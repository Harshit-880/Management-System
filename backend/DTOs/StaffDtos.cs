using System.ComponentModel.DataAnnotations;

namespace HotelManagement.API.DTOs;

public class CreateStaffRequest
{
    [Required, MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(50)]
    public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;
    public string? Phone { get; set; }
    [Required]
    public int HotelId { get; set; }
    [Required]
    public int RoleId { get; set; }
}

public class UpdateStaffRequest
{
    [Required]
    public int RoleId { get; set; }
    public bool IsActive { get; set; } = true;
    // Optional profile fields — only updated when provided (non-null).
    public string? FirstName { get; set; }
    public string? LastName  { get; set; }
    public string? Phone     { get; set; }
}

public class StaffResponse
{
    public int HotelStaffId { get; set; }
    public int UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public string HotelName { get; set; } = string.Empty;
    public int HotelId { get; set; }
    public bool IsActive { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class RoleDto
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
}
