using System.ComponentModel.DataAnnotations;

namespace HotelManagement.API.DTOs;

public class CreateHotelRequest
{
    [Required, MaxLength(150)]
    public string HotelName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";
    public string? TimeZone { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public string? Policies { get; set; }
}

public class HotelResponse
{
    public int HotelId { get; set; }
    public string HotelName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? TimeZone { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public string? Policies { get; set; }
    public bool IsActive { get; set; }
    public int CreatedByUserId { get; set; }
}
