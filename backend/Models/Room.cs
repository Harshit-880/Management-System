namespace HotelManagement.API.Models;

/// <summary>
/// Room.Price is an OPTIONAL override of RoomType.BasePrice.
/// If null → the effective price is RoomType.BasePrice.
/// This lets one "Deluxe Suite" type have rooms priced differently
/// (e.g. corner room premium, sea-view surcharge).
/// </summary>
public class Room
{
    public int     RoomId     { get; set; }
    public int     HotelId    { get; set; }
    public int     RoomTypeId { get; set; }
    public string  RoomNumber { get; set; } = string.Empty;
    /// <summary>Available | Occupied | Dirty | Maintenance | OutOfService</summary>
    public string  Status     { get; set; } = "Available";
    /// <summary>Per-room price override. Null means use RoomType.BasePrice.</summary>
    public decimal? Price     { get; set; }

    public Hotel    Hotel    { get; set; } = null!;
    public RoomType RoomType { get; set; } = null!;
}
