namespace HotelManagement.API.DTOs;

public class CreatePaymentRequest
{
    public int     ReservationId { get; set; }
    public decimal Amount        { get; set; }
    public string? PaymentMethod { get; set; }
}

public class RefundPaymentRequest
{
    public decimal Amount { get; set; }
    public string? Reason { get; set; }
}

public class PaymentResponse
{
    public int       PaymentId     { get; set; }
    public int       ReservationId { get; set; }
    public int?      HotelId       { get; set; }
    public string?   HotelName     { get; set; }
    public int       StayId        { get; set; }
    public string     GuestName     { get; set; } = string.Empty;
    public string?    RoomNumber    { get; set; }
    public decimal    Amount        { get; set; }
    public string?    PaymentMethod { get; set; }
    /// <summary>Pending | Completed | Refunded | Failed</summary>
    public string     Status        { get; set; } = string.Empty;
    public DateTime?   PaidAt        { get; set; }
}

/// <summary>Reservation-wise rollup of payments received/refunded — powers the
/// "Guest payments / Pending / Completed / Outstanding" views.</summary>
public class ReservationPaymentSummary
{
    public int       ReservationId     { get; set; }
    public int?      HotelId           { get; set; }
    public string?   HotelName         { get; set; }
    public string    GuestName         { get; set; } = string.Empty;
    public string?   GuestPhone        { get; set; }
    public string?   GuestEmail        { get; set; }
    public string    RoomNumber        { get; set; } = string.Empty;
    public string    RoomTypeName      { get; set; } = string.Empty;
    public string    ReservationStatus { get; set; } = string.Empty;
    public DateOnly  CheckInDate       { get; set; }
    public DateOnly  CheckOutDate      { get; set; }
    public decimal   TotalAmount       { get; set; }
    public decimal   AmountPaid        { get; set; }
    public decimal   AmountRefunded    { get; set; }
    public decimal   OutstandingAmount { get; set; }
    /// <summary>Pending | Partial | Completed</summary>
    public string    PaymentStatus     { get; set; } = "Pending";
}
