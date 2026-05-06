import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type HotelCatalogDocument = HydratedDocument<HotelCatalog>;

@Schema()
export class HotelCatalog {
  @Prop({ required: true, unique: true, index: true })
  hotel_id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description!: string;

  @Prop({ type: [Object] })
  amenities_embedded!: Record<string, any>[];

  @Prop([String])
  images!: string[];

  @Prop({ type: Object })
  location_embedded!: Record<string, any>;
}

export const HotelCatalogSchema = SchemaFactory.createForClass(HotelCatalog);
