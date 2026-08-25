namespace HotelManagement.API.Models;

public class GuestStay
{
    public int       StayId        { get; set; }
    public int       ReservationId { get; set; }
    public string?   AccessToken   { get; set; }
    public DateTime? CheckInAt     { get; set; }
    public DateTime? CheckOutAt    { get; set; }
    /// <summary>Active | CheckedOut</summary>
    public string    Status        { get; set; } = "Active";

    public Reservation Reservation { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
