// ═══════════════════════════════════════════════════════════════
// room-catalog.schema.ts — Thành viên 2
// MongoDB schema cho Room Catalog (semi-structured data)
//
// Lý do dùng MongoDB:
//  • Mỗi loại phòng có tiện nghi khác nhau (linh hoạt schema)
//  • Lưu nhiều ảnh, mô tả đa ngôn ngữ
//  • Đọc nhiều (1000s req/min) — MongoDB scale tốt hơn SQL cho read
//  • Caching với Redis (cache aside pattern) có thể tích hợp sau
// ═══════════════════════════════════════════════════════════════
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type RoomCatalogDocument = HydratedDocument<RoomCatalog>;

@Schema({
  collection: 'room_catalog',
  timestamps: true,
})
export class RoomCatalog extends Document {
  // ── Reference to SQL Server room_type_id (sync key) ────────
  @Prop({ required: true, unique: true, index: true })
  room_type_id!: number;

  @Prop({ required: true, index: true })
  hotel_id!: number;

  @Prop({ required: true, index: true })
  hotel_name!: string;

  @Prop({ required: true, index: true })
  name!: string;

  // ── Flexible amenities (array of tags) ─────────────────────
  @Prop({ type: [String], default: [], index: true })
  amenities!: string[];

  // ── Images (multiple URLs with metadata) ───────────────────
  @Prop({
    type: [
      {
        url: String,
        alt: String,
        is_primary: Boolean,
        order: Number,
      },
    ],
    default: [],
  })
  images!: Array<{
    url: string;
    alt: string;
    is_primary: boolean;
    order: number;
  }>;

  // ── Multilingual description ────────────────────────────────
  @Prop({ type: Object, default: {} })
  description!: {
    vi?: string;
    en?: string;
  };

  // ── Room details ────────────────────────────────────────────
  @Prop({ default: 2 })
  capacity!: number;

  @Prop({ default: 0 })
  size_sqm!: number;

  @Prop({ type: String, default: 'standard' })
  bed_type!: string; // 'king', 'queen', 'twin', 'double', 'standard'

  @Prop({ default: 1 })
  floor!: number;

  // ── Pricing (denormalized from SQL for fast read) ───────────
  @Prop({ default: 0 })
  base_price!: number;

  @Prop({ default: 0 })
  current_price!: number;

  // ── Status ──────────────────────────────────────────────────
  @Prop({ default: true, index: true })
  is_active!: boolean;

  // ── Search boost / ranking ──────────────────────────────────
  @Prop({ default: 0 })
  rating!: number; // 0–5 star average

  @Prop({ default: 0 })
  review_count!: number;

  @Prop({ default: 0 })
  booking_count!: number; // for popularity sorting
}

export const RoomCatalogSchema = SchemaFactory.createForClass(RoomCatalog);

// ── Compound Indexes for search performance ───────────────────
// Index: Search by hotel + active status
RoomCatalogSchema.index({ hotel_id: 1, is_active: 1 });

// Index: Price range filter
RoomCatalogSchema.index({ current_price: 1 });

// Full-text search on name + description
RoomCatalogSchema.index({ name: 'text', 'description.vi': 'text', 'description.en': 'text' });

// Compound: hotel + price (for sorted search results)
RoomCatalogSchema.index({ hotel_id: 1, current_price: 1 });
