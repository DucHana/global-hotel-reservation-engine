import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomType } from '../../database/entities/room-type.entity';
import { PriceHistory } from '../../database/entities/price-history.entity';

@Injectable()
export class PricingUpdateService {
  constructor(
    @InjectRepository(RoomType)
    private roomTypesRepository: Repository<RoomType>,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  async updatePrice(
    roomTypeId: number,
    newPrice: number,
    reason: string = '',
    userId: number,
  ) {
    const roomType = await this.roomTypesRepository.findOne({
      where: { room_type_id: roomTypeId },
    });
    if (!roomType) throw new NotFoundException('Loại phòng không tìm thấy');

    const oldPrice = Number(roomType.current_price);
    newPrice = Number(newPrice);

    // 1️⃣ Bỏ qua nếu giá không thay đổi
    if (newPrice === oldPrice) {
      return {
        message: 'Giá không thay đổi, bỏ qua cập nhật',
        data: { room_type_id: roomTypeId, old_price: oldPrice, new_price: newPrice, change_pct: '0.00', alert_flag: 0 },
      };
    }

    // 2️⃣ Validate min_price_floor và max_price_cap từ pricing_rules
    const rules = await this.roomTypesRepository.query(`
      SELECT 
        MIN(CASE WHEN min_price_floor IS NOT NULL THEN min_price_floor END) AS floor_price,
        MAX(CASE WHEN max_price_cap IS NOT NULL THEN max_price_cap END) AS cap_price
      FROM pricing_rules 
      WHERE is_active = 1
    `);
    const floorPrice = rules[0]?.floor_price ? Number(rules[0].floor_price) : null;
    const capPrice = rules[0]?.cap_price ? Number(rules[0].cap_price) : null;

    if (floorPrice && newPrice < floorPrice) {
      return {
        message: `Giá không được thấp hơn giá sàn ₫${floorPrice.toLocaleString('vi-VN')} (min_price_floor)`,
        data: { floor_price: floorPrice },
        error: 'BELOW_FLOOR',
      };
    }
    if (capPrice && newPrice > capPrice) {
      return {
        message: `Giá không được cao hơn giá trần ₫${capPrice.toLocaleString('vi-VN')} (max_price_cap)`,
        data: { cap_price: capPrice },
        error: 'ABOVE_CAP',
      };
    }

    const changePct = ((newPrice - oldPrice) / oldPrice) * 100;
    const alertFlag = Math.abs(changePct) > 50 ? 1 : 0;

    // 3️⃣ Set SESSION_CONTEXT để trigger ghi đúng user_id
    await this.roomTypesRepository.query(
      `EXEC sp_set_session_context @key = N'current_user_id', @value = @0`,
      [userId]
    );

    // 4️⃣ Update room_types — Trigger SQL sẽ TỰ GHI price_history (không ghi thêm ở đây)
    await this.roomTypesRepository.query(
      `UPDATE room_types SET current_price = @0, updated_at = GETDATE() WHERE room_type_id = @1`,
      [newPrice, roomTypeId]
    );

    // 5️⃣ Nếu có lý do, cập nhật note cho bản ghi vừa insert bởi trigger
    if (reason && reason.trim()) {
      await this.roomTypesRepository.query(`
        UPDATE TOP(1) price_history 
        SET note = @0 
        WHERE room_type_id = @1 
        AND note IS NULL 
        ORDER BY changed_at DESC
      `, [reason, roomTypeId]);
    }

    return {
      message: `Cập nhật giá thành công${alertFlag ? ' ⚠️ Biến động >50%' : ''}`,
      data: { room_type_id: roomTypeId, old_price: oldPrice, new_price: newPrice, change_pct: changePct.toFixed(2), alert_flag: alertFlag },
    };
  }

  async getPriceHistory(roomTypeId?: number) {
    // JOIN room_types + users để có tên phòng và tên người thay đổi
    let sql = `
      SELECT 
        ph.price_history_id,
        ph.room_type_id,
        rt.name AS room_type_name,
        h.name  AS hotel_name,
        ph.old_price,
        ph.new_price,
        ph.change_pct,
        ph.changed_by,
        u.full_name AS changed_by_name,
        ph.alert_flag,
        ph.note,
        ph.changed_at
      FROM price_history ph
      JOIN room_types rt ON ph.room_type_id = rt.room_type_id
      JOIN hotels h      ON rt.hotel_id     = h.hotel_id
      LEFT JOIN users u  ON ph.changed_by   = u.user_id
    `;
    const params: any[] = [];
    if (roomTypeId) {
      sql += ` WHERE ph.room_type_id = @0`;
      params.push(roomTypeId);
    }
    sql += ` ORDER BY ph.changed_at DESC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`;
    return await this.roomTypesRepository.query(sql, params);
  }


  async getSuggestion(roomTypeIdRaw: any) {
    const roomTypeId = parseInt(roomTypeIdRaw);
    if (isNaN(roomTypeId)) {
      return { error: 'Invalid roomTypeId' };
    }

    const room = await this.roomTypesRepository.findOne({ where: { room_type_id: roomTypeId } });
    if (!room) {
      return { error: 'Room type not found' };
    }

    // 1️⃣ Tính Occupancy trung bình 7 ngày gần nhất (đếm số đêm phòng đã bán)
    const totalRooms = room.total_rooms || 1;
    const windowDays = 7;
    const capacityOverWindow = totalRooms * windowDays;

    const activeBookings = await this.roomTypesRepository.query(
      `SELECT ISNULL(SUM(
        DATEDIFF(day,
          CASE WHEN b.check_in_date < DATEADD(day,-6,CAST(GETDATE() AS DATE))
               THEN DATEADD(day,-6,CAST(GETDATE() AS DATE))
               ELSE b.check_in_date END,
          CASE WHEN b.check_out_date > CAST(GETDATE() AS DATE)
               THEN CAST(GETDATE() AS DATE)
               ELSE b.check_out_date END
        )
      ), 0) AS booked_nights
       FROM bookings b
       WHERE b.room_type_id = @0
       AND b.status IN ('confirmed', 'completed')
       AND b.check_in_date <= CAST(GETDATE() AS DATE)
       AND b.check_out_date >= DATEADD(day,-6,CAST(GETDATE() AS DATE))`,
      [roomTypeId]
    );
    const bookedDaysCount = parseInt(activeBookings[0]?.booked_nights || 0);
    let occupancyRate = parseFloat(((bookedDaysCount / capacityOverWindow) * 100).toFixed(2));

    // 2️⃣ Kiểm tra "Phòng mới" (Dành cho phòng thực sự không có ai đặt)
    let isNewRoom = false;
    const daysSinceCreated = Math.floor((Date.now() - new Date(room.created_at).getTime()) / (1000 * 60 * 60 * 24));
    // Nếu mới tạo trong ngày HOẶC không có đêm nào được đặt trong tuần qua
    if (bookedDaysCount < 1 || daysSinceCreated < 1) {
      isNewRoom = true;
    }

    // 3️⃣ Quy ước trung bình (Historical Baseline) - Chỉ dùng khi không có dữ liệu thực tế
    let isUsingBaseline = false;
    if (occupancyRate === 0 && !isNewRoom) {
      const dayOfWeek = new Date().getDay();
      const baselines = [85, 35, 40, 45, 40, 55, 90]; 
      occupancyRate = baselines[dayOfWeek];
      isUsingBaseline = true;
    }

    // 4️⃣ Gọi Stored Procedure để tính giá đề xuất
    const query = `
      DECLARE @suggested DECIMAL(15, 2);
      DECLARE @rname NVARCHAR(255);
      EXEC sp_calculate_suggested_price 
        @room_type_id = @0,
        @occupancy_rate = @1,
        @is_new_room = @2,
        @suggested_price = @suggested OUTPUT,
        @rule_name = @rname OUTPUT;
      SELECT @suggested as suggested_price, @rname as rule_name;
    `;

    let suggested = 0;
    let appliedRule = 'Standard Rate';
    try {
      const result = await this.roomTypesRepository.query(query, [roomTypeId, occupancyRate, isNewRoom ? 1 : 0]);
      suggested = result[0]?.suggested_price || 0;
      appliedRule = result[0]?.rule_name || 'Standard Rate';
    } catch (e) {
      suggested = Math.round(Number(room.current_price) * 1.05 / 1000) * 1000;
    }

    if (suggested === 0) suggested = Number(room.current_price);

    const basePrice = Number(room.base_price);
    const currentPrice = Number(room.current_price);
    
    const changeFromCurrent = currentPrice > 0 ? parseFloat(((suggested - currentPrice) / currentPrice * 100).toFixed(1)) : 0;
    const changeFromBase = basePrice > 0 ? parseFloat(((suggested - basePrice) / basePrice * 100).toFixed(1)) : 0;

    let reasoning = "";
    if (isNewRoom) {
      if (appliedRule !== 'Standard Rate') {
        reasoning = `✨ PHÒNG MỚI: Dù chưa có dữ liệu đặt phòng, AI nhận diện đang trong [${appliedRule}]. Đề xuất điều chỉnh dựa trên Giá Gốc.`;
      } else {
        reasoning = `✨ PHÒNG MỚI: Dữ liệu đặt phòng chưa đủ. AI đề xuất giữ Giá Gốc (Base Price) để ổn định thị trường.`;
      }
    } else if (isUsingBaseline) {
      reasoning = `📈 DỰ BÁO: Áp dụng quy tắc [${appliedRule}] dựa trên xu hướng lịch sử (Dự kiến ${occupancyRate}%).`;
    } else {
      reasoning = `📊 THỰC TẾ: Áp dụng quy tắc [${appliedRule}] dựa trên Occupancy 7 ngày qua (${occupancyRate}%).`;
    }

    return {
      room_type_id: roomTypeId,
      room_name: room.name,
      base_price: basePrice,
      current_price: currentPrice,
      suggested_price: suggested,
      occupancy_rate: occupancyRate,
      change_from_current: changeFromCurrent,
      change_from_base: changeFromBase,
      reasoning: reasoning,
      rule_name: appliedRule,
      is_new_room: isNewRoom,
      confidence: isNewRoom ? 60 : (isUsingBaseline ? 75 : 95),
    };
  }
}