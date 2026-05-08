USE hotel_management
GO

-- ============================================
-- STORED PROCEDURE 1: GENERATE PRICING SUGGESTIONS
-- ============================================

IF OBJECT_ID('sp_generate_pricing_suggestions', 'P') IS NOT NULL
    DROP PROCEDURE sp_generate_pricing_suggestions;
GO

CREATE PROCEDURE sp_generate_pricing_suggestions
AS
BEGIN
    SET NOCOUNT ON;

    WITH occupancy_cte AS (
        SELECT
            rt.room_type_id,
            rt.current_price,
            rt.total_rooms,
            COUNT(DISTINCT CASE 
                WHEN b.status = 'confirmed' 
                THEN b.booking_id 
            END) AS booked_rooms,

            ROUND(
                100.0 * COUNT(DISTINCT CASE 
                    WHEN b.status = 'confirmed' 
                    THEN b.booking_id 
                END)
                / NULLIF(rt.total_rooms, 0),
            2) AS occupancy_pct

        FROM room_types rt
        LEFT JOIN bookings b
            ON b.room_type_id = rt.room_type_id
            AND CAST(GETDATE() AS DATE) 
                BETWEEN b.check_in_date AND b.check_out_date

        GROUP BY 
            rt.room_type_id, 
            rt.current_price, 
            rt.total_rooms
    ),

    matched_rules AS (
        SELECT
            o.room_type_id,
            o.current_price,
            o.occupancy_pct,
            pr.rule_id,
            pr.adjustment_type,
            pr.adjustment_value,
            pr.max_price_cap,
            pr.min_price_floor,
            pr.rule_name,

            ROW_NUMBER() OVER (
                PARTITION BY o.room_type_id
                ORDER BY pr.priority DESC
            ) AS rn

        FROM occupancy_cte o
        JOIN pricing_rules pr
            ON pr.is_active = 1
            AND pr.rule_type = 'occupancy'
            AND o.occupancy_pct BETWEEN pr.threshold_min AND pr.threshold_max
    )

    INSERT INTO pricing_suggestions
    (
        room_type_id,
        current_price,
        suggested_price,
        reason,
        triggered_by,
        rule_id
    )
    SELECT
        room_type_id,
        current_price,

        -- FIXED: SQL Server safe clamp logic
        CASE
            WHEN adjustment_type = 'percent' THEN
                CASE
                    WHEN ROUND(current_price * (1 + adjustment_value / 100.0), -3)
                        < ISNULL(min_price_floor, 0)
                        THEN ISNULL(min_price_floor, 0)

                    WHEN ROUND(current_price * (1 + adjustment_value / 100.0), -3)
                        > ISNULL(max_price_cap, 999999999)
                        THEN ISNULL(max_price_cap, 999999999)

                    ELSE ROUND(current_price * (1 + adjustment_value / 100.0), -3)
                END

            WHEN adjustment_type = 'fixed' THEN
                CASE
                    WHEN current_price + adjustment_value
                        < ISNULL(min_price_floor, 0)
                        THEN ISNULL(min_price_floor, 0)

                    WHEN current_price + adjustment_value
                        > ISNULL(max_price_cap, 999999999)
                        THEN ISNULL(max_price_cap, 999999999)

                    ELSE current_price + adjustment_value
                END
        END AS suggested_price,

        CONCAT('Occupancy ', occupancy_pct, '% — Rule: ', rule_name) AS reason,
        'system_cron' AS triggered_by,
        rule_id

    FROM matched_rules
    WHERE rn = 1;

    PRINT '✅ Pricing suggestions generated!';
END
GO

-- ============================================
-- STORED PROCEDURE 2: TOP 3 ROOMS BY REVENUE
-- ============================================

IF OBJECT_ID('sp_get_top_3_rooms_by_revenue', 'P') IS NOT NULL
    DROP PROCEDURE sp_get_top_3_rooms_by_revenue;
GO

CREATE PROCEDURE sp_get_top_3_rooms_by_revenue
    @HotelId BIGINT = NULL,
    @Year INT,
    @Quarter INT
AS
BEGIN
    SET NOCOUNT ON;

    WITH quarterly_revenue AS (
        SELECT
            rt.hotel_id,
            rt.room_type_id,
            rt.name AS room_name,
            @Year AS yr,
            @Quarter AS qtr,
            SUM(b.total_price) AS total_revenue,
            COUNT(b.booking_id) AS booking_count

        FROM room_types rt
        JOIN bookings b
            ON b.room_type_id = rt.room_type_id

        WHERE b.status IN ('confirmed','completed')
            AND YEAR(b.check_in_date) = @Year
            AND DATEPART(QUARTER, b.check_in_date) = @Quarter
            AND (@HotelId IS NULL OR rt.hotel_id = @HotelId)

        GROUP BY
            rt.hotel_id,
            rt.room_type_id,
            rt.name
    ),

    ranked AS (
        SELECT *,
            RANK() OVER (
                PARTITION BY r.hotel_id
                ORDER BY total_revenue DESC
            ) AS revenue_rank
        FROM quarterly_revenue r
    )

    SELECT
        h.name AS hotel_name,
        r.yr,
        r.qtr,
        r.room_name,
        r.total_revenue,
        r.booking_count,
        r.revenue_rank
    FROM ranked r
    JOIN hotels h
        ON h.hotel_id = r.hotel_id
    WHERE r.revenue_rank <= 3
    ORDER BY r.hotel_id, r.revenue_rank;
END
GO

-- ============================================
-- STORED PROCEDURE 3: CALCULATE SINGLE SUGGESTION
-- ============================================

IF OBJECT_ID('sp_calculate_suggested_price', 'P') IS NOT NULL
    DROP PROCEDURE sp_calculate_suggested_price;
GO

CREATE PROCEDURE sp_calculate_suggested_price
    @room_type_id INT,
    @occupancy_rate DECIMAL(5,2),
    @is_new_room BIT = 0,
    @suggested_price DECIMAL(15,2) OUTPUT,
    @rule_name NVARCHAR(255) OUTPUT -- Trả về tên quy tắc
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @current_price DECIMAL(15,2);
    DECLARE @rule_id INT;
    DECLARE @adjustment_type NVARCHAR(50);
    DECLARE @adjustment_value DECIMAL(10,2);
    DECLARE @max_price_cap DECIMAL(15,2);
    DECLARE @min_price_floor DECIMAL(15,2);
    DECLARE @today DATE = CAST(GETDATE() AS DATE);

    IF @is_new_room = 1
        SELECT @current_price = base_price FROM room_types WHERE room_type_id = @room_type_id;
    ELSE
        SELECT @current_price = current_price FROM room_types WHERE room_type_id = @room_type_id;

    SELECT TOP 1 
        @rule_id = rule_id,
        @rule_name = rule_name,
        @adjustment_type = adjustment_type,
        @adjustment_value = adjustment_value,
        @max_price_cap = max_price_cap,
        @min_price_floor = min_price_floor
    FROM pricing_rules
    WHERE is_active = 1
      AND (
          (@is_new_room = 1 AND rule_type IN ('season', 'event', 'demand') AND @today BETWEEN ISNULL(valid_from, '1900-01-01') AND ISNULL(valid_to, '2099-12-31'))
          OR
          (@is_new_room = 0 AND (
              (rule_type = 'occupancy' AND @occupancy_rate BETWEEN threshold_min AND threshold_max)
              OR 
              (rule_type IN ('season', 'event', 'demand') AND @today BETWEEN ISNULL(valid_from, '1900-01-01') AND ISNULL(valid_to, '2099-12-31'))
          ))
      )
    ORDER BY priority DESC, created_at DESC;

    IF @rule_id IS NULL
    BEGIN
        SET @suggested_price = @current_price;
        SET @rule_name = 'Standard Rate';
        RETURN;
    END

    IF UPPER(@adjustment_type) IN ('PERCENT', 'PERCENTAGE')
        SET @suggested_price = ROUND(@current_price * (1 + @adjustment_value / 100.0), -3);
    ELSE
        SET @suggested_price = @current_price + @adjustment_value;

    IF @max_price_cap IS NOT NULL AND @suggested_price > @max_price_cap
        SET @suggested_price = @max_price_cap;
    IF @min_price_floor IS NOT NULL AND @suggested_price < @min_price_floor
        SET @suggested_price = @min_price_floor;
END
GO

PRINT '✅ All Stored Procedures created successfully!';
GO
