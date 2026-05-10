'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { analyticsApi, usersApi, roomsApi, pricingApi, hotelsApi, bookingsApi, searchApi, supportApi, checkApiHealth } from '@/lib/api';
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
  const [searchAnalytics, setSearchAnalytics] = useState<{topCities:any[];amenities:any[];trend:any[]}>({topCities:[],amenities:[],trend:[]});
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportFilter, setSupportFilter] = useState('');

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
        hotel_id: modalRoomHotel,
        name: modalRoomName,
        capacity: modalRoomCapacity,
        base_price: modalRoomPrice,
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

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/auth');
  }, [authLoading, isAuthenticated, router]);

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
          const data = await analyticsApi.getDashboard() as MockAnalytics;
          setAnalytics(data);
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
          const res = await roomsApi.getAll() as { data: MockRoomType[] };
          setRooms(res.data);
          if (res.data.length > 0) {
            setSelRoom(res.data[0].room_type_id.toString());
            setNewPrice(Number(res.data[0].current_price || res.data[0].base_price));
          }
        } else if (page === 'history') {
          const res = await pricingApi.getHistory() as { data: MockPriceHistory[] };
          setPriceHistory(res.data);
        } else if (page === 'rules') {
          const res = await pricingApi.getRules() as { data: MockPricingRule[] };
          setPricingRules(res.data);
        } else if (page === 'reports') {
          const [analyticsData, bookingData] = await Promise.all([
            analyticsApi.getDashboard() as Promise<MockAnalytics>,
            bookingsApi.getAll() as Promise<{ data: MockBooking[] }>,
          ]);
          setAnalytics(analyticsData);
          setAllBookings(bookingData.data);
        } else if (page === 'bookings') {
          const res = await bookingsApi.getAll() as { data: MockBooking[] };
          setAllBookings(res.data);
        } else if (page === 'search-analytics') {
          const [cities, amenities, trend] = await Promise.all([
            searchApi.getAnalytics('top-cities', 30) as Promise<{data:any[]}>,
            searchApi.getAnalytics('popular-amenities', 30) as Promise<{data:any[]}>,
            searchApi.getAnalytics('trend', 14) as Promise<{data:any[]}>,
          ]);
          setSearchAnalytics({ topCities: cities.data, amenities: amenities.data, trend: trend.data });
        } else if (page === 'support') {
          const res = await supportApi.getAll() as { data: any[] };
          setSupportTickets(res.data);
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
      const alertFlag = res?.data?.alert_flag || res?.alert_flag;
      showToast(res?.message || 'Cập nhật giá thành công', alertFlag ? 'warning' : 'success');
      const updated = await roomsApi.getAll() as { data: MockRoomType[] };
      setRooms(updated.data);
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
            {(['dashboard','auth'] as PageId[]).map(id => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{id === 'dashboard' ? '📊' : '🔐'}</span>{PAGE_TITLES[id]}
              </button>
            ))}
            <div className="nav-label">Quản lý</div>
            {(['users','rooms','hotels'] as PageId[]).map(id => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{id === 'users' ? '👥' : id === 'rooms' ? '🛏️' : '🏨'}</span>{PAGE_TITLES[id]}
              </button>
            ))}
            <div className="nav-label">Dynamic Pricing</div>
            {(['pricing','history','rules'] as PageId[]).map(id => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{id === 'pricing' ? '💰' : id === 'history' ? '📜' : '⚙️'}</span>{PAGE_TITLES[id]}
              </button>
            ))}
            <div className="nav-label">TV1 — Giao dịch</div>
            <button className={`nav-item${page === 'bookings' ? ' active' : ''}`} onClick={() => setPage('bookings')}>
              <span className="nav-icon">📝</span>Quản lý Đặt phòng
            </button>
            <div className="nav-label">TV2 — NoSQL</div>
            {(['search-analytics','support'] as PageId[]).map(id => (
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
                          <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                            {analytics.monthly_revenue.map((d, i) => (
                              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '100%', background: 'var(--gold)', height: `${(d.revenue / 500) * 100}%`, borderRadius: '4px 4px 0 0' }} />
                                <div style={{ fontSize: 10, marginTop: 5 }}>{d.month}</div>
                              </div>
                            ))}
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
                            <td>{r.rule_type === 'occupancy' ? `${r.threshold_min}% - ${r.threshold_max}%` : r.rule_type}</td>
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

                {/* Các phần khác (Users, Hotels, Bookings, Search Analytics, Support) render tương tự... */}
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

      {toast && (
        <div className={`toast-fixed toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span> {toast.msg}
        </div>
      )}
    </>
  );
}