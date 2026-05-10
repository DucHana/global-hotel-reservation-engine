// ═══════════════════════════════════════════════════
// TypeScript Types — Hotel Management System (TV3)
// ═══════════════════════════════════════════════════

export interface MockUser {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  is_active: boolean;
  created_at: string;
}

export interface MockHotel {
  hotel_id: string | number;
  name: string;
  address: string;
  city: string;
  star_rating: number;
  total_rooms: number;
  occupancy_rate: number;
  is_active: boolean;
  phone: string;
  email: string;
}

export interface MockRoomType {
  room_type_id: string | number;
  hotel_id: string | number;
  hotel_name: string;
  name: string;
  capacity: number;
  base_price: number;
  current_price?: number; // Đã thêm để hết lỗi r.current_price
  cap_price?: number;
  floor_price?: number;
  total_rooms: number;
  available_rooms: number;
  description: string;
  amenities: string[];
  is_active: boolean;
}

export interface MockBooking {
  booking_id: string;
  user_id: string;
  user_name: string;
  room_type_id: string;
  room_type_name: string;
  hotel_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  total_price: number;
  // Đã thêm 'completed' cho khớp với thao tác Admin duyệt
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out' | 'completed';
  created_at: string;
}

export interface MockPriceHistory {
  id?: string;
  price_history_id?: string | number; // Đã thêm
  room_type_id: string;
  room_type_name: string;
  hotel_name?: string; // Đã thêm
  old_price: number;
  new_price: number;
  change_pct: number;
  reason?: string;
  note?: string; // Đã thêm để hiển thị ghi chú
  changed_by: string;
  changed_by_name?: string; // Đã thêm
  alert_flag: boolean;
  changed_at: string;
}

export interface MockAnalytics {
  monthly_revenue: Array<{ month: string; revenue: number; bookings: number }>;
  kpis: {
    total_revenue: number;
    revenue_growth: number;
    total_bookings: number;
    booking_growth: number;
    avg_occupancy: number;
    occupancy_change: number;
    avg_daily_rate: number;
    adr_change: number;
  };
  top_rooms: Array<{
    rank: number;
    name: string;
    hotel: string;
    revenue: number;
    bookings: number;
    occupancy: number;
  }>;
}

// Đã cập nhật lại toàn bộ cho khớp với Form Thêm/Sửa Rule
export interface MockPricingRule {
  rule_id: string | number;
  name?: string; 
  rule_name: string;
  rule_type: string;
  threshold_min: number;
  threshold_max: number;
  adjustment_type: string;
  adjustment_value: number;
  condition?: string;
  multiplier?: number;
  priority: number;
  is_active: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
}