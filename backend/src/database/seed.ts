import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const mockData = {
  users: [
    {
      full_name: 'Dương Chí Chung',
      email: 'chung@tdtu.edu.vn',
      plain_password: 'admin123',
      phone: '0901234567',
      role: 'admin',
      is_active: 1,
    },
    {
      full_name: 'Trần Thanh Liêm',
      email: 'liem@tdtu.edu.vn',
      plain_password: 'admin123',
      phone: '0912345678',
      role: 'admin',
      is_active: 1,
    },
    {
      full_name: 'Nguyễn Thị Hoa',
      email: 'hoa.nt@gmail.com',
      plain_password: 'user123',
      phone: '0934567890',
      role: 'customer',
      is_active: 1,
    },
  ],
  hotels: [
    {
      name: 'Marriott Hà Nội',
      city: 'Hà Nội',
      address: '12 Đào Duy Từ, Hoàn Kiếm, Hà Nội',
      is_active: 1,
    },
    {
      name: 'Sheraton Sài Gòn',
      city: 'Sài Gòn',
      address: '88 Đồng Khởi, Q.1, TP.HCM',
      is_active: 1,
    },
    {
      name: 'InterCon Đà Nẵng',
      city: 'Đà Nẵng',
      address: 'Bãi Biển Mỹ Khê, Đà Nẵng',
      is_active: 1,
    },
  ],
  rooms: [
    {
      hotel_id: 1,
      name: 'Presidential Suite',
      capacity: 4,
      current_price: 5150000,
      total_rooms: 5,
      description: 'Luxury suite with ocean view',
    },
    {
      hotel_id: 2,
      name: 'Deluxe Ocean View',
      capacity: 2,
      current_price: 2400000,
      total_rooms: 20,
      description: 'Spacious room with sea view',
    },
    {
      hotel_id: 3,
      name: 'Grand Deluxe',
      capacity: 2,
      current_price: 2000000,
      total_rooms: 30,
      description: 'Premium deluxe room',
    },
    {
      hotel_id: 1,
      name: 'Standard Room',
      capacity: 2,
      current_price: 1200000,
      total_rooms: 50,
      description: 'Comfortable standard room',
    },
  ],
  pricingRules: [
    {
      name: 'Mùa du lịch Hè',
      rule_type: 'season',
      threshold_min: 0,
      threshold_max: 100,
      adjustment_type: 'percent',
      adjustment_value: 25.0,
      priority: 5,
      is_active: 1,
      valid_from: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0], // Đang diễn ra
      valid_to: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
    },
    {
      name: 'Sự kiện Pháo hoa',
      rule_type: 'event',
      threshold_min: 0,
      threshold_max: 100,
      adjustment_type: 'percent',
      adjustment_value: 50.0,
      priority: 10, // Ưu tiên cao nhất
      is_active: 1,
      valid_from: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
      valid_to: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // Kết thúc sau 2 ngày
    },
    {
      name: 'Giảm giá vắng khách',
      rule_type: 'occupancy',
      threshold_min: 0,
      threshold_max: 20,
      adjustment_type: 'percent',
      adjustment_value: -15.0,
      priority: 1,
      is_active: 1,
    },
    {
      name: 'Giá cao điểm',
      rule_type: 'occupancy',
      threshold_min: 80,
      threshold_max: 100,
      adjustment_type: 'percent',
      adjustment_value: 20.0,
      priority: 2,
      is_active: 1,
    },
  ],
  bookings: [
    { uid: 1, rid: 1, ci: '2026-05-01', co: '2026-05-05', price: 1500000 },
    { uid: 2, rid: 2, ci: '2026-05-02', co: '2026-05-06', price: 2500000 },
    { uid: 3, rid: 3, ci: '2026-05-05', co: '2026-05-10', price: 3500000 },
    { uid: 1, rid: 1, ci: '2026-05-10', co: '2026-05-15', price: 1500000 },
  ],
};

export async function seedDatabase(dataSource: DataSource) {
  console.log('🔐 Generating bcrypt hashes...');

  const usersWithHashes = await Promise.all(
    mockData.users.map(async (user) => ({
      ...user,
      password_hash: await bcrypt.hash(user.plain_password, 10),
    }))
  );

  // ── INSERT USERS ──
  for (const user of usersWithHashes) {
    try {
      await dataSource.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, is_active) 
         VALUES ('${user.full_name}', '${user.email}', '${user.password_hash}', '${user.phone}', '${user.role}', ${user.is_active})`
      );
      console.log(`✓ User: ${user.email} (${user.role}) / ${user.plain_password}`);
    } catch (e: any) {
      console.error(`✗ User ${user.email}:`, e.message);
    }
  }

  // ── INSERT HOTELS ──
  for (const hotel of mockData.hotels) {
    try {
      await dataSource.query(
        `INSERT INTO hotels (name, city, address, is_active) VALUES ('${hotel.name}', '${hotel.city}', '${hotel.address}', ${hotel.is_active})`
      );
      console.log(`✓ Hotel: ${hotel.name}`);
    } catch (e: any) {
      console.error(`✗ Hotel ${hotel.name}:`, e.message);
    }
  }

  // ── INSERT ROOM TYPES ──
  for (const room of mockData.rooms) {
    try {
      await dataSource.query(
        `INSERT INTO room_types (hotel_id, name, capacity, base_price, current_price, total_rooms, description) 
         VALUES (${room.hotel_id}, '${room.name}', ${room.capacity}, ${room.current_price}, ${room.current_price}, ${room.total_rooms}, '${room.description}')`
      );
      console.log(`✓ Room: ${room.name}`);
    } catch (e: any) {
      console.error(`✗ Room ${room.name}:`, e.message);
    }
  }

  // ── INSERT PRICING RULES ──
  for (const rule of mockData.pricingRules as any[]) {
    try {
      await dataSource.query(
        `INSERT INTO pricing_rules (rule_name, rule_type, threshold_min, threshold_max, adjustment_type, adjustment_value, max_price_cap, min_price_floor, priority, is_active, valid_from, valid_to)
         VALUES ('${rule.name}', '${rule.rule_type}', ${rule.threshold_min}, ${rule.threshold_max}, '${rule.adjustment_type}', ${rule.adjustment_value}, ${rule.max_price_cap || 'NULL'}, ${rule.min_price_floor || 'NULL'}, ${rule.priority}, ${rule.is_active}, ${rule.valid_from ? `'${rule.valid_from}'` : 'NULL'}, ${rule.valid_to ? `'${rule.valid_to}'` : 'NULL'})`
      );
      console.log(`✓ Rule: ${rule.name}`);
    } catch (e: any) {
      console.error(`✗ Rule ${rule.name}:`, e.message);
    }
  }

  // ── INSERT BOOKINGS (dùng ID thật từ DB) ──
  try {
    const users = await dataSource.query(`SELECT TOP 3 user_id FROM users ORDER BY user_id`);
    const rooms = await dataSource.query(`SELECT TOP 3 room_type_id FROM room_types ORDER BY room_type_id`);

    if (users.length >= 1 && rooms.length >= 1) {
      const today = new Date();
      const d = (offset: number) => new Date(today.getTime() + offset * 86400000).toISOString().split('T')[0];

      const bookings = [
        { uid: users[0].user_id, rid: rooms[0].room_type_id, ci: d(-2), co: d(2),  price: 1500000 },
        { uid: users[1]?.user_id || users[0].user_id, rid: rooms[0].room_type_id, ci: d(-1), co: d(3), price: 1500000 },
        { uid: users[2]?.user_id || users[0].user_id, rid: rooms[1]?.room_type_id || rooms[0].room_type_id, ci: d(0), co: d(4),  price: 4500000 },
      ];

      for (const b of bookings) {
        try {
          await dataSource.query(
            `INSERT INTO bookings (user_id, room_type_id, check_in_date, check_out_date, total_price, status)
             VALUES (${b.uid}, ${b.rid}, '${b.ci}', '${b.co}', ${b.price}, 'confirmed')`
          );
          console.log(`✓ Booking: room ${b.rid}, ${b.ci} → ${b.co}`);
        } catch (e: any) {
          console.error(`✗ Booking:`, e.message);
        }
      }
    }
  } catch (e: any) {
    console.error('✗ Bookings section:', e.message);
  }

  console.log('\n📋 Tài khoản demo:');
  console.log('  Admin: chung@tdtu.edu.vn / admin123');
  console.log('  Admin: liem@tdtu.edu.vn  / admin123');
  console.log('  User:  hoa.nt@gmail.com  / user123');
}
