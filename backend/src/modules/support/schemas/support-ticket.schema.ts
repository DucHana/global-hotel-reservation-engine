// ═══════════════════════════════════════════════════════════════
// support-ticket.schema.ts — Thành viên 2
// MongoDB schema cho Support Tickets
//
// Lý do dùng MongoDB:
//  • Support ticket có schema linh hoạt (đính kèm files, tags v.v.)
//  • Tìm kiếm full-text trên nội dung yêu cầu
//  • History/timeline của ticket là array of embedded docs
// ═══════════════════════════════════════════════════════════════
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type SupportTicketDocument = HydratedDocument<SupportTicket>;

@Schema({
  collection: 'support_tickets',
  timestamps: true,
})
export class SupportTicket extends Document {
  @Prop({ required: true, index: true })
  user_id!: string;

  @Prop({ required: true })
  user_name!: string;

  @Prop({ required: true })
  user_email!: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({
    type: String,
    enum: ['billing', 'booking', 'room_quality', 'service', 'other'],
    default: 'other',
    index: true,
  })
  category!: string;

  @Prop({
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true,
  })
  status!: string;

  @Prop({
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  })
  priority!: string;

  // Optional booking reference
  @Prop({ type: String, default: null })
  booking_id?: string | null;

  // Admin replies timeline
  @Prop({
    type: [
      {
        admin_id: String,
        admin_name: String,
        message: String,
        replied_at: Date,
      },
    ],
    default: [],
  })
  replies!: Array<{
    admin_id: string;
    admin_name: string;
    message: string;
    replied_at: Date;
  }>;

  @Prop({ type: Date, default: null })
  resolved_at?: Date | null;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);

// ── Indexes ───────────────────────────────────────────────────
SupportTicketSchema.index({ user_id: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, priority: -1 });
SupportTicketSchema.index({ category: 1, status: 1 });
SupportTicketSchema.index({ subject: 'text', message: 'text' });
