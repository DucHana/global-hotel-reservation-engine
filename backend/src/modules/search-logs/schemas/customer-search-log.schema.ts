// ═══════════════════════════════════════════════════════════════
// customer-search-log.schema.ts — Thành viên 2
// MongoDB / Mongoose schema cho Search Logs
//
// Polyglot Persistence: Dữ liệu hành vi tìm kiếm (unstructured/semi-structured)
// được lưu vào MongoDB thay vì SQL Server vì:
//  • Schema linh hoạt (filters thay đổi theo loại tìm kiếm)
//  • Write-heavy: hàng nghìn log/phút cần throughput cao
//  • Aggregation pipeline mạnh cho analytics hành vi
// ═══════════════════════════════════════════════════════════════
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type CustomerSearchLogDocument = HydratedDocument<CustomerSearchLog>;

@Schema({
  collection: 'customer_search_logs',
  timestamps: true, // auto createdAt, updatedAt
})
export class CustomerSearchLog extends Document {
  // ── Core search context ────────────────────────────────────
  @Prop({ required: true, index: true })
  city!: string;

  @Prop({ required: true, type: Date, index: true })
  check_in!: Date;

  @Prop({ required: true, type: Date })
  check_out!: Date;

  @Prop({ default: 1 })
  guests!: number;

  // ── Applied filters (flexible schema = NoSQL advantage) ────
  @Prop({ type: Object, default: {} })
  filters!: {
    min_price?: number;
    max_price?: number;
    amenities?: string[];
    capacity?: number;
    hotel_id?: string;
    star_rating?: number;
    sort_by?: string;
  };

  // ── Result metadata ────────────────────────────────────────
  @Prop({ default: 0 })
  results_count!: number;

  @Prop({ default: false, index: true })
  converted!: boolean; // did the user book after this search?

  @Prop({ type: String, default: null })
  booked_room_type_id?: string | null;

  // ── Session / User tracking ────────────────────────────────
  @Prop({ type: String, default: null, index: true })
  user_id?: string | null; // null = anonymous user

  @Prop({ required: true, index: true })
  session_id!: string;

  @Prop({ type: String, default: null })
  ip_address?: string | null;

  @Prop({ type: String, default: null })
  user_agent?: string | null;

  // ── Performance ────────────────────────────────────────────
  @Prop({ default: 0 })
  response_time_ms!: number;
}

export const CustomerSearchLogSchema =
  SchemaFactory.createForClass(CustomerSearchLog);

// ── Compound Indexes for analytics performance ────────────────
// Index 1: Thành phố + ngày tìm kiếm (top cities query)
CustomerSearchLogSchema.index({ city: 1, createdAt: -1 });

// Index 2: Chuyển đổi theo thành phố (conversion rate query)
CustomerSearchLogSchema.index({ city: 1, converted: 1 });

// Index 3: User behavior (lịch sử tìm kiếm của user)
CustomerSearchLogSchema.index({ user_id: 1, createdAt: -1 });

// Index 4: Session lookup
CustomerSearchLogSchema.index({ session_id: 1 });

// Index 5: Full-text search on city (Atlas Search / text index)
CustomerSearchLogSchema.index({ city: 'text' });
