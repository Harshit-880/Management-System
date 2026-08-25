-- =============================================
-- HotelManagementSystem — Full Schema
-- =============================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'HotelManagementSystem')
BEGIN
    CREATE DATABASE HotelManagementSystem;
    PRINT 'Database HotelManagementSystem created.';
END
GO

USE HotelManagementSystem;
GO

-- =============================================
-- 1. ROLES
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Roles' AND xtype='U')
BEGIN
    CREATE TABLE Roles (
        RoleId      INT IDENTITY(1,1) PRIMARY KEY,
        RoleName    NVARCHAR(50)  NOT NULL UNIQUE,
        Description NVARCHAR(200) NULL
    );
    PRINT 'Roles table created.';
END
GO

-- =============================================
-- 2. USERS
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
    CREATE TABLE Users (
        UserId       INT IDENTITY(1,1) PRIMARY KEY,
        Email        NVARCHAR(100) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        FirstName    NVARCHAR(50)  NOT NULL,
        LastName     NVARCHAR(50)  NOT NULL,
        Phone        NVARCHAR(20)  NULL,
        IsActive     BIT           NOT NULL DEFAULT 1,
        CreatedAt    DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'Users table created.';
END
GO

-- =============================================
-- 3. USER_ROLES  (junction)
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserRoles' AND xtype='U')
BEGIN
    CREATE TABLE UserRoles (
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        CONSTRAINT PK_UserRoles         PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_Users   FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Roles   FOREIGN KEY (RoleId) REFERENCES Roles(RoleId) ON DELETE CASCADE
    );
    PRINT 'UserRoles table created.';
END
GO

-- =============================================
-- 4. HOTELS
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Hotels' AND xtype='U')
BEGIN
    CREATE TABLE Hotels (
        HotelId         INT IDENTITY(1,1) PRIMARY KEY,
        CreatedByUserId INT           NOT NULL,
        HotelName       NVARCHAR(150) NOT NULL,
        Address         NVARCHAR(255) NULL,
        City            NVARCHAR(100) NULL,
        Country         NVARCHAR(100) NULL,
        Phone           NVARCHAR(30)  NULL,
        Email           NVARCHAR(100) NULL,
        Currency        NVARCHAR(10)  NOT NULL DEFAULT 'USD',
        TimeZone        NVARCHAR(100) NULL,
        CheckInTime     NVARCHAR(20)  NULL,
        CheckOutTime    NVARCHAR(20)  NULL,
        Policies        NVARCHAR(MAX) NULL,
        IsActive        BIT           NOT NULL DEFAULT 1,
        CONSTRAINT FK_Hotels_Users FOREIGN KEY (CreatedByUserId) REFERENCES Users(UserId)
    );
    PRINT 'Hotels table created.';
END
GO

-- Additive migration for existing databases created before CheckInTime/CheckOutTime/Policies existed.
IF COL_LENGTH('Hotels', 'CheckInTime') IS NULL
BEGIN
    ALTER TABLE Hotels ADD CheckInTime NVARCHAR(20) NULL;
    PRINT 'Hotels.CheckInTime column added.';
END
GO
IF COL_LENGTH('Hotels', 'CheckOutTime') IS NULL
BEGIN
    ALTER TABLE Hotels ADD CheckOutTime NVARCHAR(20) NULL;
    PRINT 'Hotels.CheckOutTime column added.';
END
GO
IF COL_LENGTH('Hotels', 'Policies') IS NULL
BEGIN
    ALTER TABLE Hotels ADD Policies NVARCHAR(MAX) NULL;
    PRINT 'Hotels.Policies column added.';
END
GO

-- =============================================
-- 5. HOTEL_STAFF
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='HotelStaff' AND xtype='U')
BEGIN
    CREATE TABLE HotelStaff (
        HotelStaffId INT IDENTITY(1,1) PRIMARY KEY,
        HotelId      INT      NOT NULL,
        UserId       INT      NOT NULL,
        RoleId       INT      NOT NULL,
        IsActive     BIT      NOT NULL DEFAULT 1,
        JoinedAt     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_HotelStaff_Hotels FOREIGN KEY (HotelId) REFERENCES Hotels(HotelId) ON DELETE CASCADE,
        CONSTRAINT FK_HotelStaff_Users  FOREIGN KEY (UserId)  REFERENCES Users(UserId),
        CONSTRAINT FK_HotelStaff_Roles  FOREIGN KEY (RoleId)  REFERENCES Roles(RoleId)
    );
    PRINT 'HotelStaff table created.';
END
GO

-- =============================================
-- 6. ROOM_TYPES
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RoomTypes' AND xtype='U')
BEGIN
    CREATE TABLE RoomTypes (
        RoomTypeId  INT IDENTITY(1,1) PRIMARY KEY,
        HotelId     INT            NOT NULL,
        Name        NVARCHAR(100)  NOT NULL,
        Description NVARCHAR(500)  NULL,
        BasePrice   DECIMAL(10,2)  NOT NULL DEFAULT 0,
        Capacity    INT            NOT NULL DEFAULT 1,
        CONSTRAINT FK_RoomTypes_Hotels FOREIGN KEY (HotelId) REFERENCES Hotels(HotelId) ON DELETE CASCADE
    );
    PRINT 'RoomTypes table created.';
END
GO

-- =============================================
-- 7. ROOMS
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Rooms' AND xtype='U')
BEGIN
    CREATE TABLE Rooms (
        RoomId     INT IDENTITY(1,1) PRIMARY KEY,
        HotelId    INT           NOT NULL,
        RoomTypeId INT           NOT NULL,
        RoomNumber NVARCHAR(20)  NOT NULL,
        Status     NVARCHAR(30)  NOT NULL DEFAULT 'Available',  -- Available | Occupied | Maintenance | OutOfService
        Price      DECIMAL(10,2) NULL,                          -- NULL = use RoomType.BasePrice as effective price
        CONSTRAINT FK_Rooms_Hotels    FOREIGN KEY (HotelId)    REFERENCES Hotels(HotelId) ON DELETE CASCADE,
        CONSTRAINT FK_Rooms_RoomTypes FOREIGN KEY (RoomTypeId) REFERENCES RoomTypes(RoomTypeId)
    );
    PRINT 'Rooms table created.';
END
GO

-- =============================================
-- 8. GUESTS
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Guests' AND xtype='U')
BEGIN
    CREATE TABLE Guests (
        GuestId                INT IDENTITY(1,1) PRIMARY KEY,
        UserId                 INT           NULL,
        FirstName              NVARCHAR(50)  NOT NULL,
        LastName               NVARCHAR(50)  NOT NULL,
        Phone                  NVARCHAR(30)  NULL,
        Email                  NVARCHAR(100) NULL,
        IdentificationType     NVARCHAR(50)  NULL,
        IdentificationNumber   NVARCHAR(100) NULL,
        Notes                  NVARCHAR(MAX) NULL,
        CONSTRAINT FK_Guests_Users FOREIGN KEY (UserId) REFERENCES Users(UserId)
    );
    PRINT 'Guests table created.';
END
GO

-- =============================================
-- 9. RESERVATIONS
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Reservations' AND xtype='U')
BEGIN
    CREATE TABLE Reservations (
        ReservationId INT IDENTITY(1,1) PRIMARY KEY,
        HotelId       INT           NOT NULL,
        GuestId       INT           NOT NULL,
        RoomId        INT           NOT NULL,
        CheckInDate   DATE          NOT NULL,
        CheckOutDate  DATE          NOT NULL,
        Status        NVARCHAR(30)  NOT NULL DEFAULT 'Pending',  -- Pending | Confirmed | CheckedIn | CheckedOut | Cancelled
        TotalAmount   DECIMAL(10,2) NOT NULL DEFAULT 0,
        CONSTRAINT FK_Reservations_Hotels FOREIGN KEY (HotelId) REFERENCES Hotels(HotelId),
        CONSTRAINT FK_Reservations_Guests FOREIGN KEY (GuestId) REFERENCES Guests(GuestId),
        CONSTRAINT FK_Reservations_Rooms  FOREIGN KEY (RoomId)  REFERENCES Rooms(RoomId)
    );
    PRINT 'Reservations table created.';
END
GO

-- =============================================
-- 10. GUEST_STAYS
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GuestStays' AND xtype='U')
BEGIN
    CREATE TABLE GuestStays (
        StayId        INT IDENTITY(1,1) PRIMARY KEY,
        ReservationId INT           NOT NULL UNIQUE,
        AccessToken   NVARCHAR(255) NULL,
        CheckInAt     DATETIME2     NULL,
        CheckOutAt    DATETIME2     NULL,
        Status        NVARCHAR(30)  NOT NULL DEFAULT 'Active',  -- Active | CheckedOut
        CONSTRAINT FK_GuestStays_Reservations FOREIGN KEY (ReservationId) REFERENCES Reservations(ReservationId) ON DELETE CASCADE
    );
    PRINT 'GuestStays table created.';
END
GO

-- =============================================
-- 11. SERVICE_TYPES
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ServiceTypes' AND xtype='U')
BEGIN
    CREATE TABLE ServiceTypes (
        ServiceTypeId INT IDENTITY(1,1) PRIMARY KEY,
        Name          NVARCHAR(100) NOT NULL UNIQUE,
        Description   NVARCHAR(500) NULL,
        IsActive      BIT           NOT NULL DEFAULT 1
    );
    PRINT 'ServiceTypes table created.';
END
GO

-- =============================================
-- 12. SERVICE_REQUESTS
-- =============================================
-- Note: if you previously created this table with the old schema
-- (StayId / ServiceTypeId columns), run first:
--   DROP TABLE ServiceRequests;
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ServiceRequests' AND xtype='U')
BEGIN
    CREATE TABLE ServiceRequests (
        ServiceRequestId INT IDENTITY(1,1) PRIMARY KEY,
        HotelId          INT            NOT NULL,
        RoomId           INT            NULL,
        GuestId          INT            NULL,
        Department       NVARCHAR(50)   NOT NULL DEFAULT 'Other',   -- Housekeeping | RoomService | Maintenance | Other
        Title            NVARCHAR(200)  NOT NULL,
        Description      NVARCHAR(1000) NULL,
        Status           NVARCHAR(50)   NOT NULL DEFAULT 'Pending', -- Pending | Assigned | InProgress | Completed | Archived
        AssignedToUserId INT            NULL,
        CreatedAt        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt        DATETIME2      NULL,
        CONSTRAINT FK_ServiceRequests_Hotels FOREIGN KEY (HotelId) REFERENCES Hotels(HotelId) ON DELETE CASCADE
    );
    PRINT 'ServiceRequests table created.';
END
GO

-- =============================================
-- 13. PAYMENTS
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Payments' AND xtype='U')
BEGIN
    CREATE TABLE Payments (
        PaymentId     INT IDENTITY(1,1) PRIMARY KEY,
        StayId        INT           NOT NULL,
        Amount        DECIMAL(10,2) NOT NULL,
        PaymentMethod NVARCHAR(50)  NULL,  -- Cash | Card | Online | etc.
        Status        NVARCHAR(30)  NOT NULL DEFAULT 'Pending',  -- Pending | Completed | Refunded | Failed
        PaidAt        DATETIME2     NULL,
        CONSTRAINT FK_Payments_GuestStays FOREIGN KEY (StayId) REFERENCES GuestStays(StayId)
    );
    PRINT 'Payments table created.';
END
GO

-- =============================================
-- Seed: default roles
-- =============================================
IF NOT EXISTS (SELECT 1 FROM Roles)
BEGIN
    INSERT INTO Roles (RoleName, Description) VALUES
        ('Admin',        'Full system access'),
        ('Manager',      'Hotel management access'),
        ('Staff',        'Limited operational access'),
        ('Receptionist', 'Front desk operations'),
        ('Housekeeping', 'Room maintenance and cleaning'),
        ('Accountant',   'Financial and billing operations');
    PRINT 'Default roles seeded.';
END
ELSE
BEGIN
    -- Add missing roles if they were seeded without them
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Receptionist')
        INSERT INTO Roles (RoleName, Description) VALUES ('Receptionist', 'Front desk operations');
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Housekeeping')
        INSERT INTO Roles (RoleName, Description) VALUES ('Housekeeping', 'Room maintenance and cleaning');
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Accountant')
        INSERT INTO Roles (RoleName, Description) VALUES ('Accountant', 'Financial and billing operations');
END
GO

-- =============================================
-- Seed: default service types
-- =============================================
IF NOT EXISTS (SELECT 1 FROM ServiceTypes)
BEGIN
    INSERT INTO ServiceTypes (Name, Description) VALUES
        ('Room Cleaning',    'Standard room cleaning service'),
        ('Room Service',     'Food and beverage delivery to room'),
        ('Maintenance',      'Technical repair and maintenance'),
        ('Laundry',          'Laundry and dry cleaning'),
        ('Concierge',        'Guest assistance and information');
    PRINT 'Default service types seeded.';
END
GO

PRINT '=== All tables created successfully ===';



-- =============================================
-- Day 17 August 2026 — seed missing roles
-- =============================================

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Receptionist')
    INSERT INTO Roles (RoleName, Description) VALUES ('Receptionist', 'Front desk operations');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Housekeeping')
    INSERT INTO Roles (RoleName, Description) VALUES ('Housekeeping', 'Room maintenance and cleaning');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Accountant')
    INSERT INTO Roles (RoleName, Description) VALUES ('Accountant', 'Financial and billing operations');

SELECT RoleId, RoleName, Description FROM HotelManagementSystem.dbo.Roles;
GO

-- =============================================
-- Day 19 August 2026 — rebuild ServiceRequests
-- (old schema had StayId/ServiceTypeId columns)
-- =============================================

DROP TABLE IF EXISTS ServiceRequests;
GO

CREATE TABLE ServiceRequests (
    ServiceRequestId INT IDENTITY(1,1) PRIMARY KEY,
    HotelId          INT            NOT NULL,
    RoomId           INT            NULL,
    GuestId          INT            NULL,
    Department       NVARCHAR(50)   NOT NULL DEFAULT 'Other',   -- Housekeeping | RoomService | Maintenance | Other
    Title            NVARCHAR(200)  NOT NULL,
    Description      NVARCHAR(1000) NULL,
    Status           NVARCHAR(50)   NOT NULL DEFAULT 'Pending', -- Pending | Assigned | InProgress | Completed | Archived
    AssignedToUserId INT            NULL,
    CreatedAt        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt        DATETIME2      NULL,
    CONSTRAINT FK_ServiceRequests_Hotels FOREIGN KEY (HotelId) REFERENCES Hotels(HotelId) ON DELETE CASCADE
);
PRINT 'ServiceRequests rebuilt with new schema.';


GO

-- Day 19 August 2026 — AdditionalGuests table for co-occupants
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AdditionalGuests')
BEGIN
    CREATE TABLE AdditionalGuests (
        AdditionalGuestId INT           IDENTITY(1,1) PRIMARY KEY,
        ReservationId     INT           NOT NULL,
        FullName          NVARCHAR(200) NOT NULL,
        IdType            NVARCHAR(50)  NULL,
        IdNumber          NVARCHAR(100) NULL,
        CONSTRAINT FK_AdditionalGuests_Reservations
            FOREIGN KEY (ReservationId) REFERENCES Reservations(ReservationId) ON DELETE CASCADE
    );
    PRINT 'AdditionalGuests table created.';
END
GO

-- Day 22 August 2026 — Notes column on Guests (manager/front-desk notes)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Guests' AND COLUMN_NAME = 'Notes')
BEGIN
    ALTER TABLE Guests ADD Notes NVARCHAR(MAX) NULL;
    PRINT 'Notes column added to Guests.';
END
GO




