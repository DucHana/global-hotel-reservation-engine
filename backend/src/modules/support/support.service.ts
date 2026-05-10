// ═══════════════════════════════════════════════════════════════
// support.service.ts — Thành viên 2
// Support Ticket system stored in MongoDB (flexible schema)
// ═══════════════════════════════════════════════════════════════
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SupportTicket,
  SupportTicketDocument,
} from './schemas/support-ticket.schema';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(SupportTicket.name)
    private ticketModel: Model<SupportTicketDocument>,
  ) {}

  // ── USER: Gửi yêu cầu hỗ trợ ───────────────────────────────
  async createTicket(data: {
    user_id: string;
    user_name: string;
    user_email: string;
    subject: string;
    message: string;
    category?: string;
    priority?: string;
    booking_id?: string;
  }) {
    const ticket = new this.ticketModel({
      ...data,
      status: 'open',
      priority: data.priority || 'medium',
      category: data.category || 'other',
    });
    await ticket.save();
    return {
      ticket_id: ticket._id,
      message: 'Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi trong vòng 24 giờ.',
    };
  }

  // ── USER: Xem ticket của mình ───────────────────────────────
  async getMyTickets(userId: string) {
    const tickets = await this.ticketModel
      .find({ user_id: userId })
      .sort({ createdAt: -1 })
      .lean();
    return { data: tickets, total: tickets.length };
  }

  // ── ADMIN: Danh sách tất cả tickets (filter by status/category) ─
  async getAllTickets(params: {
    status?: string;
    category?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, params.limit || 30);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (params.status)   filter.status   = params.status;
    if (params.category) filter.category = params.category;
    if (params.priority) filter.priority = params.priority;

    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.ticketModel.countDocuments(filter),
    ]);

    return { data: tickets, total, page, limit };
  }

  // ── ADMIN: Trả lời ticket ───────────────────────────────────
  async replyToTicket(
    ticketId: string,
    adminId: string,
    adminName: string,
    message: string,
  ) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket không tìm thấy');

    ticket.replies.push({
      admin_id: adminId,
      admin_name: adminName,
      message,
      replied_at: new Date(),
    });

    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();
    return { message: 'Đã gửi phản hồi' };
  }

  // ── ADMIN: Đóng ticket ──────────────────────────────────────
  async resolveTicket(ticketId: string, adminId: string) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket không tìm thấy');

    ticket.status = 'resolved';
    ticket.resolved_at = new Date();
    await ticket.save();

    return { message: 'Ticket đã được giải quyết' };
  }

  // ── ADMIN: Cập nhật trạng thái thủ công ────────────────────
  async updateTicketStatus(ticketId: string, status: string) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket không tìm thấy');
    
    ticket.status = status;
    if (status === 'resolved') ticket.resolved_at = new Date();
    await ticket.save();
    return { message: `Đã cập nhật trạng thái sang ${status}` };
  }

  // ── ADMIN: Analytics — tickets by category + status ─────────
  async getTicketStats() {
    const pipeline = [
      {
        $group: {
          _id: { category: '$category', status: '$status' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          total: { $sum: '$count' },
          by_status: {
            $push: { status: '$_id.status', count: '$count' },
          },
        },
      },
      { $sort: { total: -1 as 1 | -1 } },
    ];

    const result = await this.ticketModel.aggregate(pipeline);
    return { data: result };
  }
}
