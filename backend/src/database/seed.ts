import { DataSource } from 'typeorm';

const mockData = {
  users: [
    {
      full_name: 'Dương Chí Chung',
      email: 'chung@tdtu.edu.vn',
      // Hash chuẩn cho mật khẩu: admin123
      password_hash: '$2a$12$guH.nxyge/hS/Shw4bQhv.eeoanakq146h1Ah.3L/USUPtP2uVncu',
      phone: '0901234567',
      role: 'admin',
      is_active: 1,
    },
    {
      full_name: 'Trần Thanh Liêm',
      email: 'liem@tdtu.edu.vn',
      password_hash: '$2a$12$guH.nxyge/hS/Shw4bQhv.eeoanakq146h1Ah.3L/USUPtP2uVncu',
      phone: '0912345678',
      role: 'admin',
      is_active: 1,
    },
    {
      full_name: 'Nguyễn Thị Hoa',
      email: 'hoa.nt@gmail.com',
      password_hash: '$2a$12$guH.nxyge/hS/Shw4bQhv.eeoanakq146h1Ah.3L/USUPtP2uVncu',
      phone: '0934567890',
      role: 'customer', // Dùng customer để khớp với check constraint chk_role
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
      city: 'Hồ Chí Minh',
      address: '88 Đồng Khởi, Q.1, TP.HCM',
      is_active: 1,
    },
    {
      name: 'InterCon Đà Nẵng',
      city: 'Đà Nẵng',
      address: 'Bãi Biển Mỹ Khê, Đà Nẵng',
      is_active: 1,
    },
    {
      name: 'Sofitel Hà Nội',
      city: 'Hà Nội',
      address: '02 Trần Phú, Lộc Thọ, Hà Nội',
      is_active: 1,
    },
    {
      name: 'Meliá Hà Nội',
      city: 'Hà Nội',
      address: 'Bãi Dài, Gành Dầu, Hà Nội',
      is_active: 1,
    },
    {
      name: 'Vinpearl Landmark 81',
      city: 'Hồ Chí Minh',
      address: '720A Điện Biên Phủ, Bình Thạnh, TP.HCM',
      is_active: 1,
    },
    {
      name: 'FLC Grand Hạ Long',
      city: 'Hạ Long',
      address: 'Nguyễn Văn Cừ, Hồng Hải, Hạ Long',
      is_active: 1,
    },
    {
      name: 'Silk Path Sapa Resort',
      city: 'Lào Cai',
      address: 'Đồi Quan 6, Sapa, Lào Cai',
      is_active: 1,
    },
  ],
  rooms: [
    {
      hotel_id: 1,
      name: 'Presidential Suite',
      capacity: 4,
      base_price: 5000000,
      current_price: 5150000,
      total_rooms: 5,
      description: 'Phòng Tổng thống sang trọng, đầy đủ tiện nghi với tầm nhìn toàn cảnh Hà Nội',
    },
    {
      hotel_id: 2,
      name: 'Deluxe Ocean View',
      capacity: 2,
      base_price: 2400000,
      current_price: 2400000,
      total_rooms: 20,
      description: 'Phòng cao cấp hướng biển, không gian thoáng đãng',
    },
    {
      hotel_id: 3,
      name: 'Grand Deluxe',
      capacity: 2,
      base_price: 2000000,
      current_price: 2000000,
      total_rooms: 30,
      description: 'Phòng Grand Deluxe hiện đại tại Đà Nẵng',
    },
    {
      hotel_id: 1,
      name: 'Standard Room',
      capacity: 2,
      base_price: 1200000,
      current_price: 1200000,
      total_rooms: 50,
      description: 'Phòng tiêu chuẩn ấm cúng cho khách du lịch',
    },
    {
      hotel_id: 2,
      name: 'Business Suite',
      capacity: 3,
      base_price: 3100000,
      current_price: 3250000,
      total_rooms: 12,
      description: 'Suite cao cấp cho khách công tác, khu làm việc riêng và lounge',
    },
    {
      hotel_id: 3,
      name: 'Family Ocean Suite',
      capacity: 5,
      base_price: 4200000,
      current_price: 4300000,
      total_rooms: 8,
      description: 'Suite gia đình view biển, phòng khách rộng và bồn tắm lớn',
    },
    {
      hotel_id: 4,
      name: 'Junior Suite',
      capacity: 2,
      base_price: 2600000,
      current_price: 2750000,
      total_rooms: 18,
      description: 'Junior Suite hiện đại, ban công nhìn vịnh Nha Trang',
    },
    {
      hotel_id: 4,
      name: 'Panorama Sea View',
      capacity: 3,
      base_price: 3400000,
      current_price: 3500000,
      total_rooms: 14,
      description: 'Phòng panorama tầng cao, cửa kính toàn cảnh biển',
    },
    {
      hotel_id: 5,
      name: 'Villa Garden Private Pool',
      capacity: 4,
      base_price: 6800000,
      current_price: 6950000,
      total_rooms: 6,
      description: 'Villa sân vườn có hồ bơi riêng, phù hợp nghỉ dưỡng cao cấp',
    },
    {
      hotel_id: 5,
      name: 'Sunset Premium Room',
      capacity: 2,
      base_price: 2900000,
      current_price: 3050000,
      total_rooms: 24,
      description: 'Phòng premium ngắm hoàng hôn, nội thất gỗ tự nhiên',
    },
    {
      hotel_id: 6,
      name: 'Skyline Executive Room',
      capacity: 2,
      base_price: 3600000,
      current_price: 3720000,
      total_rooms: 22,
      description: 'Phòng executive tầng cao nhìn toàn cảnh thành phố',
    },
    {
      hotel_id: 6,
      name: 'Landmark Signature Suite',
      capacity: 4,
      base_price: 7500000,
      current_price: 7700000,
      total_rooms: 7,
      description: 'Suite signature diện tích lớn, phù hợp khách VIP và gia đình',
    },
    {
      hotel_id: 7,
      name: 'Golf View Deluxe',
      capacity: 2,
      base_price: 2800000,
      current_price: 2920000,
      total_rooms: 26,
      description: 'Phòng deluxe hướng sân golf, không gian yên tĩnh',
    },
    {
      hotel_id: 7,
      name: 'Bay Panorama Suite',
      capacity: 3,
      base_price: 4700000,
      current_price: 4850000,
      total_rooms: 10,
      description: 'Suite panorama hướng vịnh, ban công rộng và phòng khách riêng',
    },
    {
      hotel_id: 8,
      name: 'Mountain View Bungalow',
      capacity: 3,
      base_price: 2500000,
      current_price: 2650000,
      total_rooms: 16,
      description: 'Bungalow view núi với thiết kế ấm cúng và lò sưởi trang trí',
    },
    {
      hotel_id: 8,
      name: 'Sapa Family Suite',
      capacity: 5,
      base_price: 3900000,
      current_price: 4050000,
      total_rooms: 9,
      description: 'Suite gia đình rộng rãi, phù hợp nhóm khách 4-5 người',
    },
  ],
  pricingRules: [
    {
      rule_name: 'Emergency Demand',
      rule_type: 'occupancy',
      threshold_min: 90,
      threshold_max: 100,
      adjustment_type: 'percent',
      adjustment_value: 30,
      max_price_cap: 8000000,
      min_price_floor: 500000,
      priority: 10,
      is_active: 1,
    },
    {
      rule_name: 'High Demand',
      rule_type: 'occupancy',
      threshold_min: 70,
      threshold_max: 89,
      adjustment_type: 'percent',
      adjustment_value: 15,
      max_price_cap: 6000000,
      min_price_floor: 800000,
      priority: 8,
      is_active: 1,
    },
    {
      rule_name: 'Normal',
      rule_type: 'occupancy',
      threshold_min: 40,
      threshold_max: 69,
      adjustment_type: 'percent',
      adjustment_value: 0,
      priority: 5,
      is_active: 1,
    },
    {
      rule_name: 'Low Demand',
      rule_type: 'occupancy',
      threshold_min: 20,
      threshold_max: 39,
      adjustment_type: 'percent',
      adjustment_value: -10,
      min_price_floor: 800000,
      priority: 8,
      is_active: 1,
    },
  ],
};

export async function seedDatabase(dataSource: DataSource) {
  const queries = [
    // Chèn người dùng - Hỗ trợ Unicode cho tên
    ...mockData.users.map(
      (user) =>
        `INSERT INTO users (full_name, email, password_hash, phone, role, is_active) 
        VALUES (N'${user.full_name}', '${user.email}', '${user.password_hash}', '${user.phone}', '${user.role}', ${user.is_active})`,
    ),
    // Chèn khách sạn - BẮT BUỘC có N'' để search được "Hà Nội"
    ...mockData.hotels.map(
      (hotel) =>
        `INSERT INTO hotels (name, city, address, is_active) 
        VALUES (N'${hotel.name}', N'${hotel.city}', N'${hotel.address}', ${hotel.is_active})`,
    ),
    // Chèn loại phòng - Hỗ trợ tiếng Việt cho tên và mô tả
    ...mockData.rooms.map(
      (room) =>
        `INSERT INTO room_types (hotel_id, name, capacity, base_price, current_price, total_rooms, description) 
        VALUES (${room.hotel_id}, N'${room.name}', ${room.capacity}, ${room.base_price}, ${room.current_price}, ${room.total_rooms}, N'${room.description}')`,
    ),
    // Chèn quy tắc giá - Xử lý giá trị NULL cho các trường tùy chọn
    ...mockData.pricingRules.map((rule) => {
      const cap = rule.max_price_cap !== undefined ? rule.max_price_cap : 'NULL';
      const floor = rule.min_price_floor !== undefined ? rule.min_price_floor : 'NULL';
      return `INSERT INTO pricing_rules (rule_name, rule_type, threshold_min, threshold_max, adjustment_type, adjustment_value, max_price_cap, min_price_floor, priority, is_active)
        VALUES (N'${rule.rule_name}', '${rule.rule_type}', ${rule.threshold_min}, ${rule.threshold_max}, '${rule.adjustment_type}', ${rule.adjustment_value}, ${cap}, ${floor}, ${rule.priority}, ${rule.is_active})`;
    }),
  ];

  console.log('🚀 Bắt đầu chèn dữ liệu vào SQL Server...');

  for (const query of queries) {
    try {
      await dataSource.query(query);
      // In ra log ngắn gọn để theo dõi tiến độ
      const preview = query.length > 80 ? query.substring(0, 80) + '...' : query;
      console.log('✓ Executed:', preview);
    } catch (error: any) {
      console.error('✗ Lỗi thực thi query:', query);
      console.error('Chi tiết lỗi:', error.message);
    }
  }
}