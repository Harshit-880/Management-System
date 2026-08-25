namespace HotelManagement.API.Models;

public class AdditionalGuest
{
    public int     AdditionalGuestId { get; set; }
    public int     ReservationId     { get; set; }
    public string  FullName          { get; set; } = string.Empty;
    public string? IdType            { get; set; }
    public string? IdNumber          { get; set; }

    public Reservation Reservation { get; set; } = null!;
}
