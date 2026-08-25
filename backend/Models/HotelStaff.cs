namespace HotelManagement.API.Models;

public class HotelStaff
{
    public int HotelStaffId { get; set; }
    public int HotelId { get; set; }
    public int UserId { get; set; }
    public int RoleId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Hotel Hotel { get; set; } = null!;
    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
