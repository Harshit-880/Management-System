namespace HotelManagement.API.Models;

public class Payment
{
    public int       PaymentId     { get; set; }
    public int       StayId        { get; set; }
    public decimal   Amount        { get; set; }
    public string?   PaymentMethod { get; set; }
    /// <summary>Pending | Completed | Refunded | Failed</summary>
    public string    Status        { get; set; } = "Pending";
    public DateTime? PaidAt        { get; set; }

    public GuestStay GuestStay { get; set; } = null!;
}
