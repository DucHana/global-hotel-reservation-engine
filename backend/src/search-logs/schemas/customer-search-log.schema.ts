import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerSearchLogDocument = HydratedDocument<CustomerSearchLog>;

@Schema({ timestamps: { createdAt: 'search_timestamp', updatedAt: false } })
export class CustomerSearchLog {
  @Prop({ type: String })
  user_id!: string;

  @Prop()
  session_id!: string;

  @Prop({ default: false })
  converted_to_booking!: boolean;

  @Prop({ type: Object })
  search_params_embedded!: Record<string, any>;
}

export const CustomerSearchLogSchema =
  SchemaFactory.createForClass(CustomerSearchLog);
