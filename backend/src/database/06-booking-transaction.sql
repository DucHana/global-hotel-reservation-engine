USE hotel_management
GO

-- ============================================================
-- STORED PROCEDURE: sp_create_booking
-- Thành viên 1 — Transaction & Locking Expert
-- 
-- Kỹ thuật áp dụng:
--   1. ISOLATION LEVEL SERIALIZABLE   → ngăn phantom read
--   2. SELECT ... WITH (UPDLOCK, HOLDLOCK) → Pessimistic Locking
--      → chặn double-booking khi 2 transaction đồng thời
--   3. ATOMIC TRANSACTION → thành công toàn bộ hoặc rollback toàn bộ
--   4. RAISERROR với error code để NestJS bắt và phân loại lỗi
-- ============================================================

IF OBJECT_ID('sp_create_booking', 'P') IS NOT NULL
    DROP PROCEDURE sp_create_booking;
GO

CREATE PROCEDURE sp_create_booking
    @UserId      BIGINT,
    @RoomTypeId  BIGINT,
    @CheckIn     DATE,
    @CheckOut    DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- ── Bước 1: Validate đầu vào ────────────────────────────
    IF @CheckIn >= @CheckOut
    BEGIN
        RAISERROR ('INVALID_DATES: check_out phải sau check_in', 16, 1);
        RETURN;
    END

    IF @CheckIn < CAST(GETDATE() AS DATE)
    BEGIN
        RAISERROR ('INVALID_DATES: check_in không thể là ngày quá khứ', 16, 1);
        RETURN;
    END

    -- ── Bước 2: Bắt đầu transaction SERIALIZABLE ────────────
    -- SERIALIZABLE ngăn phantom rows: nếu T1 đang đọc danh sách booking
    -- trong khoảng ngày, T2 không thể INSERT booking mới vào khoảng đó.
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    BEGIN TRANSACTION;

    BEGIN TRY
        -- ── Bước 3: Lock hàng room_type (Pessimistic Locking) ───
        -- UPDLOCK  → chiếm Update Lock, chặn transaction khác đặt cùng phòng
        -- HOLDLOCK → giữ lock cho đến hết transaction (equiv to SERIALIZABLE)
        -- Nếu T1 và T2 cùng chạy, T2 sẽ bị block ở đây cho đến khi T1 commit/rollback
        DECLARE @TotalRooms    SMALLINT;
        DECLARE @CurrentPrice  DECIMAL(12,2);

        SELECT
            @TotalRooms   = rt.total_rooms,
            @CurrentPrice = rt.current_price
        FROM room_types rt WITH (UPDLOCK, HOLDLOCK)
        WHERE rt.room_type_id = @RoomTypeId
          AND rt.is_active    = 1;

        IF @TotalRooms IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR ('ROOM_NOT_FOUND: Loại phòng không tồn tại hoặc đã bị vô hiệu hóa', 16, 1);
            RETURN;
        END

        -- ── Bước 4: Đếm số phòng đã bị đặt (overlap check) ─────
        -- Điều kiện overlap: check_in_new < check_out_existing AND check_out_new > check_in_existing
        DECLARE @BookedRooms INT;
        SELECT @BookedRooms = COUNT(DISTINCT b.booking_id)
        FROM bookings b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.room_type_id  = @RoomTypeId
          AND b.status       IN ('pending', 'confirmed')
          AND b.check_in_date  < @CheckOut
          AND b.check_out_date > @CheckIn;

        -- ── Bước 5: Kiểm tra Double Booking ─────────────────────
        IF @BookedRooms >= @TotalRooms
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR ('DOUBLE_BOOKING: Phòng đã hết chỗ trong khoảng thời gian này', 16, 1);
            RETURN;
        END

        -- ── Bước 6: Tính tổng giá (số đêm × giá hiện tại) ──────
        DECLARE @Nights     INT        = DATEDIFF(day, @CheckIn, @CheckOut);
        DECLARE @TotalPrice DECIMAL(12,2) = @Nights * @CurrentPrice;

        -- ── Bước 7: INSERT booking (atomic) ─────────────────────
        INSERT INTO bookings (user_id, room_type_id, check_in_date, check_out_date, total_price, status)
        VALUES (@UserId, @RoomTypeId, @CheckIn, @CheckOut, @TotalPrice, 'pending');

        DECLARE @NewBookingId BIGINT = SCOPE_IDENTITY();

        -- ── Bước 8: Ghi audit log ───────────────────────────────
        INSERT INTO audit_logs (event_type, detail, created_by)
        VALUES (
            'BOOKING_CREATED',
            CONCAT('Booking #', @NewBookingId, ' created for room_type ', @RoomTypeId,
                   ' | ', @CheckIn, ' → ', @CheckOut,
                   ' | ', @Nights, ' đêm × ₫', FORMAT(@CurrentPrice,'N0'),
                   ' = ₫', FORMAT(@TotalPrice,'N0')),
            @UserId
        );

        COMMIT TRANSACTION;

        -- ── Trả về kết quả ──────────────────────────────────────
        SELECT
            @NewBookingId  AS booking_id,
            @TotalPrice    AS total_price,
            'SUCCESS'      AS status,
            'Đặt phòng thành công! Đang chờ xác nhận.' AS message;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Re-throw để NestJS bắt được
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT            = ERROR_SEVERITY();
        RAISERROR (@ErrMsg, @ErrSev, 1);
    END CATCH
END
GO

PRINT ' sp_create_booking created — Pessimistic Locking + ACID Transaction';
GO
