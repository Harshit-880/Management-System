using System.ComponentModel.DataAnnotations;

namespace HotelManagement.API.DTOs;

// ── Create ────────────────────────────────────────────────
public class CreateReservationRequest
{
    [Required] public int    HotelId        { get; set; }
    [Required] public int    RoomId         { get; set; }
    [Required] public string GuestFirstName { get; set; } = string.Empty;
    [Required] public string GuestLastName  { get; set; } = string.Empty;
    public string? GuestPhone  { get; set; }
    public string? GuestEmail  { get; set; }
    public string? IdType      { get; set; }
    public string? IdNumber    { get; set; }
    [Required] public DateOnly CheckInDate  { get; set; }
    [Required] public DateOnly CheckOutDate { get; set; }
    public decimal? TotalAmount { get; set; }
    public List<AdditionalGuestRequest> AdditionalGuests { get; set; } = new();
}

// ── Response ──────────────────────────────────────────────
public class ReservationResponse
{
    public int      ReservationId { get; set; }
    public int      HotelId       { get; set; }
    public string?  HotelName     { get; set; }
    public int      GuestId       { get; set; }
    public string   GuestName     { get; set; } = string.Empty;
    public string?  GuestPhone    { get; set; }
    public string?  GuestEmail    { get; set; }
    public int      RoomId        { get; set; }
    public string   RoomNumber    { get; set; } = string.Empty;
    public string   RoomTypeName  { get; set; } = string.Empty;
    public string   Floor         { get; set; } = string.Empty;
    public DateOnly CheckInDate   { get; set; }
    public DateOnly CheckOutDate  { get; set; }
    public string   Status        { get; set; } = string.Empty;
    public decimal  TotalAmount   { get; set; }
    public int      Nights        { get; set; }
    public DateTime? CheckedInAt  { get; set; }
    public DateTime? CheckedOutAt { get; set; }
    public string?   AccessToken  { get; set; }  // guest portal token
    public int       AdditionalGuestCount { get; set; }
}

// ── Additional guest (co-occupant) ───────────────────────────
public class AdditionalGuestRequest
{
    [Required, MaxLength(200)]
    public string  FullName { get; set; } = string.Empty;
    public string? IdType   { get; set; }
    public string? IdNumber { get; set; }
}

// ── Update (modify dates / amount) ────────────────────────────
public class UpdateReservationRequest
{
    public DateOnly  CheckInDate  { get; set; }
    public DateOnly  CheckOutDate { get; set; }
    public decimal?  TotalAmount  { get; set; }
}

// ── Change Room ───────────────────────────────────────────────
public class ChangeRoomRequest
{
    [Required] public int RoomId { get; set; }
}
