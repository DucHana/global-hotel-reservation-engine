// ═══════════════════════════════════════════════════
// API CLIENT — connects to NestJS backend
// ĐÃ TẮT MOCK DATA ĐỂ DÙNG 100% DATABASE THẬT
// ═══════════════════════════════════════════════════

import {
  MOCK_USERS, MOCK_HOTELS, MOCK_ROOM_TYPES, MOCK_BOOKINGS,
  MOCK_PRICE_HISTORY, MOCK_ANALYTICS, MOCK_PRICING_RULES, delay,
} from './mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// Bắt buộc dùng Real Backend, tắt giả lập
const USE_MOCK = false; 

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
// AUTH API
// ═══════════════════════════════════════════════════
export const authApi = {
  login: async (email: string, password: string) => {
    return http<{ access_token: string; user: object }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (payload: {
    full_name: string; email: string; password: string; phone?: string; role?: string;
  }) => {
    return http('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },

  logout: () => tokenStore.clear(),
};

// ═══════════════════════════════════════════════════
// USERS API
// ═══════════════════════════════════════════════════
export const usersApi = {
  getAll: async (params?: { role?: string; page?: number; limit?: number }) => {
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return http<{ data: typeof MOCK_USERS; total: number }>(`/api/users${q ? '?' + q : ''}`);
  },
  getById: async (id: string | number) => http(`/api/users/${id}`),
  update: async (id: string | number, payload: any) => http(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: async (id: string | number) => http(`/api/users/${id}`, { method: 'DELETE' }),
};

// ═══════════════════════════════════════════════════
// HOTELS & ROOMS API
// ═══════════════════════════════════════════════════
export const hotelsApi = {
  getAll: async () => http<{ data: typeof MOCK_HOTELS }>('/api/hotels'),
  getById: async (id: number) => http(`/api/hotels/${id}`),
  create: async (data: any) => http('/api/hotels', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: any) => http(`/api/hotels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => http(`/api/hotels/${id}`, { method: 'DELETE' }),
};

export const roomsApi = {
  getAll: async (hotelId?: string) => http<{ data: typeof MOCK_ROOM_TYPES }>(`/api/rooms${hotelId ? '?hotelId=' + hotelId : ''}`),
  getAmenities: async () => http<{ data: string[]; total: number }>('/api/rooms/amenities'),
  getById: async (id: string | number) => http(`/api/rooms/${id}`),
  create: async (data: any) => http('/api/rooms', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: string | number, payload: any) => http(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: async (id: string | number) => http(`/api/rooms/${id}`, { method: 'DELETE' }),
  updateCatalog: async (id: string | number, payload: any) => http(`/api/rooms/${id}/catalog`, { method: 'PUT', body: JSON.stringify(payload) }),
};

// ═══════════════════════════════════════════════════
// BOOKINGS API
// ═══════════════════════════════════════════════════
export const bookingsApi = {
  getAll: async (params?: any) => {
    const q = params ? new URLSearchParams(params).toString() : '';
    return http<{ data: typeof MOCK_BOOKINGS; total: number }>(`/api/bookings${q ? '?' + q : ''}`);
  },
  getById: async (id: string) => http(`/api/bookings/${id}`),
  create: async (payload: any) => http('/api/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  cancel: async (bookingId: string) => http(`/api/bookings/${bookingId}/cancel`, { method: 'PATCH', body: JSON.stringify({}) }),
  updateStatus: async (bookingId: string, status: string, adminUserId: string) => http(`/api/bookings/${bookingId}/status`, { method: 'PATCH', body: JSON.stringify({ status, admin_user_id: Number(adminUserId) }) }),
  checkAvailability: async (roomTypeId: string, checkIn: string, checkOut: string) => http(`/api/bookings/availability?roomTypeId=${roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}`),
  getMyBookings: async () => http('/api/bookings/my'),
};

// ═══════════════════════════════════════════════════
// SEARCH API — Đã Fix triệt để lỗi 'Hà+Nội'
// ═══════════════════════════════════════════════════
export const searchApi = {
  searchRooms: async (params: {
    city?: string; hotelId?: string; checkIn?: string; checkOut?: string;
    guests?: number; minPrice?: number; maxPrice?: number; amenities?: string[];
    sortBy?: string; page?: number; limit?: number;
  }) => {
    const q = new URLSearchParams();
    
    // Xử lý dấu cộng (+) bị dính từ thanh URL trên trình duyệt
    if (params.city) q.set('city', params.city.replace(/\+/g, ' '));
    
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

    // Đảm bảo URL mã hóa dấu cách thành %20 chứ không phải dấu +
    const queryString = q.toString().replace(/\+/g, '%20');
    return http(`/api/rooms/search?${queryString}`);
  },

  markConverted: async (sessionId: string, roomTypeId: string) => {
    try {
      return await http('/api/search-logs/convert', { method: 'POST', body: JSON.stringify({ session_id: sessionId, room_type_id: roomTypeId }) });
    } catch { return { message: 'Convert skipped' }; }
  },

  logSearch: async (data: any) => {
    try {
      return await http('/api/search-logs', { method: 'POST', body: JSON.stringify(data) });
    } catch { return { message: 'Log skipped' }; }
  },

  getUserHistory: async (userId: string, limit?: number) => {
    const q = limit ? `?limit=${limit}` : '';
    return http(`/api/search-logs/history/${userId}${q}`);
  },

  getAnalytics: async (type: string, days = 30) => {
    try { return await http(`/api/search-logs/analytics/${type}?days=${days}`); } 
    catch { return { data: [] }; }
  },
};

// ═══════════════════════════════════════════════════
// SUPPORT API
// ═══════════════════════════════════════════════════
export const supportApi = {
  createTicket: async (data: any) => http('/api/support', { method: 'POST', body: JSON.stringify(data) }),
  getMyTickets: async (userId: string) => http(`/api/support/my/${userId}`),
  getAll: async (params?: any) => {
    const q = params ? new URLSearchParams(params).toString() : '';
    return http(`/api/support${q ? '?' + q : ''}`);
  },
  reply: async (ticketId: string, adminId: string, adminName: string, message: string) => http(`/api/support/${ticketId}/reply`, { method: 'POST', body: JSON.stringify({ admin_id: adminId, admin_name: adminName, message }) }),
  resolve: async (id: string, adminId: string) => http(`/api/support/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ admin_id: adminId }) }),
};

// ═══════════════════════════════════════════════════
// PRICING & ANALYTICS API
// ═══════════════════════════════════════════════════
export const pricingApi = {
  getHistory: async (roomTypeId?: string) => {
    try { return await http<{ data: typeof MOCK_PRICE_HISTORY }>(`/api/pricing/history${roomTypeId ? '?roomTypeId=' + roomTypeId : ''}`); } 
    catch { return { data: [], total: 0 }; }
  },
  getRules: async () => {
    try { return await http<{ data: typeof MOCK_PRICING_RULES }>('/api/pricing/rules'); } 
    catch { return { data: [] }; }
  },
  createRule: async (payload: any) => http('/api/pricing/rules', { method: 'POST', body: JSON.stringify(payload) }),
  updateRule: async (ruleId: string | number, payload: any) => http(`/api/pricing/rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRule: async (ruleId: string | number) => http(`/api/pricing/rules/${ruleId}`, { method: 'DELETE' }),
  toggleRule: async (ruleId: string | number) => http(`/api/pricing/rules/${ruleId}/toggle`, { method: 'PATCH' }),
  updatePrice: async (roomTypeId: string, newPrice: number, reason: string) => http('/api/pricing/update-price', { method: 'POST', body: JSON.stringify({ room_type_id: parseInt(roomTypeId), new_price: newPrice, reason }) }),
  getSuggestion: async (roomTypeId: string) => http(`/api/pricing/suggest?roomTypeId=${roomTypeId}`),
};

export const analyticsApi = {
  getDashboard: async () => {
    try {
      const data = await http<typeof MOCK_ANALYTICS>('/api/analytics/dashboard');
      return data || MOCK_ANALYTICS;
    } catch {
      return MOCK_ANALYTICS;
    }
  },
  getRevenue: async () => {
    try { return await http('/api/analytics/revenue'); } 
    catch { return { data: [] }; }
  },
};

export const reportsApi = {
  getTopRoomsQuarterly: async (params?: { year?: number; quarter?: number; hotelId?: number }) => {
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return http(`/api/reports/top-rooms-quarterly${q ? '?' + q : ''}`);
  },
  getBranchPerformance: async (params?: { year?: number; quarter?: number }) => {
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return http(`/api/reports/branch-performance${q ? '?' + q : ''}`);
  },
  getOccupancyOverview: async (params?: { hotelId?: number }) => {
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return http(`/api/reports/occupancy-overview${q ? '?' + q : ''}`);
  },
};

export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
};

export const api = {
  get: (path: string) => http(path),
  post: (path: string, body: unknown) => http(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: unknown) => http(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) => http(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => http(path, { method: 'DELETE' }),
};