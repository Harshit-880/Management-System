using System.Security.Claims;
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
public class HotelsController : ControllerBase
{
    private readonly AppDbContext _db;

    public HotelsController(AppDbContext db)
    {
        _db = db;
    }

    // GET api/hotels?includeInactive=true
    // includeInactive is only honored for Admins — used by the Hotels
    // management page so deactivated properties can still be reactivated.
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = _db.Hotels.AsQueryable();
        if (!includeInactive || !User.IsInRole("Admin"))
            query = query.Where(h => h.IsActive);

        var hotels = await query
            .OrderBy(h => h.HotelName)
            .Select(h => ToResponse(h))
            .ToListAsync();

        return Ok(hotels);
    }

    // GET api/hotels/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var hotel = await _db.Hotels.FindAsync(id);
        if (hotel is null || !hotel.IsActive)
            return NotFound(new { message = "Hotel not found." });

        return Ok(ToResponse(hotel));
    }

    // POST api/hotels
    [Authorize(Roles = "Admin,Manager")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHotelRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var hotel = new Hotel
        {
            HotelName       = request.HotelName,
            Address         = request.Address,
            City            = request.City,
            Country         = request.Country,
            Phone           = request.Phone,
            Email           = request.Email,
            Currency        = request.Currency,
            TimeZone        = request.TimeZone,
            CheckInTime     = request.CheckInTime,
            CheckOutTime    = request.CheckOutTime,
            Policies        = request.Policies,
            IsActive        = true,
            CreatedByUserId = userId.Value,
        };

        _db.Hotels.Add(hotel);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = hotel.HotelId }, ToResponse(hotel));
    }

    // PUT api/hotels/{id}
    [Authorize(Roles = "Admin,Manager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateHotelRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var hotel = await _db.Hotels.FindAsync(id);
        if (hotel is null || !hotel.IsActive)
            return NotFound(new { message = "Hotel not found." });

        hotel.HotelName = request.HotelName;
        hotel.Address   = request.Address;
        hotel.City      = request.City;
        hotel.Country   = request.Country;
        hotel.Phone     = request.Phone;
        hotel.Email     = request.Email;
        hotel.Currency     = request.Currency;
        hotel.TimeZone     = request.TimeZone;
        hotel.CheckInTime  = request.CheckInTime;
        hotel.CheckOutTime = request.CheckOutTime;
        hotel.Policies     = request.Policies;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(hotel));
    }

    // DELETE api/hotels/{id}  (soft delete / deactivate)
    [Authorize(Roles = "Admin,Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var hotel = await _db.Hotels.FindAsync(id);
        if (hotel is null || !hotel.IsActive)
            return NotFound(new { message = "Hotel not found." });

        hotel.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT api/hotels/{id}/activate  (reactivate a deactivated hotel)
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/activate")]
    public async Task<IActionResult> Activate(int id)
    {
        var hotel = await _db.Hotels.FindAsync(id);
        if (hotel is null) return NotFound(new { message = "Hotel not found." });

        hotel.IsActive = true;
        await _db.SaveChangesAsync();
        return Ok(ToResponse(hotel));
    }

    // ── helpers ────────────────────────────────────────────────────────────
    private int? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return int.TryParse(sub, out var id) ? id : null;
    }

    private static HotelResponse ToResponse(Hotel h) => new()
    {
        HotelId         = h.HotelId,
        HotelName       = h.HotelName,
        Address         = h.Address,
        City            = h.City,
        Country         = h.Country,
        Phone           = h.Phone,
        Email           = h.Email,
        Currency        = h.Currency,
        TimeZone        = h.TimeZone,
        CheckInTime     = h.CheckInTime,
        CheckOutTime    = h.CheckOutTime,
        Policies        = h.Policies,
        IsActive        = h.IsActive,
        CreatedByUserId = h.CreatedByUserId,
    };
}
