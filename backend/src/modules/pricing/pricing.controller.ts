import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('api/pricing')
export class PricingController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // GET /api/pricing  →  active rules
  @Get()
  async getRules() {
    const rows = await this.dataSource.query(`
      SELECT rule_id, rule_name AS name, rule_type, threshold_min, threshold_max,
             adjustment_type, adjustment_value, priority, is_active
      FROM pricing_rules
      WHERE is_active = 1
      ORDER BY priority DESC
    `);

    const data = rows.map((r: any) => ({
      rule_id: String(r.rule_id),
      name: r.name,
      condition: `occupancy BETWEEN ${r.threshold_min}% AND ${r.threshold_max}%`,
      multiplier: r.adjustment_type === 'percent'
        ? Number((1 + r.adjustment_value / 100).toFixed(4))
        : 1,
      priority: r.priority,
      is_active: r.is_active === true || r.is_active === 1,
    }));

    return { data };
  }

  // GET /api/pricing/history
  @Get('history')
  async getHistory(@Query('roomTypeId') roomTypeId?: string) {
    const cond = roomTypeId ? `AND ph.room_type_id = ${Number(roomTypeId)}` : '';
    const rows = await this.dataSource.query(`
      SELECT TOP 50
        ph.price_history_id AS id,
        ph.room_type_id,
        rt.name AS room_type_name,
        ph.old_price,
        ph.new_price,
        ph.change_pct,
        ph.note AS reason,
        u.email AS changed_by,
        ph.alert_flag,
        ph.changed_at
      FROM price_history ph
      JOIN room_types rt ON rt.room_type_id = ph.room_type_id
      JOIN users u ON u.user_id = ph.changed_by
      ${cond ? 'WHERE ' + cond.substring(4) : ''}
      ORDER BY ph.changed_at DESC
    `);

    const data = rows.map((p: any) => ({
      id: String(p.id),
      room_type_id: String(p.room_type_id),
      room_type_name: p.room_type_name,
      old_price: Number(p.old_price),
      new_price: Number(p.new_price),
      change_pct: Number(p.change_pct || 0),
      reason: p.reason || '',
      changed_by: p.changed_by,
      alert_flag: p.alert_flag === true || p.alert_flag === 1,
      changed_at: p.changed_at,
    }));

    return { data, total: data.length };
  }

  // GET /api/pricing/suggest
  @Get('suggest')
  async getSuggestion(@Query('roomTypeId') roomTypeId: string) {
    const rows = await this.dataSource.query(`
      SELECT
        rt.current_price,
        ROUND(
          100.0 * COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.booking_id END)
          / NULLIF(rt.total_rooms, 0),
        1) AS occupancy_pct
      FROM room_types rt
      LEFT JOIN bookings b
        ON b.room_type_id = rt.room_type_id
        AND CAST(GETDATE() AS DATE) BETWEEN b.check_in_date AND b.check_out_date
      WHERE rt.room_type_id = ${Number(roomTypeId)}
      GROUP BY rt.room_type_id, rt.current_price, rt.total_rooms
    `);

    if (!rows.length) throw new Error('Room not found');
    const { current_price, occupancy_pct } = rows[0];
    const occ = Number(occupancy_pct || 0);

    let pct = 0;
    let reasoning = 'Occupancy normal, no adjustment needed.';
    if (occ >= 90) { pct = 30; reasoning = `Occupancy ${occ}% — Emergency demand. +30% suggested.`; }
    else if (occ >= 70) { pct = 15; reasoning = `Occupancy ${occ}% — High demand. +15% suggested.`; }
    else if (occ >= 40) { pct = 0; reasoning = `Occupancy ${occ}% — Normal range. No change needed.`; }
    else if (occ >= 20) { pct = -10; reasoning = `Occupancy ${occ}% — Low demand. -10% suggested.`; }
    else { pct = -20; reasoning = `Occupancy ${occ}% — Very low. -20% suggested.`; }

    const suggested = Math.round(Number(current_price) * (1 + pct / 100) / 1000) * 1000;

    return {
      current_price: Number(current_price),
      suggested_price: suggested,
      change_pct: pct,
      reasoning,
      confidence: 85,
    };
  }

  // POST /api/pricing/update
  @Post('update')
  async updatePrice(
    @Body() body: { roomTypeId: string; newPrice: number; reason?: string },
  ) {
    const { roomTypeId, newPrice, reason } = body;
    // Set session context so trigger can capture the user id (use 1 as fallback)
    await this.dataSource.query(
      `EXEC sp_set_session_context N'current_user_id', 1`
    );
    await this.dataSource.query(
      `UPDATE room_types SET current_price = ${Number(newPrice)}, updated_at = GETDATE()
       WHERE room_type_id = ${Number(roomTypeId)}`
    );

    // Read back what trigger wrote to know if alert was fired
    const hist = await this.dataSource.query(`
      SELECT TOP 1 alert_flag, change_pct FROM price_history
      WHERE room_type_id = ${Number(roomTypeId)}
      ORDER BY changed_at DESC
    `);
    const alertFlag = hist.length ? (hist[0].alert_flag === 1 || hist[0].alert_flag === true) : false;
    const changePct = hist.length ? Number(hist[0].change_pct || 0) : 0;

    return {
      success: true,
      alert_flag: alertFlag,
      message: alertFlag
        ? `⚠️ Giá cập nhật! alert_flag = 1 vì biến động ${changePct.toFixed(1)}% > 50%`
        : '✓ Trigger ghi price_history thành công',
    };
  }
}