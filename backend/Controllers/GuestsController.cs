using HotelManagement.API.Data;
using HotelManagement.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/guests")]
// Guest PII (name, phone, email, ID) is restricted to front-of-house and
// financial roles — Housekeeping/Staff must not see guest identity data.
[Authorize(Roles = "Admin,Manager,Receptionist,Accountant")]
public class GuestsController : ControllerBase
{
    private readonly AppDbContext _db;
    public GuestsController(AppDbContext db) => _db = db;

    // GET api/guests?hotelId=1&search=john  (omit hotelId to search across all hotels)
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    hotelId,
        [FromQuery] string? search)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var query = _db.Reservations
            .Include(r => r.Guest)
            .Include(r => r.Room).ThenInclude(ro => ro.RoomType)
            .Include(r => r.GuestStay)
            .Include(r => r.AdditionalGuests)
            .Include(r => r.Hotel)
            .AsQueryable();

        if (hotelId.HasValue) query = query.Where(r => r.HotelId == hotelId.Value);

        var reservations = await query.ToListAsync();

        var primaryGuests = reservations
            .GroupBy(r => r.GuestId)
            .Select(g =>
            {
                // Pick "highlight" reservation: CheckedIn > ArrivingToday > latest
                var highlight = g
                    .OrderByDescending(r =>
                        r.Status == "CheckedIn" ? 3
                        : r.Status == "Confirmed" && r.CheckInDate == today ? 2
                        : 1)
                    .ThenByDescending(r => r.ReservationId)
                    .First();

                var nights = Math.Max(0,
                    (highlight.CheckOutDate.ToDateTime(TimeOnly.MinValue) -
                     highlight.CheckInDate.ToDateTime(TimeOnly.MinValue)).Days);

                return new GuestResponse
                {
                    GuestId           = g.Key,
                    HotelId           = highlight.HotelId,
                    HotelName         = highlight.Hotel?.HotelName,
                    FullName          = $"{highlight.Guest?.FirstName} {highlight.Guest?.LastName}".Trim(),
                    Phone             = highlight.Guest?.Phone,
                    Email             = highlight.Guest?.Email,
                    IdType            = highlight.Guest?.IdentificationType,
                    IdNumber          = highlight.Guest?.IdentificationNumber,
                    ReservationId     = highlight.ReservationId,
                    RoomNumber        = highlight.Room?.RoomNumber,
                    RoomTypeName      = highlight.Room?.RoomType?.Name,
                    CheckInDate       = highlight.CheckInDate,
                    CheckOutDate      = highlight.CheckOutDate,
                    ReservationStatus = highlight.Status,
                    TotalAmount       = highlight.TotalAmount,
                    Nights            = nights,
                    AccessToken       = highlight.GuestStay?.AccessToken,
                    TotalStays        = g.Count(),
                    TotalSpend        = g.Sum(r => r.TotalAmount),
                    FirstStayDate     = g.Min(r => r.CheckInDate),
                    Notes             = highlight.Guest?.Notes,
                    CoOccupants       = highlight.AdditionalGuests
                        .Select(ag => new CoOccupantInfo
                        {
                            AdditionalGuestId = ag.AdditionalGuestId,
                            FullName          = ag.FullName,
                            IdType            = ag.IdType,
                            IdNumber          = ag.IdNumber,
                        }).ToList(),
                };
            })
            .ToList();

        var allGuests = primaryGuests.AsEnumerable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            allGuests = allGuests.Where(g =>
                g.FullName.ToLower().Contains(q) ||
                (g.Phone  != null && g.Phone.Contains(q)) ||
                (g.Email  != null && g.Email.ToLower().Contains(q)) ||
                g.CoOccupants.Any(co => co.FullName.ToLower().Contains(q)));
        }

        return Ok(allGuests.OrderByDescending(g => g.ReservationId).ToList());
    }

    // PUT api/guests/{id}/notes
    [HttpPut("{id:int}/notes")]
    public async Task<IActionResult> UpdateNotes(int id, [FromBody] UpdateGuestNotesRequest req)
    {
        var guest = await _db.Guests.FindAsync(id);
        if (guest is null) return NotFound();

        guest.Notes = req.Notes;
        await _db.SaveChangesAsync();

        return Ok(new { guestId = guest.GuestId, notes = guest.Notes });
    }
}
