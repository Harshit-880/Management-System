using HotelManagement.API.Data;
using HotelManagement.API.DTOs;
using HotelManagement.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StaffController : ControllerBase
{
    private readonly AppDbContext _db;

    public StaffController(AppDbContext db) => _db = db;

    // Managers can manage day-to-day staff, but must not be able to create
    // or promote anyone into the Manager/Admin tier themselves.
    private bool CurrentUserIsManagerOnly() => User.IsInRole("Manager") && !User.IsInRole("Admin");
    private static bool IsRestrictedRole(string roleName) => roleName is "Manager" or "Admin";

    // GET api/staff
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? hotelId, [FromQuery] int? roleId)
    {
        var query = _db.HotelStaff
            .Include(hs => hs.User)
            .Include(hs => hs.Role)
            .Include(hs => hs.Hotel)
            .AsQueryable();

        if (hotelId.HasValue) query = query.Where(hs => hs.HotelId == hotelId);
        if (roleId.HasValue)  query = query.Where(hs => hs.RoleId  == roleId);

        var result = await query
            .OrderBy(hs => hs.User.LastName)
            .Select(hs => ToResponse(hs))
            .ToListAsync();

        return Ok(result);
    }

    // GET api/staff/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var hs = await _db.HotelStaff
            .Include(x => x.User)
            .Include(x => x.Role)
            .Include(x => x.Hotel)
            .FirstOrDefaultAsync(x => x.HotelStaffId == id);

        return hs is null ? NotFound() : Ok(ToResponse(hs));
    }

    // POST api/staff  — creates a User account + assigns hotel+role
    [Authorize(Roles = "Admin,Manager")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStaffRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (await _db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict(new { message = "A user with this email already exists." });

        var hotel = await _db.Hotels.FindAsync(req.HotelId);
        if (hotel is null || !hotel.IsActive)
            return BadRequest(new { message = "Hotel not found." });

        var role = await _db.Roles.FindAsync(req.RoleId);
        if (role is null)
            return BadRequest(new { message = "Role not found." });

        if (CurrentUserIsManagerOnly() && IsRestrictedRole(role.RoleName))
            return StatusCode(403, new { message = "Managers cannot assign the Manager or Admin role." });

        // 1. Create user account
        var user = new User
        {
            Email        = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            FirstName    = req.FirstName,
            LastName     = req.LastName,
            Phone        = req.Phone,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // 2. Assign system-wide role (for JWT claims on login)
        if (!await _db.UserRoles.AnyAsync(ur => ur.UserId == user.UserId && ur.RoleId == req.RoleId))
        {
            _db.UserRoles.Add(new UserRole { UserId = user.UserId, RoleId = req.RoleId });
        }

        // 3. Create hotel-staff link
        var hotelStaff = new HotelStaff
        {
            HotelId  = req.HotelId,
            UserId   = user.UserId,
            RoleId   = req.RoleId,
            IsActive = true,
            JoinedAt = DateTime.UtcNow,
        };
        _db.HotelStaff.Add(hotelStaff);
        await _db.SaveChangesAsync();

        // Reload for navigation props
        await _db.Entry(hotelStaff).Reference(x => x.User).LoadAsync();
        await _db.Entry(hotelStaff).Reference(x => x.Role).LoadAsync();
        await _db.Entry(hotelStaff).Reference(x => x.Hotel).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = hotelStaff.HotelStaffId }, ToResponse(hotelStaff));
    }

    // PUT api/staff/{id}  — update role / active status
    [Authorize(Roles = "Admin,Manager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateStaffRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var hs = await _db.HotelStaff
            .Include(x => x.User)
            .Include(x => x.Role)
            .Include(x => x.Hotel)
            .FirstOrDefaultAsync(x => x.HotelStaffId == id);

        if (hs is null) return NotFound();

        var role = await _db.Roles.FindAsync(req.RoleId);
        if (role is null) return BadRequest(new { message = "Role not found." });

        if (CurrentUserIsManagerOnly() && (IsRestrictedRole(role.RoleName) || IsRestrictedRole(hs.Role.RoleName)))
            return StatusCode(403, new { message = "Managers cannot assign or modify the Manager or Admin role." });

        // Update hotel-staff record
        hs.RoleId   = req.RoleId;
        hs.IsActive = req.IsActive;

        // Optional profile edits
        if (req.FirstName != null) hs.User.FirstName = req.FirstName;
        if (req.LastName  != null) hs.User.LastName  = req.LastName;
        if (req.Phone     != null) hs.User.Phone     = req.Phone;

        // Keep system-wide UserRole in sync
        var existingUserRole = await _db.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == hs.UserId);
        if (existingUserRole is not null)
            existingUserRole.RoleId = req.RoleId;
        else
            _db.UserRoles.Add(new UserRole { UserId = hs.UserId, RoleId = req.RoleId });

        await _db.SaveChangesAsync();
        await _db.Entry(hs).Reference(x => x.Role).LoadAsync();

        return Ok(ToResponse(hs));
    }

    // DELETE api/staff/{id}  — deactivate (soft delete)
    [Authorize(Roles = "Admin,Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var hs = await _db.HotelStaff.FindAsync(id);
        if (hs is null) return NotFound();

        hs.IsActive = false;
        await _db.Users.Where(u => u.UserId == hs.UserId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false));

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET api/staff/roles
    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _db.Roles
            .Select(r => new RoleDto { RoleId = r.RoleId, RoleName = r.RoleName })
            .ToListAsync();
        return Ok(roles);
    }

    // ── helper ────────────────────────────────────────────────────────────
    private static StaffResponse ToResponse(HotelStaff hs) => new()
    {
        HotelStaffId = hs.HotelStaffId,
        UserId       = hs.UserId,
        FirstName    = hs.User.FirstName,
        LastName     = hs.User.LastName,
        Email        = hs.User.Email,
        Phone        = hs.User.Phone,
        RoleName     = hs.Role.RoleName,
        RoleId       = hs.RoleId,
        HotelName    = hs.Hotel.HotelName,
        HotelId      = hs.HotelId,
        IsActive     = hs.IsActive,
        JoinedAt     = hs.JoinedAt,
    };
}
