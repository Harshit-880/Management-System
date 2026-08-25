using HotelManagement.API.Data;
using HotelManagement.API.DTOs;
using HotelManagement.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/service-requests")]
// All operational roles use service requests; Accountant has no need for it.
[Authorize(Roles = "Admin,Manager,Receptionist,Housekeeping,Staff")]
public class ServiceRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ServiceRequestsController(AppDbContext db) => _db = db;

    // ── GET api/service-requests?hotelId=1&department=Housekeeping&status=Pending ──
    // Omitting hotelId returns requests across all hotels (Admin overview).
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    hotelId,
        [FromQuery] string? department,
        [FromQuery] string? status)
    {
        var q = _db.ServiceRequests
            .Include(sr => sr.Room).ThenInclude(r => r != null ? r.RoomType : null)
            .Include(sr => sr.Guest)
            .Include(sr => sr.AssignedTo)
            .Include(sr => sr.Hotel)
            .AsQueryable();

        if (hotelId.HasValue)
            q = q.Where(sr => sr.HotelId == hotelId.Value);

        if (!string.IsNullOrWhiteSpace(department))
            q = q.Where(sr => sr.Department == department);

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(sr => sr.Status == status);

        var list = await q
            .OrderByDescending(sr => sr.CreatedAt)
            .ToListAsync();

        return Ok(list.Select(ToResponse));
    }

    // ── GET api/service-requests/{id} ─────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var sr = await LoadFull(id);
        return sr is null ? NotFound() : Ok(ToResponse(sr));
    }

    // ── POST api/service-requests ─────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServiceRequestRequest req)
    {
        var sr = new ServiceRequest
        {
            HotelId     = req.HotelId,
            RoomId      = req.RoomId,
            GuestId     = req.GuestId,
            Department  = req.Department,
            Title       = req.Title,
            Description = req.Description,
            Status      = "Pending",
            CreatedAt   = DateTime.UtcNow
        };
        _db.ServiceRequests.Add(sr);
        await _db.SaveChangesAsync();

        var created = await LoadFull(sr.ServiceRequestId);
        return CreatedAtAction(nameof(GetById), new { id = sr.ServiceRequestId }, ToResponse(created!));
    }

    // ── PUT api/service-requests/{id}/assign ─────────────────────
    [HttpPut("{id:int}/assign")]
    public async Task<IActionResult> Assign(int id, [FromBody] AssignServiceRequestRequest req)
    {
        var sr = await LoadFull(id);
        if (sr is null) return NotFound();

        sr.AssignedToUserId = req.AssignedToUserId;
        sr.Status           = "Assigned";
        sr.UpdatedAt        = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await LoadFull(id);
        return Ok(ToResponse(updated!));
    }

    // ── PUT api/service-requests/{id}/status ─────────────────────
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] string newStatus)
    {
        var allowed = new[] { "Pending", "Assigned", "InProgress", "Completed", "Archived" };
        if (!allowed.Contains(newStatus))
            return BadRequest(new { message = "Invalid status value." });

        var sr = await _db.ServiceRequests.FindAsync(id);
        if (sr is null) return NotFound();

        sr.Status    = newStatus;
        sr.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await LoadFull(id);
        return Ok(ToResponse(updated!));
    }

    // ── DELETE api/service-requests/{id} ─────────────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var sr = await _db.ServiceRequests.FindAsync(id);
        if (sr is null) return NotFound();
        _db.ServiceRequests.Remove(sr);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────
    private Task<ServiceRequest?> LoadFull(int id) =>
        _db.ServiceRequests
            .Include(sr => sr.Room).ThenInclude(r => r != null ? r.RoomType : null)
            .Include(sr => sr.Guest)
            .Include(sr => sr.AssignedTo)
            .Include(sr => sr.Hotel)
            .FirstOrDefaultAsync(sr => sr.ServiceRequestId == id);

    private static ServiceRequestResponse ToResponse(ServiceRequest sr) => new(
        RequestId:        sr.ServiceRequestId,
        HotelId:          sr.HotelId,
        HotelName:        sr.Hotel?.HotelName,
        RoomId:           sr.RoomId,
        RoomNumber:       sr.Room?.RoomNumber,
        RoomTypeName:     sr.Room?.RoomType?.Name,
        GuestId:          sr.GuestId,
        GuestName:        sr.Guest != null ? $"{sr.Guest.FirstName} {sr.Guest.LastName}" : null,
        Department:       sr.Department,
        Title:            sr.Title,
        Description:      sr.Description,
        Status:           sr.Status,
        AssignedToUserId: sr.AssignedToUserId,
        AssignedToName:   sr.AssignedTo != null ? $"{sr.AssignedTo.FirstName} {sr.AssignedTo.LastName}" : null,
        CreatedAt:        sr.CreatedAt,
        TimeAgo:          GetTimeAgo(sr.CreatedAt)
    );

    private static string GetTimeAgo(DateTime dt)
    {
        var diff = DateTime.UtcNow - dt;
        if (diff.TotalMinutes < 1)   return "Just now";
        if (diff.TotalMinutes < 60)  return $"{(int)diff.TotalMinutes} min ago";
        if (diff.TotalHours   < 24)  return $"{(int)diff.TotalHours}h ago";
        if (diff.TotalDays    < 7)   return $"{(int)diff.TotalDays}d ago";
        return dt.ToString("MMM d");
    }
}
