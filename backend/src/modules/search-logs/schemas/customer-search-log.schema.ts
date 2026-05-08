import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerSearchLogDocument = CustomerSearchLog & Document;

@Schema({ timestamps: true })
export class CustomerSearchLog {
  @Prop({ required: true })
  user_id!: string;

  @Prop({ required: true })
  search_query!: string;

  @Prop()
  results_count?: number;

  @Prop()
  city?: string;
}

export const CustomerSearchLogSchema = SchemaFactory.createForClass(CustomerSearchLog);
