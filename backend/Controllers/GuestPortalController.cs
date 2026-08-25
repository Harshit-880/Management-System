using HotelManagement.API.Data;
using HotelManagement.API.DTOs;
using HotelManagement.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/guest-portal")]
public class GuestPortalController : ControllerBase
{
    private readonly AppDbContext _db;
    public GuestPortalController(AppDbContext db) => _db = db;

    // ── GET api/guest-portal/{token} ──────────────────────────────
    // Public — no [Authorize]. Token identifies the stay.
    [HttpGet("{token}")]
    public async Task<IActionResult> GetStay(string token)
    {
        var stay = await _db.GuestStays
            .Include(gs => gs.Reservation)
                .ThenInclude(r => r.Guest)
            .Include(gs => gs.Reservation)
                .ThenInclude(r => r.Room).ThenInclude(room => room.RoomType)
            .Include(gs => gs.Reservation)
                .ThenInclude(r => r.Hotel)
            .FirstOrDefaultAsync(gs => gs.AccessToken == token && gs.Status == "Active");

        if (stay is null)
            return NotFound(new { message = "Invalid or expired guest session." });

        var res = stay.Reservation;

        // Fetch service requests for this room in this stay
        var requests = await _db.ServiceRequests
            .Where(sr => sr.HotelId == res.HotelId && sr.RoomId == res.RoomId)
            .OrderByDescending(sr => sr.CreatedAt)
            .ToListAsync();

        return Ok(new
        {
            stayId       = stay.StayId,
            token        = token,
            guestName    = $"{res.Guest?.FirstName} {res.Guest?.LastName}".Trim(),
            guestPhone   = res.Guest?.Phone,
            guestEmail   = res.Guest?.Email,
            hotelName    = res.Hotel?.HotelName,
            hotelId      = res.HotelId,
            hotelAddress = res.Hotel?.Address,
            hotelCity    = res.Hotel?.City,
            hotelCountry = res.Hotel?.Country,
            hotelPhone   = res.Hotel?.Phone,
            hotelEmail   = res.Hotel?.Email,
            roomNumber   = res.Room?.RoomNumber,
            roomType     = res.Room?.RoomType?.Name,
            roomId       = res.RoomId,
            guestId      = res.GuestId,
            checkInDate  = res.CheckInDate,
            checkOutDate = res.CheckOutDate,
            checkInAt    = stay.CheckInAt,
            requests     = requests.Select(sr => new
            {
                requestId   = sr.ServiceRequestId,
                department  = sr.Department,
                title       = sr.Title,
                description = sr.Description,
                status      = sr.Status,
                createdAt   = sr.CreatedAt,
                timeAgo     = GetTimeAgo(sr.CreatedAt),
            }),
        });
    }

    // ── GET api/guest-portal/{token}/bill ─────────────────────────
    // Public — no [Authorize]. Reservation-scoped payment summary for the guest.
    [HttpGet("{token}/bill")]
    public async Task<IActionResult> GetBill(string token)
    {
        var stay = await _db.GuestStays
            .Include(gs => gs.Reservation)
            .Include(gs => gs.Payments)
            .FirstOrDefaultAsync(gs => gs.AccessToken == token && gs.Status == "Active");

        if (stay is null)
            return NotFound(new { message = "Invalid or expired guest session." });

        var paid        = stay.Payments.Where(p => p.Status == "Completed").Sum(p => p.Amount);
        var refunded    = stay.Payments.Where(p => p.Status == "Refunded").Sum(p => p.Amount);
        var net         = paid - refunded;
        var outstanding = Math.Max(0, stay.Reservation.TotalAmount - net);
        var status      = outstanding <= 0 ? "Completed" : (net > 0 ? "Partial" : "Pending");

        return Ok(new
        {
            totalAmount       = stay.Reservation.TotalAmount,
            amountPaid        = net,
            amountRefunded    = refunded,
            outstandingAmount = outstanding,
            paymentStatus     = status,
            transactions      = stay.Payments
                .OrderByDescending(p => p.PaidAt ?? DateTime.MinValue)
                .Select(p => new
                {
                    paymentId     = p.PaymentId,
                    amount        = p.Amount,
                    paymentMethod = p.PaymentMethod,
                    status        = p.Status,
                    paidAt        = p.PaidAt,
                }),
        });
    }

    // ── POST api/guest-portal/{token}/requests ────────────────────
    [HttpPost("{token}/requests")]
    public async Task<IActionResult> CreateRequest(string token, [FromBody] GuestPortalRequestDto req)
    {
        var stay = await _db.GuestStays
            .Include(gs => gs.Reservation)
            .FirstOrDefaultAsync(gs => gs.AccessToken == token && gs.Status == "Active");

        if (stay is null)
            return NotFound(new { message = "Invalid or expired guest session." });

        var sr = new ServiceRequest
        {
            HotelId     = stay.Reservation.HotelId,
            RoomId      = stay.Reservation.RoomId,
            GuestId     = stay.Reservation.GuestId,
            Department  = req.Department,
            Title       = req.Title,
            Description = req.Description,
            Status      = "Pending",
            CreatedAt   = DateTime.UtcNow,
        };
        _db.ServiceRequests.Add(sr);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            requestId   = sr.ServiceRequestId,
            department  = sr.Department,
            title       = sr.Title,
            description = sr.Description,
            status      = sr.Status,
            createdAt   = sr.CreatedAt,
            timeAgo     = "Just now",
        });
    }

    private static string GetTimeAgo(DateTime dt)
    {
        var diff = DateTime.UtcNow - dt;
        if (diff.TotalMinutes < 1)  return "Just now";
        if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes} min ago";
        if (diff.TotalHours   < 24) return $"{(int)diff.TotalHours}h ago";
        return $"{(int)diff.TotalDays}d ago";
    }
}

public record GuestPortalRequestDto(string Department, string Title, string? Description);
