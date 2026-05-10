// ═══════════════════════════════════════════════════════════════
// search-logs.service.ts — Thành viên 2
// NoSQL Service: MongoDB search log storage + aggregation analytics
//
// Kỹ thuật áp dụng:
//  1. Polyglot Persistence: tất cả search logs lưu MongoDB
//  2. Compound Index: { city, createdAt } cho analytics nhanh
//  3. Aggregation Pipeline: top cities, popular amenities, trends
//  4. Indexing Tuning: text index cho city search
// ═══════════════════════════════════════════════════════════════
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CustomerSearchLog,
  CustomerSearchLogDocument,
} from './schemas/customer-search-log.schema';

@Injectable()
export class SearchLogsService {
  constructor(
    @InjectModel(CustomerSearchLog.name)
    private searchLogModel: Model<CustomerSearchLogDocument>,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // 1. LOG A SEARCH EVENT (write to MongoDB)
  //    Called every time a user performs a search
  // ─────────────────────────────────────────────────────────────
  async logSearch(data: {
    city: string;
    check_in: string;
    check_out: string;
    guests?: number;
    filters?: Record<string, unknown>;
    results_count?: number;
    user_id?: string | null;
    session_id: string;
    ip_address?: string;
    user_agent?: string;
    response_time_ms?: number;
  }) {
    const log = new this.searchLogModel({
      city: data.city,
      check_in: new Date(data.check_in),
      check_out: new Date(data.check_out),
      guests: data.guests || 1,
      filters: data.filters || {},
      results_count: data.results_count || 0,
      converted: false,
      user_id: data.user_id || null,
      session_id: data.session_id,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      response_time_ms: data.response_time_ms || 0,
    });
    await log.save();
    return { message: 'Search logged', id: log._id };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MARK CONVERSION (khi user đặt phòng sau khi tìm kiếm)
  // ─────────────────────────────────────────────────────────────
  async markConverted(sessionId: string, roomTypeId: string) {
    await this.searchLogModel.updateMany(
      { session_id: sessionId, converted: false },
      {
        $set: {
          converted: true,
          booked_room_type_id: roomTypeId,
        },
      },
    );
    return { message: 'Conversion marked' };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. GET RECENT LOGS (admin view)
  // ─────────────────────────────────────────────────────────────
  async getRecentLogs(limit = 50) {
    const logs = await this.searchLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-user_agent -ip_address') // exclude PII in list view
      .lean();
    return { data: logs, total: logs.length };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. AGGREGATION: Top cities by search volume
  //    MongoDB pipeline: $group → $sort → $limit
  // ─────────────────────────────────────────────────────────────
  async getTopCities(days = 30, limit = 10) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const pipeline: any[] = [
      // Stage 1: Filter by time range
      { $match: { createdAt: { $gte: since } } },

      // Stage 2: Group by city — count searches + conversions
      {
        $group: {
          _id: '$city',
          search_count: { $sum: 1 },
          converted_count: {
            $sum: { $cond: [{ $eq: ['$converted', true] }, 1, 0] },
          },
          avg_results: { $avg: '$results_count' },
          avg_response_ms: { $avg: '$response_time_ms' },
        },
      },

      // Stage 3: Calculate conversion rate
      {
        $addFields: {
          conversion_rate: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      '$converted_count',
                      { $cond: [{ $eq: ['$search_count', 0] }, 1, '$search_count'] },
                    ],
                  },
                  100,
                ],
              },
              1,
            ],
          },
        },
      },

      // Stage 4: Sort by search volume
      { $sort: { search_count: -1 as 1 | -1 } },

      // Stage 5: Limit results
      { $limit: limit },

      // Stage 6: Reshape output
      {
        $project: {
          _id: 0,
          city: '$_id',
          search_count: 1,
          converted_count: 1,
          conversion_rate: 1,
          avg_results: { $round: ['$avg_results', 0] },
          avg_response_ms: { $round: ['$avg_response_ms', 0] },
        },
      },
    ];

    const result = await this.searchLogModel.aggregate(pipeline);
    return { data: result, days, generated_at: new Date() };
  }

  // ─────────────────────────────────────────────────────────────
  // 5. AGGREGATION: Popular amenities searched by users
  // ─────────────────────────────────────────────────────────────
  async getPopularAmenities(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: since }, 'filters.amenities': { $exists: true, $ne: [] } } },

      // Unwind amenities array to individual documents
      { $unwind: '$filters.amenities' },

      // Group and count
      {
        $group: {
          _id: '$filters.amenities',
          count: { $sum: 1 },
        },
      },

      { $sort: { count: -1 as 1 | -1 } },
      { $limit: 15 },

      {
        $project: {
          _id: 0,
          amenity: '$_id',
          count: 1,
        },
      },
    ];

    const result = await this.searchLogModel.aggregate(pipeline);
    return { data: result, days };
  }

  // ─────────────────────────────────────────────────────────────
  // 6. AGGREGATION: Daily search trend (last N days)
  // ─────────────────────────────────────────────────────────────
  async getSearchTrend(days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: since } } },

      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          searches: { $sum: 1 },
          conversions: {
            $sum: { $cond: [{ $eq: ['$converted', true] }, 1, 0] },
          },
        },
      },

      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },

      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day',
                },
              },
            },
          },
          searches: 1,
          conversions: 1,
        },
      },
    ];

    const result = await this.searchLogModel.aggregate(pipeline);
    return { data: result, days };
  }

  // ─────────────────────────────────────────────────────────────
  // 7. AGGREGATION: Price range preferences
  // ─────────────────────────────────────────────────────────────
  async getPriceRangePreferences(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const pipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: since },
          'filters.max_price': { $exists: true, $gt: 0 },
        },
      },

      {
        $bucket: {
          groupBy: '$filters.max_price',
          boundaries: [0, 1000000, 2000000, 3000000, 5000000, 10000000],
          default: 'over_10M',
          output: {
            count: { $sum: 1 },
            avg_max_price: { $avg: '$filters.max_price' },
          },
        },
      },
    ];

    const result = await this.searchLogModel.aggregate(pipeline);
    const labels = [
      'Dưới 1M', '1M–2M', '2M–3M', '3M–5M', '5M–10M', 'Trên 10M',
    ];
    return {
      data: result.map((r: any, i: number) => ({
        range: labels[i] || String(r._id),
        count: r.count,
        avg_max_price: Math.round(r.avg_max_price),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 8. SEARCH USER HISTORY
  // ─────────────────────────────────────────────────────────────
  async getUserHistory(userId: string, limit = 20) {
    const logs = await this.searchLogModel
      .find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return { data: logs, total: logs.length };
  }
}
