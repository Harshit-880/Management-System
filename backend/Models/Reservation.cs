namespace HotelManagement.API.Models;

public class Reservation
{
    public int      ReservationId { get; set; }
    public int      HotelId       { get; set; }
    public int      GuestId       { get; set; }
    public int      RoomId        { get; set; }
    public DateOnly CheckInDate   { get; set; }
    public DateOnly CheckOutDate  { get; set; }
    /// <summary>Pending | Confirmed | CheckedIn | CheckedOut | Cancelled</summary>
    public string   Status        { get; set; } = "Pending";
    public decimal  TotalAmount   { get; set; }

    public Hotel      Hotel     { get; set; } = null!;
    public Guest      Guest     { get; set; } = null!;
    public Room       Room      { get; set; } = null!;
    public GuestStay? GuestStay { get; set; }
    public ICollection<AdditionalGuest> AdditionalGuests { get; set; } = new List<AdditionalGuest>();
}
