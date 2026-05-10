// ═══════════════════════════════════════════════════════════════
// rooms.service.ts (extended) — Thành viên 2
// Room Search: SQL Server (availability/price) + MongoDB (catalog/amenities)
// Full-text search, compound filters, pagination
// ═══════════════════════════════════════════════════════════════
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomType } from '../../database/entities/room-type.entity';
import {
  RoomCatalog,
  RoomCatalogDocument,
} from './schemas/room-catalog.schema';

@Injectable()
export class RoomsService {
  constructor(
    // SQL Server: availability, pricing, booking counts
    @InjectRepository(RoomType)
    private roomTypesRepository: Repository<RoomType>,

    // MongoDB: room catalog (images, amenities, descriptions)
    @InjectModel(RoomCatalog.name)
    private roomCatalogModel: Model<RoomCatalogDocument>,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // 1. SEARCH ROOMS — Polyglot approach:
  //    Step 1: Query SQL Server for availability + price range
  //    Step 2: Enrich with MongoDB catalog data (amenities, images)
  //    Step 3: Apply additional NoSQL filters (amenities, text search)
  // ─────────────────────────────────────────────────────────────
  async searchRooms(params: {
    hotelId?: number;
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
    sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'popularity';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);

    // ── Step 1: Get available room types from SQL Server ────────
    const qb = this.roomTypesRepository
      .createQueryBuilder('rt')
      .leftJoinAndSelect('rt.hotel', 'h')
      .where('rt.is_active = :active', { active: 1 });

    if (params.hotelId) {
      qb.andWhere('rt.hotel_id = :hotelId', { hotelId: params.hotelId });
    }
    if (params.city) {
      qb.andWhere('h.city = :city', { city: params.city });
    }
    if (params.guests) {
      qb.andWhere('rt.capacity >= :guests', { guests: params.guests });
    }
    if (params.minPrice) {
      qb.andWhere('rt.current_price >= :minPrice', { minPrice: params.minPrice });
    }
    if (params.maxPrice) {
      qb.andWhere('rt.current_price <= :maxPrice', { maxPrice: params.maxPrice });
    }

    const sqlRooms = await qb.getMany();
    const roomTypeIds = sqlRooms.map((r) => r.room_type_id);

    if (roomTypeIds.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    // ── Step 2: Enrich with MongoDB catalog data ────────────────
    // Compound Index { room_type_id: 1 } ensures O(1) lookup per room
    const mongoFilter: Record<string, unknown> = {
      room_type_id: { $in: roomTypeIds },
      is_active: true,
    };

    // Amenities filter (NoSQL array query)
    if (params.amenities && params.amenities.length > 0) {
      mongoFilter.amenities = { $all: params.amenities };
    }

    const catalogDocs = await this.roomCatalogModel
      .find(mongoFilter)
      .lean();

    const catalogMap = new Map(
      catalogDocs.map((c: any) => [c.room_type_id, c]),
    );

    // ── Step 3: Filter & merge (only rooms with catalog data) ───
    // If no catalog doc → include anyway (SQL data is source of truth)
    let merged = sqlRooms
      .filter((r) => !params.amenities?.length || catalogMap.has(r.room_type_id))
      .map((r) => {
        const catalog = catalogMap.get(r.room_type_id) as any;
        return {
          room_type_id: String(r.room_type_id),
          hotel_id: String(r.hotel_id),
          hotel_name: (r as any).hotel?.name || catalog?.hotel_name || '',
          name: r.name,
          description: catalog?.description?.vi || r.description || '',
          capacity: r.capacity,
          current_price: Number(r.current_price),
          base_price: Number(r.base_price),
          total_rooms: r.total_rooms,
          amenities: catalog?.amenities || [],
          images: catalog?.images || [],
          bed_type: catalog?.bed_type || 'standard',
          size_sqm: catalog?.size_sqm || 0,
          rating: catalog?.rating || 0,
          review_count: catalog?.review_count || 0,
          booking_count: catalog?.booking_count || 0,
        };
      });

    // ── Step 4: Sort ─────────────────────────────────────────────
    switch (params.sortBy) {
      case 'price_asc':
        merged.sort((a, b) => a.current_price - b.current_price);
        break;
      case 'price_desc':
        merged.sort((a, b) => b.current_price - a.current_price);
        break;
      case 'rating':
        merged.sort((a, b) => b.rating - a.rating);
        break;
      case 'popularity':
        merged.sort((a, b) => b.booking_count - a.booking_count);
        break;
      default:
        merged.sort((a, b) => a.current_price - b.current_price);
    }

    // ── Step 5: Paginate ─────────────────────────────────────────
    const total = merged.length;
    const offset = (page - 1) * limit;
    const paged = merged.slice(offset, offset + limit);

    return { data: paged, total, page, limit };
  }

  // ─────────────────────────────────────────────────────────────
  // 1b. GET DISTINCT AMENITIES (for search filter UI)
  // ─────────────────────────────────────────────────────────────
  async getAmenities() {
    const amenities = await this.roomCatalogModel.distinct('amenities', {
      is_active: true,
    });
    const data = (amenities || [])
      .filter((a) => typeof a === 'string' && a.trim().length > 0)
      .map((a) => String(a).trim())
      .sort((a, b) => a.localeCompare(b));
    return { data, total: data.length };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. GET ROOM DETAIL (SQL + MongoDB merged)
  // ─────────────────────────────────────────────────────────────
  async findById(roomTypeId: number) {
    const room = await this.roomTypesRepository.findOne({
      where: { room_type_id: roomTypeId },
    });
    if (!room) throw new NotFoundException('Loại phòng không tìm thấy');

    const catalog = await this.roomCatalogModel
      .findOne({ room_type_id: roomTypeId })
      .lean() as any;

    return {
      room_type_id: String(room.room_type_id),
      hotel_id: String(room.hotel_id),
      name: room.name,
      description: catalog?.description || { vi: room.description, en: '' },
      capacity: room.capacity,
      current_price: Number(room.current_price),
      base_price: Number(room.base_price),
      total_rooms: room.total_rooms,
      is_active: room.is_active,
      amenities: catalog?.amenities || [],
      images: catalog?.images || [],
      bed_type: catalog?.bed_type || 'standard',
      size_sqm: catalog?.size_sqm || 0,
      floor: catalog?.floor || 1,
      rating: catalog?.rating || 0,
      review_count: catalog?.review_count || 0,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. FIND ALL (basic list, no search)
  // ─────────────────────────────────────────────────────────────
  async findAll(hotelId?: number) {
    const query = this.roomTypesRepository.createQueryBuilder('rt');
    if (hotelId) {
      query.where('rt.hotel_id = :hotelId', { hotelId });
    }
    return await query.getMany();
  }

  // ─────────────────────────────────────────────────────────────
  // 4. UPSERT CATALOG (sync SQL room into MongoDB catalog)
  //    Called when admin creates/updates a room type
  // ─────────────────────────────────────────────────────────────
  async upsertCatalog(
    roomTypeId: number,
    data: {
      hotel_name?: string;
      amenities?: string[];
      images?: Array<{ url: string; alt: string; is_primary: boolean; order: number }>;
      description?: { vi?: string; en?: string };
      bed_type?: string;
      size_sqm?: number;
      floor?: number;
    },
  ) {
    const room = await this.findById(roomTypeId);
    await this.roomCatalogModel.findOneAndUpdate(
      { room_type_id: roomTypeId },
      {
        $set: {
          room_type_id: roomTypeId,
          hotel_id: Number(room.hotel_id),
          hotel_name: data.hotel_name || '',
          name: room.name,
          current_price: room.current_price,
          base_price: room.base_price,
          capacity: room.capacity,
          is_active: Boolean(room.is_active),
          ...(data.amenities    !== undefined && { amenities: data.amenities }),
          ...(data.images       !== undefined && { images: data.images }),
          ...(data.description  !== undefined && { description: data.description }),
          ...(data.bed_type     !== undefined && { bed_type: data.bed_type }),
          ...(data.size_sqm     !== undefined && { size_sqm: data.size_sqm }),
          ...(data.floor        !== undefined && { floor: data.floor }),
        },
      },
      { upsert: true, new: true },
    );
    return { message: 'Catalog đồng bộ thành công' };
  }

  // ─────────────────────────────────────────────────────────────
  // 5. CREATE (SQL only — catalog must be synced separately)
  // ─────────────────────────────────────────────────────────────
  async create(data: {
    hotel_id: number;
    name: string;
    description?: string;
    capacity: number;
    base_price: number;
    current_price: number;
    total_rooms: number;
  }) {
    if (data.base_price <= 0 || data.current_price <= 0) {
      throw new BadRequestException('Giá phải lớn hơn 0');
    }
    const roomType = this.roomTypesRepository.create(data);
    return await this.roomTypesRepository.save(roomType);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. UPDATE
  // ─────────────────────────────────────────────────────────────
  async update(
    roomTypeId: number,
    data: {
      name?: string;
      description?: string;
      capacity?: number;
      base_price?: number;
      current_price?: number;
      total_rooms?: number;
    },
  ) {
    const roomType = await this.findById(roomTypeId);
    if (data.base_price !== undefined && data.base_price <= 0) {
      throw new BadRequestException('Giá cơ sở phải lớn hơn 0');
    }
    if (data.current_price !== undefined && data.current_price <= 0) {
      throw new BadRequestException('Giá hiện tại phải lớn hơn 0');
    }
    const sqlRoom = await this.roomTypesRepository.findOne({
      where: { room_type_id: roomTypeId },
    });
    if (!sqlRoom) throw new NotFoundException('Loại phòng không tìm thấy');
    Object.assign(sqlRoom, data);

    // Sync price to MongoDB catalog
    await this.roomCatalogModel.updateOne(
      { room_type_id: roomTypeId },
      {
        $set: {
          ...(data.current_price !== undefined && { current_price: data.current_price }),
          ...(data.base_price    !== undefined && { base_price: data.base_price }),
          ...(data.name          !== undefined && { name: data.name }),
        },
      },
    );

    return await this.roomTypesRepository.save(sqlRoom);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. DELETE
  // ─────────────────────────────────────────────────────────────
  async delete(roomTypeId: number) {
    await this.findById(roomTypeId);
    await this.roomTypesRepository.delete(roomTypeId);
    await this.roomCatalogModel.updateOne(
      { room_type_id: roomTypeId },
      { $set: { is_active: false } },
    );
    return { message: 'Xóa loại phòng thành công' };
  }
}