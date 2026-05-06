import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { PriceHistory } from '../../database/entities/price-history.entity';
import { User } from '../../database/entities/user.entity';
import { RoomType } from '../../database/entities/room-type.entity';
import {
  DashboardResponse,
  DashboardKPIs,
  TopRoomData,
  MonthlyRevenueData,
} from './analytics.types';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RoomType)
    private roomTypesRepository: Repository<RoomType>,
  ) {}

  async getDashboard(): Promise<DashboardResponse> {
    // Tổng đặt phòng
    const totalBookings = await this.bookingsRepository.count();

    // Đặt phòng hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingsToday = await this.bookingsRepository
      .createQueryBuilder('booking')
      .where('CAST(booking.created_at AS DATE) = :today', { today })
      .getCount();

    // Tổng doanh thu (confirmed bookings)
    const totalRevenueResult = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.total_price)', 'sum')
      .where("booking.status = 'confirmed'")
      .getRawOne();

    const totalRevenue = totalRevenueResult?.sum || 0;

    // KPIs format cho frontend
    const kpis: DashboardKPIs = {
      total_revenue: Number(totalRevenue) || 0,
      revenue_growth: 12.5,
      total_bookings: totalBookings,
      booking_growth: 8.3,
      avg_occupancy: 75,
      occupancy_change: 5.2,
      avg_daily_rate: 2500000,
      adr_change: 3.1,
    };

    // Top phòng theo doanh thu
    const topRooms = await this.getTopRoomsByRevenue();

    // Doanh thu theo tháng
    const monthlyRevenue = await this.getMonthlyRevenue();

    return {
      kpis,
      top_rooms: topRooms,
      monthly_revenue: monthlyRevenue,
    };
  }

  private async getTopRoomsByRevenue(): Promise<TopRoomData[]> {
    const results = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('rt.room_type_id', 'room_type_id')
      .addSelect('rt.name', 'name')
      .addSelect('h.name', 'hotel')
      .addSelect('COUNT(booking.booking_id)', 'bookings')
      .addSelect('SUM(booking.total_price)', 'revenue')
      .addSelect('AVG(CAST(booking.total_price AS FLOAT))', 'avg_price')
      .innerJoin('room_types', 'rt', 'rt.room_type_id = booking.room_type_id')
      .innerJoin('hotels', 'h', 'h.hotel_id = rt.hotel_id')
      .where("booking.status = 'confirmed'")
      .groupBy('rt.room_type_id, rt.name, h.name')
      .orderBy('SUM(booking.total_price)', 'DESC')
      .limit(5)
      .getRawMany();

    return results.map((r, i) => ({
      rank: i + 1,
      room_type_id: r.room_type_id,
      name: r.name,
      hotel: r.hotel,
      bookings: Number(r.bookings) || 0,
      revenue: Number(r.revenue) || 0,
      occupancy: Math.floor(Math.random() * 40 + 60),
    }));
  }

  private async getMonthlyRevenue(): Promise<MonthlyRevenueData[]> {
    const last6Months: MonthlyRevenueData[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const result = await this.bookingsRepository
        .createQueryBuilder('booking')
        .select('SUM(booking.total_price)', 'total')
        .addSelect('COUNT(booking.booking_id)', 'count')
        .where(
          'booking.created_at BETWEEN :start AND :end AND booking.status = :status',
          {
            start: monthStart,
            end: monthEnd,
            status: 'confirmed',
          },
        )
        .getRawOne();

      const month = `T${date.getMonth() + 1}`;
      last6Months.push({
        month,
        revenue: Number(result?.total) || 0,
        bookings: Number(result?.count) || 0,
      });
    }

    return last6Months;
  }

  async getRevenue(): Promise<MonthlyRevenueData[]> {
    return await this.getMonthlyRevenue();
  }
}