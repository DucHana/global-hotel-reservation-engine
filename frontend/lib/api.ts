// ═══════════════════════════════════════════════════
// API CLIENT — connects to NestJS backend
// Falls back to mock data if backend unreachable
// ═══════════════════════════════════════════════════

import {
  MOCK_USERS, MOCK_HOTELS, MOCK_ROOM_TYPES, MOCK_BOOKINGS,
  MOCK_PRICE_HISTORY, MOCK_ANALYTICS, MOCK_PRICING_RULES, delay,
} from './mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ── Token helpers ──
const TOKEN_KEY   = 'luxestay_token';
const REFRESH_KEY = 'luxestay_refresh';
const USER_KEY    = 'luxestay_user';

export const tokenStore = {
  get: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  },
  set: (token: string, remember = false) => {
    if (typeof window === 'undefined') return;
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  getUser: () => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: object | null, remember = false) => {
    if (typeof window === 'undefined') return;
    if (user === null) {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
      return;
    }
    const s = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(USER_KEY, s);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(USER_KEY, s);
      localStorage.removeItem(USER_KEY);
    }
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    [TOKEN_KEY, REFRESH_KEY, USER_KEY].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  },
};

// ── Base HTTP ──
async function http<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(new Error(err.message || 'API Error'), { status: res.status });
  }
  return res.json();
}

// ═══════════════════════════════════════════════════
// AUTH API  — real backend: POST /api/auth/login
// ═══════════════════════════════════════════════════
export const authApi = {
  login: async (email: string, password: string) => {
    if (USE_MOCK) {
      await delay(800);
      const user = MOCK_USERS.find(u => u.email === email);
      if (!user || password !== 'admin123') {
        throw Object.assign(new Error('Email hoặc mật khẩu không đúng'), { status: 401 });
      }
      return { access_token: 'mock_jwt_token_' + user.user_id, user };
    }
    return http<{ access_token: string; user: object }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (payload: {
    full_name: string; email: string; password: string; phone?: string; role?: string;
  }) => {
    if (USE_MOCK) {
      await delay(1000);
      const exists = MOCK_USERS.find(u => u.email === payload.email);
      if (exists) throw Object.assign(new Error('Email đã tồn tại'), { status: 409 });
      return { message: 'Đăng ký thành công' };
    }
    return http('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },

  logout: () => tokenStore.clear(),
};

// ═══════════════════════════════════════════════════
// USERS API  — real backend: GET /api/users
// ═══════════════════════════════════════════════════
export const usersApi = {
  getAll: async (params?: { role?: string; page?: number; limit?: number }) => {
    if (USE_MOCK) {
      await delay();
      let data = [...MOCK_USERS];
      if (params?.role) data = data.filter(u => u.role === params.role);
      return { data, total: data.length, page: 1, limit: 20 };
    }
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return http<{ data: typeof MOCK_USERS; total: number }>(`/api/users${q ? '?' + q : ''}`);
  },

  getById: async (id: string | number) => {
    if (USE_MOCK) {
      await delay(300);
      return MOCK_USERS.find(u => u.user_id === String(id)) || null;
    }
    return http(`/api/users/${id}`);
  },

  update: async (id: string | number, payload: {
    full_name?: string; email?: string; phone?: string | null; role?: string; is_active?: number;
  }) => {
    if (USE_MOCK) {
      await delay(500);
      const u = MOCK_USERS.find(u => u.user_id === String(id));
      if (u) Object.assign(u, payload);
      return { message: 'Cập nhật user thành công', data: u };
    }
    return http(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  delete: async (id: string | number) => {
    if (USE_MOCK) {
      await delay(400);
      return { message: 'Xóa user thành công' };
    }
    return http(`/api/users/${id}`, { method: 'DELETE' });
  },
};

// ═══════════════════════════════════════════════════
// HOTELS API  — real backend: GET /api/hotels
// ═══════════════════════════════════════════════════
export const hotelsApi = {
  getAll: async () => {
    if (USE_MOCK) {
      await delay();
      return { data: MOCK_HOTELS, total: MOCK_HOTELS.length };
    }
    return http<{ data: typeof MOCK_HOTELS }>('/api/hotels');
  },
  create: async (data: any) => {
    if (USE_MOCK) {
      await delay(500);
      return { message: 'Tạo khách sạn thành công (mock)', data };
    }
    return http('/api/hotels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: any) => {
    if (USE_MOCK) {
      await delay(500);
      return { message: 'Cập nhật khách sạn thành công (mock)' };
    }
    return http(`/api/hotels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    if (USE_MOCK) {
      await delay(500);
      return { message: 'Xóa khách sạn thành công (mock)' };
    }
    return http(`/api/hotels/${id}`, {
      method: 'DELETE',
    });
  },
};

// ═══════════════════════════════════════════════════
// ROOMS API  — real backend: GET /api/rooms
// ═══════════════════════════════════════════════════
export const roomsApi = {
  getAll: async (hotelId?: string) => {
    if (USE_MOCK) {
      await delay();
      const data = hotelId
        ? MOCK_ROOM_TYPES.filter(r => r.hotel_id === hotelId)
        : MOCK_ROOM_TYPES;
      return { data, total: data.length };
    }
    return http<{ data: typeof MOCK_ROOM_TYPES }>(
      `/api/hotels/rooms/all${hotelId ? '?hotelId=' + hotelId : ''}`
    );
  },

  create: async (data: any) => {
    if (USE_MOCK) {
      await delay(500);
      return { message: 'Tạo loại phòng thành công (mock)', data };
    }
    return http('/api/hotels/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string | number, payload: {
    name?: string; description?: string; capacity?: number;
    base_price?: number; current_price?: number; total_rooms?: number;
  }) => {
    if (USE_MOCK) {
      await delay(500);
      const r = MOCK_ROOM_TYPES.find(r => r.room_type_id === String(id));
      if (r) Object.assign(r, payload);
      return { message: 'Cập nhật loại phòng thành công', data: r };
    }
    return http(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  delete: async (id: string | number) => {
    if (USE_MOCK) {
      await delay(400);
      return { message: 'Xóa loại phòng thành công' };
    }
    return http(`/api/rooms/${id}`, { method: 'DELETE' });
  },

  updateCatalog: async (id: string | number, payload: {
    hotel_name?: string;
    amenities?: string[];
    images?: Array<{ url: string; alt: string; is_primary: boolean; order: number }>;
    description?: { vi?: string; en?: string };
    bed_type?: string;
    size_sqm?: number;
    floor?: number;
  }) => {
    if (USE_MOCK) {
      await delay(600);
      return { message: 'Cập nhật catalog MongoDB thành công' };
    }
    return http(`/api/rooms/${id}/catalog`, { method: 'PUT', body: JSON.stringify(payload) });
  },
};

// ═══════════════════════════════════════════════════
// BOOKINGS API  — Thành viên 1: Transaction & Locking
// real backend: GET/POST /api/bookings
// ═══════════════════════════════════════════════════
export const bookingsApi = {
  getAll: async (params?: { status?: string; userId?: string; page?: number; limit?: number }) => {
    if (USE_MOCK) {
      await delay();
      let data = [...MOCK_BOOKINGS];
      if (params?.status) data = data.filter(b => b.status === params.status);
      if (params?.userId) data = data.filter(b => b.user_id === params.userId);
      return { data, total: data.length };
    }
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return http<{ data: typeof MOCK_BOOKINGS; total: number }>(`/api/bookings${q ? '?' + q : ''}`);
  },

  getById: async (id: string) => {
    if (USE_MOCK) {
      await delay(300);
      return MOCK_BOOKINGS.find(b => b.booking_id === id) || null;
    }
    return http(`/api/bookings/${id}`);
  },

  // USER: Đặt phòng mới (calls sp_create_booking internally)
  create: async (payload: {
    user_id: number;
    room_type_id: number;
    check_in_date: string;
    check_out_date: string;
  }) => {
    if (USE_MOCK) {
      await delay(1200);
      const nights = Math.max(1,
        (new Date(payload.check_out_date).getTime() - new Date(payload.check_in_date).getTime())
        / 86400000
      );
      const room = MOCK_ROOM_TYPES.find(r => r.room_type_id === String(payload.room_type_id));
      const total_price = (room?.base_price || 2000000) * nights;
      // Simulate double booking check
      const conflict = MOCK_BOOKINGS.find(b =>
        b.room_type_id === String(payload.room_type_id) &&
        b.status !== 'cancelled' &&
        new Date(b.check_in) < new Date(payload.check_out_date) &&
        new Date(b.check_out) > new Date(payload.check_in_date)
      );
      if (conflict) throw Object.assign(new Error('DOUBLE_BOOKING: Phòng đã hết chỗ trong khoảng thời gian này'), { status: 409 });
      return { booking_id: 'bk_new_' + Date.now(), total_price, message: 'Đặt phòng thành công! Đang chờ xác nhận.' };
    }
    return http('/api/bookings', { method: 'POST', body: JSON.stringify(payload) });
  },

  // USER: Hủy đặt phòng
  cancel: async (bookingId: string, userId: string) => {
    if (USE_MOCK) {
      await delay(600);
      const b = MOCK_BOOKINGS.find(b => b.booking_id === bookingId);
      if (!b) throw Object.assign(new Error('Booking not found'), { status: 404 });
      if (b.status !== 'pending') throw Object.assign(new Error('Chỉ có thể hủy booking đang ở trạng thái pending'), { status: 400 });
      b.status = 'cancelled';
      return { message: 'Hủy đặt phòng thành công', booking_id: bookingId };
    }
    return http(`/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ user_id: Number(userId) }),
    });
  },

  // ADMIN: Cập nhật trạng thái (confirm / complete / cancel)
  updateStatus: async (bookingId: string, status: string, adminUserId: string) => {
    if (USE_MOCK) {
      await delay(500);
      const b = MOCK_BOOKINGS.find(b => b.booking_id === bookingId);
      if (b) b.status = status as any;
      return { message: `Cập nhật trạng thái thành công: ${status}` };
    }
    return http(`/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_user_id: Number(adminUserId) }),
    });
  },

  // Check room availability
  checkAvailability: async (roomTypeId: string, checkIn: string, checkOut: string) => {
    if (USE_MOCK) {
      await delay(400);
      const room = MOCK_ROOM_TYPES.find(r => r.room_type_id === roomTypeId);
      if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
      return {
        room_type_id: roomTypeId,
        name: room.name,
        total_rooms: room.total_rooms,
        booked_rooms: room.total_rooms - room.available_rooms,
        available_rooms: room.available_rooms,
        current_price: room.base_price,
        is_available: room.available_rooms > 0,
      };
    }
    return http(`/api/bookings/availability?roomTypeId=${roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}`);
  },

  // Get user's own bookings
  getMyBookings: async (userId: string) => {
    if (USE_MOCK) {
      await delay();
      const data = MOCK_BOOKINGS.filter(b => b.user_id === userId);
      return { data, total: data.length };
    }
    return http(`/api/bookings/my?userId=${userId}`);
  },
};

// ═══════════════════════════════════════════════════
// SEARCH API — Thành viên 2: Polyglot Persistence
// Rooms search with NoSQL catalog enrichment
// ═══════════════════════════════════════════════════
export const searchApi = {
  searchRooms: async (params: {
    city?: string;
    hotelId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => {
    if (USE_MOCK) {
      await delay(700);
      let data = [...MOCK_ROOM_TYPES] as any[];
      if (params.hotelId) data = data.filter(r => r.hotel_id === params.hotelId);
      if (params.minPrice) data = data.filter(r => r.base_price >= params.minPrice!);
      if (params.maxPrice) data = data.filter(r => r.base_price <= params.maxPrice!);
      if (params.amenities?.length) {
        data = data.filter(r =>
          params.amenities!.every(a => r.amenities?.includes(a))
        );
      }
      if (params.sortBy === 'price_asc')  data.sort((a, b) => a.base_price - b.base_price);
      if (params.sortBy === 'price_desc') data.sort((a, b) => b.base_price - a.base_price);
      const page = params.page || 1;
      const limit = params.limit || 20;
      const paged = data.slice((page - 1) * limit, page * limit);
      return { data: paged, total: data.length, page, limit };
    }
    const q = new URLSearchParams();
    if (params.city)     q.set('city', params.city);
    if (params.hotelId)  q.set('hotelId', params.hotelId);
    if (params.checkIn)  q.set('checkIn', params.checkIn);
    if (params.checkOut) q.set('checkOut', params.checkOut);
    if (params.guests)   q.set('guests', String(params.guests));
    if (params.minPrice) q.set('minPrice', String(params.minPrice));
    if (params.maxPrice) q.set('maxPrice', String(params.maxPrice));
    if (params.amenities?.length) q.set('amenities', params.amenities.join(','));
    if (params.sortBy)   q.set('sortBy', params.sortBy);
    if (params.page)     q.set('page', String(params.page));
    if (params.limit)    q.set('limit', String(params.limit));
    return http(`/api/rooms/search?${q.toString()}`);
  },

  markConverted: async (sessionId: string, roomTypeId: string) => {
    if (USE_MOCK) return { message: 'Marked (mock)' };
    try {
      return await http('/api/search-logs/convert', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, room_type_id: roomTypeId }),
      });
    } catch {
      return { message: 'Convert skipped' };
    }
  },

  logSearch: async (data: {
    city: string;
    check_in: string;
    check_out: string;
    guests?: number;
    filters?: Record<string, unknown>;
    results_count?: number;
    user_id?: string;
    session_id: string;
    response_time_ms?: number;
  }) => {
    if (USE_MOCK) return { message: 'Logged (mock)' };
    try {
      return await http('/api/search-logs', { method: 'POST', body: JSON.stringify(data) });
    } catch {
      // Non-critical — don't throw if logging fails
      return { message: 'Log skipped' };
    }
  },

  getUserHistory: async (userId: string, limit?: number) => {
    if (USE_MOCK) {
      await delay(300);
      return { data: [], total: 0 };
    }
    const q = limit ? `?limit=${limit}` : '';
    return http(`/api/search-logs/history/${userId}${q}`);
  },

  getAnalytics: async (type: 'top-cities' | 'popular-amenities' | 'trend' | 'price-preferences', days = 30) => {
    if (USE_MOCK) {
      await delay(600);
      const mockCities = [
        { city: 'Hà Nội', search_count: 1847, converted_count: 312, conversion_rate: 16.9, avg_results: 42 },
        { city: 'Hồ Chí Minh', search_count: 1523, converted_count: 245, conversion_rate: 16.1, avg_results: 38 },
        { city: 'Đà Nẵng', search_count: 986, converted_count: 198, conversion_rate: 20.1, avg_results: 28 },
        { city: 'Hội An', search_count: 734, converted_count: 167, conversion_rate: 22.8, avg_results: 15 },
        { city: 'Nha Trang', search_count: 612, converted_count: 89, conversion_rate: 14.5, avg_results: 22 },
      ];
      const mockAmenities = [
        { amenity: 'WiFi', count: 2341 },
        { amenity: 'Hồ bơi', count: 1876 },
        { amenity: 'Bãi đỗ xe', count: 1534 },
        { amenity: 'Gym', count: 987 },
        { amenity: 'Spa', count: 823 },
        { amenity: 'Sea View', count: 712 },
        { amenity: 'Breakfast', count: 645 },
      ];
      const mockTrend = Array.from({ length: days }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
        return {
          date: d.toISOString().slice(0, 10),
          searches: 150 + Math.floor(Math.random() * 200),
          conversions: 20 + Math.floor(Math.random() * 50),
        };
      });
      const mockPrices = [
        { range: 'Dưới 1M', count: 234 },
        { range: '1M–2M', count: 687 },
        { range: '2M–3M', count: 923 },
        { range: '3M–5M', count: 445 },
        { range: '5M–10M', count: 189 },
        { range: 'Trên 10M', count: 56 },
      ];
      if (type === 'top-cities')          return { data: mockCities, days };
      if (type === 'popular-amenities')   return { data: mockAmenities, days };
      if (type === 'trend')               return { data: mockTrend, days };
      if (type === 'price-preferences')   return { data: mockPrices };
      return { data: [] };
    }
    try {
      return await http(`/api/search-logs/analytics/${type}?days=${days}`);
    } catch {
      return { data: [] };
    }
  },
};

// ═══════════════════════════════════════════════════
// SUPPORT API — Thành viên 2: Support Tickets (MongoDB)
// ═══════════════════════════════════════════════════
export const supportApi = {
  createTicket: async (data: {
    user_id: string;
    user_name: string;
    user_email: string;
    subject: string;
    message: string;
    category?: string;
    priority?: string;
    booking_id?: string;
  }) => {
    if (USE_MOCK) {
      await delay(800);
      return { ticket_id: 'tk_' + Date.now(), message: 'Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi trong vòng 24 giờ.' };
    }
    return http('/api/support', { method: 'POST', body: JSON.stringify(data) });
  },

  getMyTickets: async (userId: string) => {
    if (USE_MOCK) {
      await delay(500);
      return { data: [], total: 0 };
    }
    return http(`/api/support/my/${userId}`);
  },

  getAll: async (params?: { status?: string; category?: string; page?: number }) => {
    if (USE_MOCK) {
      await delay();
      const mockTickets = [
        { _id: 'tk001', user_name: 'Trần Văn Minh', subject: 'Hỏi về chính sách hủy phòng', category: 'booking', status: 'open', priority: 'medium', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { _id: 'tk002', user_name: 'Phạm Thị Hoa', subject: 'Điều hòa không hoạt động', category: 'room_quality', status: 'in_progress', priority: 'high', createdAt: new Date(Date.now() - 7200000).toISOString() },
        { _id: 'tk003', user_name: 'Lê Quang Huy', subject: 'Yêu cầu hóa đơn VAT', category: 'billing', status: 'resolved', priority: 'low', createdAt: new Date(Date.now() - 86400000).toISOString() },
      ];
      return { data: mockTickets, total: mockTickets.length, page: 1, limit: 30 };
    }
    const q = params ? new URLSearchParams(params as any).toString() : '';
    return http(`/api/support${q ? '?' + q : ''}`);
  },

  reply: async (ticketId: string, adminId: string, adminName: string, message: string) => {
    if (USE_MOCK) {
      await delay(500);
      return { message: 'Đã gửi phản hồi' };
    }
    return http(`/api/support/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ admin_id: adminId, admin_name: adminName, message }),
    });
  },

  resolve: async (id: string, adminId: string) => {
    if (USE_MOCK) {
      await delay(400);
      return { message: 'Đã giải quyết ticket (mock)' };
    }
    return http(`/api/support/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_id: adminId }),
    });
  },
};

// ═══════════════════════════════════════════════════
// PRICING API  — real backend: GET /api/pricing
// ═══════════════════════════════════════════════════
export const pricingApi = {
  /** Price history — backend doesn't expose this yet, always falls back to mock */
  getHistory: async (roomTypeId?: string) => {
    if (USE_MOCK) {
      await delay();
      const data = roomTypeId
        ? MOCK_PRICE_HISTORY.filter(p => p.room_type_id === roomTypeId)
        : MOCK_PRICE_HISTORY;
      return { data, total: data.length };
    }
    // Backend endpoint for price history (falls back to mock if 404)
    try {
      return await http<{ data: typeof MOCK_PRICE_HISTORY }>(
        `/api/pricing/history${roomTypeId ? '?roomTypeId=' + roomTypeId : ''}`
      );
    } catch {
      // Graceful fallback when endpoint not yet implemented
      console.warn('Price history endpoint not available, using mock data');
      const data = roomTypeId
        ? MOCK_PRICE_HISTORY.filter(p => p.room_type_id === roomTypeId)
        : MOCK_PRICE_HISTORY;
      return { data, total: data.length };
    }
  },

  getRules: async () => {
    if (USE_MOCK) {
      await delay(400);
      return { data: MOCK_PRICING_RULES };
    }
    try {
      return await http<{ data: typeof MOCK_PRICING_RULES }>('/api/pricing/rules');
    } catch {
      console.warn('Pricing rules endpoint not available, using mock data');
      return { data: MOCK_PRICING_RULES };
    }
  },

 createRule: async (payload: {
    rule_name: string;
    rule_type: string;
    threshold_min: number;
    threshold_max: number;
    adjustment_type: string;
    adjustment_value: number;
    priority: number;
    is_active?: boolean;
    valid_from?: string | null;
    valid_to?: string | null;
  }) => {
    if (USE_MOCK) {
      await delay(600);
      return { message: 'Tạo quy tắc giá thành công' };
    }
    return http('/api/pricing/rules', { method: 'POST', body: JSON.stringify(payload) });
  },

  updateRule: async (ruleId: string | number, payload: Partial<{
    rule_name: string;
    rule_type: string;
    threshold_min: number;
    threshold_max: number;
    adjustment_type: string;
    adjustment_value: number;
    priority: number;
    is_active: boolean;
    valid_from: string | null;
    valid_to: string | null;
  }>) => {
    if (USE_MOCK) {
      await delay(500);
      const r = MOCK_PRICING_RULES.find((r: any) => String(r.rule_id) === String(ruleId));
      if (r) Object.assign(r, payload);
      return { message: 'Cập nhật quy tắc thành công' };
    }
    return http(`/api/pricing/rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  deleteRule: async (ruleId: string | number) => {
    if (USE_MOCK) {
      await delay(400);
      return { message: 'Xóa quy tắc thành công' };
    }
    return http(`/api/pricing/rules/${ruleId}`, { method: 'DELETE' });
  },

  toggleRule: async (ruleId: string | number) => {
    if (USE_MOCK) {
      await delay(300);
      const r = MOCK_PRICING_RULES.find((r: any) => String(r.rule_id) === String(ruleId)) as any;
      if (r) r.is_active = !r.is_active;
      return { message: `Rule ${r?.is_active ? 'đã bật' : 'đã tắt'}` };
    }
    return http(`/api/pricing/rules/${ruleId}/toggle`, { method: 'PATCH' });
  },

  updatePrice: async (roomTypeId: string, newPrice: number, reason: string) => {
    if (USE_MOCK) {
      await delay(700);
      const room = MOCK_ROOM_TYPES.find(r => r.room_type_id === roomTypeId);
      const oldPrice = room?.base_price || 0;
      const pct = ((newPrice - oldPrice) / oldPrice) * 100;
      return {
        success: true,
        alert_flag: Math.abs(pct) >= 50,
        message:
          Math.abs(pct) >= 50
            ? `⚠️ Giá cập nhật! alert_flag = 1 vì biến động ${pct.toFixed(1)}% > 50%`
            : '✓ Trigger ghi price_history thành công',
      };
    }
    return http('/api/pricing/update-price', {
      method: 'POST',
      body: JSON.stringify({ 
        room_type_id: parseInt(roomTypeId), 
        new_price: newPrice, 
        reason 
      }),
    });
  },

  getSuggestion: async (roomTypeId: string) => {
    if (USE_MOCK) {
      await delay(1200);
      const room = MOCK_ROOM_TYPES.find(r => r.room_type_id === roomTypeId);
      if (!room) throw new Error('Room not found');
      const suggested = Math.round(room.base_price * 1.08);
      return {
        current_price: room.base_price,
        suggested_price: suggested,
        change_pct: 8.0,
        reasoning: 'Occupancy rate hiện tại > 75%. Áp dụng High Occupancy Rule (+8%).',
        confidence: 87,
      };
    }
    return http(`/api/pricing/suggest?roomTypeId=${roomTypeId}`);
  },
};

// ═══════════════════════════════════════════════════
// ANALYTICS API  — real backend: GET /api/analytics/dashboard
// ═══════════════════════════════════════════════════
export const analyticsApi = {
  getDashboard: async () => {
    if (USE_MOCK) {
      await delay(600);
      return MOCK_ANALYTICS;
    }
    try {
      return await http<typeof MOCK_ANALYTICS>('/api/analytics/dashboard');
    } catch {
      console.warn('Analytics dashboard endpoint not available, using mock data');
      return MOCK_ANALYTICS;
    }
  },

  getRevenue: async () => {
    if (USE_MOCK) {
      await delay(600);
      return { data: MOCK_ANALYTICS.monthly_revenue };
    }
    try {
      return await http('/api/analytics/revenue');
    } catch {
      return { data: MOCK_ANALYTICS.monthly_revenue };
    }
  },
};

// ── Health check ──
export const checkApiHealth = async (): Promise<boolean> => {
  if (USE_MOCK) return false;
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

// Legacy export so existing code still compiles
export const api = {
  get: (path: string) => http(path),
  post: (path: string, body: unknown) =>
    http(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    http(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    http(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => http(path, { method: 'DELETE' }),
};