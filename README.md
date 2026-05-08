# 🏨 Global Hotel Reservation Engine - AI Pricing

Hệ thống quản lý đặt phòng khách sạn thông minh với công nghệ **AI Dynamic Pricing** (Định giá linh hoạt) dựa trên nhu cầu thị trường, mùa vụ và công suất phòng thực tế.

## 🚀 Tính năng nổi bật
- **AI Dynamic Pricing:** Tự động đề xuất giá dựa trên Occupancy (mật độ phòng), Season (mùa vụ) và Event (sự kiện).
- **Phân loại logic thông minh:** Tự động nhận diện phòng mới để bảo vệ giá gốc, tránh giảm giá sâu do thiếu dữ liệu.
- **Admin Dashboard chuyên sâu:** Quản lý chi nhánh, loại phòng, quy tắc giá và theo dõi lịch sử biến động giá.
- **Data Integrity:** Sử dụng SQL Server Triggers và Stored Procedures để đảm bảo tính chính xác của dữ liệu tài chính.

## 🛠 Tech Stack
- **Frontend:** Next.js 14, React, Vanilla CSS (Premium Dark Mode UI).
- **Backend:** NestJS (Node.js framework), TypeORM.
- **Database:** Microsoft SQL Server (MSSQL).
- **Auth:** JWT (JSON Web Token) & bcrypt.

## 📋 Hướng dẫn cài đặt nhanh (Quick Start)

### 1. Yêu cầu hệ thống
- **Node.js** v18 trở lên.
- **Microsoft SQL Server** (Bản Express hoặc Developer).
- Bật tính năng **SQL Server Authentication** và tạo một User có quyền `dbcreator` hoặc `sysadmin`.

### 2. Cài đặt Dependencies
Mở 2 terminal riêng biệt:
```powershell
# Terminal 1: Backend
cd backend
npm install

# Terminal 2: Frontend
cd frontend
npm install
```

### 3. Cấu hình Môi trường (.env)
- Tại thư mục `backend`, copy file `.env.example` thành `.env`.
- Cập nhật thông tin kết nối SQL Server của bạn vào file `.env`:
```env
DB_HOST=localhost
DB_PORT=1433
DB_USER=your_user      # VD: sa
DB_PASSWORD=your_pass  # VD: 123456
JWT_SECRET=hotel-secret-key-2026
```

### 4. Khởi tạo Database & Dữ liệu mẫu (Quan trọng nhất)
Bạn không cần tạo database thủ công. Chỉ cần chạy lệnh duy nhất sau:
```powershell
cd backend
npm run seed
```
*Lệnh này sẽ tự động tạo Database, Bảng, Triggers, Procedures và nạp các tài khoản demo.*

### 5. Chạy ứng dụng
```powershell
# Terminal Backend
npm run start:dev

# Terminal Frontend
npm run dev
```
Truy cập: `http://localhost:3000/admin/dashboard`

## 🔑 Tài khoản Demo (Admin)
- **Email:** `chung@tdtu.edu.vn`
- **Mật khẩu:** `admin123`

---
