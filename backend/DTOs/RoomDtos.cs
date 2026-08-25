using System.ComponentModel.DataAnnotations;

namespace HotelManagement.API.DTOs;

// ── RoomType ──────────────────────────────────────────────
public class RoomTypeResponse
{
    public int     RoomTypeId  { get; set; }
    public int     HotelId     { get; set; }
    public string  Name        { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice   { get; set; }
    public int     Capacity    { get; set; }
}

// ── Room ──────────────────────────────────────────────────
public class CreateRoomRequest
{
    [Required] public int    HotelId    { get; set; }
    [Required] public int    RoomTypeId { get; set; }
    [Required] public string RoomNumber { get; set; } = string.Empty;
    /// <summary>Null → use RoomType.BasePrice as effective price.</summary>
    public decimal? Price { get; set; }
    public string   Floor { get; set; } = "Floor 1";
}

public class BulkCreateRoomRequest
{
    [Required] public int    HotelId     { get; set; }
    [Required] public int    RoomTypeId  { get; set; }
    [Required] public int    FloorNumber { get; set; }
    public string  Prefix      { get; set; } = string.Empty;
    [Range(1, 999)] public int StartFrom { get; set; } = 1;
    [Range(1, 100)] public int Count     { get; set; } = 1;
}

public class UpdateRoomRequest
{
    [Required] public string Status { get; set; } = "Available";
    public decimal? Price { get; set; }
}

public class RoomResponse
{
    public int     RoomId        { get; set; }
    public int     HotelId       { get; set; }
    public string? HotelName     { get; set; }
    public int     RoomTypeId    { get; set; }
    public string  RoomTypeName  { get; set; } = string.Empty;
    public string  RoomNumber    { get; set; } = string.Empty;
    public string  Status        { get; set; } = string.Empty;
    /// <summary>Effective price: room override if set, otherwise type base price.</summary>
    public decimal EffectivePrice { get; set; }
    public decimal? PriceOverride { get; set; }
    public decimal BasePrice      { get; set; }
    public int     Capacity       { get; set; }
    public string  Floor          { get; set; } = string.Empty;
}
