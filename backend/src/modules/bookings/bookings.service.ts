// ═══════════════════════════════════════════════════════════════
// bookings.service.ts — Thành viên 1
// Đã fix lỗi ngày tháng & Bổ sung log bắt lỗi Stored Procedure
// ═══════════════════════════════════════════════════════════════
import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // ─────────────────────────────────────────────────────────────
  // 1. CREATE BOOKING — ACID Transaction + Pessimistic Locking
  // ─────────────────────────────────────────────────────────────
  async createBooking(dto: CreateBookingDto) {
    const checkIn = new Date(dto.check_in_date);
    const checkOut = new Date(dto.check_out_date);
    
    // FIX: Chuẩn hóa thời gian về nửa đêm (00:00:00) để không bị lệch múi giờ
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn >= checkOut) {
      throw new BadRequestException('Ngày trả phòng (check_out) phải sau ngày nhận phòng (check_in)');
    }
    if (checkIn < today) {
      throw new BadRequestException('Không thể đặt phòng cho ngày trong quá khứ');
    }

    let result: any[];
    try {
      result = await this.dataSource.query(
        `EXEC sp_create_booking @UserId=@0, @RoomTypeId=@1, @CheckIn=@2, @CheckOut=@3`,
        [dto.user_id, dto.room_type_id, dto.check_in_date, dto.check_out_date],
      );
    } catch (err: any) {
      // Bổ sung dòng này để lật tẩy lỗi nếu Stored Procedure code sai:
      console.error('❌ [BookingsService] Lỗi từ SQL Server (sp_create_booking):', err.message || err);

      if (err?.originalError?.message?.includes('DOUBLE_BOOKING')) {
        throw new ConflictException(
          'Phòng đã hết chỗ trong khoảng thời gian này. Vui lòng chọn ngày khác.',
        );
      }
      if (err?.originalError?.message?.includes('CAPACITY_EXCEEDED')) {
        throw new ConflictException('Loại phòng không còn phòng trống trong thời gian này.');
      }
      throw new InternalServerErrorException('Lỗi hệ thống khi tạo đặt phòng: ' + err.message);
    }

    const row = result?.[0];
    if (!row || row.status === 'ERROR') {
      throw new ConflictException(row?.message || 'Không thể tạo đặt phòng. Vui lòng thử lại sau.');
    }

    return {
      booking_id: String(row.booking_id),
      message: row.message || 'Đặt phòng thành công',
      total_price: Number(row.total_price),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. GET ALL BOOKINGS (Admin view — paginated, filterable)
  // ─────────────────────────────────────────────────────────────
  async findAll(params: {
    status?: string;
    userId?: number;
    roomTypeId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, params.limit || 50);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const sqlParams: (string | number)[] = [];
    let paramIdx = 0;

    const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (params.status && allowedStatuses.includes(params.status)) {
      conditions.push(`b.status = @${paramIdx++}`);
      sqlParams.push(params.status);
    }
    if (params.userId && !isNaN(params.userId)) {
      conditions.push(`b.user_id = @${paramIdx++}`);
      sqlParams.push(params.userId);
    }
    if (params.roomTypeId && !isNaN(params.roomTypeId)) {
      conditions.push(`b.room_type_id = @${paramIdx++}`);
      sqlParams.push(params.roomTypeId);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await this.dataSource.query(
      `
      SELECT
        b.booking_id,
        b.user_id,
        u.full_name   AS user_name,
        b.room_type_id,
        rt.name       AS room_type_name,
        h.name        AS hotel_name,
        b.check_in_date  AS check_in,
        b.check_out_date AS check_out,
        DATEDIFF(day, b.check_in_date, b.check_out_date) AS nights,
        b.total_price,
        b.status,
        b.created_at
      FROM bookings b
      JOIN users     u  ON u.user_id       = b.user_id
      JOIN room_types rt ON rt.room_type_id = b.room_type_id
      JOIN hotels     h  ON h.hotel_id      = rt.hotel_id
      ${where}
      ORDER BY b.created_at DESC
      OFFSET @${paramIdx} ROWS FETCH NEXT @${paramIdx + 1} ROWS ONLY
      `,
      [...sqlParams, offset, limit],
    );

    const [countRow] = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM bookings b ${where}`,
      sqlParams,
    );

    return {
      data: rows.map((b: any) => ({
        booking_id: String(b.booking_id),
        user_id: String(b.user_id),
        user_name: b.user_name,
        room_type_id: String(b.room_type_id),
        room_type_name: b.room_type_name,
        hotel_name: b.hotel_name,
        check_in: b.check_in,
        check_out: b.check_out,
        nights: Number(b.nights),
        total_price: Number(b.total_price),
        status: b.status,
        created_at: b.created_at,
      })),
      total: Number(countRow?.total || 0),
      page,
      limit,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. GET BOOKING BY ID
  // ─────────────────────────────────────────────────────────────
  async findById(bookingId: number) {
    const [row] = await this.dataSource.query(
      `
      SELECT
        b.booking_id, b.user_id, u.full_name AS user_name,
        b.room_type_id, rt.name AS room_type_name, h.name AS hotel_name,
        b.check_in_date AS check_in, b.check_out_date AS check_out,
        DATEDIFF(day, b.check_in_date, b.check_out_date) AS nights,
        b.total_price, b.status, b.created_at
      FROM bookings b
      JOIN users     u  ON u.user_id       = b.user_id
      JOIN room_types rt ON rt.room_type_id = b.room_type_id
      JOIN hotels     h  ON h.hotel_id      = rt.hotel_id
      WHERE b.booking_id = @0
      `,
      [bookingId],
    );
    if (!row) throw new NotFoundException('Đặt phòng không tìm thấy');
    return {
      ...row,
      booking_id: String(row.booking_id),
      nights: Number(row.nights),
      total_price: Number(row.total_price),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. UPDATE BOOKING STATUS (Admin: confirm / cancel / complete)
  // ─────────────────────────────────────────────────────────────
  async updateStatus(
    bookingId: number,
    newStatus: string,
    adminUserId: number,
  ) {
    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException('Trạng thái không hợp lệ: ' + newStatus);
    }

    const booking = await this.findById(bookingId);

    const transitions: Record<string, string[]> = {
      pending:   ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    if (!transitions[booking.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ '${booking.status}' sang '${newStatus}'`,
      );
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction('READ COMMITTED');
    try {
      await runner.query(
        `UPDATE bookings SET status = @0 WHERE booking_id = @1`,
        [newStatus, bookingId],
      );
      await runner.query(
        `INSERT INTO audit_logs (event_type, detail, created_by)
         VALUES (@0, @1, @2)`,
        [
          'BOOKING_STATUS_CHANGE',
          `Booking ${bookingId}: ${booking.status} → ${newStatus}`,
          adminUserId,
        ],
      );
      await runner.commitTransaction();
    } catch (err) {
      await runner.rollbackTransaction();
      throw new InternalServerErrorException('Lỗi cập nhật trạng thái: ' + (err as Error).message);
    } finally {
      await runner.release();
    }

    return { message: `Cập nhật trạng thái thành công: ${newStatus}`, booking_id: bookingId };
  }

  // ─────────────────────────────────────────────────────────────
  // 5. CANCEL BOOKING (User can cancel their own pending booking)
  // ─────────────────────────────────────────────────────────────
  async cancelBooking(bookingId: number, userId: number) {
    const booking = await this.findById(bookingId);

    if (String(booking.user_id) !== String(userId)) {
      throw new BadRequestException('Bạn không có quyền hủy đặt phòng này');
    }
    if (booking.status !== 'pending') {
      throw new BadRequestException('Chỉ có thể hủy đặt phòng ở trạng thái pending');
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction('READ COMMITTED');
    try {
      await runner.query(
        `UPDATE bookings SET status = 'cancelled' WHERE booking_id = @0`,
        [bookingId],
      );
      await runner.query(
        `INSERT INTO audit_logs (event_type, detail, created_by) VALUES (@0, @1, @2)`,
        ['BOOKING_CANCELLED', `User ${userId} cancelled booking ${bookingId}`, userId],
      );
      await runner.commitTransaction();
    } catch (err) {
      await runner.rollbackTransaction();
      throw new InternalServerErrorException('Lỗi hủy đặt phòng');
    } finally {
      await runner.release();
    }

    return { message: 'Hủy đặt phòng thành công', booking_id: bookingId };
  }

  // ─────────────────────────────────────────────────────────────
  // 6. GET BOOKING HISTORY FOR A USER
  // ─────────────────────────────────────────────────────────────
  async getMyBookings(userId: number) {
    const rows = await this.dataSource.query(
      `
      SELECT
        b.booking_id, b.room_type_id, rt.name AS room_type_name,
        h.name AS hotel_name, b.check_in_date AS check_in,
        b.check_out_date AS check_out,
        DATEDIFF(day, b.check_in_date, b.check_out_date) AS nights,
        b.total_price, b.status, b.created_at
      FROM bookings b
      JOIN room_types rt ON rt.room_type_id = b.room_type_id
      JOIN hotels     h  ON h.hotel_id      = rt.hotel_id
      WHERE b.user_id = @0
      ORDER BY b.created_at DESC
      `,
      [userId],
    );
    return {
      data: rows.map((b: any) => ({
        ...b,
        booking_id: String(b.booking_id),
        nights: Number(b.nights),
        total_price: Number(b.total_price),
      })),
      total: rows.length,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 7. CHECK AVAILABILITY (without locking — read-only check)
  // ─────────────────────────────────────────────────────────────
  async checkAvailability(roomTypeId: number, checkIn: string, checkOut: string) {
    const [row] = await this.dataSource.query(
      `
      SELECT
        rt.room_type_id,
        rt.name,
        rt.total_rooms,
        rt.current_price,
        (
          SELECT COUNT(DISTINCT b.booking_id)
          FROM bookings b
          WHERE b.room_type_id = rt.room_type_id
            AND b.status IN ('pending', 'confirmed')
            AND b.check_in_date  < @1
            AND b.check_out_date > @0
        ) AS booked_rooms,
        rt.total_rooms - (
          SELECT COUNT(DISTINCT b.booking_id)
          FROM bookings b
          WHERE b.room_type_id = rt.room_type_id
            AND b.status IN ('pending', 'confirmed')
            AND b.check_in_date  < @1
            AND b.check_out_date > @0
        ) AS available_rooms
      FROM room_types rt
      WHERE rt.room_type_id = @2
        AND rt.is_active = 1
      `,
      [checkIn, checkOut, roomTypeId],
    );

    if (!row) throw new NotFoundException('Loại phòng không tìm thấy');

    return {
      room_type_id: String(row.room_type_id),
      name: row.name,
      total_rooms: Number(row.total_rooms),
      booked_rooms: Number(row.booked_rooms),
      available_rooms: Number(row.available_rooms),
      current_price: Number(row.current_price),
      is_available: Number(row.available_rooms) > 0,
    };
  }
}