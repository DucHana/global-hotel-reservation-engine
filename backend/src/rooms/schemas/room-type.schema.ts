import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoomTypeDocument = HydratedDocument<RoomType>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class RoomType {
  @Prop({ required: true, index: true })
  hotel_id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Number, index: true })
  base_price!: number;

  @Prop({ required: true, type: Number, index: true })
  capacity!: number;

  @Prop([String])
  amenities!: string[];

  @Prop([String])
  images!: string[];

  @Prop({ type: Number, default: 0 })
  average_rating!: number;

  @Prop({ type: [Object] })
  rooms_embedded!: Record<string, any>[];

  @Prop({ type: [Object] })
  pricing_rules_embedded!: Record<string, any>[];
}

export const RoomTypeSchema = SchemaFactory.createForClass(RoomType);
