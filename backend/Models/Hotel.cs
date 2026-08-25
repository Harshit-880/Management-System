namespace HotelManagement.API.Models;

public class Hotel
{
    public int HotelId { get; set; }
    public int CreatedByUserId { get; set; }
    public string HotelName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Currency { get; set; } = "USD";
    public string? TimeZone { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public string? Policies { get; set; }
    public bool IsActive { get; set; } = true;

    public User CreatedBy { get; set; } = null!;    public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();}
