-- ============================================
-- HOTEL MANAGEMENT SYSTEM - SCHEMA SQL SERVER
-- Thành viên 3: Dương Chí Chung (52300011)
-- ============================================

USE hotel_management
GO

-- 1️⃣ USERS TABLE (Xác thực & RBAC)
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY IDENTITY(1,1),
    full_name NVARCHAR(150) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20) NULL,
    role NVARCHAR(50) DEFAULT 'customer',
    is_active BIT DEFAULT 1,
    reset_token NVARCHAR(255) NULL,
    reset_expires DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT chk_role CHECK (role IN ('customer', 'admin', 'superadmin')),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- 2️⃣ HOTELS TABLE (Chi nhánh khách sạn)
CREATE TABLE hotels (
    hotel_id BIGINT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(200) NOT NULL,
    city NVARCHAR(100) NOT NULL,
    address NVARCHAR(MAX) NOT NULL,
    phone NVARCHAR(20) NULL,
    email NVARCHAR(255) NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    INDEX idx_city (city),
    INDEX idx_active (is_active)
);

-- 3️⃣ ROOM_TYPES TABLE (Loại phòng) ⭐ 
CREATE TABLE room_types (
    room_type_id BIGINT PRIMARY KEY IDENTITY(1,1),
    hotel_id BIGINT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX) NULL,
    capacity TINYINT NOT NULL,
    base_price DECIMAL(12, 2) NOT NULL,           -- ✅ Thêm base_price
    current_price DECIMAL(12, 2) NOT NULL,
    total_rooms SMALLINT NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT fk_hotel_room FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id),
    CONSTRAINT chk_capacity CHECK (capacity > 0),
    CONSTRAINT chk_total_rooms CHECK (total_rooms > 0),
    CONSTRAINT chk_prices CHECK (base_price > 0 AND current_price > 0),
    
    INDEX idx_hotel_room (hotel_id),
    INDEX idx_active_room (is_active)
);


-- 4️⃣ PRICE_HISTORY TABLE (Temporal Table - Lịch sử giá) ⭐⭐⭐
CREATE TABLE price_history (
    price_history_id BIGINT PRIMARY KEY IDENTITY(1,1),
    room_type_id BIGINT NOT NULL,
    old_price DECIMAL(12,2) NOT NULL,
    new_price DECIMAL(12,2) NOT NULL,
    change_pct AS ROUND((new_price - old_price) / old_price * 100, 2) PERSISTED,
    changed_by BIGINT NOT NULL,
    alert_flag BIT DEFAULT 0,
    note NVARCHAR(255) NULL,
    changed_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT fk_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id),
    CONSTRAINT fk_changed_by FOREIGN KEY (changed_by) REFERENCES users(user_id),
    CONSTRAINT chk_alert CHECK (alert_flag IN (0, 1)),
    
    INDEX idx_room_type (room_type_id),
    INDEX idx_alert_flag (alert_flag),
    INDEX idx_changed_at (changed_at)
);

-- 5️⃣ BOOKINGS TABLE (Đặt phòng)
CREATE TABLE bookings (
    booking_id BIGINT PRIMARY KEY IDENTITY(1,1),
    user_id BIGINT NOT NULL,
    room_type_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_room_type_booking FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id),
    CONSTRAINT chk_dates CHECK (check_in_date < check_out_date),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    
    INDEX idx_user (user_id),
    INDEX idx_room_type (room_type_id),
    INDEX idx_dates (check_in_date, check_out_date),
    INDEX idx_status (status)
);

-- 6️⃣ PRICING_RULES TABLE (Quy tắc giá động)
CREATE TABLE pricing_rules (
    rule_id BIGINT PRIMARY KEY IDENTITY(1,1),
    hotel_id BIGINT NULL,
    rule_name NVARCHAR(100) NOT NULL,
    rule_type NVARCHAR(50) NOT NULL,
    threshold_min DECIMAL(5,2) NOT NULL,
    threshold_max DECIMAL(5,2) NOT NULL,
    adjustment_type NVARCHAR(50) NOT NULL,
    adjustment_value DECIMAL(10,2) NOT NULL,
    max_price_cap DECIMAL(12,2) NULL,
    min_price_floor DECIMAL(12,2) NULL,
    valid_from DATE NULL,
    valid_to DATE NULL,
    priority TINYINT DEFAULT 5,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT fk_hotel_rule FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id),
    CONSTRAINT chk_rule_type CHECK (rule_type IN ('occupancy', 'season', 'event', 'demand')),
    CONSTRAINT chk_adjustment_type CHECK (adjustment_type IN ('percent', 'fixed')),
    CONSTRAINT chk_threshold CHECK (threshold_min <= threshold_max),
    
    INDEX idx_hotel_rule (hotel_id),
    INDEX idx_active_rule (is_active)
);

-- 7️⃣ PRICING_SUGGESTIONS TABLE (Đề xuất giá)
CREATE TABLE pricing_suggestions (
    suggestion_id BIGINT PRIMARY KEY IDENTITY(1,1),
    room_type_id BIGINT NOT NULL,
    current_price DECIMAL(12,2) NOT NULL,
    suggested_price DECIMAL(12,2) NOT NULL,
    reason NVARCHAR(MAX) NOT NULL,
    triggered_by NVARCHAR(100) NOT NULL,
    rule_id BIGINT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    approved_by BIGINT NULL,
    approved_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT fk_room_type_suggestion FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id),
    CONSTRAINT fk_rule FOREIGN KEY (rule_id) REFERENCES pricing_rules(rule_id),
    CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id),
    CONSTRAINT chk_suggestion_status CHECK (status IN ('pending', 'approved', 'rejected')),
    
    INDEX idx_status (status),
    INDEX idx_room_type_suggestion (room_type_id)
);

-- 8️⃣ PAYMENTS TABLE (Thanh toán)
CREATE TABLE payments (
    payment_id BIGINT PRIMARY KEY IDENTITY(1,1),
    booking_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    
    INDEX idx_booking (booking_id),
    INDEX idx_status (status)
);

-- 9️⃣ AUDIT_LOGS TABLE (Ghi chép hoạt động)
CREATE TABLE audit_logs (
    log_id BIGINT PRIMARY KEY IDENTITY(1,1),
    event_type NVARCHAR(100) NOT NULL,
    detail NVARCHAR(MAX) NULL,
    created_by BIGINT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
    
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);

-- 🔟 SEARCH_SUMMARY TABLE (Thống kê tìm kiếm)
CREATE TABLE search_summary (
    summary_id BIGINT PRIMARY KEY IDENTITY(1,1),
    city NVARCHAR(100) NOT NULL,
    hotel_id BIGINT NOT NULL,
    search_date DATE NOT NULL,
    search_count INT DEFAULT 0,
    converted INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT fk_hotel_search FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id),
    CONSTRAINT uq_search_summary UNIQUE (hotel_id, search_date),
    
    INDEX idx_date (search_date),
    INDEX idx_hotel_search (hotel_id)
);

-- Thông báo hoàn tất
PRINT '✅ Schema tạo thành công!'
GO