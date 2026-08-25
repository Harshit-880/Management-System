namespace HotelManagement.API.DTOs;

public class GuestResponse
{
    public int     GuestId           { get; set; }
    public int?    HotelId           { get; set; }
    public string? HotelName         { get; set; }
    public string  FullName          { get; set; } = string.Empty;
    public string? Phone             { get; set; }
    public string? Email             { get; set; }
    public string? IdType            { get; set; }
    public string? IdNumber          { get; set; }
    // Current / latest reservation for this hotel
    public int?     ReservationId     { get; set; }
    public string?  RoomNumber        { get; set; }
    public string?  RoomTypeName      { get; set; }
    public DateOnly? CheckInDate      { get; set; }
    public DateOnly? CheckOutDate     { get; set; }
    public string?  ReservationStatus { get; set; }
    public decimal? TotalAmount       { get; set; }
    public int?     Nights            { get; set; }
    public string?  AccessToken       { get; set; }
    // Aggregates across all stays at this hotel
    public int      TotalStays        { get; set; }
    public decimal  TotalSpend        { get; set; }
    public DateOnly? FirstStayDate    { get; set; }
    // Co-occupant flag (kept for forward-compat; not used in nested approach)
    public bool    IsAdditionalGuest { get; set; }
    public int?    AdditionalGuestId { get; set; }
    public string? PrimaryGuestName  { get; set; }
    // Internal notes staff can leave about this guest (preferences, flags, etc.)
    public string? Notes              { get; set; }
    // Co-occupants sharing this room in the highlight reservation
    public List<CoOccupantInfo> CoOccupants { get; set; } = new();
}

public class UpdateGuestNotesRequest
{
    public string? Notes { get; set; }
}

public class CoOccupantInfo
{
    public int     AdditionalGuestId { get; set; }
    public string  FullName          { get; set; } = string.Empty;
    public string? IdType            { get; set; }
    public string? IdNumber          { get; set; }
}
