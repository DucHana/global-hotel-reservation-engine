USE hotel_management
GO

-- Xóa dữ liệu cũ (optional)
-- DELETE FROM bookings;
-- DELETE FROM pricing_suggestions;
-- DELETE FROM price_history;
-- DELETE FROM pricing_rules;
-- DELETE FROM room_types;
-- DELETE FROM hotels;
-- DELETE FROM users;

-- ============================================
-- INSERT USERS (Admin + Customers)
-- ============================================

-- Admin account (password: admin123 - bcrypt cost 12)
INSERT INTO users (full_name, email, password_hash, phone, role, is_active)
VALUES 
  ('Dương Chí Chung', 'admin@luxestay.vn', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN1jOmVgF5kN8bN9vHf9C', '0901234567', 'admin', 1),
  ('Nguyễn Văn A', 'customer1@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN1jOmVgF5kN8bN9vHf9C', '0912345678', 'customer', 1),
  ('Trần Thị B', 'customer2@gmail.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN1jOmVgF5kN8bN9vHf9C', '0923456789', 'customer', 1);

-- ============================================
-- INSERT HOTELS (Chi nhánh)
-- ============================================

INSERT INTO hotels (name, city, address, is_active)
VALUES 
  ('Marriott Hà Nội', 'Hà Nội', '12 Đào Duy Từ, Hoàn Kiếm, Hà Nội', 1),
  ('Sheraton Sài Gòn', 'Sài Gòn', '88 Đồng Khởi, Q.1, TP.HCM', 1),
  ('InterCon Đà Nẵng', 'Đà Nẵng', 'Bãi Biển Mỹ Khê, Đà Nẵng', 1);

-- ============================================
-- INSERT ROOM_TYPES
-- ============================================

INSERT INTO room_types (hotel_id, name, description, capacity, current_price, total_rooms, is_active)
VALUES 
  -- Marriott Hà Nội
  (1, 'Presidential Suite', 'Luxury suite with river view', 4, 5150000, 5, 1),
  (1, 'Deluxe Ocean View', 'Spacious room with city view', 2, 2400000, 20, 1),
  (1, 'Standard Room', 'Comfortable standard room', 2, 1200000, 50, 1),
  
  -- Sheraton Sài Gòn
  (2, 'Grand Deluxe', 'Premium deluxe room', 2, 2000000, 30, 1),
  (2, 'Superior Room', 'Modern room with balcony', 2, 1500000, 40, 1),
  
  -- InterCon Đà Nẵng
  (3, 'Beach Suites', 'Direct beach access', 4, 3500000, 15, 1),
  (3, 'Beachfront Deluxe', 'Beachfront deluxe room', 2, 2200000, 25, 1);

-- ============================================
-- INSERT PRICING_RULES
-- ============================================

INSERT INTO pricing_rules (hotel_id, rule_name, rule_type, threshold_min, threshold_max, adjustment_type, adjustment_value, max_price_cap, min_price_floor, priority, is_active)
VALUES 
  -- Áp dụng toàn hệ thống (hotel_id = NULL)
  (NULL, 'Emergency Demand', 'occupancy', 90, 100, 'percent', 30, 8000000, 500000, 10, 1),
  (NULL, 'High Demand', 'occupancy', 70, 89, 'percent', 15, 6000000, 800000, 8, 1),
  (NULL, 'Normal', 'occupancy', 40, 69, 'percent', 0, NULL, NULL, 5, 1),
  (NULL, 'Low Demand', 'occupancy', 20, 39, 'percent', -10, NULL, 800000, 3, 1),
  (NULL, 'Emergency Empty', 'occupancy', 0, 19, 'percent', -20, NULL, 500000, 1, 1);

-- ============================================
-- INSERT BOOKINGS (Để test occupancy rate)
-- ============================================

INSERT INTO bookings (user_id, room_type_id, check_in_date, check_out_date, total_price, status)
VALUES 
  (2, 1, '2026-05-01', '2026-05-05', 25750000, 'confirmed'),
  (2, 2, '2026-05-01', '2026-05-03', 4800000, 'confirmed'),
  (3, 3, '2026-05-02', '2026-05-04', 2400000, 'confirmed'),
  (2, 4, '2026-05-05', '2026-05-08', 6000000, 'pending'),
  (3, 5, '2026-05-10', '2026-05-12', 3000000, 'completed');

-- ============================================
-- INSERT PRICING_SUGGESTIONS (Chờ duyệt)
-- ============================================

INSERT INTO pricing_suggestions (room_type_id, current_price, suggested_price, reason, triggered_by, rule_id, status)
VALUES 
  (1, 5150000, 6695000, 'Occupancy 85% — Rule: High Demand', 'system_cron', 2, 'pending'),
  (2, 2400000, 2760000, 'Occupancy 75% — Rule: High Demand', 'system_cron', 2, 'pending'),
  (3, 1200000, 1080000, 'Occupancy 30% — Rule: Low Demand', 'system_cron', 4, 'pending');

PRINT '✅ Seed data inserted successfully!'
GO