USE hotel_management
GO

-- ============================================
-- VIEW 1: TOP 3 ROOMS BY REVENUE (QUARTERLY)
-- ============================================

IF OBJECT_ID('vw_top_3_rooms_quarterly', 'V') IS NOT NULL
    DROP VIEW vw_top_3_rooms_quarterly;
GO

CREATE VIEW vw_top_3_rooms_quarterly AS
SELECT *
FROM (
    SELECT
        h.name AS hotel_name,
        r.hotel_id,
        r.yr,
        r.qtr,
        r.room_name,
        r.total_revenue,
        r.booking_count,
        r.revenue_rank
    FROM (
        SELECT
            rt.hotel_id,
            rt.room_type_id,
            rt.name AS room_name,
            YEAR(b.check_in_date) AS yr,
            DATEPART(QUARTER, b.check_in_date) AS qtr,
            SUM(b.total_price) AS total_revenue,
            COUNT(b.booking_id) AS booking_count,

            RANK() OVER (
                PARTITION BY 
                    rt.hotel_id,
                    YEAR(b.check_in_date),
                    DATEPART(QUARTER, b.check_in_date)
                ORDER BY SUM(b.total_price) DESC
            ) AS revenue_rank

        FROM room_types rt
        JOIN bookings b
            ON b.room_type_id = rt.room_type_id
        WHERE b.status IN ('confirmed','completed')
        GROUP BY
            rt.hotel_id,
            rt.room_type_id,
            rt.name,
            YEAR(b.check_in_date),
            DATEPART(QUARTER, b.check_in_date)
    ) r
    JOIN hotels h
        ON h.hotel_id = r.hotel_id
) x
WHERE revenue_rank <= 3;
GO

-- ============================================
-- VIEW 2: MONTHLY OCCUPANCY RATE
-- ============================================

IF OBJECT_ID('vw_monthly_occupancy', 'V') IS NOT NULL
    DROP VIEW vw_monthly_occupancy;
GO

CREATE VIEW vw_monthly_occupancy AS
SELECT
    m.hotel_id,
    m.yr,
    m.mth,
    m.room_type_id,
    m.occupancy_rate,

    LAG(m.occupancy_rate) OVER (
        PARTITION BY m.hotel_id, m.room_type_id
        ORDER BY m.yr, m.mth
    ) AS prev_month_rate,

    m.occupancy_rate - LAG(m.occupancy_rate) OVER (
        PARTITION BY m.hotel_id, m.room_type_id
        ORDER BY m.yr, m.mth
    ) AS occupancy_delta

FROM (
    SELECT
        rt.hotel_id,
        YEAR(b.check_in_date) AS yr,
        MONTH(b.check_in_date) AS mth,
        rt.room_type_id,
        rt.total_rooms,

        COUNT(DISTINCT b.booking_id) AS booked_count,

        ROUND(
            100.0 * COUNT(DISTINCT b.booking_id)
            / NULLIF(rt.total_rooms, 0),
        2) AS occupancy_rate

    FROM room_types rt
    LEFT JOIN bookings b
        ON b.room_type_id = rt.room_type_id
        AND b.status IN ('confirmed','completed')

    GROUP BY
        rt.hotel_id,
        rt.room_type_id,
        rt.total_rooms,
        YEAR(b.check_in_date),
        MONTH(b.check_in_date)
) m;
GO

-- ============================================
-- VIEW 3: BRANCH REVENUE CONTRIBUTION
-- ============================================

IF OBJECT_ID('vw_branch_contribution', 'V') IS NOT NULL
    DROP VIEW vw_branch_contribution;
GO

CREATE VIEW vw_branch_contribution AS
SELECT
    h.hotel_id,
    h.name AS hotel_name,
    h.city,

    SUM(b.total_price) AS hotel_revenue,

    SUM(SUM(b.total_price)) OVER () AS total_revenue,

    ROUND(
        100.0 * SUM(b.total_price)
        / SUM(SUM(b.total_price)) OVER (),
    2) AS contribution_pct

FROM bookings b
JOIN room_types rt
    ON rt.room_type_id = b.room_type_id
JOIN hotels h
    ON h.hotel_id = rt.hotel_id

WHERE b.status IN ('confirmed','completed')

GROUP BY
    h.hotel_id,
    h.name,
    h.city;
GO

-- ============================================
-- VIEW 4: PRICE CHANGE IMPACT ANALYSIS
-- ============================================

IF OBJECT_ID('vw_price_changes_impact', 'V') IS NOT NULL
    DROP VIEW vw_price_changes_impact;
GO

CREATE VIEW vw_price_changes_impact AS
SELECT
    pc.room_type_id,
    pc.change_yr,
    pc.change_mth,
    pc.change_pct AS price_change_pct,
    rm.monthly_revenue AS next_month_revenue,
    rm.booking_count
FROM (
    SELECT
        room_type_id,
        YEAR(changed_at) AS change_yr,
        MONTH(changed_at) AS change_mth,

        ROUND(
            100.0 * ABS(new_price - old_price)
            / NULLIF(old_price, 0),
        2) AS change_pct,

        DATEADD(MONTH, 1, changed_at) AS next_month

    FROM price_history
) pc
JOIN (
    SELECT
        rt.room_type_id,
        YEAR(b.check_in_date) AS rev_yr,
        MONTH(b.check_in_date) AS rev_mth,
        SUM(b.total_price) AS monthly_revenue,
        COUNT(b.booking_id) AS booking_count
    FROM bookings b
    JOIN room_types rt
        ON rt.room_type_id = b.room_type_id
    WHERE b.status IN ('confirmed','completed')
    GROUP BY
        rt.room_type_id,
        YEAR(b.check_in_date),
        MONTH(b.check_in_date)
) rm
    ON rm.room_type_id = pc.room_type_id
    AND rm.rev_yr = YEAR(pc.next_month)
    AND rm.rev_mth = MONTH(pc.next_month);
GO

PRINT '✅ All Views created successfully!';
GO
