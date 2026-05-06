-- ═══════════════════════════════════════════════════════
-- ADVANCED DATABASE — HOTEL MANAGEMENT SYSTEM (TV3)
-- Temporal Tables, Triggers, Window Functions, RBAC
-- ═══════════════════════════════════════════════════════

-- Enable temporal table tracking
-- (SQL Server specific)

-- ════════ USERS TABLE ════════
CREATE TABLE users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,  -- Bcrypt hash (cost=12)
    phone NVARCHAR(20),
    role ENUM('user', 'admin') DEFAULT 'user',
    is_active BIT DEFAULT 1,  -- Soft delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- ════════ HOTELS TABLE ════════
CREATE TABLE hotels (
    hotel_id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL,
    city NVARCHAR(100) NOT NULL,
    address NVARCHAR(500),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- ════════ ROOM_TYPES TABLE ════════
CREATE TABLE room_types (
    room_type_id INT PRIMARY KEY IDENTITY(1,1),
    hotel_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,  -- e.g. "Deluxe Ocean View"
    capacity INT DEFAULT 2,  -- Guest capacity
    current_price DECIMAL(15, 2) NOT NULL,
    total_rooms INT NOT NULL,
    description NVARCHAR(500),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id)
);

-- ════════ PRICE_HISTORY TABLE (Temporal/Audit Trail) ════════
CREATE TABLE price_history (
    price_history_id INT PRIMARY KEY IDENTITY(1,1),
    room_type_id INT NOT NULL,
    old_price DECIMAL(15, 2),
    new_price DECIMAL(15, 2) NOT NULL,
    change_pct AS CAST((new_price - ISNULL(old_price, 0)) * 100.0 / NULLIF(old_price, 0) AS DECIMAL(10, 2)) PERSISTED,
    alert_flag BIT DEFAULT 0,  -- 1 if |change_pct| >= 50%
    changed_by INT,  -- user_id
    notes NVARCHAR(500),
    changed_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id),
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

-- ════════ BOOKINGS TABLE ════════
CREATE TABLE bookings (
    booking_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    room_type_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    num_nights INT GENERATED ALWAYS AS (DATEDIFF(DAY, check_in, check_out)) STORED,
    num_guests INT DEFAULT 1,
    total_price DECIMAL(15, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    booking_date DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id)
);

-- ════════ PRICING_RULES TABLE ════════
CREATE TABLE pricing_rules (
    rule_id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL,
    rule_type ENUM('occupancy', 'season', 'event') DEFAULT 'occupancy',
    threshold_min INT,  -- For occupancy: 0-100%
    threshold_max INT,
    adjustment_type ENUM('percentage', 'fixed_amount') DEFAULT 'percentage',
    adjustment_value DECIMAL(10, 2) NOT NULL,
    max_price_cap DECIMAL(15, 2),
    min_price_floor DECIMAL(15, 2),
    priority INT DEFAULT 5,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- ════════ AUDIT_LOGS TABLE ════════
CREATE TABLE audit_logs (
    log_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    action NVARCHAR(255),
    table_name NVARCHAR(100),
    record_id INT,
    old_values NVARCHAR(MAX),
    new_values NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ════════ INDEXES ════════
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);
CREATE INDEX idx_price_history_room ON price_history(room_type_id);
CREATE INDEX idx_price_history_date ON price_history(changed_at);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_room ON bookings(room_type_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);

-- ════════ TRIGGERS ════════
-- Trigger: Automatic price_history INSERT when current_price changes
CREATE TRIGGER trg_price_history_insert
ON room_types
AFTER UPDATE
AS
BEGIN
    INSERT INTO price_history (room_type_id, old_price, new_price, alert_flag, changed_by, notes)
    SELECT 
        i.room_type_id,
        d.current_price,
        i.current_price,
        CASE WHEN ABS((i.current_price - d.current_price) * 100.0 / NULLIF(d.current_price, 0)) >= 50 THEN 1 ELSE 0 END,
        USER_ID(),
        'Auto-triggered by price update'
    FROM inserted i
    INNER JOIN deleted d ON i.room_type_id = d.room_type_id
    WHERE i.current_price <> d.current_price;
    
    -- Log to audit_logs
    INSERT INTO audit_logs (action, table_name, record_id, old_values, new_values)
    SELECT 
        'UPDATE',
        'room_types',
        i.room_type_id,
        CAST(d.current_price AS NVARCHAR(MAX)),
        CAST(i.current_price AS NVARCHAR(MAX))
    FROM inserted i
    INNER JOIN deleted d ON i.room_type_id = d.room_type_id
    WHERE i.current_price <> d.current_price;
END;

-- ════════ STORED PROCEDURES ════════
-- SP: Calculate suggested price based on occupancy & rules
CREATE PROCEDURE sp_calculate_suggested_price
    @room_type_id INT,
    @occupancy_rate DECIMAL(5, 2),
    @suggested_price DECIMAL(15, 2) OUTPUT
AS
BEGIN
    DECLARE @current_price DECIMAL(15, 2);
    DECLARE @adjustment_pct DECIMAL(10, 2) = 0;
    DECLARE @max_cap DECIMAL(15, 2);
    DECLARE @min_floor DECIMAL(15, 2);
    
    SELECT @current_price = current_price FROM room_types WHERE room_type_id = @room_type_id;
    
    -- Find matching rule based on occupancy
    SELECT TOP 1
        @adjustment_pct = adjustment_value,
        @max_cap = max_price_cap,
        @min_floor = min_price_floor
    FROM pricing_rules
    WHERE is_active = 1
        AND rule_type = 'occupancy'
        AND @occupancy_rate BETWEEN threshold_min AND threshold_max
    ORDER BY priority DESC;
    
    -- Calculate suggested price
    SET @suggested_price = @current_price * (1 + @adjustment_pct / 100.0);
    
    -- Apply cap/floor
    SET @suggested_price = LEAST(GREATEST(@suggested_price, @min_floor), @max_cap);
END;

-- SP: Get occupancy rate for a room type (current month)
CREATE PROCEDURE sp_get_occupancy_rate
    @room_type_id INT,
    @occupancy_rate DECIMAL(5, 2) OUTPUT
AS
BEGIN
    DECLARE @total_days INT;
    DECLARE @booked_room_nights INT;
    DECLARE @total_rooms INT;
    
    SELECT @total_rooms = total_rooms FROM room_types WHERE room_type_id = @room_type_id;
    
    SET @total_days = DAY(EOMONTH(GETDATE()));
    
    SELECT @booked_room_nights = ISNULL(SUM(num_nights), 0)
    FROM bookings
    WHERE room_type_id = @room_type_id
        AND status = 'confirmed'
        AND YEAR(check_in) = YEAR(GETDATE())
        AND MONTH(check_in) = MONTH(GETDATE());
    
    SET @occupancy_rate = (@booked_room_nights * 100.0) / (@total_rooms * @total_days);
END;

-- ════════ VIEWS ════════
-- View: Top 3 rooms by revenue per hotel (Window Function)
CREATE VIEW vw_top_rooms_per_hotel AS
SELECT
    h.hotel_id,
    h.name AS hotel_name,
    rt.room_type_id,
    rt.name AS room_name,
    SUM(b.total_price) AS total_revenue,
    COUNT(b.booking_id) AS booking_count,
    DENSE_RANK() OVER (PARTITION BY h.hotel_id ORDER BY SUM(b.total_price) DESC) AS rank_in_hotel
FROM hotels h
INNER JOIN room_types rt ON h.hotel_id = rt.hotel_id
LEFT JOIN bookings b ON rt.room_type_id = b.room_type_id AND b.status = 'confirmed'
GROUP BY h.hotel_id, h.name, rt.room_type_id, rt.name;

-- View: Monthly revenue by hotel
CREATE VIEW vw_monthly_revenue AS
SELECT
    YEAR(b.booking_date) AS year,
    MONTH(b.booking_date) AS month,
    h.hotel_id,
    h.name AS hotel_name,
    SUM(b.total_price) AS total_revenue,
    COUNT(b.booking_id) AS booking_count
FROM bookings b
INNER JOIN room_types rt ON b.room_type_id = rt.room_type_id
INNER JOIN hotels h ON rt.hotel_id = h.hotel_id
WHERE b.status = 'confirmed'
GROUP BY YEAR(b.booking_date), MONTH(b.booking_date), h.hotel_id, h.name;

-- ════════ RBAC — Database Roles ════════
-- Create roles
CREATE ROLE role_admin;
CREATE ROLE role_user;
CREATE ROLE role_readonly;

-- Grant permissions to role_admin
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::dbo TO role_admin;

-- Grant permissions to role_user
GRANT SELECT ON users TO role_user;
GRANT SELECT ON hotels TO role_user;
GRANT SELECT ON room_types TO role_user;
GRANT SELECT ON bookings TO role_user;
GRANT INSERT ON bookings TO role_user;

-- Grant permissions to role_readonly
GRANT SELECT ON vw_monthly_revenue TO role_readonly;
GRANT SELECT ON vw_top_rooms_per_hotel TO role_readonly;