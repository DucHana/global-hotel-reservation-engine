'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { analyticsApi, usersApi, roomsApi, pricingApi, hotelsApi, bookingsApi, searchApi, supportApi, reportsApi, checkApiHealth } from '@/lib/api';
import type {
  MockUser, MockHotel, MockRoomType, MockBooking, MockPriceHistory, MockAnalytics, MockPricingRule
} from '@/types';

// ── Types for API responses ──
type PageId = 'dashboard' | 'auth' | 'users' | 'rooms' | 'hotels' | 'pricing' | 'history' | 'rules' | 'reports' | 'occupancy' | 'bookings' | 'search-analytics' | 'support';

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Dashboard', auth: 'Auth & RBAC', users: 'Người dùng',
  rooms: 'Loại phòng', hotels: 'Chi nhánh', pricing: 'Dynamic Pricing',
  history: 'Price History', rules: 'Pricing Rules', reports: 'Báo cáo OLAP',
  occupancy: 'Occupancy Rate',
  bookings: 'Quản lý Đặt phòng',
  'search-analytics': 'Search Analytics (NoSQL)',
  support: 'Yêu cầu Hỗ trợ',
};

// ── Utility ──
const fmt = (n: number) => (n !== undefined && n !== null) ? n.toLocaleString('vi-VN') : '0';
const fmtM = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'B' : n + 'M');

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();

  const [page, setPage] = useState<PageId>('dashboard');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const [analytics, setAnalytics] = useState<MockAnalytics | null>(null);
  const [users, setUsers] = useState<MockUser[]>([]);
  const [rooms, setRooms] = useState<MockRoomType[]>([]);
  const [hotels, setHotels] = useState<MockHotel[]>([]);
  const [priceHistory, setPriceHistory] = useState<MockPriceHistory[]>([]);
  const [pricingRules, setPricingRules] = useState<MockPricingRule[]>([]);

  // Member 1 — Bookings
  const [allBookings, setAllBookings] = useState<MockBooking[]>([]);
  const [bookingFilter, setBookingFilter] = useState('');

  // Member 2 — Search analytics + support
  const [searchAnalytics, setSearchAnalytics] = useState<{ topCities: any[]; amenities: any[]; trend: any[] }>({ topCities: [], amenities: [], trend: [] });
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportFilter, setSupportFilter] = useState('');
  const [supportReplies, setSupportReplies] = useState<Record<string, string>>({});
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [topRoomsQuarterly, setTopRoomsQuarterly] = useState<any[]>([]);
  const [branchPerformance, setBranchPerformance] = useState<any[]>([]);
  const [occupancyOverview, setOccupancyOverview] = useState<any[]>([]);

  // Pricing form - Khởi tạo state chuẩn để không bị đỏ
  const [selRoom, setSelRoom] = useState<string>('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [priceReason, setPriceReason] = useState('');

  // FIX: Định nghĩa lại kiểu dữ liệu cho suggestion để hết lỗi đỏ
  const [suggestion, setSuggestion] = useState<{
    suggested_price: number;
    reasoning: string;
    change_from_base: number; // Trường gây lỗi đỏ trong ảnh
    is_new_room?: boolean;    // Trường gây lỗi đỏ trong ảnh
    confidence?: number;
  } | null>(null);

  // Modal form states
  const [modalUserName, setModalUserName] = useState('');
  const [modalUserPhone, setModalUserPhone] = useState('');
  const [modalUserEmail, setModalUserEmail] = useState('');
  const [modalUserPassword, setModalUserPassword] = useState('');
  const [modalUserRole, setModalUserRole] = useState<'admin' | 'manager' | 'staff' | 'customer'>('customer');

  const [modalRoomName, setModalRoomName] = useState('');
  const [modalRoomHotel, setModalRoomHotel] = useState<string>('');
  const [modalRoomCapacity, setModalRoomCapacity] = useState(2);
  const [modalRoomPrice, setModalRoomPrice] = useState(2000000);
  const [modalRoomTotal, setModalRoomTotal] = useState(10);
  const [modalRoomDesc, setModalRoomDesc] = useState('');

  // Pricing Rule states
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('occupancy');
  const [tMin, setTMin] = useState(0);
  const [tMax, setTMax] = useState(100);
  const [adjType, setAdjType] = useState('percent');
  const [adjVal, setAdjVal] = useState(0);
  const [priority, setPriority] = useState(5);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  // Hotel form
  const [modalHotelName, setModalHotelName] = useState('');
  const [modalHotelCity, setModalHotelCity] = useState('');
  const [modalHotelAddress, setModalHotelAddress] = useState('');
  const [modalHotelPhone, setModalHotelPhone] = useState('');
  const [modalHotelEmail, setModalHotelEmail] = useState('');

  const [editingHotel, setEditingHotel] = useState<MockHotel | null>(null);
  const [editingRule, setEditingRule] = useState<MockPricingRule | null>(null);
  const [editingRoom, setEditingRoom] = useState<MockRoomType | null>(null);
  const [editingUser, setEditingUser] = useState<MockUser | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const showToast = useCallback((msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const openEditRoomModal = (room: MockRoomType) => {
    setEditingRoom(room);
    setModalRoomName(room.name);
    setModalRoomHotel(room.hotel_id.toString());
    setModalRoomCapacity(room.capacity);
    setModalRoomPrice(Number(room.base_price));
    setModalRoomTotal(room.total_rooms);
    setModalRoomDesc(room.description || '');
    setModalOpen('addRoom');
  };

  const handleSaveRoom = async () => {
    if (!modalRoomHotel) return showToast('Vui lòng chọn khách sạn', 'error');
    try {
      setLoading(true);
      const payload = {
        hotel_id: Number(modalRoomHotel),
        name: modalRoomName,
        capacity: modalRoomCapacity,
        base_price: modalRoomPrice,
        current_price: modalRoomPrice,
        total_rooms: modalRoomTotal,
        description: modalRoomDesc
      };

      if (editingRoom) {
        await roomsApi.update(editingRoom.room_type_id, payload);
        showToast('Cập nhật loại phòng thành công', 'success');
      } else {
        await roomsApi.create(payload);
        showToast('Tạo loại phòng thành công', 'success');
      }

      setModalOpen(null);
      setEditingRoom(null);
      const res = await roomsApi.getAll() as { data: MockRoomType[] };
      setRooms(res.data);
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi lưu loại phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (id: string | number) => {
    if (!confirm('Bạn có chắc muốn xóa loại phòng này?')) return;
    try {
      await roomsApi.delete(id);
      showToast('Xóa thành công', 'success');
      const res = await roomsApi.getAll() as { data: MockRoomType[] };
      setRooms(res.data);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteHotel = async (id: string | number) => {
    if (!confirm('Bạn có chắc muốn xóa chi nhánh này?')) return;
    try {
      await hotelsApi.delete(Number(id));
      showToast('Xóa thành công', 'success');
      const res = await hotelsApi.getAll() as { data: MockHotel[] };
      setHotels(res.data);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteRule = async (id: string | number) => {
    if (!confirm('Bạn có chắc muốn xóa quy tắc này?')) return;
    try {
      await pricingApi.deleteRule(id);
      showToast('Xóa thành công', 'success');
      const res = await pricingApi.getRules() as any;
      setPricingRules(res.data);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleBookingStatusUpdate = async (bookingId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    if (!user?.user_id) return;
    try {
      setBusyBookingId(bookingId);
      await bookingsApi.updateStatus(bookingId, status, String(user.user_id));
      showToast(`Đã cập nhật booking sang ${status}`, 'success');
      const res = await bookingsApi.getAll() as { data: MockBooking[] };
      setAllBookings(res.data);
    } catch (e: any) {
      showToast(e.message || 'Lỗi cập nhật trạng thái booking', 'error');
    } finally {
      setBusyBookingId(null);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    if (!user?.user_id) return;
    try {
      setBusyTicketId(ticketId);
      await supportApi.resolve(ticketId, String(user.user_id));
      showToast('Đã đóng ticket', 'success');
      const res = await supportApi.getAll() as { data: any[] };
      setSupportTickets(res.data);
    } catch (e: any) {
      showToast(e.message || 'Không thể đóng ticket', 'error');
    } finally {
      setBusyTicketId(null);
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    const msg = (supportReplies[ticketId] || '').trim();
    if (!msg) return showToast('Vui lòng nhập nội dung phản hồi', 'warning');
    if (!user?.user_id) return;
    try {
      setBusyTicketId(ticketId);
      await supportApi.reply(ticketId, String(user.user_id), user.full_name || 'Admin', msg);
      setSupportReplies(prev => ({ ...prev, [ticketId]: '' }));
      showToast('Đã gửi phản hồi', 'success');
      const res = await supportApi.getAll() as { data: any[] };
      setSupportTickets(res.data);
    } catch (e: any) {
      showToast(e.message || 'Không thể phản hồi ticket', 'error');
    } finally {
      setBusyTicketId(null);
    }
  };

  const openEditRuleModal = (rule: MockPricingRule) => {
    setEditingRule(rule);
    setRuleName(rule.rule_name);
    setRuleType(rule.rule_type);
    setTMin(rule.threshold_min);
    setTMax(rule.threshold_max);
    setAdjType(rule.adjustment_type);
    setAdjVal(rule.adjustment_value);
    setPriority(rule.priority);
    setValidFrom(rule.valid_from ? rule.valid_from.split('T')[0] : '');
    setValidTo(rule.valid_to ? rule.valid_to.split('T')[0] : '');
    setModalOpen('addRule');
  };

  // Auth guard - Bảo vệ trang Admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth');
      } else if (user?.role !== 'admin' && user?.role !== 'superadmin') {
        // Nếu đã đăng nhập nhưng không có quyền admin, quay về trang chủ
        router.push('/');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Populate user modal
  useEffect(() => {
    if (editingUser) {
      setModalUserName(editingUser.full_name);
      setModalUserEmail(editingUser.email);
      setModalUserPhone(editingUser.phone || '');
      setModalUserRole(editingUser.role as any);
    } else {
      setModalUserName('');
      setModalUserEmail('');
      setModalUserPhone('');
      setModalUserRole('customer');
      setModalUserPassword('');
    }
  }, [editingUser]);

  // Populate hotel modal
  useEffect(() => {
    if (editingHotel) {
      setModalHotelName(editingHotel.name);
      setModalHotelCity(editingHotel.city);
      setModalHotelAddress(editingHotel.address);
      setModalHotelPhone(editingHotel.phone || '');
    } else {
      setModalHotelName('');
      setModalHotelCity('');
      setModalHotelAddress('');
      setModalHotelPhone('');
    }
  }, [editingHotel]);
 
   useEffect(() => {
     if (editingRule) {
       setRuleName(editingRule.rule_name);
       setRuleType(editingRule.rule_type);
       setTMin(editingRule.threshold_min || 0);
       setTMax(editingRule.threshold_max || 100);
       setAdjType(editingRule.adjustment_type);
       setAdjVal(editingRule.adjustment_value);
       setPriority(editingRule.priority);
       setValidFrom(editingRule.valid_from ? String(editingRule.valid_from).split('T')[0] : '');
       setValidTo(editingRule.valid_to ? String(editingRule.valid_to).split('T')[0] : '');
     } else {
       setRuleName('');
       setRuleType('occupancy');
       setTMin(0);
       setTMax(100);
       setAdjType('percent');
       setAdjVal(0);
       setPriority(5);
       setValidFrom('');
       setValidTo('');
     }
   }, [editingRule]);

  // Check API health
  useEffect(() => {
    checkApiHealth().then(setApiOnline);
  }, []);

  // Load data per page
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (page === 'dashboard') {
          const data = await analyticsApi.getDashboard() as any;
          setAnalytics({
            kpis: {
              total_revenue: Number(data?.kpis?.total_revenue || 0),
              revenue_growth: Number(data?.kpis?.revenue_growth || 0),
              total_bookings: Number(data?.kpis?.total_bookings || 0),
              booking_growth: Number(data?.kpis?.booking_growth || 0),
              avg_occupancy: Number(data?.kpis?.avg_occupancy || 0),
              occupancy_change: Number(data?.kpis?.occupancy_change || 0),
              avg_daily_rate: Number(data?.kpis?.avg_daily_rate || 0),
              adr_change: Number(data?.kpis?.adr_change || 0),
            },
            monthly_revenue: Array.isArray(data?.monthly_revenue) ? data.monthly_revenue : [],
            top_rooms: Array.isArray(data?.top_rooms) ? data.top_rooms : [],
          } as MockAnalytics);
        } else if (page === 'auth') {
          const res = await usersApi.getAll() as { data: MockUser[] };
          setUsers(res.data);
        } else if (page === 'users') {
          const res = await usersApi.getAll() as { data: MockUser[] };
          setUsers(res.data);
        } else if (page === 'rooms') {
          const res = await roomsApi.getAll() as { data: MockRoomType[] };
          setRooms(res.data);
          const hres = await hotelsApi.getAll() as { data: MockHotel[] };
          setHotels(hres.data);
          if (hres.data.length > 0) setModalRoomHotel(hres.data[0].hotel_id.toString());
        } else if (page === 'hotels' || page === 'occupancy') {
          const res = await hotelsApi.getAll() as { data: MockHotel[] };
          setHotels(res.data);
        } else if (page === 'pricing') {
          const [roomsRes, historyRes] = await Promise.all([
            roomsApi.getAll() as Promise<{ data: MockRoomType[] }>,
            pricingApi.getHistory() as Promise<{ data: MockPriceHistory[] }>,
          ]);
          setRooms(roomsRes.data);
          setPriceHistory(historyRes.data || []);
          if (roomsRes.data.length > 0) {
            setSelRoom(roomsRes.data[0].room_type_id.toString());
            setNewPrice(Number(roomsRes.data[0].current_price || roomsRes.data[0].base_price));
          }
        } else if (page === 'history') {
          const res = await pricingApi.getHistory() as { data: MockPriceHistory[] };
          setPriceHistory(res.data);
        } else if (page === 'rules') {
          const res = await pricingApi.getRules() as { data: MockPricingRule[] };
          setPricingRules(res.data);
        } else if (page === 'bookings') {
          const res = await bookingsApi.getAll() as { data: MockBooking[] };
          setAllBookings(res.data);
        } else if (page === 'search-analytics') {
          const [cities, amenities, trend, prices] = await Promise.all([
            searchApi.getAnalytics('top-cities', 30) as Promise<{ data: any[] }>,
            searchApi.getAnalytics('popular-amenities', 30) as Promise<{ data: any[] }>,
            searchApi.getAnalytics('trend', 14) as Promise<{ data: any[] }>,
            searchApi.getAnalytics('price-preferences', 30) as Promise<{ data: any[] }>,
          ]);
          setSearchAnalytics({ topCities: cities.data, amenities: amenities.data, trend: trend.data, pricePreferences: prices.data } as any);
        } else if (page === 'support') {
          const res = await supportApi.getAll() as { data: any[] };
          setSupportTickets(res.data);
        } else if (page === 'reports') {
          const [topRoomsRes, branchRes] = await Promise.all([
            reportsApi.getTopRoomsQuarterly() as Promise<{ data: any[] }>,
            reportsApi.getBranchPerformance() as Promise<{ data: any[] }>,
          ]);
          setTopRoomsQuarterly(topRoomsRes.data || []);
          setBranchPerformance(branchRes.data || []);
        } else if (page === 'occupancy') {
          const res = await reportsApi.getOccupancyOverview() as { data: any[] };
          setOccupancyOverview(res.data || []);
        }
      } catch (err) {
        showToast('Lỗi tải dữ liệu', 'error');
      }
      setLoading(false);
    };
    load();
  }, [page, showToast]);

  const handlePriceUpdate = async () => {
    if (!selRoom) return showToast('Vui lòng chọn loại phòng', 'error');
    if (!newPrice || newPrice <= 0) return showToast('Giá phải lớn hơn 0', 'error');
    try {
      setLoading(true);
      const res = await pricingApi.updatePrice(String(selRoom), newPrice, priceReason) as any;
      if (res?.error === 'BELOW_FLOOR' || res?.error === 'ABOVE_CAP') {
        showToast(res?.message || 'Giá nhập không hợp lệ theo policy', 'error');
        return;
      }
      const alertFlag = res?.data?.alert_flag || res?.alert_flag;
      showToast(res?.message || 'Cập nhật giá thành công', alertFlag ? 'warning' : 'success');
      const [updated, historyRes] = await Promise.all([
        roomsApi.getAll() as Promise<{ data: MockRoomType[] }>,
        pricingApi.getHistory() as Promise<{ data: MockPriceHistory[] }>,
      ]);
      setRooms(updated.data);
      setPriceHistory(historyRes.data || []);
    } catch (e: any) {
      showToast(e.message || 'Lỗi cập nhật giá', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestion = async () => {
    if (!selRoom) return showToast('Vui lòng chọn loại phòng', 'error');
    try {
      setLoading(true);
      const data = await pricingApi.getSuggestion(String(selRoom)) as any;
      // Map data từ API về đúng structure state của chúng ta
      setSuggestion({
        suggested_price: data.suggested_price,
        reasoning: data.reasoning,
        change_from_base: data.change_pct || 0, // Mock API có thể trả về change_pct
        is_new_room: data.is_new_room || false,
        confidence: data.confidence
      });
    } catch (e: any) {
      showToast(e.message || 'Lỗi lấy đề xuất', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHotel = async () => {
    if (!modalHotelName.trim() || !modalHotelCity.trim()) {
      return showToast('Tên và thành phố là bắt buộc', 'error');
    }
    try {
      setLoading(true);
      const payload = { name: modalHotelName, city: modalHotelCity, address: modalHotelAddress, phone: modalHotelPhone, email: modalHotelEmail };
      if (editingHotel) {
        await hotelsApi.update(Number(editingHotel.hotel_id), payload);
        showToast('Cập nhật chi nhánh thành công', 'success');
      } else {
        await hotelsApi.create(payload);
        showToast('Tạo chi nhánh thành công', 'success');
      }
      setModalOpen(null);
      setEditingHotel(null);
      const res = await hotelsApi.getAll() as { data: MockHotel[] };
      setHotels(res.data);
    } catch (e: any) {
      showToast(e.message || 'Lỗi lưu chi nhánh', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper cho phần Pricing
  const selRoomData = rooms.find(r => String(r.room_type_id) === String(selRoom));
  const basePrice = selRoomData?.base_price || 0;
  const currentPrice = selRoomData?.current_price || selRoomData?.base_price || 0;
  const priceDeltaPct = basePrice ? ((newPrice - basePrice) / basePrice * 100) : 0;
  const roleStats = users.reduce<Record<string, number>>((acc, u) => {
    const role = u.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  if (authLoading) return <div style={{ background: '#0a0d13', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0a500', fontFamily: 'DM Sans, sans-serif', fontSize: 18 }}>Đang tải...</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        :root {
          --bg:#0a0d13;--bg2:#111520;--bg3:#171d2e;--card:#1a2035;
          --border:#252d44;--border2:#2e3a55;
          --gold:#f0a500;--gold2:#ffc233;--gold3:#ffd87a;
          --accent:#4f87ff;--accent2:#7aabff;
          --danger:#ff4d6d;--danger2:#ff8099;
          --success:#00c896;--success2:#4deab5;
          --text:#e8ecf5;--text2:#9aa5c0;--text3:#5c6b8a;
          --shadow:0 8px 32px rgba(0,0,0,.5);
          --radius:12px;--radius2:20px;
        }
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.6}
        input,select,textarea,button{font-family:inherit}
        .app{display:flex;min-height:100vh}
        .sidebar{width:260px;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100}
        .sidebar-brand{padding:28px 24px 20px;border-bottom:1px solid var(--border)}
        .brand-logo{display:flex;align-items:center;gap:12px;margin-bottom:8px}
        .brand-icon{width:40px;height:40px;background:linear-gradient(135deg,var(--gold),var(--gold2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 30px rgba(240,165,0,.2)}
        .brand-name{font-family:'DM Serif Display',serif;font-size:18px;color:var(--text);letter-spacing:.5px}
        .brand-sub{font-size:11px;color:var(--gold);letter-spacing:1.5px;text-transform:uppercase;font-weight:500}
        .badge-tv3{display:inline-flex;align-items:center;gap:6px;background:rgba(240,165,0,.1);border:1px solid rgba(240,165,0,.3);color:var(--gold);padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.5px;margin-top:8px}
        .sidebar-nav{flex:1;padding:16px 12px;overflow-y:auto}
        .nav-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);font-weight:600;padding:8px 12px 4px;margin-bottom:4px}
        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;color:var(--text2);font-weight:400;transition:all .2s;position:relative;border:none;background:none;width:100%;text-align:left}
        .nav-item:hover{background:var(--bg3);color:var(--text)}
        .nav-item.active{background:rgba(240,165,0,.12);color:var(--gold);font-weight:500}
        .nav-item.active::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:3px;background:var(--gold);border-radius:0 3px 3px 0}
        .nav-icon{font-size:16px;width:20px;text-align:center;flex-shrink:0}
        .sidebar-footer{padding:16px;border-top:1px solid var(--border)}
        .user-card{display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:10px;cursor:pointer}
        .user-avatar{width:36px;height:36px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white;flex-shrink:0}
        .main{margin-left:260px;flex:1;display:flex;flex-direction:column;min-height:100vh}
        .topbar{background:var(--bg2);border-bottom:1px solid var(--border);padding:0 28px;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
        .topbar-right{display:flex;align-items:center;gap:12px}
        .api-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500}
        .api-badge.online{background:rgba(0,200,150,.1);color:var(--success);border:1px solid rgba(0,200,150,.3)}
        .api-badge.offline{background:rgba(255,77,109,.1);color:var(--danger);border:1px solid rgba(255,77,109,.3)}
        .icon-btn{width:36px;height:36px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;position:relative;border:none}
        .notif-dot{position:absolute;top:6px;right:6px;width:8px;height:8px;background:var(--danger);border-radius:50%;border:2px solid var(--bg2)}
        .content{flex:1;padding:28px;overflow-y:auto}
        .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
        .page-title{font-family:'DM Serif Display',serif;font-size:28px;color:var(--text);margin-bottom:4px}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
        .stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius2);padding:20px;transition:border-color .2s}
        .stat-label-s{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);font-weight:600;margin-bottom:10px}
        .stat-value-s{font-family:'DM Serif Display',serif;font-size:28px;color:var(--text);line-height:1;margin-bottom:8px}
        .stat-change{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500}
        .stat-change.up{color:var(--success)}
        .stat-change.down{color:var(--danger)}
        .grid-2{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px}
        .grid-cols-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .grid-cols-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}
        .card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius2);overflow:hidden}
        .card-header{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .card-title{font-size:14px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:8px}
        .card-body{padding:20px}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);font-weight:600;padding:10px 16px;border-bottom:1px solid var(--border);background:rgba(255,255,255,.02)}
        td{padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text2)}
        .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .badge-active{background:rgba(0,200,150,.12);color:var(--success);border:1px solid rgba(0,200,150,.3)}
        .badge-inactive{background:rgba(255,77,109,.1);color:var(--danger);border:1px solid rgba(255,77,109,.3)}
        .btn{padding:9px 18px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;border:none;display:inline-flex;align-items:center;gap:6px}
        .btn-primary{background:linear-gradient(135deg,var(--gold),#e09600);color:#0a0d13;font-weight:700}
        .btn-ghost{background:var(--bg3);color:var(--text2);border:1px solid var(--border)}
        .btn-danger{background:rgba(255,77,109,.12);color:var(--danger);border:1px solid rgba(255,77,109,.3)}
        .form-group{margin-bottom:16px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        label{display:block;font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
        input,select,textarea{width:100%;padding:10px 14px;background:var(--bg2);border:1.5px solid var(--border);border-radius:10px;color:var(--text);font-size:13px;outline:none}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center}
        .modal{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius2);width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
        .modal-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid var(--border)}
        .modal-body{padding:24px}
        .modal-footer{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px}
        .toast-fixed{position:fixed;top:80px;right:28px;z-index:500;max-width:400px;display:flex;align-items:flex-start;gap:10px;padding:14px 18px;border-radius:14px;box-shadow:var(--shadow);animation:slideIn .25s ease;font-size:13px}
        .toast-success{background:rgba(0,200,150,.15);border:1px solid rgba(0,200,150,.3);color:var(--success2)}
        .toast-warning{background:rgba(240,165,0,.12);border:1px solid rgba(240,165,0,.3);color:var(--gold3)}
        .toast-error{background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.3);color:var(--danger2)}
        .suggestion-box{background:rgba(79,135,255,.06);border:1px solid rgba(79,135,255,.2);border-radius:12px;padding:16px;margin-top:16px}
        .spinner{width:28px;height:28px;border:3px solid var(--border2);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
      `}</style>

      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <div className="brand-icon">🏨</div>
              <div>
                <div className="brand-name">LuxeStay</div>
                <div className="brand-sub">Hotel Management</div>
              </div>
            </div>
            <div className="badge-tv3">⚡ Thành viên 3 — Advanced DB</div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-label">Main</div>
            {(['dashboard', 'auth'] as PageId[]).map(id => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{id === 'dashboard' ? '📊' : '🔐'}</span>{PAGE_TITLES[id]}
              </button>
            ))}
            <div className="nav-label">Quản lý</div>
            {(['users', 'rooms', 'hotels'] as PageId[]).map(id => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{id === 'users' ? '👥' : id === 'rooms' ? '🛏️' : '🏨'}</span>{PAGE_TITLES[id]}
              </button>
            ))}
            <div className="nav-label">Dynamic Pricing</div>
            {(['pricing', 'history', 'rules'] as PageId[]).map(id => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{id === 'pricing' ? '💰' : id === 'history' ? '📜' : '⚙️'}</span>{PAGE_TITLES[id]}
              </button>
            ))}
            <div className="nav-label">Báo cáo OLAP</div>
            {(['reports','occupancy'] as PageId[]).map(id => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{id === 'reports' ? '📈' : '🏠'}</span>{PAGE_TITLES[id]}
              </button>
            ))}
            <div className="nav-label">TV1 — Giao dịch</div>
            <button className={`nav-item${page === 'bookings' ? ' active' : ''}`} onClick={() => setPage('bookings')}>
              <span className="nav-icon">📝</span>Quản lý Đặt phòng
            </button>
            <div className="nav-label">TV2 — NoSQL</div>
            {(['search-analytics', 'support'] as PageId[]).map(id => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{id === 'support' ? '📨' : '🔍'}</span>{PAGE_TITLES[id]}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-card" onClick={logout}>
              <div className="user-avatar">{user?.full_name?.[0] || 'A'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || 'Admin'}</div>
                <div style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(240,165,0,.1)', padding: '1px 7px', borderRadius: 10, display: 'inline-block', marginTop: 2 }}>{user?.role || 'admin'}</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Serif Display, serif' }}>{PAGE_TITLES[page]}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Home / {PAGE_TITLES[page]}</div>
            </div>
            <div className="topbar-right">
              <span className={`api-badge ${apiOnline ? 'online' : 'offline'}`}>
                {apiOnline === null ? '⟳ Checking...' : apiOnline ? '● API Online' : '● Mock Data'}
              </span>
              <button className="icon-btn" onClick={() => setNotifOpen(v => !v)}>
                🔔<span className="notif-dot" />
              </button>
            </div>
          </div>

          <div className="content">
            {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>}

            {!loading && (
              <>
                {/* ─── DASHBOARD ─── */}
                {page === 'dashboard' && analytics && (
                  <div>
                    <div className="stats-grid">
                      {[
                        ['💰', 'Doanh thu', fmtM(analytics.kpis.total_revenue / 1000000), analytics.kpis.revenue_growth, 'up'],
                        ['📋', 'Lượt đặt', fmt(analytics.kpis.total_bookings), analytics.kpis.booking_growth, 'up'],
                        ['🏠', 'Avg. Occupancy', analytics.kpis.avg_occupancy + '%', analytics.kpis.occupancy_change, 'up'],
                        ['💵', 'ADR / đêm', '₫' + fmt(analytics.kpis.avg_daily_rate), analytics.kpis.adr_change, 'down'],
                      ].map(([icon, label, val, chg, dir]) => (
                        <div key={String(label)} className="stat-card">
                          <div className="stat-label-s">{icon} {label}</div>
                          <div className="stat-value-s">{val}</div>
                          <div className={`stat-change ${dir}`}>{dir === 'up' ? '▲' : '▼'} {Math.abs(Number(chg))}%</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid-2">
                      <div className="card">
                        <div className="card-header"><span className="card-title">📊 Doanh thu 6 tháng</span></div>
                        <div className="card-body">
                          <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 12, padding: '20px 0 10px' }}>
                            {(() => {
                              const maxRev = Math.max(...analytics.monthly_revenue.map(d => d.revenue || 0), 100);
                              return analytics.monthly_revenue.map((d, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                  <div 
                                    style={{ 
                                      width: '70%', 
                                      background: 'linear-gradient(to top, var(--gold), var(--gold2))', 
                                      height: `${(d.revenue / maxRev) * 100}%`, 
                                      borderRadius: '4px 4px 0 0',
                                      transition: 'height 0.3s ease',
                                      cursor: 'pointer'
                                    }} 
                                    title={`${d.month}: ₫${fmt(d.revenue)}M`}
                                  />
                                  <div style={{ fontSize: 10, marginTop: 10, color: 'var(--text3)' }}>{d.month}</div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-header"><span className="card-title">🏆 Top phòng</span></div>
                        <table style={{ fontSize: 12 }}>
                          <tbody>
                            {analytics.top_rooms.map(r => (
                              <tr key={r.rank}>
                                <td style={{ padding: '10px' }}>#{r.rank} {r.name}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.occupancy}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                 {/* ─── AUTH & RBAC ─── */}
                 {page === 'auth' && (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                     <div className="card">
                       <div className="card-header">
                         <span className="card-title">🔐 Role-Based Access Control Matrix</span>
                       </div>
                       <div className="card-body">
                         <p style={{ marginBottom: 20, fontSize: 13, color: 'var(--text3)' }}>
                           Hệ thống sử dụng cơ chế bảo mật JWT kết hợp phân quyền đa lớp (RBAC). Dưới đây là bảng phân bổ quyền hạn:
                         </p>
                         <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                           <thead>
                             <tr style={{ borderBottom: '2px solid var(--border)' }}>
                               <th style={{ textAlign: 'left', padding: '12px' }}>Tính năng</th>
                               <th style={{ textAlign: 'center', padding: '12px' }}>Super Admin</th>
                               <th style={{ textAlign: 'center', padding: '12px' }}>Admin</th>
                               <th style={{ textAlign: 'center', padding: '12px' }}>Customer</th>
                             </tr>
                           </thead>
                           <tbody>
                             {[
                               ['Quản lý Người dùng', '✅ Full', '✅ Full', '❌ No'],
                               ['Cấu hình Hệ thống', '✅ Full', '⚠️ Read-only', '❌ No'],
                               ['Quản lý Đặt phòng', '✅ View All', '✅ View All', '👤 Own Only'],
                               ['Điều chỉnh Dynamic Pricing', '✅ Yes', '✅ Yes', '❌ No'],
                               ['Xem Báo cáo OLAP/Analytics', '✅ Yes', '✅ Yes', '❌ No'],
                               ['Trả lời Support Tickets', '✅ Yes', '✅ Yes', '❌ No'],
                               ['Đăng bài Tìm kiếm / Booking', '✅ Yes', '✅ Yes', '✅ Yes'],
                             ].map(([feature, superAdmin, admin, customer]) => (
                               <tr key={feature} style={{ borderBottom: '1px solid var(--border)' }}>
                                 <td style={{ fontWeight: 600, padding: '12px' }}>{feature}</td>
                                 <td style={{ textAlign: 'center', color: 'var(--success)', padding: '12px' }}>{superAdmin}</td>
                                 <td style={{ textAlign: 'center', padding: '12px', color: admin.includes('✅') ? 'var(--success)' : admin.includes('⚠️') ? 'var(--warning)' : 'var(--danger)' }}>{admin}</td>
                                 <td style={{ textAlign: 'center', padding: '12px', color: customer.includes('✅') || customer.includes('👤') ? 'var(--success)' : 'var(--danger)' }}>{customer}</td>
                                </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     </div>
 
                     <div className="grid-2">
                       <div className="card">
                         <div className="card-header"><span className="card-title">🛡️ Session Security</span></div>
                         <div className="card-body">
                           <div className="form-group">
                             <label>JWT Token Algorithm</label>
                             <input type="text" readOnly value="HS256 (HMAC with SHA-256)" />
                           </div>
                           <div className="form-group">
                             <label>Token Expiration</label>
                             <input type="text" readOnly value="24 Hours" />
                           </div>
                           <div style={{ padding: '12px', background: 'rgba(79,135,255,.05)', borderRadius: 8, fontSize: 12 }}>
                             <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>Pro-tip:</span> Toàn bộ các API endpoint trong hệ thống đều được bảo vệ bởi <code>AuthGuard</code> và <code>RolesGuard</code> ở tầng Backend NestJS.
                           </div>
                         </div>
                       </div>
                       <div className="card">
                         <div className="card-header"><span className="card-title">👤 Current Session</span></div>
                         <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                             <div className="user-avatar" style={{ width: 60, height: 60, fontSize: 24 }}>{user?.full_name?.[0]}</div>
                             <div>
                               <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.full_name}</div>
                               <div style={{ color: 'var(--gold)' }}>{user?.role?.toUpperCase()} ACCESS</div>
                             </div>
                           </div>
                           <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '5px 0' }} />
                           <div style={{ fontSize: 13 }}>
                             <div style={{ marginBottom: 8 }}><strong>User ID:</strong> <code style={{ color: 'var(--accent2)' }}>{user?.user_id}</code></div>
                             <div><strong>Login Time:</strong> {new Date().toLocaleString()}</div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}

                {/* ─── ROOMS ─── */}
                {page === 'rooms' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">🛏️ Loại phòng</span>
                      <button className="btn btn-primary" onClick={() => { setEditingRoom(null); setModalOpen('addRoom'); }}>+ Thêm</button>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Tên phòng</th><th>Khách sạn</th><th>Giá hiện tại</th><th>Trống</th><th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map(r => (
                          <tr key={r.room_type_id}>
                            <td style={{ fontWeight: 600 }}>{r.name}</td>
                            <td>{r.hotel_name}</td>
                            <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₫{fmt(Number(r.current_price || r.base_price))}</td>
                            <td>{r.available_rooms}/{r.total_rooms}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEditRoomModal(r)}>Sửa</button>
                                <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteRoom(r.room_type_id)}>Xóa</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── PRICING ─── */}
                {page === 'pricing' && (
                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header"><span className="card-title">💰 Cập nhật giá</span></div>
                      <div className="card-body">
                        <div className="form-group">
                          <label>Chọn loại phòng</label>
                          <select value={selRoom} onChange={e => {
                            const rid = e.target.value;
                            setSelRoom(rid);
                            const r = rooms.find(rm => String(rm.room_type_id) === rid);
                            if (r) setNewPrice(Number(r.current_price || r.base_price));
                            setSuggestion(null);
                          }}>
                            {rooms.map(r => <option key={r.room_type_id} value={r.room_type_id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div className="price-compare">
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700 }}>₫{fmt(basePrice)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Giá gốc</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>₫{fmt(newPrice)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Giá mới</div>
                          </div>
                        </div>
                        <div className="form-group" style={{ marginTop: 20 }}>
                          <label>Giá mới (₫)</label>
                          <input type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn btn-ghost" onClick={handleGetSuggestion}>🤖 AI Đề xuất</button>
                          <button className="btn btn-primary" onClick={handlePriceUpdate}>Cập nhật</button>
                        </div>
                        {/* FIX LỖI ĐỎ Ở ĐÂY: suggestion.change_from_base và suggestion.is_new_room */}
                        {suggestion && (
                          <div className="suggestion-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, color: 'var(--accent2)' }}>🤖 Đề xuất</span>
                              {suggestion.is_new_room && <span className="badge badge-inactive">Phòng mới</span>}
                            </div>
                            <p style={{ fontSize: 12, marginBottom: 10 }}>{suggestion.reasoning}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--gold)' }}>₫{fmt(suggestion.suggested_price)}</div>
                                <div style={{ fontSize: 10 }}>
                                  Lệch {suggestion.change_from_base >= 0 ? '+' : ''}{suggestion.change_from_base}%
                                </div>
                              </div>
                              <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => setNewPrice(suggestion.suggested_price)}>Áp dụng</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-header"><span className="card-title">📜 Lịch sử (Trigger)</span></div>
                      <div className="card-body" style={{ padding: 0 }}>
                        <table style={{ fontSize: 11 }}>
                          <tbody>
                            {priceHistory.slice(0, 5).map((h, i) => (
                              <tr key={i}>
                                <td style={{ padding: '10px' }}>{h.room_type_name}</td>
                                <td style={{ color: h.alert_flag ? 'var(--danger)' : 'var(--success)' }}>₫{fmt(h.new_price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── PRICING RULES ─── */}
                {page === 'rules' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">⚙️ Pricing Rules</span>
                      <button className="btn btn-primary" onClick={() => { setEditingRule(null); setModalOpen('addRule'); }}>+ Thêm</button>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Tên Rule</th><th>Điều kiện</th><th>Giá trị</th><th>Ưu tiên</th><th>Trạng thái</th><th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingRules.map(r => (
                          <tr key={r.rule_id}>
                            <td style={{ fontWeight: 600 }}>{r.rule_name}</td>
                            <td>{r.rule_type === 'occupancy' ? `${r.threshold_min}% - ${r.threshold_max}%` : `${new Date(r.valid_from).toLocaleDateString()} - ${new Date(r.valid_to).toLocaleDateString()}`}</td>
                            <td style={{ fontWeight: 700, color: r.adjustment_value > 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {r.adjustment_type === 'percent' ? `${r.adjustment_value > 0 ? '+' : ''}${r.adjustment_value}%` : `₫${fmt(r.adjustment_value)}`}
                            </td>
                            <td>P{r.priority}</td>
                            <td>
                              <span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`} style={{ cursor: 'pointer' }} onClick={async () => {
                                await pricingApi.toggleRule(r.rule_id);
                                const res = await pricingApi.getRules() as any;
                                setPricingRules(res.data);
                              }}>
                                {r.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => openEditRuleModal(r)}>✏️</button>
                                <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteRule(r.rule_id)}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── USERS ─── */}
                {page === 'users' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">👥 Danh sách người dùng</span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.user_id}>
                            <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>
                              <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── HOTELS ─── */}
                {page === 'hotels' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">🏨 Chi nhánh</span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Tên</th><th>Thành phố</th><th>Địa chỉ</th><th>Liên hệ</th><th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hotels.map(h => (
                          <tr key={String(h.hotel_id)}>
                            <td style={{ fontWeight: 600 }}>{h.name}</td>
                            <td>{h.city}</td>
                            <td>{h.address}</td>
                            <td>{h.phone || h.email || '-'}</td>
                            <td>
                              <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteHotel(h.hotel_id)}>Xóa</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── PRICE HISTORY ─── */}
                {page === 'history' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">📜 Lịch sử thay đổi giá</span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Loại phòng</th><th>Giá cũ</th><th>Giá mới</th><th>Biến động</th><th>Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.map((h, idx) => (
                          <tr key={String(h.price_history_id || idx)}>
                            <td style={{ fontWeight: 600 }}>{h.room_type_name}</td>
                            <td>₫{fmt(h.old_price)}</td>
                            <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₫{fmt(h.new_price)}</td>
                            <td style={{ color: (h.change_pct || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {(h.change_pct || 0) >= 0 ? '+' : ''}{h.change_pct || 0}%
                            </td>
                            <td>{h.changed_at ? new Date(h.changed_at).toLocaleString('vi-VN') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── REPORTS (OLAP) ─── */}
                {page === 'reports' && (
                  <div className="grid-cols-2">
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">🏆 Top 3 phòng doanh thu theo quý</span>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Năm/Q</th><th>Chi nhánh</th><th>Phòng</th><th>Doanh thu</th><th>Hạng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topRoomsQuarterly.map((r, idx) => (
                            <tr key={String(idx)}>
                              <td>{r.yr}/Q{r.qtr}</td>
                              <td>{r.hotel_name}</td>
                              <td>{r.room_name}</td>
                              <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₫{fmt(Number(r.total_revenue || 0))}</td>
                              <td>#{r.revenue_rank}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">🏨 Đóng góp doanh thu theo chi nhánh</span>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Chi nhánh</th><th>Thành phố</th><th>Doanh thu</th><th>Tỷ trọng</th><th>Hạng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchPerformance.map((r, idx) => (
                            <tr key={String(idx)}>
                              <td>{r.hotel_name}</td>
                              <td>{r.city}</td>
                              <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₫{fmt(Number(r.hotel_revenue || 0))}</td>
                              <td>{Number(r.contribution_pct || 0).toFixed(2)}%</td>
                              <td>#{r.revenue_rank}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── OCCUPANCY ─── */}
                {page === 'occupancy' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">🏠 Occupancy theo loại phòng</span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Chi nhánh</th><th>Loại phòng</th><th>Tổng phòng</th><th>Booking active</th><th>Occupancy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {occupancyOverview.map((r, idx) => (
                          <tr key={String(idx)}>
                            <td>{r.hotel_name}</td>
                            <td>{r.room_type_name}</td>
                            <td>{r.total_rooms}</td>
                            <td>{r.active_bookings}</td>
                            <td style={{ color: Number(r.occupancy_rate || 0) >= 70 ? 'var(--success)' : 'var(--text2)', fontWeight: 600 }}>
                              {Number(r.occupancy_rate || 0).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── BOOKINGS ─── */}
                {page === 'bookings' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">📝 Quản lý đặt phòng</span>
                    </div>
                    <div className="card-body">
                      <input
                        placeholder="Lọc theo tên khách hoặc mã booking..."
                        value={bookingFilter}
                        onChange={e => setBookingFilter(e.target.value)}
                      />
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Booking</th><th>Khách</th><th>Phòng</th><th>Thời gian</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allBookings
                          .filter(b => {
                            const key = bookingFilter.trim().toLowerCase();
                            if (!key) return true;
                            return b.booking_id.toLowerCase().includes(key) || (b.user_name || '').toLowerCase().includes(key);
                          })
                          .map(b => (
                            <tr key={b.booking_id}>
                              <td style={{ fontWeight: 600 }}>#{b.booking_id.slice(0, 8)}</td>
                              <td>{b.user_name}</td>
                              <td>{b.room_type_name}</td>
                              <td>{new Date(b.check_in).toLocaleDateString('vi-VN')} - {new Date(b.check_out).toLocaleDateString('vi-VN')}</td>
                              <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₫{fmt(b.total_price)}</td>
                              <td>{b.status}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {b.status === 'pending' && (
                                    <>
                                      <button className="btn btn-primary" style={{ padding: '4px 8px' }} disabled={busyBookingId === b.booking_id} onClick={() => handleBookingStatusUpdate(b.booking_id, 'confirmed')}>Duyệt</button>
                                      <button className="btn btn-danger" style={{ padding: '4px 8px' }} disabled={busyBookingId === b.booking_id} onClick={() => handleBookingStatusUpdate(b.booking_id, 'cancelled')}>Hủy</button>
                                    </>
                                  )}
                                  {b.status === 'confirmed' && (
                                    <>
                                      <button className="btn btn-primary" style={{ padding: '4px 8px' }} disabled={busyBookingId === b.booking_id} onClick={() => handleBookingStatusUpdate(b.booking_id, 'completed')}>Hoàn thành</button>
                                      <button className="btn btn-danger" style={{ padding: '4px 8px' }} disabled={busyBookingId === b.booking_id} onClick={() => handleBookingStatusUpdate(b.booking_id, 'cancelled')}>Hủy</button>
                                    </>
                                  )}
                                  {(b.status === 'completed' || b.status === 'cancelled') && <span style={{ color: 'var(--text3)', fontSize: 12 }}>Đã khóa</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── SEARCH ANALYTICS ─── */}
                {page === 'search-analytics' && (
                  <div className="grid-cols-3">
                    <div className="card">
                      <div className="card-header"><span className="card-title">🏙️ Top thành phố</span></div>
                      <table>
                        <thead>
                          <tr>
                            <th>Thành phố</th><th>Lượt tìm</th><th>Chuyển đổi</th><th>Tỷ lệ CVR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchAnalytics.topCities.map((row, i) => (
                            <tr key={String(i)}>
                              <td>{row.city || '-'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Number(row.search_count || row.total || 0))}</td>
                              <td style={{ textAlign: 'right' }}>{fmt(Number(row.converted_count || row.conversions || 0))}</td>
                              <td style={{ textAlign: 'right' }}>{Number(row.conversion_rate || 0).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="card">
                      <div className="card-header"><span className="card-title">🧩 Amenities phổ biến</span></div>
                      <table>
                        <tbody>
                          {searchAnalytics.amenities.map((row, i) => (
                            <tr key={String(i)}>
                              <td>{row.amenity || row.name || '-'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Number(row.count || row.total || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="card">
                      <div className="card-header"><span className="card-title">📈 Xu hướng tìm kiếm</span></div>
                      <table>
                        <thead>
                          <tr>
                            <th>Ngày</th><th>Lượt tìm</th><th>Chuyển đổi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchAnalytics.trend.map((row, i) => (
                            <tr key={String(i)}>
                              <td>{row.date || row.day || '-'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Number(row.searches || row.count || row.search_count || 0))}</td>
                              <td style={{ textAlign: 'right' }}>{fmt(Number(row.conversions || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── SUPPORT ─── */}
                {page === 'support' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">📨 Hỗ trợ khách hàng</span>
                    </div>
                    <div className="card-body">
                      <input
                        placeholder="Lọc theo tiêu đề ticket..."
                        value={supportFilter}
                        onChange={e => setSupportFilter(e.target.value)}
                      />
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Chủ đề</th><th>Khách hàng</th><th>Ưu tiên</th><th>Trạng thái</th><th>Tạo lúc</th><th>Xử lý</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supportTickets
                          .filter(t => {
                            const key = supportFilter.trim().toLowerCase();
                            if (!key) return true;
                            return String(t.subject || '').toLowerCase().includes(key);
                          })
                          .map(t => (
                            <tr key={String(t._id)}>
                              <td style={{ fontWeight: 600 }}>{t.subject || '-'}</td>
                              <td>{t.user_name || t.user_email || '-'}</td>
                              <td>{t.priority || 'normal'}</td>
                              <td>{t.status || '-'}</td>
                              <td>{t.createdAt ? new Date(t.createdAt).toLocaleString('vi-VN') : '-'}</td>
                              <td style={{ minWidth: 280 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <input
                                    placeholder="Nhập phản hồi cho khách..."
                                    value={supportReplies[String(t._id)] || ''}
                                    onChange={e => setSupportReplies(prev => ({ ...prev, [String(t._id)]: e.target.value }))}
                                  />
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-ghost" style={{ padding: '4px 8px' }} disabled={busyTicketId === String(t._id)} onClick={() => handleReplyTicket(String(t._id))}>Reply</button>
                                    {t.status !== 'resolved' && (
                                      <button className="btn btn-primary" style={{ padding: '4px 8px' }} disabled={busyTicketId === String(t._id)} onClick={() => handleResolveTicket(String(t._id))}>Resolve</button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── AUTH & RBAC ─── */}
                {page === 'auth' && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">🔐 Auth & RBAC</span>
                    </div>
                    <div className="card-body">
                      <div className="grid-cols-3" style={{ marginBottom: 16 }}>
                        <div className="stat-card">
                          <div className="stat-label-s">Phiên hiện tại</div>
                          <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{user?.email || '-'}</div>
                          <div style={{ color: 'var(--text2)', fontSize: 12 }}>Role: {user?.role || '-'}</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label-s">Admin</div>
                          <div className="stat-value-s">{fmt(roleStats.admin || 0)}</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label-s">Superadmin</div>
                          <div className="stat-value-s">{fmt(roleStats.superadmin || 0)}</div>
                        </div>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Tài nguyên</th><th>Vai trò được phép</th><th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Admin Dashboard</td>
                            <td>admin, superadmin</td>
                            <td>Guard phía frontend + backend</td>
                          </tr>
                          <tr>
                            <td>Pricing Rules (create/update/delete)</td>
                            <td>admin</td>
                            <td>API có RolesGuard</td>
                          </tr>
                          <tr>
                            <td>Hotels / Rooms quản trị</td>
                            <td>admin, superadmin</td>
                            <td>API có RolesGuard</td>
                          </tr>
                          <tr>
                            <td>Bookings quản trị</td>
                            <td>admin, superadmin</td>
                            <td>Xem và thao tác trạng thái booking</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── MODALS ── */}
      {modalOpen === 'addRoom' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingRoom ? 'Sửa loại phòng' : 'Thêm loại phòng'}</div>
              <button onClick={() => setModalOpen(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên phòng</label>
                <input type="text" value={modalRoomName} onChange={e => setModalRoomName(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Khách sạn</label>
                  <select value={modalRoomHotel} onChange={e => setModalRoomHotel(e.target.value)}>
                    {hotels.map(h => <option key={h.hotel_id} value={h.hotel_id}>{h.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Sức chứa</label>
                  <input type="number" value={modalRoomCapacity} onChange={e => setModalRoomCapacity(Number(e.target.value))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Giá niêm yết (₫)</label>
                  <input type="number" value={modalRoomPrice} onChange={e => setModalRoomPrice(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Tổng số phòng</label>
                  <input type="number" value={modalRoomTotal} onChange={e => setModalRoomTotal(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveRoom}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen === 'addRule' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">{editingRule ? 'Sửa quy tắc' : 'Thêm quy tắc'}</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên quy tắc</label>
                <input type="text" value={ruleName} onChange={e => setRuleName(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Loại</label>
                  <select value={ruleType} onChange={e => setRuleType(e.target.value)}>
                    <option value="occupancy">Occupancy</option>
                    <option value="season">Season</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ưu tiên</label>
                  <input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} />
                </div>
              </div>
              {ruleType === 'occupancy' && (
                <div className="form-row">
                  <div className="form-group"><label>Min (%)</label><input type="number" value={tMin} onChange={e => setTMin(Number(e.target.value))} /></div>
                  <div className="form-group"><label>Max (%)</label><input type="number" value={tMax} onChange={e => setTMax(Number(e.target.value))} /></div>
                </div>
              )}
              {ruleType === 'season' && (
                <div className="form-row">
                  <div className="form-group"><label>Bắt đầu</label><input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} /></div>
                  <div className="form-group"><label>Kết thúc</label><input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} /></div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Điều chỉnh</label>
                  <select value={adjType} onChange={e => setAdjType(e.target.value)}>
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Cố định (₫)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Giá trị</label>
                  <input type="number" value={adjVal} onChange={e => setAdjVal(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={async () => {
                const payload = {
                  rule_name: ruleName,
                  rule_type: ruleType,
                  threshold_min: tMin,
                  threshold_max: tMax,
                  adjustment_type: adjType,
                  adjustment_value: adjVal,
                  priority: priority,
                  valid_from: ruleType === 'season' ? validFrom : null,
                  valid_to: ruleType === 'season' ? validTo : null,
                  is_active: editingRule ? editingRule.is_active : true
                };
                if (editingRule) await pricingApi.updateRule(editingRule.rule_id, payload);
                else await pricingApi.createRule(payload);
                setModalOpen(null);
                const res = await pricingApi.getRules() as any;
                setPricingRules(res.data);
              }}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen === 'addUser' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingUser ? 'Sửa người dùng' : 'Thêm người dùng'}</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Họ tên</label>
                <input type="text" value={modalUserName} onChange={e => setModalUserName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={modalUserEmail} onChange={e => setModalUserEmail(e.target.value)} />
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label>Mật khẩu</label>
                  <input type="password" value={modalUserPassword} onChange={e => setModalUserPassword(e.target.value)} placeholder="Mặc định: admin123" />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input type="text" value={modalUserPhone} onChange={e => setModalUserPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Vai trò</label>
                  <select value={modalUserRole} onChange={e => setModalUserRole(e.target.value as any)}>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={async () => {
                const payload = { full_name: modalUserName, email: modalUserEmail, phone: modalUserPhone, role: modalUserRole };
                if (editingUser) await usersApi.update(editingUser.user_id, payload);
                else await authApi.register({ ...payload, password: modalUserPassword || 'admin123' });
                setModalOpen(null);
                const res = await usersApi.getAll() as any;
                setUsers(res.data);
                showToast('Lưu người dùng thành công');
              }}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen === 'addHotel' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingHotel ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên khách sạn</label>
                <input type="text" value={modalHotelName} onChange={e => setModalHotelName(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Thành phố</label>
                  <input type="text" value={modalHotelCity} onChange={e => setModalHotelCity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input type="text" value={modalHotelPhone} onChange={e => setModalHotelPhone(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Địa chỉ</label>
                <textarea value={modalHotelAddress} onChange={e => setModalHotelAddress(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={async () => {
                const payload = { name: modalHotelName, city: modalHotelCity, address: modalHotelAddress, phone: modalHotelPhone };
                if (editingHotel) await hotelsApi.update(Number(editingHotel.hotel_id), payload);
                else await hotelsApi.create(payload);
                setModalOpen(null);
                const res = await hotelsApi.getAll() as any;
                setHotels(res.data);
                showToast('Lưu chi nhánh thành công');
              }}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen === 'viewTicket' && selectedTicket && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">Chi tiết hỗ trợ #{selectedTicket._id?.toString().slice(-6)}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {selectedTicket.status !== 'resolved' && (
                  <button className="btn btn-success" style={{ padding: '4px 12px', fontSize: 12 }} onClick={async () => {
                    try {
                      await supportApi.resolve(String(selectedTicket._id), String(user?.user_id));
                      showToast('Đã đánh dấu yêu cầu là đã giải quyết', 'success');
                      setModalOpen(null);
                      const res = await supportApi.getAll() as any;
                      setSupportTickets(res.data);
                    } catch (err: any) {
                      showToast(err.message || 'Lỗi khi đóng ticket', 'error');
                    }
                  }}>Đã giải quyết</button>
                )}
                <button onClick={() => setModalOpen(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text3)' }}>Khách hàng</div>
                  <div style={{ fontWeight: 600 }}>{selectedTicket.customer_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent2)' }}>{selectedTicket.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 5 }}>Trạng thái</div>
                  <select 
                    value={selectedTicket.status} 
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        await supportApi.updateStatus(String(selectedTicket._id), newStatus);
                        showToast(`Đã chuyển trạng thái sang ${newStatus}`, 'success');
                        setSelectedTicket({ ...selectedTicket, status: newStatus });
                        const res = await supportApi.getAll() as any;
                        setSupportTickets(res.data);
                      } catch (err: any) {
                        showToast(err.message, 'error');
                      }
                    }}
                    style={{ background: 'var(--bg3)', color: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 15, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--gold)' }}>Chủ đề: {selectedTicket.subject}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{selectedTicket.message}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 10 }}>Gửi lúc: {new Date(selectedTicket.created_at || selectedTicket.createdAt).toLocaleString()}</div>
              </div>

              {/* Lịch sử phản hồi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600 }}>Lịch sử phản hồi ({selectedTicket.replies?.length || 0})</div>
                {(!selectedTicket.replies || selectedTicket.replies.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 10 }}>Chưa có phản hồi nào</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto', paddingRight: 5 }}>
                    {selectedTicket.replies.map((r: any, i: number) => (
                      <div key={i} style={{ background: 'var(--bg3)', padding: 12, borderRadius: '12px 12px 12px 0', border: '1px solid var(--border)', alignSelf: 'flex-start', maxWidth: '90%' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)', marginBottom: 4 }}>Admin: {r.admin_name}</div>
                        <div style={{ fontSize: 13 }}>{r.message}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>{new Date(r.replied_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedTicket.status !== 'resolved' && (
                <div className="form-group">
                  <label>Gửi phản hồi mới</label>
                  <textarea 
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    placeholder="Nhập nội dung phản hồi..." 
                    rows={3}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, color: 'white', resize: 'none' }}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Đóng</button>
              {selectedTicket.status !== 'resolved' && (
                <button className="btn btn-primary" disabled={!replyMessage.trim()} onClick={async () => {
                  try {
                    await supportApi.reply(String(selectedTicket._id), String(user?.user_id), user?.full_name || 'Admin', replyMessage);
                    showToast('Đã gửi phản hồi thành công', 'success');
                    setReplyMessage('');
                    setModalOpen(null);
                    const res = await supportApi.getAll() as any;
                    setSupportTickets(res.data);
                  } catch (err: any) {
                    showToast(err.message || 'Lỗi khi gửi phản hồi', 'error');
                  }
                }}>Gửi phản hồi</button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-fixed toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span> {toast.msg}
        </div>
      )}
    </>
  );
}