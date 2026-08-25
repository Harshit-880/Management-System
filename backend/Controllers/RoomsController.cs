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
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _db;
    public RoomsController(AppDbContext db) => _db = db;

    // ── GET api/rooms?hotelId=1 (omit hotelId to list rooms across all hotels) ──
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? hotelId)
    {
        var query = _db.Rooms.Include(r => r.RoomType).Include(r => r.Hotel).AsQueryable();
        if (hotelId.HasValue) query = query.Where(r => r.HotelId == hotelId.Value);

        var rooms = await query
            .OrderBy(r => r.HotelId).ThenBy(r => r.RoomNumber)
            .Select(r => ToResponse(r))
            .ToListAsync();

        return Ok(rooms);
    }

    // ── GET api/rooms/{id} ───────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var r = await _db.Rooms.Include(x => x.RoomType).FirstOrDefaultAsync(x => x.RoomId == id);
        return r is null ? NotFound() : Ok(ToResponse(r));
    }

    // ── POST api/rooms  (single) ─────────────────────────
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoomRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (!await _db.Hotels.AnyAsync(h => h.HotelId == req.HotelId && h.IsActive))
            return BadRequest(new { message = "Hotel not found." });

        var roomType = await _db.RoomTypes.FindAsync(req.RoomTypeId);
        if (roomType is null) return BadRequest(new { message = "Room type not found." });

        if (await _db.Rooms.AnyAsync(r => r.HotelId == req.HotelId && r.RoomNumber == req.RoomNumber))
            return Conflict(new { message = $"Room {req.RoomNumber} already exists in this hotel." });

        var room = new Room
        {
            HotelId    = req.HotelId,
            RoomTypeId = req.RoomTypeId,
            RoomNumber = req.RoomNumber,
            Status     = "Available",
            Price      = req.Price.HasValue ? req.Price : null,
        };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        await _db.Entry(room).Reference(x => x.RoomType).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = room.RoomId }, ToResponse(room));
    }

    // ── POST api/rooms/bulk ──────────────────────────────
    [Authorize(Roles = "Admin")]
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreate([FromBody] BulkCreateRoomRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (!await _db.Hotels.AnyAsync(h => h.HotelId == req.HotelId && h.IsActive))
            return BadRequest(new { message = "Hotel not found." });

        var roomType = await _db.RoomTypes.FindAsync(req.RoomTypeId);
        if (roomType is null) return BadRequest(new { message = "Room type not found." });

        var rooms = new List<Room>();
        var duplicates = new List<string>();

        for (int i = 0; i < req.Count; i++)
        {
            var seq = (req.StartFrom + i).ToString().PadLeft(2, '0');
            var number = string.IsNullOrWhiteSpace(req.Prefix)
                ? $"{req.FloorNumber}{seq}"
                : $"{req.Prefix}{req.StartFrom + i}";

            if (await _db.Rooms.AnyAsync(r => r.HotelId == req.HotelId && r.RoomNumber == number))
            {
                duplicates.Add(number);
                continue;
            }
            rooms.Add(new Room
            {
                HotelId    = req.HotelId,
                RoomTypeId = req.RoomTypeId,
                RoomNumber = number,
                Status     = "Available",
                Price      = null,  // null → effective price = RoomType.BasePrice
            });
        }

        if (rooms.Count == 0)
            return Conflict(new { message = "All room numbers already exist.", duplicates });

        _db.Rooms.AddRange(rooms);
        await _db.SaveChangesAsync();

        // Reload with RoomType nav prop
        var ids = rooms.Select(r => r.RoomId).ToList();
        var created = await _db.Rooms
            .Include(r => r.RoomType)
            .Where(r => ids.Contains(r.RoomId))
            .Select(r => ToResponse(r))
            .ToListAsync();

        return Ok(new { created, skippedDuplicates = duplicates });
    }

    // ── PUT api/rooms/{id} (status / price) ─────────────
    // Managers edit price + status from Room Inventory; Housekeeping only
    // toggles status (Dirty/Available/etc.) from the Rooms tab.
    [Authorize(Roles = "Admin,Manager,Housekeeping")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRoomRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var room = await _db.Rooms.Include(r => r.RoomType).FirstOrDefaultAsync(r => r.RoomId == id);
        if (room is null) return NotFound();

        room.Status = req.Status;
        room.Price  = req.Price;
        await _db.SaveChangesAsync();

        return Ok(ToResponse(room));
    }

    // ── DELETE api/rooms/{id} ────────────────────────────
    [Authorize(Roles = "Admin,Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room is null) return NotFound();
        _db.Rooms.Remove(room);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── GET api/rooms/available?hotelId=&checkIn=&checkOut= ─
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable(
        [FromQuery] int      hotelId,
        [FromQuery] DateOnly checkIn,
        [FromQuery] DateOnly checkOut)
    {
        if (hotelId <= 0) return BadRequest(new { message = "hotelId is required." });
        if (checkOut <= checkIn) return BadRequest(new { message = "checkOut must be after checkIn." });

        // Rooms that have an overlapping active reservation
        var bookedRoomIds = await _db.Reservations
            .Where(r => r.HotelId == hotelId
                && r.Status != "Cancelled" && r.Status != "CheckedOut"
                && r.CheckInDate < checkOut && r.CheckOutDate > checkIn)
            .Select(r => r.RoomId)
            .Distinct()
            .ToListAsync();

        var rooms = await _db.Rooms
            .Include(r => r.RoomType)
            .Where(r => r.HotelId == hotelId
                && r.Status != "OutOfService"
                && r.Status != "Maintenance"
                && !bookedRoomIds.Contains(r.RoomId))
            .OrderBy(r => r.RoomNumber)
            .ToListAsync();

        return Ok(rooms.Select(r => ToResponse(r)).ToList());
    }

    // ── GET api/rooms/types?hotelId=1 ────────────────────
    [HttpGet("types")]
    public async Task<IActionResult> GetRoomTypes([FromQuery] int hotelId)
    {
        if (hotelId <= 0) return BadRequest(new { message = "hotelId is required." });

        var types = await _db.RoomTypes
            .Where(rt => rt.HotelId == hotelId)
            .Select(rt => new RoomTypeResponse
            {
                RoomTypeId  = rt.RoomTypeId,
                HotelId     = rt.HotelId,
                Name        = rt.Name,
                Description = rt.Description,
                BasePrice   = rt.BasePrice,
                Capacity    = rt.Capacity,
            })
            .ToListAsync();

        return Ok(types);
    }

    // ── POST api/rooms/types ─────────────────────────────
    [Authorize(Roles = "Admin")]
    [HttpPost("types")]
    public async Task<IActionResult> CreateRoomType([FromBody] RoomTypeResponse req)
    {
        if (!await _db.Hotels.AnyAsync(h => h.HotelId == req.HotelId && h.IsActive))
            return BadRequest(new { message = "Hotel not found." });

        var rt = new RoomType
        {
            HotelId     = req.HotelId,
            Name        = req.Name,
            Description = req.Description,
            BasePrice   = req.BasePrice,
            Capacity    = req.Capacity,
        };
        _db.RoomTypes.Add(rt);
        await _db.SaveChangesAsync();

        return Ok(new RoomTypeResponse
        {
            RoomTypeId  = rt.RoomTypeId,
            HotelId     = rt.HotelId,
            Name        = rt.Name,
            Description = rt.Description,
            BasePrice   = rt.BasePrice,
            Capacity    = rt.Capacity,
        });
    }

    // ── helper ───────────────────────────────────────────
    private static RoomResponse ToResponse(Room r) => new()
    {
        RoomId         = r.RoomId,
        HotelId        = r.HotelId,
        HotelName      = r.Hotel?.HotelName,
        RoomTypeId     = r.RoomTypeId,
        RoomTypeName   = r.RoomType?.Name ?? string.Empty,
        RoomNumber     = r.RoomNumber,
        Status         = r.Status,
        PriceOverride  = r.Price,
        BasePrice      = r.RoomType?.BasePrice ?? 0,
        EffectivePrice = r.Price ?? r.RoomType?.BasePrice ?? 0,
        Capacity       = r.RoomType?.Capacity ?? 1,
        // Floor derived from first digit(s) before the last 2 chars: "101" → "Floor 1"
        Floor          = DeriveFloor(r.RoomNumber),
    };

    private static string DeriveFloor(string roomNumber)
    {
        if (roomNumber.Length >= 3 && int.TryParse(roomNumber[..^2], out var f))
            return $"Floor {f}";
        return "Floor 1";
    }
}
