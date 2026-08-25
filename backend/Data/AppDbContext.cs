using HotelManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelManagement.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User>      Users      => Set<User>();
    public DbSet<Role>      Roles      => Set<Role>();
    public DbSet<UserRole>  UserRoles  => Set<UserRole>();
    public DbSet<Hotel>     Hotels     => Set<Hotel>();
    public DbSet<HotelStaff> HotelStaff => Set<HotelStaff>();
    public DbSet<RoomType>   RoomTypes   => Set<RoomType>();
    public DbSet<Room>        Rooms       => Set<Room>();
    public DbSet<Guest>          Guests          => Set<Guest>();
    public DbSet<Reservation>    Reservations    => Set<Reservation>();
    public DbSet<GuestStay>      GuestStays      => Set<GuestStay>();
    public DbSet<AdditionalGuest> AdditionalGuests => Set<AdditionalGuest>();
    public DbSet<ServiceRequest> ServiceRequests => Set<ServiceRequest>();
    public DbSet<Payment>        Payments        => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Seed default roles
        modelBuilder.Entity<Role>().HasData(
            new Role { RoleId = 1, RoleName = "Admin",        Description = "Full system access" },
            new Role { RoleId = 2, RoleName = "Manager",      Description = "Hotel management access" },
            new Role { RoleId = 3, RoleName = "Staff",        Description = "Limited operational access" },
            new Role { RoleId = 4, RoleName = "Receptionist", Description = "Front desk operations" },
            new Role { RoleId = 5, RoleName = "Housekeeping", Description = "Room maintenance and cleaning" },
            new Role { RoleId = 6, RoleName = "Accountant",   Description = "Financial and billing operations" }
        );

        // UserRole composite PK
        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        // Map to existing SQL table names
        modelBuilder.Entity<User>().ToTable("Users");
        modelBuilder.Entity<Role>().ToTable("Roles");
        modelBuilder.Entity<UserRole>().ToTable("UserRoles");
        modelBuilder.Entity<Hotel>().ToTable("Hotels");
        modelBuilder.Entity<HotelStaff>().ToTable("HotelStaff");

        modelBuilder.Entity<User>().HasKey(u => u.UserId);
        modelBuilder.Entity<Role>().HasKey(r => r.RoleId);
        modelBuilder.Entity<Hotel>().HasKey(h => h.HotelId);
        modelBuilder.Entity<HotelStaff>().HasKey(hs => hs.HotelStaffId);

        modelBuilder.Entity<Hotel>()
            .HasOne(h => h.CreatedBy)
            .WithMany()
            .HasForeignKey(h => h.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HotelStaff>()
            .HasOne(hs => hs.Hotel)
            .WithMany()
            .HasForeignKey(hs => hs.HotelId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HotelStaff>()
            .HasOne(hs => hs.User)
            .WithMany()
            .HasForeignKey(hs => hs.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HotelStaff>()
            .HasOne(hs => hs.Role)
            .WithMany()
            .HasForeignKey(hs => hs.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        // RoomType
        modelBuilder.Entity<RoomType>().ToTable("RoomTypes");
        modelBuilder.Entity<RoomType>().HasKey(rt => rt.RoomTypeId);
        modelBuilder.Entity<RoomType>()
            .HasOne(rt => rt.Hotel)
            .WithMany(h => h.RoomTypes)
            .HasForeignKey(rt => rt.HotelId)
            .OnDelete(DeleteBehavior.Cascade);

        // Room — Price is nullable (override); Status has default
        modelBuilder.Entity<Room>().ToTable("Rooms");
        modelBuilder.Entity<Room>().HasKey(r => r.RoomId);
        modelBuilder.Entity<Room>()
            .Property(r => r.Price)
            .IsRequired(false);
        modelBuilder.Entity<Room>()
            .HasOne(r => r.Hotel)
            .WithMany()
            .HasForeignKey(r => r.HotelId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Room>()
            .HasOne(r => r.RoomType)
            .WithMany(rt => rt.Rooms)
            .HasForeignKey(r => r.RoomTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Guest
        modelBuilder.Entity<Guest>().ToTable("Guests");
        modelBuilder.Entity<Guest>().HasKey(g => g.GuestId);
        modelBuilder.Entity<Guest>()
            .HasOne(g => g.User)
            .WithMany()
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Reservation
        modelBuilder.Entity<Reservation>().ToTable("Reservations");
        modelBuilder.Entity<Reservation>().HasKey(r => r.ReservationId);
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Hotel)
            .WithMany()
            .HasForeignKey(r => r.HotelId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Guest)
            .WithMany(g => g.Reservations)
            .HasForeignKey(r => r.GuestId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Reservation>()
            .HasOne(r => r.Room)
            .WithMany()
            .HasForeignKey(r => r.RoomId)
            .OnDelete(DeleteBehavior.Restrict);

        // GuestStay — 1-to-1 with Reservation
        modelBuilder.Entity<GuestStay>().ToTable("GuestStays");
        modelBuilder.Entity<GuestStay>().HasKey(gs => gs.StayId);
        modelBuilder.Entity<GuestStay>()
            .HasOne(gs => gs.Reservation)
            .WithOne(r => r.GuestStay)
            .HasForeignKey<GuestStay>(gs => gs.ReservationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Payment — FK column is StayId (not the EF-conventional "GuestStayStayId")
        modelBuilder.Entity<Payment>().ToTable("Payments");
        modelBuilder.Entity<Payment>().HasKey(p => p.PaymentId);
        modelBuilder.Entity<Payment>()
            .HasOne(p => p.GuestStay)
            .WithMany(gs => gs.Payments)
            .HasForeignKey(p => p.StayId)
            .OnDelete(DeleteBehavior.Restrict);

        // ServiceRequest
        modelBuilder.Entity<ServiceRequest>().ToTable("ServiceRequests");
        modelBuilder.Entity<ServiceRequest>().HasKey(sr => sr.ServiceRequestId);
        modelBuilder.Entity<ServiceRequest>()
            .HasOne(sr => sr.Hotel)
            .WithMany()
            .HasForeignKey(sr => sr.HotelId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ServiceRequest>()
            .HasOne(sr => sr.Room)
            .WithMany()
            .HasForeignKey(sr => sr.RoomId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<ServiceRequest>()
            .HasOne(sr => sr.Guest)
            .WithMany()
            .HasForeignKey(sr => sr.GuestId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<ServiceRequest>()
            .HasOne(sr => sr.AssignedTo)
            .WithMany()
            .HasForeignKey(sr => sr.AssignedToUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        // AdditionalGuest
        modelBuilder.Entity<AdditionalGuest>().ToTable("AdditionalGuests");
        modelBuilder.Entity<AdditionalGuest>().HasKey(ag => ag.AdditionalGuestId);
        modelBuilder.Entity<AdditionalGuest>()
            .HasOne(ag => ag.Reservation)
            .WithMany(r => r.AdditionalGuests)
            .HasForeignKey(ag => ag.ReservationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
