using HotelManagement.API.Data;
using HotelManagement.API.DTOs;
using HotelManagement.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/reservations")]
[Authorize]
public class ReservationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReservationsController(AppDbContext db) => _db = db;

    // ── GET api/reservations?hotelId=1&status=Confirmed&checkInDate=2026-08-17 ──
    // Guest/reservation data is not exposed to Housekeeping or generic Staff.
    // Omitting hotelId returns reservations across all hotels (Admin overview).
    [Authorize(Roles = "Admin,Manager,Receptionist,Accountant")]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    hotelId,
        [FromQuery] string? status,
        [FromQuery] DateOnly? checkInDate,
        [FromQuery] int?    guestId)
    {
        var q = _db.Reservations
            .Include(r => r.Guest)
            .Include(r => r.Room).ThenInclude(room => room.RoomType)
            .Include(r => r.GuestStay)
            .Include(r => r.AdditionalGuests)
            .Include(r => r.Hotel)
            .AsQueryable();

        if (hotelId.HasValue)
            q = q.Where(r => r.HotelId == hotelId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(r => r.Status == status);

        if (checkInDate.HasValue)
            q = q.Where(r => r.CheckInDate == checkInDate.Value);

        if (guestId.HasValue)
            q = q.Where(r => r.GuestId == guestId.Value);

        var list = await q
            .OrderByDescending(r => r.ReservationId)
            .Select(r => ToResponse(r))
            .ToListAsync();

        return Ok(list);
    }

    // ── GET api/reservations/{id} ──────────────────────────────────
    [Authorize(Roles = "Admin,Manager,Receptionist,Accountant")]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var r = await _db.Reservations
            .Include(r => r.Guest)
            .Include(r => r.Room).ThenInclude(room => room.RoomType)
            .Include(r => r.GuestStay)
            .FirstOrDefaultAsync(r => r.ReservationId == id);
        return r is null ? NotFound() : Ok(ToResponse(r));
    }

    // ── POST api/reservations ─────────────────────────────────────
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (req.CheckOutDate <= req.CheckInDate)
            return BadRequest(new { message = "Check-out date must be after check-in date." });

        var room = await _db.Rooms.Include(r => r.RoomType).FirstOrDefaultAsync(r => r.RoomId == req.RoomId);
        if (room is null) return BadRequest(new { message = "Room not found." });

        // Overlap check
        var overlap = await _db.Reservations.AnyAsync(r =>
            r.RoomId == req.RoomId &&
            r.Status != "Cancelled" && r.Status != "CheckedOut" &&
            r.CheckInDate < req.CheckOutDate && r.CheckOutDate > req.CheckInDate);
        if (overlap)
            return Conflict(new { message = "Room already has a reservation for those dates." });

        // Create guest record
        var guest = new Guest
        {
            FirstName            = req.GuestFirstName,
            LastName             = req.GuestLastName,
            Phone                = req.GuestPhone,
            Email                = req.GuestEmail,
            IdentificationType   = req.IdType,
            IdentificationNumber = req.IdNumber,
        };
        _db.Guests.Add(guest);
        await _db.SaveChangesAsync();

        var nights = (req.CheckOutDate.ToDateTime(TimeOnly.MinValue) - req.CheckInDate.ToDateTime(TimeOnly.MinValue)).Days;
        var price  = room.Price ?? room.RoomType?.BasePrice ?? 0;
        var total  = req.TotalAmount ?? (price * nights);

        var reservation = new Reservation
        {
            HotelId      = req.HotelId,
            GuestId      = guest.GuestId,
            RoomId       = req.RoomId,
            CheckInDate  = req.CheckInDate,
            CheckOutDate = req.CheckOutDate,
            Status       = "Confirmed",
            TotalAmount  = total,
        };
        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        // Save additional (co-occupant) guests
        foreach (var ag in req.AdditionalGuests)
        {
            _db.AdditionalGuests.Add(new AdditionalGuest
            {
                ReservationId = reservation.ReservationId,
                FullName      = ag.FullName,
                IdType        = ag.IdType,
                IdNumber      = ag.IdNumber,
            });
        }
        if (req.AdditionalGuests.Count > 0)
            await _db.SaveChangesAsync();

        await _db.Entry(reservation).Reference(r => r.Guest).LoadAsync();
        await _db.Entry(reservation).Reference(r => r.Room).LoadAsync();
        await _db.Entry(reservation.Room).Reference(r => r.RoomType).LoadAsync();
        await _db.Entry(reservation).Collection(r => r.AdditionalGuests).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = reservation.ReservationId }, ToResponse(reservation));
    }

    // ── PUT api/reservations/{id}/confirm ─────────────────────────
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    [HttpPut("{id:int}/confirm")]
    public async Task<IActionResult> Confirm(int id)
    {
        var r = await LoadFull(id);
        if (r is null) return NotFound();
        if (r.Status != "Pending")
            return BadRequest(new { message = $"Cannot confirm a '{r.Status}' reservation." });
        r.Status = "Confirmed";
        await _db.SaveChangesAsync();
        return Ok(ToResponse(r));
    }

    // ── PUT api/reservations/{id}/checkin ─────────────────────────
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    [HttpPut("{id:int}/checkin")]
    public async Task<IActionResult> CheckIn(int id)
    {
        var r = await LoadFull(id);
        if (r is null) return NotFound();
        if (r.Status != "Confirmed" && r.Status != "Pending")
            return BadRequest(new { message = $"Cannot check in a '{r.Status}' reservation." });

        var today = DateOnly.FromDateTime(DateTime.Today);
        if (today < r.CheckInDate)
            return BadRequest(new { message = $"Check-in is not allowed before the scheduled date ({r.CheckInDate:yyyy-MM-dd})." });

        r.Status      = "CheckedIn";
        r.Room.Status = "Occupied";

        var token = Guid.NewGuid().ToString("N"); // 32-char hex, no dashes
        if (r.GuestStay is null)
            _db.GuestStays.Add(new GuestStay { ReservationId = r.ReservationId, CheckInAt = DateTime.UtcNow, Status = "Active", AccessToken = token });
        else
        {
            r.GuestStay.CheckInAt   = DateTime.UtcNow;
            r.GuestStay.Status      = "Active";
            r.GuestStay.AccessToken = token;
        }

        await _db.SaveChangesAsync();
        await _db.Entry(r).Reference(x => x.GuestStay).LoadAsync();
        return Ok(ToResponse(r));
    }

    // ── PUT api/reservations/{id}/checkout ────────────────────────
    // Also used by Billing (Accountant) to finalize a stay at settlement.
    [Authorize(Roles = "Admin,Manager,Receptionist,Accountant")]
    [HttpPut("{id:int}/checkout")]
    public async Task<IActionResult> CheckOut(int id)
    {
        var r = await LoadFull(id);
        if (r is null) return NotFound();
        if (r.Status != "CheckedIn")
            return BadRequest(new { message = $"Cannot check out a '{r.Status}' reservation." });

        r.Status      = "CheckedOut";
        r.Room.Status = "Dirty"; // standard post-checkout flow

        if (r.GuestStay is not null)
        {
            r.GuestStay.CheckOutAt = DateTime.UtcNow;
            r.GuestStay.Status     = "CheckedOut";
        }

        await _db.SaveChangesAsync();
        return Ok(ToResponse(r));
    }

    // ── PUT api/reservations/{id}/cancel ──────────────────────────
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var r = await LoadFull(id);
        if (r is null) return NotFound();
        if (r.Status is "CheckedIn" or "CheckedOut")
            return BadRequest(new { message = $"Cannot cancel a '{r.Status}' reservation." });

        if (r.Status == "CheckedIn") r.Room.Status = "Available";
        r.Status = "Cancelled";
        await _db.SaveChangesAsync();
        return Ok(ToResponse(r));
    }

    // ── PATCH api/reservations/{id} — modify dates / amount ───────
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Modify(int id, [FromBody] UpdateReservationRequest req)
    {
        if (req.CheckOutDate <= req.CheckInDate)
            return BadRequest(new { message = "Check-out date must be after check-in date." });

        var r = await LoadFull(id);
        if (r is null) return NotFound();
        if (r.Status is "CheckedOut" or "Cancelled")
            return BadRequest(new { message = $"Cannot modify a '{r.Status}' reservation." });

        // Date changes only allowed before check-in
        if (r.Status is "Pending" or "Confirmed")
        {
            // Overlap check (exclude self)
            var overlap = await _db.Reservations.AnyAsync(x =>
                x.ReservationId != id &&
                x.RoomId == r.RoomId &&
                x.Status != "Cancelled" && x.Status != "CheckedOut" &&
                x.CheckInDate < req.CheckOutDate && x.CheckOutDate > req.CheckInDate);
            if (overlap)
                return Conflict(new { message = "Room already has a reservation for those dates." });

            r.CheckInDate  = req.CheckInDate;
            r.CheckOutDate = req.CheckOutDate;
        }

        if (req.TotalAmount.HasValue)
            r.TotalAmount = req.TotalAmount.Value;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(r));
    }

    // ── PUT api/reservations/{id}/changeroom ──────────────────────
    [Authorize(Roles = "Admin,Manager,Receptionist")]
    [HttpPut("{id:int}/changeroom")]
    public async Task<IActionResult> ChangeRoom(int id, [FromBody] ChangeRoomRequest req)
    {
        var r = await LoadFull(id);
        if (r is null) return NotFound();
        if (r.Status is "CheckedOut" or "Cancelled")
            return BadRequest(new { message = $"Cannot change room for a '{r.Status}' reservation." });
        if (r.RoomId == req.RoomId)
            return BadRequest(new { message = "The selected room is already assigned to this reservation." });

        var newRoom = await _db.Rooms.Include(x => x.RoomType).FirstOrDefaultAsync(x => x.RoomId == req.RoomId);
        if (newRoom is null) return BadRequest(new { message = "Room not found." });
        if (newRoom.Status is "OutOfService" or "Maintenance")
            return BadRequest(new { message = $"Room {newRoom.RoomNumber} is not available ({newRoom.Status})." });

        // Overlap check on new room (exclude current reservation)
        var overlap = await _db.Reservations.AnyAsync(x =>
            x.ReservationId != id &&
            x.RoomId == req.RoomId &&
            x.Status != "Cancelled" && x.Status != "CheckedOut" &&
            x.CheckInDate < r.CheckOutDate && x.CheckOutDate > r.CheckInDate);
        if (overlap)
            return Conflict(new { message = $"Room {newRoom.RoomNumber} is already booked for those dates." });

        // If checked in, swap room statuses
        if (r.Status == "CheckedIn")
        {
            r.Room.Status  = "Available"; // vacate old room
            newRoom.Status = "Occupied";  // occupy new room
        }

        r.RoomId = req.RoomId;
        await _db.SaveChangesAsync();

        var updated = await LoadFull(id);
        return Ok(ToResponse(updated!));
    }

    // ── Helpers ───────────────────────────────────────────────────
    private Task<Reservation?> LoadFull(int id) =>
        _db.Reservations
            .Include(r => r.Guest)
            .Include(r => r.Room).ThenInclude(room => room.RoomType)
            .Include(r => r.GuestStay)
            .Include(r => r.AdditionalGuests)
            .Include(r => r.Hotel)
            .FirstOrDefaultAsync(r => r.ReservationId == id);

    private static ReservationResponse ToResponse(Reservation r) => new()
    {
        ReservationId = r.ReservationId,
        HotelId       = r.HotelId,
        HotelName     = r.Hotel?.HotelName,
        GuestId       = r.GuestId,
        GuestName     = $"{r.Guest?.FirstName} {r.Guest?.LastName}".Trim(),
        GuestPhone    = r.Guest?.Phone,
        GuestEmail    = r.Guest?.Email,
        RoomId        = r.RoomId,
        RoomNumber    = r.Room?.RoomNumber ?? string.Empty,
        RoomTypeName  = r.Room?.RoomType?.Name ?? string.Empty,
        Floor         = DeriveFloor(r.Room?.RoomNumber ?? ""),
        CheckInDate   = r.CheckInDate,
        CheckOutDate  = r.CheckOutDate,
        Status        = r.Status,
        TotalAmount   = r.TotalAmount,
        Nights        = Math.Max(0, (r.CheckOutDate.ToDateTime(TimeOnly.MinValue) - r.CheckInDate.ToDateTime(TimeOnly.MinValue)).Days),
        CheckedInAt   = r.GuestStay?.CheckInAt,
        CheckedOutAt  = r.GuestStay?.CheckOutAt,
        AccessToken   = r.GuestStay?.AccessToken,
        AdditionalGuestCount = r.AdditionalGuests?.Count ?? 0,
    };

    private static string DeriveFloor(string n) =>
        n.Length >= 3 && int.TryParse(n[..^2], out var f) ? $"Floor {f}" : "Floor 1";
}
