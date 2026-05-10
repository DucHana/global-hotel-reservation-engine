import * as mongoose from 'mongoose';

const SearchLogSchema = new mongoose.Schema({
  city: String,
  check_in: Date,
  check_out: Date,
  guests: Number,
  filters: mongoose.Schema.Types.Mixed,
  results_count: Number,
  converted: Boolean,
  session_id: String,
  response_time_ms: Number,
  createdAt: Date,
  updatedAt: Date
}, { collection: 'customer_search_logs' });

const SupportTicketSchema = new mongoose.Schema({
  user_id: String,
  user_name: String,
  user_email: String,
  subject: String,
  message: String,
  status: String,
  replies: Array,
  created_at: Date
}, { collection: 'support_tickets' });

async function seed() {
  const uri = 'mongodb://localhost:27017/hotel-reservation';
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(uri);
  
  const SearchLog = mongoose.model('SearchLog', SearchLogSchema);
  const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);

  // Clear
  await SearchLog.deleteMany({});
  await SupportTicket.deleteMany({});

  // Seed Search Logs
  const cities = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Nha Trang', 'Phú Quốc', 'Đà Lạt'];
  const amenitiesList = ['Wifi', 'Hồ bơi', 'Bữa sáng', 'Gym', 'Spa', 'Bãi đậu xe'];
  const logs: any[] = [];

  for (let i = 0; i < 300; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    logs.push({
      city: cities[Math.floor(Math.random() * cities.length)],
      check_in: date,
      check_out: new Date(date.getTime() + 86400000 * 2),
      guests: Math.floor(Math.random() * 4) + 1,
      results_count: Math.floor(Math.random() * 50),
      converted: Math.random() > 0.8,
      session_id: 'sess_' + Math.random().toString(36).substring(7),
      response_time_ms: 100 + Math.floor(Math.random() * 400),
      createdAt: date,
      filters: {
        max_price: (Math.floor(Math.random() * 10) + 1) * 1000000,
        amenities: [
          amenitiesList[Math.floor(Math.random() * amenitiesList.length)],
          amenitiesList[Math.floor(Math.random() * amenitiesList.length)]
        ]
      }
    });
  }
  await SearchLog.insertMany(logs);
  console.log('✅ Seeded Search Logs (with filters & dates)');

  // Seed Support
  const tickets = [
    { user_id: '4', user_name: 'Dương Chí Chung', user_email: 'chung@tdtu.edu.vn', subject: 'Hỏi về quy trình đặt phòng', message: 'Tôi muốn biết thêm về cách thức thanh toán online.', status: 'open', created_at: new Date() },
    { user_id: '5', user_name: 'Nguyễn Thị Lan', user_email: 'lan@gmail.com', subject: 'Yêu cầu hỗ trợ', message: 'Tôi không nhận được email xác nhận đặt phòng.', status: 'pending', created_at: new Date() },
    { user_id: '6', user_name: 'Trần Minh Tâm', user_email: 'tam@outlook.com', subject: 'Phản hồi dịch vụ', message: 'Nhân viên phục vụ rất nhiệt tình!', status: 'closed', created_at: new Date() },
  ];
  await SupportTicket.insertMany(tickets);
  console.log('✅ Seeded Support Tickets');

  await mongoose.disconnect();
  console.log('👋 Done!');
}

seed().catch(err => console.error(err));
