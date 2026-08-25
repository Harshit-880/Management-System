using HotelManagement.API.Data;
using HotelManagement.API.DTOs;
using HotelManagement.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/payments")]
// Same access tier as billing/reservations — front-desk collects payments,
// Accountant/Manager/Admin oversee and reconcile them.
[Authorize(Roles = "Admin,Manager,Receptionist,Accountant")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PaymentsController(AppDbContext db) => _db = db;

    // ── GET api/payments?hotelId=1&reservationId=5 (omit hotelId for all hotels) ──
    // Raw transaction list ── powers "Transaction history" and
    // "Reservation-wise payment history".
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? hotelId, [FromQuery] int? reservationId)
    {
        var query = _db.Payments
            .Include(p => p.GuestStay).ThenInclude(gs => gs.Reservation).ThenInclude(r => r.Guest)
            .Include(p => p.GuestStay).ThenInclude(gs => gs.Reservation).ThenInclude(r => r.Room)
            .Include(p => p.GuestStay).ThenInclude(gs => gs.Reservation).ThenInclude(r => r.Hotel)
            .AsQueryable();

        if (hotelId.HasValue)
            query = query.Where(p => p.GuestStay.Reservation.HotelId == hotelId.Value);

        if (reservationId.HasValue)
            query = query.Where(p => p.GuestStay.ReservationId == reservationId.Value);

        var list = await query.OrderByDescending(p => p.PaidAt ?? DateTime.MinValue).ToListAsync();
        return Ok(list.Select(ToResponse));
    }

    // ── GET api/payments/overview?hotelId=1 (omit hotelId for all hotels) ────
    // Reservation-wise rollup ── powers Guest/Pending/Completed/Outstanding views.
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] int? hotelId)
    {
        var query = _db.Reservations
            .Include(r => r.Guest)
            .Include(r => r.Room).ThenInclude(ro => ro.RoomType)
            .Include(r => r.GuestStay).ThenInclude(gs => gs!.Payments)
            .Include(r => r.Hotel)
            .Where(r => r.GuestStay != null)
            .AsQueryable();

        if (hotelId.HasValue)
            query = query.Where(r => r.HotelId == hotelId.Value);

        var reservations = await query.ToListAsync();

        var summaries = reservations.Select(r =>
        {
            var payments = r.GuestStay!.Payments;
            var paid     = payments.Where(p => p.Status == "Completed").Sum(p => p.Amount);
            var refunded = payments.Where(p => p.Status == "Refunded").Sum(p => p.Amount);
            var net      = paid - refunded;
            var outstanding = r.TotalAmount - net;

            var status = outstanding <= 0 ? "Completed" : (net > 0 ? "Partial" : "Pending");

            return new ReservationPaymentSummary
            {
                ReservationId     = r.ReservationId,
                HotelId           = r.HotelId,
                HotelName         = r.Hotel?.HotelName,
                GuestName         = $"{r.Guest.FirstName} {r.Guest.LastName}".Trim(),
                GuestPhone        = r.Guest.Phone,
                GuestEmail        = r.Guest.Email,
                RoomNumber        = r.Room.RoomNumber,
                RoomTypeName      = r.Room.RoomType?.Name ?? string.Empty,
                ReservationStatus = r.Status,
                CheckInDate       = r.CheckInDate,
                CheckOutDate      = r.CheckOutDate,
                TotalAmount       = r.TotalAmount,
                AmountPaid        = net,
                AmountRefunded    = refunded,
                OutstandingAmount = Math.Max(0, outstanding),
                PaymentStatus     = status,
            };
        })
        .OrderByDescending(s => s.ReservationId)
        .ToList();

        return Ok(summaries);
    }

    // ── POST api/payments ───────────────────────────────────────────
    // Records a completed payment against a reservation's stay.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePaymentRequest req)
    {
        if (req.Amount <= 0) return BadRequest(new { message = "Amount must be greater than zero." });

        var reservation = await _db.Reservations
            .Include(r => r.GuestStay)
            .FirstOrDefaultAsync(r => r.ReservationId == req.ReservationId);

        if (reservation is null) return NotFound(new { message = "Reservation not found." });
        if (reservation.GuestStay is null)
            return BadRequest(new { message = "Guest must be checked in before a payment can be recorded." });

        var payment = new Payment
        {
            StayId        = reservation.GuestStay.StayId,
            Amount        = req.Amount,
            PaymentMethod = req.PaymentMethod,
            Status        = "Completed",
            PaidAt        = DateTime.UtcNow,
        };
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        var full = await LoadFull(payment.PaymentId);
        return CreatedAtAction(nameof(GetAll), new { hotelId = reservation.HotelId }, ToResponse(full!));
    }

    // ── POST api/payments/{id}/refund ───────────────────────────────
    // Issues a refund — recorded as its own ledger entry against the same stay.
    [HttpPost("{id:int}/refund")]
    public async Task<IActionResult> Refund(int id, [FromBody] RefundPaymentRequest req)
    {
        if (req.Amount <= 0) return BadRequest(new { message = "Refund amount must be greater than zero." });

        var original = await _db.Payments.FindAsync(id);
        if (original is null) return NotFound(new { message = "Payment not found." });

        var refund = new Payment
        {
            StayId        = original.StayId,
            Amount        = req.Amount,
            PaymentMethod = original.PaymentMethod,
            Status        = "Refunded",
            PaidAt        = DateTime.UtcNow,
        };
        _db.Payments.Add(refund);
        await _db.SaveChangesAsync();

        var full = await LoadFull(refund.PaymentId);
        return Ok(ToResponse(full!));
    }

    // ── Helpers ──────────────────────────────────────────────────────
    private Task<Payment?> LoadFull(int id) =>
        _db.Payments
            .Include(p => p.GuestStay).ThenInclude(gs => gs.Reservation).ThenInclude(r => r.Guest)
            .Include(p => p.GuestStay).ThenInclude(gs => gs.Reservation).ThenInclude(r => r.Room)
            .FirstOrDefaultAsync(p => p.PaymentId == id);

    private static PaymentResponse ToResponse(Payment p) => new()
    {
        PaymentId     = p.PaymentId,
        ReservationId = p.GuestStay.ReservationId,
        HotelId       = p.GuestStay.Reservation?.HotelId,
        HotelName     = p.GuestStay.Reservation?.Hotel?.HotelName,
        StayId        = p.StayId,
        GuestName     = $"{p.GuestStay.Reservation.Guest.FirstName} {p.GuestStay.Reservation.Guest.LastName}".Trim(),
        RoomNumber    = p.GuestStay.Reservation.Room?.RoomNumber,
        Amount        = p.Amount,
        PaymentMethod = p.PaymentMethod,
        Status        = p.Status,
        PaidAt        = p.PaidAt,
    };
}
