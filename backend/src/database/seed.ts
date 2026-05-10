
import { DataSource } from 'typeorm';

const mockData = {
  users: [
    {
      full_name: 'Dương Chí Chung',
      email: 'chung@tdtu.edu.vn',
      password_hash:
        '$2b$12$a6STvnDlE9yQdPZGdkHPLuzKrqdV/WyN4RuO0oQw6MRFE2AGFFatO', // admin123
      phone: '0901234567',
      role: 'admin',
      is_active: 1,
    },
    {
      full_name: 'Trần Thanh Liêm',
      email: 'liem@tdtu.edu.vn',
      password_hash: '$2b$12$a6STvnDlE9yQdPZGdkHPLuzKrqdV/WyN4RuO0oQw6MRFE2AGFFatO',
      phone: '0912345678',
      role: 'admin',
      is_active: 1,
    },
    {
      full_name: 'Nguyễn Thị Hoa',
      email: 'hoa.nt@gmail.com',
      password_hash: '$2b$12$a6STvnDlE9yQdPZGdkHPLuzKrqdV/WyN4RuO0oQw6MRFE2AGFFatO',
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
      base_price: 5000000, // Đã thêm base_price
      current_price: 5150000,
      total_rooms: 5,
      description: 'Luxury suite with ocean view',
    },
    {
      hotel_id: 2,
      name: 'Deluxe Ocean View',
      capacity: 2,
      base_price: 2400000, // Đã thêm base_price
      current_price: 2400000,
      total_rooms: 20,
      description: 'Spacious room with sea view',
    },
    {
      hotel_id: 3,
      name: 'Grand Deluxe',
      capacity: 2,
      base_price: 2000000, // Đã thêm base_price
      current_price: 2000000,
      total_rooms: 30,
      description: 'Premium deluxe room',
    },
    {
      hotel_id: 1,
      name: 'Standard Room',
      capacity: 2,
      base_price: 1200000, // Đã thêm base_price
      current_price: 1200000,
      total_rooms: 50,
      description: 'Comfortable standard room',
    },
  ],
  pricingRules: [
    {
      rule_name: 'Emergency Demand', // Đã sửa name thành rule_name
      rule_type: 'occupancy',
      threshold_min: 90,
      threshold_max: 100,
      adjustment_type: 'percent', // Đã sửa percentage thành percent
      adjustment_value: 30,
      max_price_cap: 8000000,
      min_price_floor: 500000,
      priority: 10,
      is_active: 1,
    },
    {
      rule_name: 'High Demand', // Đã sửa name thành rule_name
      rule_type: 'occupancy',
      threshold_min: 70,
      threshold_max: 89,
      adjustment_type: 'percent', // Đã sửa percentage thành percent
      adjustment_value: 15,
      max_price_cap: 6000000,
      min_price_floor: 800000,
      priority: 8,
      is_active: 1,
    },
    {
      rule_name: 'Normal', // Đã sửa name thành rule_name
      rule_type: 'occupancy',
      threshold_min: 40,
      threshold_max: 69,
      adjustment_type: 'percent', // Đã sửa percentage thành percent
      adjustment_value: 0,
      priority: 5,
      is_active: 1,
    },
    {
      rule_name: 'Low Demand', // Đã sửa name thành rule_name
      rule_type: 'occupancy',
      threshold_min: 20,
      threshold_max: 39,
      adjustment_type: 'percent', // Đã sửa percentage thành percent
      adjustment_value: -10,
      min_price_floor: 800000,
      priority: 8,
      is_active: 1,
    },
  ],
  priceHistory: [
    { room_type_id: 1, old_price: 4500000, new_price: 5000000, changed_by: 1, note: 'Tăng giá mùa cao điểm' },
    { room_type_id: 2, old_price: 2600000, new_price: 2400000, changed_by: 1, note: 'Giảm giá khuyến mãi' },
  ]
};

export async function seedDatabase(dataSource: DataSource) {
  const queries = [
    // Insert users
    ...mockData.users.map(
      (user) =>
        `INSERT INTO users (full_name, email, password_hash, phone, role, is_active) 
       VALUES (N'${user.full_name}', '${user.email}', '${user.password_hash}', '${user.phone}', '${user.role}', ${user.is_active})`,
    ),
    // Insert hotels
    ...mockData.hotels.map(
      (hotel) =>
        `INSERT INTO hotels (name, city, address, is_active) 
       VALUES (N'${hotel.name}', N'${hotel.city}', N'${hotel.address}', ${hotel.is_active})`,
    ),
    // Insert room types (Đã fix chèn thêm base_price)
    ...mockData.rooms.map(
      (room) =>
        `INSERT INTO room_types (hotel_id, name, capacity, base_price, current_price, total_rooms, description) 
       VALUES (${room.hotel_id}, N'${room.name}', ${room.capacity}, ${room.base_price}, ${room.current_price}, ${room.total_rooms}, N'${room.description}')`,
    ),
    // Insert pricing rules (Đã fix rule_name)
    ...mockData.pricingRules.map(
      (rule) =>
        `INSERT INTO pricing_rules (rule_name, rule_type, threshold_min, threshold_max, adjustment_type, adjustment_value, max_price_cap, min_price_floor, priority, is_active)
       VALUES (N'${rule.rule_name}', '${rule.rule_type}', ${rule.threshold_min}, ${rule.threshold_max}, '${rule.adjustment_type}', ${rule.adjustment_value}, ${rule.max_price_cap || 'NULL'}, ${rule.min_price_floor || 'NULL'}, ${rule.priority}, ${rule.is_active})`,
    ),
    // Insert initial history
    ...mockData.priceHistory.map(
      (h) => 
        `INSERT INTO price_history (room_type_id, old_price, new_price, changed_by, note)
         VALUES (${h.room_type_id}, ${h.old_price}, ${h.new_price}, ${h.changed_by}, N'${h.note}')`
    )
  ];

  for (const query of queries) {
    try {
      await dataSource.query(query);
      console.log('✓', query.substring(0, 50) + '...');
    } catch (error) {
      console.error('✗ Lỗi khi chạy query:', query);
      console.error('Chi tiết lỗi:', error);
    }
  }
}
