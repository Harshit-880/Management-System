namespace HotelManagement.API.Models;

public class ServiceRequest
{
    public int     ServiceRequestId  { get; set; }
    public int     HotelId           { get; set; }
    public int?    RoomId            { get; set; }
    public int?    GuestId           { get; set; }

    /// <summary>Housekeeping | RoomService | Maintenance | Other</summary>
    public string  Department        { get; set; } = "Other";

    public string  Title             { get; set; } = string.Empty;
    public string? Description       { get; set; }

    /// <summary>Pending | Assigned | InProgress | Completed | Archived</summary>
    public string  Status            { get; set; } = "Pending";

    public int?    AssignedToUserId  { get; set; }
    public DateTime CreatedAt        { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt       { get; set; }

    // ── Navigation ──────────────────────────────────────────────
    public Hotel?  Hotel      { get; set; }
    public Room?   Room       { get; set; }
    public Guest?  Guest      { get; set; }
    public User?   AssignedTo { get; set; }
}
