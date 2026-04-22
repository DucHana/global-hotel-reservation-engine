export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  bookings: number;
}

export interface TopRoomData {
  rank: number;
  room_type_id: number;
  name: string;
  hotel: string;
  bookings: number;
  revenue: number;
  occupancy: number;
}

export interface DashboardKPIs {
  total_revenue: number;
  revenue_growth: number;
  total_bookings: number;
  booking_growth: number;
  avg_occupancy: number;
  occupancy_change: number;
  avg_daily_rate: number;
  adr_change: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  top_rooms: TopRoomData[];
  monthly_revenue: MonthlyRevenueData[];
}