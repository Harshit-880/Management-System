namespace HotelManagement.API.Models;

public class RoomType
{
    public int     RoomTypeId  { get; set; }
    public int     HotelId     { get; set; }
    public string  Name        { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Default price for all rooms of this type.</summary>
    public decimal BasePrice   { get; set; }
    public int     Capacity    { get; set; } = 1;

    public Hotel             Hotel { get; set; } = null!;
    public ICollection<Room> Rooms { get; set; } = new List<Room>();
}
