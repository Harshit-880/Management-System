namespace HotelManagement.API.Models;

public class Guest
{
    public int     GuestId              { get; set; }
    public int?    UserId               { get; set; }
    public string  FirstName            { get; set; } = string.Empty;
    public string  LastName             { get; set; } = string.Empty;
    public string? Phone                { get; set; }
    public string? Email                { get; set; }
    public string? IdentificationType   { get; set; }
    public string? IdentificationNumber { get; set; }
    public string? Notes                { get; set; }

    public User?   User         { get; set; }
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
