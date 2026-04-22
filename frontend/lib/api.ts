// ═══════════════════════════════════════════════════
// API CLIENT — connects to NestJS backend
// Falls back to mock data if backend unreachable
// ═══════════════════════════════════════════════════

import {
  MOCK_USERS, MOCK_HOTELS, MOCK_ROOM_TYPES, MOCK_BOOKINGS,
  MOCK_PRICE_HISTORY, MOCK_ANALYTICS, MOCK_PRICING_RULES, delay,
} from './mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'false';

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
      `/api/rooms${hotelId ? '?hotelId=' + hotelId : ''}`
    );
  },
};

// ═══════════════════════════════════════════════════
// BOOKINGS API  — real backend: GET /api/bookings
// ═══════════════════════════════════════════════════
export const bookingsApi = {
  getAll: async (params?: { status?: string; userId?: string }) => {
    if (USE_MOCK) {
      await delay();
      let data = [...MOCK_BOOKINGS];
      if (params?.status) data = data.filter(b => b.status === params.status);
      if (params?.userId) data = data.filter(b => b.user_id === params.userId);
      return { data, total: data.length };
    }
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return http<{ data: typeof MOCK_BOOKINGS }>(`/api/bookings${q ? '?' + q : ''}`);
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
      return await http<{ data: typeof MOCK_PRICING_RULES }>('/api/pricing');
    } catch {
      console.warn('Pricing rules endpoint not available, using mock data');
      return { data: MOCK_PRICING_RULES };
    }
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
    return http('/api/pricing/update', {
      method: 'POST',
      body: JSON.stringify({ roomTypeId, newPrice, reason }),
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