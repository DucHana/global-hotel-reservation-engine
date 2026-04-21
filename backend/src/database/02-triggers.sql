USE hotel_management
GO

-- ============================================
-- TRIGGER 1: GHI LỊC SỬ GIÁ KHI CHANGE_PRICE
-- ============================================

CREATE TRIGGER trg_price_history_insert
ON room_types
AFTER UPDATE
AS BEGIN
    SET NOCOUNT ON;
    
    -- Chỉ xử lý khi giá thay đổi
    IF UPDATE(current_price) BEGIN
        -- Ghi vào price_history
        INSERT INTO price_history (
            room_type_id, 
            old_price, 
            new_price,
            changed_by, 
            alert_flag, 
            changed_at
        )
        SELECT
            i.room_type_id,
            d.current_price,           -- Giá CŨ
            i.current_price,           -- Giá MỚI
            ISNULL(CAST(SESSION_CONTEXT(N'current_user_id') AS BIGINT), 1),
            CASE 
                WHEN ABS((i.current_price - d.current_price) / d.current_price * 100) > 50 
                THEN 1 
                ELSE 0 
            END,
            GETDATE()
        FROM inserted i 
        JOIN deleted d ON i.room_type_id = d.room_type_id
        WHERE d.current_price <> i.current_price;

        -- Nếu alert_flag = 1, ghi vào audit_logs
        INSERT INTO audit_logs (event_type, detail, created_by, created_at)
        SELECT
            'PRICE_ALERT',
            CONCAT('Room type ', i.room_type_id, 
                   ' changed ', 
                   ROUND(ABS((i.current_price - d.current_price) / d.current_price * 100), 1), '%'),
            ISNULL(CAST(SESSION_CONTEXT(N'current_user_id') AS BIGINT), 1),
            GETDATE()
        FROM inserted i 
        JOIN deleted d ON i.room_type_id = d.room_type_id
        WHERE ABS((i.current_price - d.current_price) / d.current_price * 100) > 50;
    END
END
GO

-- ============================================
-- TRIGGER 2: CẬP NHẬT UPDATED_AT TỰ ĐỘNG
-- ============================================

CREATE TRIGGER trg_update_timestamp_users
ON users
AFTER UPDATE
AS BEGIN
    UPDATE users
    SET updated_at = GETDATE()
    FROM users u
    INNER JOIN inserted i ON u.user_id = i.user_id;
END
GO

CREATE TRIGGER trg_update_timestamp_room_types
ON room_types
AFTER UPDATE
AS BEGIN
    UPDATE room_types
    SET updated_at = GETDATE()
    FROM room_types rt
    INNER JOIN inserted i ON rt.room_type_id = i.room_type_id;
END
GO

-- ============================================
-- TRIGGER 3: TRIGGER APPROVE PRICING SUGGESTION
-- ============================================

CREATE TRIGGER trg_apply_approved_suggestion
ON pricing_suggestions
AFTER UPDATE
AS BEGIN
    SET NOCOUNT ON;
    
    -- Nếu status chuyển từ 'pending' → 'approved'
    IF EXISTS (
        SELECT 1 FROM inserted i 
        JOIN deleted d ON i.suggestion_id = d.suggestion_id
        WHERE i.status = 'approved' AND d.status = 'pending'
    ) BEGIN
        -- Update giá vào room_types (sẽ trigger trg_price_history_insert)
        UPDATE rt 
        SET current_price = i.suggested_price
        FROM room_types rt
        INNER JOIN inserted i ON rt.room_type_id = i.room_type_id
        WHERE EXISTS (
            SELECT 1 FROM inserted i2
            JOIN deleted d2 ON i2.suggestion_id = d2.suggestion_id
            WHERE i2.room_type_id = rt.room_type_id
            AND i2.status = 'approved' 
            AND d2.status = 'pending'
        );
    END
END
GO

PRINT '✅ Tất cả Triggers tạo thành công!'
GO