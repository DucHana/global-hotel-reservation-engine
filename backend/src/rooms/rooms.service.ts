import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomType, RoomTypeDocument } from './schemas/room-type.schema';
import {
  HotelCatalog,
  HotelCatalogDocument,
} from './schemas/hotel-catalog.schema';
import {
  CustomerSearchLog,
  CustomerSearchLogDocument,
} from '../search-logs/schemas/customer-search-log.schema';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomTypeDocument>,
    @InjectModel(HotelCatalog.name)
    private hotelCatalogModel: Model<HotelCatalogDocument>,
    @InjectModel(CustomerSearchLog.name)
    private searchLogModel: Model<CustomerSearchLogDocument>,
  ) {}

  async createRoomType(data: any) {
    const newRoomType = new this.roomTypeModel(data);
    return newRoomType.save();
  }

  async searchRooms(query: any, userId?: string, sessionId?: string) {
    const { city, minPrice, maxPrice, amenities, guests, keyword } = query;

    const searchData = {
      user_id: userId,
      session_id: sessionId || 'guest-session',
      search_params_embedded: {
        city,
        minPrice,
        maxPrice,
        amenities,
        guests,
        keyword,
      },
      converted_to_booking: false,
    };

    this.searchLogModel.create(searchData).catch((err) => {
      console.error(err);
    });

    let matchedHotelIds: string[] = [];
    if (city) {
      const hotels = await this.hotelCatalogModel
        .find({ 'location_embedded.city': city })
        .select('hotel_id')
        .lean();
      matchedHotelIds = hotels.map((h) => h.hotel_id);
      if (matchedHotelIds.length === 0) return { total: 0, data: [] };
    }

    const roomFilter: any = {};

    if (matchedHotelIds.length > 0) {
      roomFilter.hotel_id = { $in: matchedHotelIds };
    }

    if (minPrice || maxPrice) {
      roomFilter.base_price = {};
      if (minPrice) roomFilter.base_price.$gte = Number(minPrice);
      if (maxPrice) roomFilter.base_price.$lte = Number(maxPrice);
    }

    if (guests) {
      roomFilter.capacity = { $gte: Number(guests) };
    }

    if (amenities) {
      const amenitiesArray = amenities
        .split(',')
        .map((item: string) => item.trim());
      roomFilter.amenities = { $all: amenitiesArray };
    }

    const results = await this.roomTypeModel.find(roomFilter).lean().exec();

    return {
      total: results.length,
      data: results,
    };
  }
}
