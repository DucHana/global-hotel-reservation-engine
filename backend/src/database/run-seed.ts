import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { seedDatabase } from './seed';

// Nạp file .env
dotenv.config();

async function seedMongoRoomCatalog(dataSource: DataSource) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost/hotel-reservation';
  console.log(`🧩 Seeding Mongo room_catalog @ ${mongoUri}`);

  await mongoose.connect(mongoUri);
  const collection = mongoose.connection.collection('room_catalog');

  const rooms = await dataSource.query(`
    SELECT
      rt.room_type_id,
      rt.hotel_id,
      h.name AS hotel_name,
      rt.name,
      rt.description,
      rt.capacity,
      rt.base_price,
      rt.current_price,
      rt.is_active
    FROM room_types rt
    JOIN hotels h ON h.hotel_id = rt.hotel_id
    ORDER BY rt.room_type_id ASC
  `);

  const amenitySets = [
    ['WiFi', 'Breakfast', 'Pool', 'Gym', 'Parking'],
    ['WiFi', 'Sea View', 'Spa', 'Bathtub', 'Mini Bar'],
    ['WiFi', 'Balcony', 'Air Conditioning', 'Smart TV'],
    ['WiFi', 'City View', 'Workspace', 'Coffee Machine'],
    ['WiFi', 'Family Friendly', 'Kitchenette', 'Laundry'],
    ['WiFi', 'Private Pool', 'Garden View', 'Premium Bedding'],
  ];
  const hotelImageSets = [
    [
      'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
      'https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg',
    ],
    [
      'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg',
      'https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg',
    ],
    [
      'https://images.pexels.com/photos/2034335/pexels-photo-2034335.jpeg',
      'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg',
    ],
    [
      'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg',
      'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg',
    ],
    [
      'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
      'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg',
    ],
    [
      'https://images.pexels.com/photos/1743227/pexels-photo-1743227.jpeg',
      'https://images.pexels.com/photos/2029719/pexels-photo-2029719.jpeg',
    ],
  ];

  const docs = rooms.map((r: any, idx: number) => {
    const amenities = amenitySets[idx % amenitySets.length];
    const imageSet = hotelImageSets[idx % hotelImageSets.length];
    return {
      room_type_id: Number(r.room_type_id),
      hotel_id: Number(r.hotel_id),
      hotel_name: r.hotel_name,
      name: r.name,
      amenities,
      images: [
        {
          url: imageSet[0],
          alt: `${r.name} - ảnh chính`,
          is_primary: true,
          order: 1,
        },
        {
          url: imageSet[1],
          alt: `${r.name} - không gian phòng`,
          is_primary: false,
          order: 2,
        },
      ],
      description: {
        vi: r.description || `Không gian ${r.name} được thiết kế tinh tế, phù hợp nghỉ dưỡng và công tác.`,
        en: `${r.name} with premium comfort and curated amenities.`,
      },
      capacity: Number(r.capacity),
      size_sqm: 28 + (idx % 5) * 6,
      bed_type: idx % 3 === 0 ? 'king' : idx % 3 === 1 ? 'queen' : 'twin',
      floor: (idx % 12) + 1,
      base_price: Number(r.base_price),
      current_price: Number(r.current_price),
      is_active: Number(r.is_active) === 1,
      rating: Number((4.2 + (idx % 6) * 0.1).toFixed(1)),
      review_count: 80 + idx * 7,
      booking_count: 50 + idx * 9,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  await collection.deleteMany({});
  if (docs.length > 0) {
    await collection.insertMany(docs);
  }
  console.log(`✅ Mongo room_catalog seeded: ${docs.length} documents`);

  await mongoose.disconnect();
}

async function run() {
  // In ra màn hình để debug xem dotenv có nạp đúng biến không
  console.log('--- KIỂM TRA THÔNG TIN KẾT NỐI ---');
  console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`User: ${process.env.DB_USERNAME || 'hotel_manager'}`);
  console.log(`Pass: ${process.env.DB_PASSWORD ? '****** (Đã nạp từ .env)' : 'YourPassword123 (Dùng mặc định)'}`);
  console.log(`DB:   ${process.env.DB_NAME || 'hotel_management'}`);
  console.log('---------------------------------');

  const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    // Lưu ý: Đã sửa thành DB_USERNAME cho khớp với file .env của bạn
    username: process.env.DB_USERNAME || 'hotel_manager',
    password: process.env.DB_PASSWORD || 'YourPassword123',
    database: process.env.DB_NAME || 'hotel_management',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });

  try {
    console.log('⏳ Đang kết nối Database...');
    await dataSource.initialize();
    console.log('📦 Kết nối thành công! Bắt đầu chạy Seed...');

    const dbDir = __dirname;
    const files = fs.readdirSync(dbDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`📜 Thực thi file ${file}...`);
      const filePath = path.join(dbDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Tách chuỗi theo chữ GO (Không phân biệt hoa thường)

      // Split by GO if present
      const batches = sql.split(/\bGO\b/i);

      for (let batch of batches) {
        batch = batch.trim();
        // Bỏ qua các lệnh rỗng hoặc lệnh USE database
        if (!batch || batch.toUpperCase().startsWith('USE ')) continue;

        try {
          await dataSource.query(batch);
        } catch (err: any) {
          console.warn(`⚠️ Cảnh báo ở file ${file}:`, err.message);
        }
      }
    }

    console.log('🌱 Đang chèn dữ liệu mẫu (Mock data)...');
    await seedDatabase(dataSource);
    await seedMongoRoomCatalog(dataSource);

    console.log('✅ Seeding hoàn tất thành công rực rỡ!');
  } catch (err: any) {
    console.error('❌ Seeding thất bại:', err.message || err);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Đã đóng kết nối Database.');
    }
  }
}

run();