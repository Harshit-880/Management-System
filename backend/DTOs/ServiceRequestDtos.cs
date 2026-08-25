namespace HotelManagement.API.DTOs;

public record CreateServiceRequestRequest(
    int     HotelId,
    int?    RoomId,
    int?    GuestId,
    string  Department,
    string  Title,
    string? Description
);

public record AssignServiceRequestRequest(int AssignedToUserId);

public record ServiceRequestResponse(
    int       RequestId,
    int       HotelId,
    string?   HotelName,
    int?      RoomId,
    string?   RoomNumber,
    string?   RoomTypeName,
    int?      GuestId,
    string?   GuestName,
    string    Department,
    string    Title,
    string?   Description,
    string    Status,
    int?      AssignedToUserId,
    string?   AssignedToName,
    DateTime  CreatedAt,
    string    TimeAgo
);
