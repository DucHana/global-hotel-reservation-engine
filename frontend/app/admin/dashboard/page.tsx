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
  const [bookings, setBookings] = useState<MockBooking[]>([]);
  const [priceHistory, setPriceHistory] = useState<MockPriceHistory[]>([]);
  const [pricingRules, setPricingRules] = useState<MockPricingRule[]>([]);
  // Member 1 — Bookings management state
  const [allBookings, setAllBookings] = useState<MockBooking[]>([]);
  const [bookingFilter, setBookingFilter] = useState('');
  const [bookingStatusAction, setBookingStatusAction] = useState<{id:string;status:string}|null>(null);
  // Member 2 — Search analytics + support state
  const [searchAnalytics, setSearchAnalytics] = useState<{topCities:any[];amenities:any[];trend:any[]}>({topCities:[],amenities:[],trend:[]});
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportFilter, setSupportFilter] = useState('');

  // Pricing form
  const [selRoom, setSelRoom] = useState('rt001');
  const [newPrice, setNewPrice] = useState(5150000);
  const [priceReason, setPriceReason] = useState('');
  const [suggestion, setSuggestion] = useState<{ suggested_price: number; reasoning: string; change_pct: number } | null>(null);

  // Pricing rule form
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('occupancy');
  const [tMin, setTMin] = useState(0);
  const [tMax, setTMax] = useState(100);
  const [adjType, setAdjType] = useState('percent');
  const [adjVal, setAdjVal] = useState(0);
  const [priority, setPriority] = useState(5);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  // Modal form states
  const [modalUserName, setModalUserName] = useState('');
  const [modalUserLastName, setModalUserLastName] = useState('');
  const [modalUserPhone, setModalUserPhone] = useState('');
  const [modalUserEmail, setModalUserEmail] = useState('');
  const [modalUserPassword, setModalUserPassword] = useState('');
  const [modalUserRole, setModalUserRole] = useState('customer');

  const [modalRoomName, setModalRoomName] = useState('');
  const [modalRoomHotel, setModalRoomHotel] = useState<any>('');
  const [modalRoomCapacity, setModalRoomCapacity] = useState(2);
  const [modalRoomPrice, setModalRoomPrice] = useState(2000000);
  const [modalRoomTotal, setModalRoomTotal] = useState(10);
  const [modalRoomDesc, setModalRoomDesc] = useState('');

  // Hotel form
  const [modalHotelName, setModalHotelName] = useState('');
  const [modalHotelCity, setModalHotelCity] = useState('');
  const [modalHotelAddress, setModalHotelAddress] = useState('');
  const [modalHotelPhone, setModalHotelPhone] = useState('');
  const [modalHotelEmail, setModalHotelEmail] = useState('');
  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);

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
        hotel_id: parseInt(modalRoomHotel),
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

  const handleDeleteRoom = async (id: number) => {
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

  const handleDeleteHotel = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa chi nhánh này?')) return;
    try {
      await hotelsApi.delete(id);
      showToast('Xóa thành công', 'success');
      const res = await hotelsApi.getAll() as { data: MockHotel[] };
      setHotels(res.data);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteRule = async (id: number) => {
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
          // Load hotels too for the dropdown
          const hres = await hotelsApi.getAll() as { data: MockHotel[] };
          setHotels(hres.data);
          if (hres.data.length > 0) setModalRoomHotel(hres.data[0].hotel_id);
        } else if (page === 'hotels' || page === 'occupancy') {
          const res = await hotelsApi.getAll() as { data: MockHotel[] };
          setHotels(res.data);
        } else if (page === 'pricing') {
          const res = await roomsApi.getAll() as { data: MockRoomType[] };
          setRooms(res.data);
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
          setBookings(bookingData.data);
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
      showToast(e.message || 'Lỗi cập nhật giá — kiểm tra bạn đã đăng nhập chưa', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestion = async () => {
    if (!selRoom) return showToast('Vui lòng chọn loại phòng', 'error');
    try {
      setLoading(true);
      const data = await pricingApi.getSuggestion(String(selRoom)) as any;
      setSuggestion(data);
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
        await hotelsApi.update(editingHotel.hotel_id, payload);
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

  const selRoomData = rooms.find(r => String(r.room_type_id) === String(selRoom));
  const basePrice = selRoomData?.base_price || 0;
  const currentPrice = selRoomData?.current_price || 0;
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
        /* APP */
        .app{display:flex;min-height:100vh}
        /* SIDEBAR */
        .sidebar{
          width:260px;background:var(--bg2);border-right:1px solid var(--border);
          display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100
        }
        .sidebar-brand{padding:28px 24px 20px;border-bottom:1px solid var(--border)}
        .brand-logo{display:flex;align-items:center;gap:12px;margin-bottom:8px}
        .brand-icon{
          width:40px;height:40px;background:linear-gradient(135deg,var(--gold),var(--gold2));
          border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;
          box-shadow:0 0 30px rgba(240,165,0,.2)
        }
        .brand-name{font-family:'DM Serif Display',serif;font-size:18px;color:var(--text);letter-spacing:.5px}
        .brand-sub{font-size:11px;color:var(--gold);letter-spacing:1.5px;text-transform:uppercase;font-weight:500}
        .badge-tv3{
          display:inline-flex;align-items:center;gap:6px;
          background:rgba(240,165,0,.1);border:1px solid rgba(240,165,0,.3);
          color:var(--gold);padding:4px 10px;border-radius:20px;
          font-size:11px;font-weight:600;letter-spacing:.5px;margin-top:8px
        }
        .sidebar-nav{flex:1;padding:16px 12px;overflow-y:auto}
        .nav-label{
          font-size:10px;letter-spacing:2px;text-transform:uppercase;
          color:var(--text3);font-weight:600;padding:8px 12px 4px;margin-bottom:4px
        }
        .nav-item{
          display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;
          cursor:pointer;color:var(--text2);font-weight:400;transition:all .2s;position:relative;
          border:none;background:none;width:100%;text-align:left
        }
        .nav-item:hover{background:var(--bg3);color:var(--text)}
        .nav-item.active{background:rgba(240,165,0,.12);color:var(--gold);font-weight:500}
        .nav-item.active::before{
          content:'';position:absolute;left:0;top:20%;bottom:20%;
          width:3px;background:var(--gold);border-radius:0 3px 3px 0
        }
        .nav-icon{font-size:16px;width:20px;text-align:center;flex-shrink:0}
        .nav-badge{
          margin-left:auto;background:var(--danger);color:white;
          font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px
        }
        .sidebar-footer{padding:16px;border-top:1px solid var(--border)}
        .user-card{
          display:flex;align-items:center;gap:10px;padding:10px;
          background:var(--bg3);border-radius:10px;cursor:pointer
        }
        .user-avatar{
          width:36px;height:36px;background:linear-gradient(135deg,var(--accent),var(--accent2));
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:14px;font-weight:700;color:white;flex-shrink:0
        }
        /* MAIN */
        .main{margin-left:260px;flex:1;display:flex;flex-direction:column;min-height:100vh}
        /* TOPBAR */
        .topbar{
          background:var(--bg2);border-bottom:1px solid var(--border);
          padding:0 28px;height:64px;display:flex;align-items:center;
          justify-content:space-between;position:sticky;top:0;z-index:50
        }
        .topbar-right{display:flex;align-items:center;gap:12px}
        .api-badge{
          display:inline-flex;align-items:center;gap:6px;
          padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500
        }
        .api-badge.online{background:rgba(0,200,150,.1);color:var(--success);border:1px solid rgba(0,200,150,.3)}
        .api-badge.offline{background:rgba(255,77,109,.1);color:var(--danger);border:1px solid rgba(255,77,109,.3)}
        .api-badge.unknown{background:rgba(255,255,255,.05);color:var(--text3);border:1px solid var(--border)}
        .icon-btn{
          width:36px;height:36px;background:var(--bg3);border:1px solid var(--border);
          border-radius:10px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;font-size:16px;position:relative;border:none
        }
        .notif-dot{
          position:absolute;top:6px;right:6px;width:8px;height:8px;
          background:var(--danger);border-radius:50%;border:2px solid var(--bg2)
        }
        /* CONTENT */
        .content{flex:1;padding:28px;overflow-y:auto}
        .page-section{display:none}
        .page-section.active{display:block}
        /* PAGE HEADER */
        .page-header{
          display:flex;justify-content:space-between;align-items:flex-start;
          margin-bottom:28px
        }
        .page-title{font-family:'DM Serif Display',serif;font-size:28px;color:var(--text);margin-bottom:4px}
        .page-breadcrumb{font-size:12px;color:var(--text3)}
        /* CARDS */
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
        .stat-card{
          background:var(--card);border:1px solid var(--border);border-radius:var(--radius2);
          padding:20px;transition:border-color .2s
        }
        .stat-card:hover{border-color:var(--border2)}
        .stat-label-s{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);font-weight:600;margin-bottom:10px}
        .stat-value-s{font-family:'DM Serif Display',serif;font-size:28px;color:var(--text);line-height:1;margin-bottom:8px}
        .stat-change{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500}
        .stat-change.up{color:var(--success)}
        .stat-change.down{color:var(--danger)}
        /* GRID */
        .grid-2{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px}
        .grid-cols-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .grid-cols-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}
        /* CARD */
        .card{
          background:var(--card);border:1px solid var(--border);
          border-radius:var(--radius2);overflow:hidden
        }
        .card-header{
          padding:18px 20px;border-bottom:1px solid var(--border);
          display:flex;align-items:center;justify-content:space-between
        }
        .card-title{font-size:14px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:8px}
        .card-body{padding:20px}
        /* TABLE */
        table{width:100%;border-collapse:collapse}
        th{
          text-align:left;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;
          color:var(--text3);font-weight:600;padding:10px 16px;
          border-bottom:1px solid var(--border);background:rgba(255,255,255,.02)
        }
        td{padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text2)}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:rgba(255,255,255,.02)}
        /* BADGE */
        .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .badge-active{background:rgba(0,200,150,.12);color:var(--success);border:1px solid rgba(0,200,150,.3)}
        .badge-inactive{background:rgba(255,77,109,.1);color:var(--danger);border:1px solid rgba(255,77,109,.3)}
        .badge-admin{background:rgba(240,165,0,.12);color:var(--gold);border:1px solid rgba(240,165,0,.3)}
        .badge-confirmed{background:rgba(0,200,150,.12);color:var(--success);border:1px solid rgba(0,200,150,.3)}
        .badge-pending{background:rgba(240,165,0,.12);color:var(--gold);border:1px solid rgba(240,165,0,.3)}
        .badge-cancelled{background:rgba(255,77,109,.1);color:var(--danger);border:1px solid rgba(255,77,109,.3)}
        /* BUTTONS */
        .btn{padding:9px 18px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;border:none;display:inline-flex;align-items:center;gap:6px}
        .btn-primary{background:linear-gradient(135deg,var(--gold),#e09600);color:#0a0d13;font-weight:700}
        .btn-primary:hover{box-shadow:0 4px 16px rgba(240,165,0,.3);transform:translateY(-1px)}
        .btn-ghost{background:var(--bg3);color:var(--text2);border:1px solid var(--border)}
        .btn-ghost:hover{color:var(--text);border-color:var(--border2)}
        .btn-danger{background:rgba(255,77,109,.12);color:var(--danger);border:1px solid rgba(255,77,109,.3)}
        .btn-danger:hover{background:rgba(255,77,109,.2)}
        /* CHART */
        .chart-wrap{height:200px;display:flex;align-items:flex-end;gap:6px;padding:10px 0}
        .bar-group{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
        .bar{border-radius:4px 4px 0 0;transition:opacity .2s;cursor:pointer;width:100%}
        .bar:hover{opacity:.8}
        .bar-gold{background:linear-gradient(180deg,var(--gold2),var(--gold))}
        .bar-blue{background:linear-gradient(180deg,var(--accent2),var(--accent))}
        .bar-label{font-size:10px;color:var(--text3);margin-top:4px}
        /* FORMS */
        .form-group{margin-bottom:16px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        label{display:block;font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
        input,select,textarea{
          width:100%;padding:10px 14px;background:var(--bg2);border:1.5px solid var(--border);
          border-radius:10px;color:var(--text);font-size:13px;outline:none;transition:border-color .2s
        }
        input:focus,select:focus,textarea:focus{border-color:var(--gold)}
        /* PRICING */
        .price-compare{
          display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;
          background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin:16px 0
        }
        .price-box{text-align:center}
        .price-box .val{font-family:'DM Serif Display',serif;font-size:22px;color:var(--text);line-height:1}
        .price-box .lbl{font-size:11px;color:var(--text3);margin-top:4px}
        .alert-box{
          display:flex;align-items:flex-start;gap:10px;
          padding:12px 16px;border-radius:10px;margin:12px 0;font-size:13px
        }
        .alert-success{background:rgba(0,200,150,.08);border:1px solid rgba(0,200,150,.25);color:var(--success)}
        .alert-warning{background:rgba(240,165,0,.08);border:1px solid rgba(240,165,0,.25);color:var(--gold)}
        /* MODAL */
        .modal-overlay{
          position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);
          z-index:200;display:flex;align-items:center;justify-content:center
        }
        .modal{
          background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius2);
          width:100%;max-width:480px;max-height:90vh;overflow-y:auto
        }
        .modal-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid var(--border)}
        .modal-title{font-size:15px;font-weight:700;color:var(--text)}
        .modal-close{cursor:pointer;color:var(--text3);font-size:18px;background:none;border:none;padding:0}
        .modal-body{padding:24px}
        .modal-footer{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px}
        /* TOAST */
        .toast-fixed{
          position:fixed;top:80px;right:28px;z-index:500;max-width:400px;
          display:flex;align-items:flex-start;gap:10px;padding:14px 18px;
          border-radius:14px;box-shadow:var(--shadow);animation:slideIn .25s ease;font-size:13px
        }
        .toast-success{background:rgba(0,200,150,.15);border:1px solid rgba(0,200,150,.3);color:var(--success2)}
        .toast-warning{background:rgba(240,165,0,.12);border:1px solid rgba(240,165,0,.3);color:var(--gold3)}
        .toast-error{background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.3);color:var(--danger2)}
        @keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        /* NOTIF */
        .notif-panel{
          position:absolute;top:48px;right:0;width:340px;
          background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);
          box-shadow:var(--shadow);z-index:200
        }
        .notif-item{display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer}
        .notif-item:last-child{border-bottom:none}
        .notif-item:hover{background:var(--bg3)}
        /* LOADING */
        .loading-overlay{
          position:absolute;inset:0;background:rgba(10,13,19,.6);
          display:flex;align-items:center;justify-content:center;border-radius:inherit;z-index:10
        }
        .spinner{
          width:28px;height:28px;border:3px solid var(--border2);
          border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        /* SUGGESTION BOX */
        .suggestion-box{
          background:rgba(79,135,255,.06);border:1px solid rgba(79,135,255,.2);
          border-radius:12px;padding:16px;margin-top:16px
        }
        /* RBAC */
        .rbac-flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0}
        .rbac-node{
          background:var(--bg3);border:1px solid var(--border2);border-radius:10px;
          padding:8px 16px;font-size:13px;font-weight:500;color:var(--text2)
        }
        .rbac-node.admin{background:rgba(240,165,0,.1);border-color:rgba(240,165,0,.3);color:var(--gold)}
        .rbac-node.manager{background:rgba(79,135,255,.1);border-color:rgba(79,135,255,.3);color:var(--accent2)}
        .rbac-arrow{color:var(--text3);font-size:18px}
      `}</style>

      <div className="app">
        {/* ── SIDEBAR ── */}
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
            {([
              ['dashboard','📊','Dashboard'],
              ['auth','🔐','Auth & RBAC'],
            ] as [PageId, string, string][]).map(([id, icon, label]) => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{icon}</span>{label}
              </button>
            ))}

            <div className="nav-label" style={{ marginTop: 8 }}>Quản lý</div>
            {([
              ['users','👥','Người dùng'],
              ['rooms','🛏️','Loại phòng'],
              ['hotels','🏨','Chi nhánh'],
            ] as [PageId, string, string][]).map(([id, icon, label]) => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{icon}</span>{label}
              </button>
            ))}

            <div className="nav-label" style={{ marginTop: 8 }}>Dynamic Pricing</div>
            {([
              ['pricing','💰','Cập nhật giá'],
              ['history','📜','Price History'],
              ['rules','⚙️','Pricing Rules'],
            ] as [PageId, string, string][]).map(([id, icon, label]) => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{icon}</span>{label}
              </button>
            ))}

            <div className="nav-label" style={{ marginTop: 8 }}>Analytics</div>
            {([
              ['reports','📈','Báo cáo OLAP'],
              ['occupancy','🏠','Occupancy Rate'],
            ] as [PageId, string, string][]).map(([id, icon, label]) => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{icon}</span>{label}
              </button>
            ))}

            <div className="nav-label" style={{ marginTop: 8 }}>TV1 — Giao dịch</div>
            {([
              ['bookings','📝','Quản lý Đặt phòng'],
            ] as [PageId, string, string][]).map(([id, icon, label]) => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{icon}</span>{label}
              </button>
            ))}

            <div className="nav-label" style={{ marginTop: 8 }}>TV2 — NoSQL & Search</div>
            {([
              ['search-analytics','🔍','Search Analytics'],
              ['support','📨','Yêu cầu Hỗ trợ'],
            ] as [PageId, string, string][]).map(([id, icon, label]) => (
              <button key={id} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>
                <span className="nav-icon">{icon}</span>{label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-card" onClick={logout} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && logout()} title="Đăng xuất">
              <div className="user-avatar">{user?.full_name?.[0] || 'A'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || 'Admin'}</div>
                <div style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(240,165,0,.1)', padding: '1px 7px', borderRadius: 10, display: 'inline-block', marginTop: 2 }}>{user?.role || 'admin'}</div>
              </div>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>→</span>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Serif Display, serif' }}>{PAGE_TITLES[page]}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Home / {PAGE_TITLES[page]}</div>
            </div>
            <div className="topbar-right">
              <span className={`api-badge ${apiOnline === null ? 'unknown' : apiOnline ? 'online' : 'offline'}`}>
                {apiOnline === null ? '⟳ Checking...' : apiOnline ? '● API Online' : '● Mock Data'}
              </span>
              <div style={{ position: 'relative' }}>
                <button className="icon-btn" onClick={() => setNotifOpen(v => !v)} title="Thông báo" aria-label="Mở thông báo">
                  🔔<span className="notif-dot" />
                </button>
                {notifOpen && (
                  <div className="notif-panel" role="dialog" aria-label="Bảng thông báo">
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Thông báo</span>
                      <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }} title="Đóng thông báo" aria-label="Đóng thông báo">✕</button>
                    </div>
                    {[
                      ['⚠️','Giá biến động >50%','Ocean View Standard tăng 71.4%','2 giờ trước'],
                      ['🛎️','Đặt phòng mới','Trần Văn Minh — InterCon ĐN','5 giờ trước'],
                      ['✅','Trigger thực thi','price_history cập nhật thành công','1 ngày trước'],
                    ].map(([icon, title, sub, time]) => (
                      <div key={title} className="notif-item">
                        <span style={{ fontSize: 20 }}>{icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="content">
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <div className="spinner" role="status" aria-label="Đang tải dữ liệu" />
              </div>
            )}

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
                          <div className={`stat-change ${dir}`}>
                            {dir === 'up' ? '▲' : '▼'} {Math.abs(Number(chg))}% so tháng trước
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid-2">
                      <div className="card">
                        <div className="card-header">
                          <span className="card-title">📊 Doanh thu & Đặt phòng (6 tháng)</span>
                          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text3)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--gold)', display: 'inline-block' }} />Doanh thu (M₫)
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)', display: 'inline-block' }} />Đặt phòng
                            </span>
                          </div>
                        </div>
                        <div className="card-body">
                          <div className="chart-wrap" role="img" aria-label="Biểu đồ doanh thu và đặt phòng 6 tháng">
                            {analytics.monthly_revenue.map((d, i) => {
                              const maxR = Math.max(...analytics.monthly_revenue.map(x => x.revenue));
                              const maxB = Math.max(...analytics.monthly_revenue.map(x => x.bookings));
                              return (
                                <div key={i} className="bar-group">
                                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 'calc(100% - 24px)', flex: 1, width: '100%' }}>
                                    <div className="bar bar-gold" style={{ height: `${d.revenue / maxR * 100}%`, minHeight: 4, width: '46%' }} title={`${d.month}: ₫${d.revenue}M`} role="presentation" />
                                    <div className="bar bar-blue" style={{ height: `${d.bookings / maxB * 100}%`, minHeight: 4, width: '46%' }} title={`${d.month}: ${d.bookings} đặt`} role="presentation" />
                                  </div>
                                  <div className="bar-label">{d.month}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-header"><span className="card-title">🏆 Top phòng theo doanh thu</span></div>
                        <div className="card-body" style={{ padding: 0 }}>
                          <table aria-label="Top phòng theo doanh thu">
                            <thead><tr><th scope="col">#</th><th scope="col">Phòng</th><th scope="col">Occupancy</th></tr></thead>
                            <tbody>
                              {analytics.top_rooms.map(r => (
                                <tr key={r.rank}>
                                  <td><span style={{ background: 'rgba(240,165,0,.15)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>#{r.rank}</span></td>
                                  <td>
                                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.hotel}</div>
                                  </td>
                                  <td><span style={{ color: r.occupancy > 80 ? 'var(--success)' : r.occupancy > 60 ? 'var(--gold)' : 'var(--danger)', fontWeight: 600 }}>{r.occupancy}%</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── AUTH & RBAC ─── */}
                {page === 'auth' && (
                  <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                      <div className="card-header"><span className="card-title">🔐 Role-Based Access Control (RBAC)</span></div>
                      <div className="card-body">
                        <p style={{ color: 'var(--text2)', marginBottom: 16 }}>Hệ thống phân quyền theo vai trò, áp dụng Row-Level Security trong SQL Server.</p>
                        <div className="rbac-flow">
                          {['admin','manager','staff','customer'].map((r, i) => (
                            <span key={r} style={{ display: 'contents' }}>
                              <div className={`rbac-node ${r === 'admin' ? 'admin' : r === 'manager' ? 'manager' : ''}`}>{r.toUpperCase()}</div>
                              {i < 3 && <span className="rbac-arrow">→</span>}
                            </span>
                          ))}
                        </div>
                        <div className="grid-cols-2" style={{ marginTop: 16 }}>
                          {[
                            ['👑 Admin', ['Toàn quyền hệ thống', 'CRUD tất cả entities', 'Xem audit logs', 'Quản lý pricing rules', 'Xem analytics đầy đủ']],
                            ['🎯 Manager', ['CRUD phòng & booking', 'Cập nhật giá trong range', 'Xem reports của chi nhánh', 'Không xem logs hệ thống']],
                            ['👤 Staff', ['Xem & cập nhật booking', 'Check-in/out', 'Không sửa giá', 'Chỉ xem data của ca làm việc']],
                            ['🛎️ Customer', ['Đặt phòng / huỷ', 'Xem booking của mình', 'Không truy cập admin', 'Chỉ đọc room & hotel info']],
                          ].map(([role, perms]) => (
                            <div key={String(role)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>{role}</div>
                              {(perms as string[]).map(p => (
                                <div key={p} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: 'var(--text2)' }}>
                                  <span style={{ color: 'var(--success)' }}>✓</span>{p}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid-cols-2">
                      <div className="card">
                        <div className="card-header"><span className="card-title">🔑 JWT Flow</span></div>
                        <div className="card-body">
                          {['POST /auth/login → nhận access_token + refresh_token', 'Token lưu localStorage / sessionStorage', 'Mỗi request: Authorization: Bearer <token>', 'Token hết hạn → tự động refresh', 'Logout → clear token + blacklist'].map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                              <span style={{ background: 'rgba(240,165,0,.15)', color: 'var(--gold)', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                              <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace' }}>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-header"><span className="card-title">🏛️ SQL Server Row-Level Security</span></div>
                        <div className="card-body">
                          <pre style={{ fontSize: 11, color: 'var(--accent2)', background: 'var(--bg)', padding: '12px 14px', borderRadius: 8, overflow: 'auto', lineHeight: 1.6 }}>{`CREATE SECURITY POLICY RoomTypePolicy
ADD FILTER PREDICATE
  dbo.fn_securitypredicate(
    hotel_id
  )
ON dbo.room_types
WITH (STATE = ON);`}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── USERS ─── */}
                {page === 'users' && (
                  <div>
                    <div className="page-header">
                      <div />
                      <button className="btn btn-primary" onClick={() => setModalOpen('addUser')}>+ Thêm người dùng</button>
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">👥 Danh sách người dùng</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{users.length} người dùng</span>
                      </div>
                      <table aria-label="Danh sách người dùng">
                        <thead><tr><th scope="col">Người dùng</th><th scope="col">Email</th><th scope="col">SĐT</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col">Ngày tạo</th><th scope="col">Hành động</th></tr></thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.user_id}>
                              <td style={{ fontWeight: 600, color: 'var(--text)' }}>{u.full_name}</td>
                              <td>{u.email}</td>
                              <td>{u.phone}</td>
                              <td><span className={`badge ${u.role === 'admin' ? 'badge-admin' : ''}`}>{u.role}</span></td>
                              <td><span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                              <td style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={async () => {
                                    const newRole = window.prompt('Nhập role mới (customer/staff/manager/admin):', u.role);
                                    if (newRole) {
                                      try {
                                        await usersApi.update(u.user_id, { role: newRole });
                                        showToast('Cập nhật role thành công');
                                        const res = await usersApi.getAll() as { data: MockUser[] };
                                        setUsers(res.data);
                                      } catch { showToast('Lỗi', 'error'); }
                                    }
                                  }}>Sửa</button>
                                  <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={async () => {
                                    if (confirm('Xóa user này?')) {
                                      try {
                                        await usersApi.delete(u.user_id);
                                        showToast('Đã xóa user');
                                        const res = await usersApi.getAll() as { data: MockUser[] };
                                        setUsers(res.data);
                                      } catch { showToast('Lỗi xóa', 'error'); }
                                    }
                                  }}>Xóa</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── ROOMS ─── */}
                {page === 'rooms' && (
                  <div>
                    <div className="page-header">
                      <div />
                      <button className="btn btn-primary" onClick={() => setModalOpen('addRoom')}>+ Thêm loại phòng</button>
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">🛏️ Loại phòng</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{rooms.length} loại phòng</span>
                      </div>
                      <table aria-label="Danh sách loại phòng">
                        <thead>
                          <tr>
                            <th scope="col">Tên phòng</th>
                            <th scope="col">Khách sạn</th>
                            <th scope="col">Sức chứa</th>
                            <th scope="col">Giá hiện tại</th>
                            <th scope="col">Trống/Tổng</th>
                            <th scope="col">Trạng thái</th>
                            <th scope="col">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.map(r => (
                            <tr key={r.room_type_id}>
                              <td style={{ fontWeight: 600, color: 'var(--text)' }}>{r.name}</td>
                              <td style={{ fontSize: 12 }}>{r.hotel_name}</td>
                              <td>{r.capacity} khách</td>
                              <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₫{fmt(r.base_price)}</td>
                              <td>{r.available_rooms}/{r.total_rooms}</td>
                              <td><span className="badge badge-active">Active</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {/* Mở Modal chỉnh sửa phòng */}
                                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => openEditRoomModal(r)}>
                                    Sửa
                                  </button>
                                  {/* Giữ lại nút Catalog của Thành viên 2 (MongoDB) */}
                                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={async () => {
                                    const desc = window.prompt('Nhập mô tả catalog (MongoDB):');
                                    if (desc) {
                                      try {
                                        await roomsApi.updateCatalog(r.room_type_id, { description: { vi: desc } });
                                        showToast('Cập nhật Catalog thành công');
                                      } catch { showToast('Lỗi', 'error'); }
                                    }
                                  }}>
                                    Catalog
                                  </button>
                                  {/* Nút xóa phòng */}
                                  <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleDeleteRoom(r.room_type_id)}>
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── HOTELS ─── */}
                {page === 'hotels' && (
                  <div>
                    <div className="page-header">
                      <div />
                      <button className="btn btn-primary" onClick={() => { setEditingHotel(null); setModalHotelName(''); setModalHotelCity(''); setModalHotelAddress(''); setModalHotelPhone(''); setModalHotelEmail(''); setModalOpen('hotel'); }}>+ Thêm chi nhánh</button>
                    </div>
                    <div className="grid-cols-3">
                    {hotels.map(h => (
                      <div key={h.hotel_id} className="card">
                        <div className="card-body" style={{ textAlign: 'center', padding: 28 }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>🏨</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{h.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>📍 {h.address}</div>
                          <span className="badge badge-active">● Active</span>
                          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 20 }}>
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{h.total_rooms}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Phòng</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: h.occupancy_rate > 80 ? 'var(--success)' : h.occupancy_rate > 60 ? 'var(--gold)' : 'var(--danger)' }}>{h.occupancy_rate}%</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Occupancy</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 10 }}>
                            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => { setEditingHotel(h); setModalHotelName(h.name); setModalHotelCity(h.city || ''); setModalHotelAddress(h.address || ''); setModalHotelPhone(h.phone || ''); setModalHotelEmail(h.email || ''); setModalOpen('hotel'); }}>Sửa</button>
                              <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleDeleteHotel(h.hotel_id)}>Xóa</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                {/* ─── PRICING ─── */}
                {page === 'pricing' && (
                  <div className="grid-2">
                    <div className="card">
                      <div className="card-header"><span className="card-title">💰 Cập nhật giá phòng</span></div>
                      <div className="card-body">
                        <div className="form-group">
                          <label htmlFor="pricing-room-select">Loại phòng</label>
                          <select
                            id="pricing-room-select"
                            value={selRoom}
                            onChange={e => { 
                              const rId = e.target.value;
                              setSelRoom(rId); 
                              setSuggestion(null);
                              // Tự động set giá mới bằng giá hiện tại khi đổi phòng
                              const r = rooms.find(room => String(room.room_type_id) === String(rId));
                              if (r) setNewPrice(Number(r.current_price));
                            }}
                            title="Chọn loại phòng để cập nhật giá"
                          >
                            <option value="">-- Chọn loại phòng --</option>
                            {rooms.map(r => <option key={r.room_type_id} value={r.room_type_id}>{r.name} — {r.hotel_name}</option>)}
                          </select>
                        </div>
                        <div className="price-compare" role="group" aria-label="So sánh giá">
                          <div className="price-box">
                            <div className="val" style={{ color: 'var(--text2)' }}>₫{fmt(basePrice)}</div>
                            <div className="lbl">Giá gốc (Niêm yết)</div>
                          </div>
                          <div className="price-box">
                            <div className="val">₫{fmt(currentPrice)}</div>
                            <div className="lbl">Giá hiện tại</div>
                          </div>
                          <div className="price-box">
                            <div className="val" style={{ color: 'var(--gold)' }}>₫{fmt(newPrice)}</div>
                            <div className="lbl">Giá mới (Sắp lưu)</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: -8, marginBottom: 15, textAlign: 'center' }}>
                          So với giá gốc: <span style={{ color: priceDeltaPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {priceDeltaPct >= 0 ? '▲ +' : '▼ '}{Math.abs(priceDeltaPct).toFixed(1)}%
                          </span>
                        </div>
                        {Math.abs(priceDeltaPct) >= 50 && (
                          <div className="alert-box alert-warning" role="alert">⚠️ Biến động giá &gt;50% — alert_flag = 1 sẽ được kích hoạt</div>
                        )}
                        <div className="form-group">
                          <label htmlFor="pricing-new-price">Giá mới (₫)</label>
                          <input
                            id="pricing-new-price"
                            type="number"
                            value={newPrice}
                            onChange={e => setNewPrice(+e.target.value)}
                            title="Nhập giá mới cho loại phòng"
                            placeholder="VD: 2000000"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="pricing-reason">Lý do</label>
                          <input
                            id="pricing-reason"
                            type="text"
                            value={priceReason}
                            onChange={e => setPriceReason(e.target.value)}
                            placeholder="VD: Peak season, High occupancy..."
                            title="Nhập lý do thay đổi giá"
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn btn-ghost" onClick={handleGetSuggestion}>🤖 AI Đề xuất</button>
                          <button className="btn btn-primary" onClick={handlePriceUpdate}>✓ Cập nhật giá</button>
                        </div>
                        {suggestion && (
                          <div className="suggestion-box" role="region" aria-label="Đề xuất giá từ AI" style={{ border: suggestion.is_new_room ? '1px dashed var(--gold)' : '1px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent2)' }}>🤖 Đề xuất AI</span>
                              {suggestion.is_new_room && <span className="badge badge-inactive" style={{ background: 'rgba(240,165,0,0.2)', color: 'var(--gold)' }}>Phòng mới</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.4 }}>{suggestion.reasoning}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                              <div>
                                <div style={{ fontSize: 15, color: 'var(--gold)', fontWeight: 700 }}>₫{fmt(suggestion.suggested_price)}</div>
                                <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                                  Lệch {suggestion.change_from_base >= 0 ? '+' : ''}{suggestion.change_from_base}% so với giá gốc
                                </div>
                              </div>
                              <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => { setNewPrice(suggestion.suggested_price); setSuggestion(null); }}>
                                Áp dụng ngay
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-header"><span className="card-title">📋 Hướng dẫn</span></div>
                      <div className="card-body">
                        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
                          Khi cập nhật giá, SQL Trigger sẽ tự động:<br/><br/>
                          <strong style={{ color: 'var(--text)' }}>1.</strong> Ghi vào bảng <code style={{ color: 'var(--accent2)' }}>price_history</code><br/>
                          <strong style={{ color: 'var(--text)' }}>2.</strong> Tính toán % thay đổi<br/>
                          <strong style={{ color: 'var(--text)' }}>3.</strong> Set <code style={{ color: 'var(--accent2)' }}>alert_flag = 1</code> nếu &gt;50%<br/>
                          <strong style={{ color: 'var(--text)' }}>4.</strong> Ghi <code style={{ color: 'var(--accent2)' }}>changed_by</code> từ JWT token<br/><br/>
                          Temporal Table tự động lưu lịch sử thay đổi với timestamp.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── PRICE HISTORY ─── */}
                {page === 'history' && (
                  <div className="card">
                    <div className="card-header"><span className="card-title">📜 Lịch sử thay đổi giá</span><span style={{ fontSize: 11, color: 'var(--text3)' }}>Ghi bởi SQL Trigger</span></div>
                    <table aria-label="Lịch sử thay đổi giá phòng">
                      <thead><tr><th scope="col">Phòng</th><th scope="col">Giá cũ</th><th scope="col">Giá mới</th><th scope="col">Thay đổi</th><th scope="col">Lý do</th><th scope="col">Người thay đổi</th><th scope="col">Alert</th><th scope="col">Thời gian</th></tr></thead>
                      <tbody>
                        {priceHistory.map((p, idx) => (
                          <tr key={p.price_history_id || idx}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.room_type_name || '—'}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.hotel_name}</div>
                            </td>
                            <td style={{ fontSize: 12 }}>₫{fmt(p.old_price)}</td>
                            <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₫{fmt(p.new_price)}</td>
                            <td><span style={{ color: Number(p.change_pct) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{Number(p.change_pct) >= 0 ? '+' : ''}{Number(p.change_pct).toFixed(2)}%</span></td>
                            <td style={{ fontSize: 12, maxWidth: 160, color: 'var(--text2)' }}>{p.note || '—'}</td>
                            <td style={{ fontSize: 11, color: 'var(--text3)' }}>{p.changed_by_name || `User #${p.changed_by}`}</td>
                            <td>{p.alert_flag ? <span className="badge badge-inactive">⚠ Alert</span> : <span className="badge badge-active">✓ OK</span>}</td>
                            <td style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(p.changed_at).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── PRICING RULES ─── */}
                {page === 'rules' && (
                  <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="card-title">⚙️ Pricing Rules</span>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => { setEditingRule(null); setModalOpen('addRule'); }}>+ Thêm Quy tắc</button>
                    </div>
                    <table aria-label="Danh sách pricing rules">
                      <thead>
                        <tr>
                          <th scope="col">Tên rule</th>
                          <th scope="col">Điều kiện</th>
                          <th scope="col">Giá trị</th>
                          <th scope="col">Ưu tiên</th>
                          <th scope="col">Trạng thái</th>
                          <th scope="col">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingRules.map(r => (
                          <tr key={r.rule_id}>
                            <td style={{ fontWeight: 600, color: 'var(--text)' }}>{r.rule_name || r.name}</td>
                            <td>
                              <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                                {r.rule_type === 'occupancy' ? `Occupancy: ${r.threshold_min}% - ${r.threshold_max}%` : r.rule_type}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: r.adjustment_value > 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {r.adjustment_type === 'percent' ? `${r.adjustment_value > 0 ? '+' : ''}${r.adjustment_value}%` : `₫${fmt(r.adjustment_value)}`}
                            </td>
                            <td style={{ fontSize: 12 }}>P{r.priority}</td>
                            <td>
                              {/* Click trực tiếp vào Badge để Bật/Tắt Rule */}
                              <span 
                                className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={async () => {
                                  try {
                                    await pricingApi.toggleRule(r.rule_id);
                                    showToast(`Đã ${r.is_active ? 'tắt' : 'bật'} rule`);
                                    const res = await pricingApi.getRules() as any;
                                    setPricingRules(res.data);
                                  } catch { showToast('Lỗi', 'error'); }
                                }}
                              >
                                {r.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {/* Mở Modal Sửa Rule */}
                                <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => openEditRuleModal(r)}>
                                  Sửa
                                </button>
                                {/* Xóa Rule */}
                                <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleDeleteRule(r.rule_id)}>
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── REPORTS / OLAP ─── */}
                {page === 'reports' && analytics && (
                  <div>
                    <div className="grid-cols-2" style={{ marginBottom: 20 }}>
                      <div className="card">
                        <div className="card-header"><span className="card-title">📈 Window Functions — Revenue Rank</span></div>
                        <div className="card-body" style={{ padding: 0 }}>
                          <table aria-label="Xếp hạng doanh thu theo window function">
                            <thead><tr><th scope="col">Rank</th><th scope="col">Phòng</th><th scope="col">Khách sạn</th><th scope="col">Doanh thu</th><th scope="col">Đặt phòng</th></tr></thead>
                            <tbody>
                              {analytics.top_rooms.map(r => (
                                <tr key={r.rank}>
                                  <td><span style={{ background: 'rgba(240,165,0,.15)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>#{r.rank}</span></td>
                                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{r.name}</td>
                                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{r.hotel}</td>
                                  <td style={{ color: 'var(--gold)' }}>₫{fmt(r.revenue)}</td>
                                  <td>{r.bookings} đặt</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-header"><span className="card-title">📋 Bookings theo trạng thái</span></div>
                        <div className="card-body" style={{ padding: 0 }}>
                          <table aria-label="Danh sách đặt phòng theo trạng thái">
                            <thead><tr><th scope="col">Khách</th><th scope="col">Phòng</th><th scope="col">Tổng tiền</th><th scope="col">Trạng thái</th></tr></thead>
                            <tbody>
                              {bookings.map(b => (
                                <tr key={b.booking_id}>
                                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{b.user_name}</td>
                                  <td style={{ fontSize: 12 }}>{b.room_type_name}</td>
                                  <td style={{ color: 'var(--gold)' }}>₫{fmt(b.total_price)}</td>
                                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-header"><span className="card-title">🧮 OLAP Query mẫu</span></div>
                      <div className="card-body">
                        <pre style={{ fontSize: 11, color: 'var(--accent2)', background: 'var(--bg)', padding: '16px', borderRadius: 10, overflow: 'auto', lineHeight: 1.7 }}>{`SELECT
  h.name AS hotel_name,
  rt.name AS room_type,
  COUNT(b.booking_id) AS total_bookings,
  SUM(b.total_price) AS total_revenue,
  AVG(b.total_price) AS avg_revenue,
  RANK() OVER (
    PARTITION BY h.hotel_id
    ORDER BY SUM(b.total_price) DESC
  ) AS revenue_rank,
  SUM(SUM(b.total_price)) OVER (
    PARTITION BY h.hotel_id
  ) AS hotel_total_revenue
FROM bookings b
  JOIN room_types rt ON b.room_type_id = rt.room_type_id
  JOIN hotels h ON rt.hotel_id = h.hotel_id
WHERE b.status = 'confirmed'
GROUP BY h.hotel_id, h.name, rt.room_type_id, rt.name
ORDER BY hotel_name, revenue_rank;`}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── BOOKINGS (Thành viên 1: Transaction & Locking) ─── */}
                {page === 'bookings' && (
                  <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                      <div className="card-header">
                        <span className="card-title">🔒 Pessimistic Locking — sp_create_booking</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>SERIALIZABLE + UPDLOCK/HOLDLOCK</span>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                          {[
                            { label: 'SET ISOLATION LEVEL', val: 'SERIALIZABLE', color: 'var(--accent2)' },
                            { label: 'SELECT...WITH', val: '(UPDLOCK, HOLDLOCK)', color: 'var(--gold)' },
                            { label: 'Double Booking Check', val: 'Overlap Query', color: 'var(--success)' },
                            { label: 'On Conflict', val: 'ROLLBACK + RAISERROR', color: 'var(--danger)' },
                          ].map(b => (
                            <div key={b.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
                              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: 1 }}>{b.label}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: b.color, fontFamily: 'monospace', marginTop: 3 }}>{b.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
                      {['', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                        <button key={s} className={`btn ${bookingFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setBookingFilter(s)} style={{ padding: '6px 14px', fontSize: 12 }}>
                          {s === '' ? 'Tất cả' : s}
                        </button>
                      ))}
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">📝 Danh sách đặt phòng</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {(bookingFilter ? allBookings.filter(b => b.status === bookingFilter) : allBookings).length} kết quả
                        </span>
                      </div>
                      <table>
                        <thead><tr>
                          <th>Khách</th><th>Phòng</th><th>Khách sạn</th>
                          <th>Check-in</th><th>Check-out</th><th>Đêm</th>
                          <th>Tổng tiền</th><th>Trạng thái</th><th>Hành động</th>
                        </tr></thead>
                        <tbody>
                          {(bookingFilter ? allBookings.filter(b => b.status === bookingFilter) : allBookings).map(b => (
                            <tr key={b.booking_id}>
                              <td style={{ fontWeight: 600, color: 'var(--text)' }}>{b.user_name}</td>
                              <td style={{ fontSize: 12 }}>{b.room_type_name}</td>
                              <td style={{ fontSize: 11, color: 'var(--text3)' }}>{b.hotel_name}</td>
                              <td style={{ fontSize: 12 }}>{new Date(b.check_in).toLocaleDateString('vi-VN')}</td>
                              <td style={{ fontSize: 12 }}>{new Date(b.check_out).toLocaleDateString('vi-VN')}</td>
                              <td style={{ textAlign: 'center' as const }}>{b.nights}</td>
                              <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₫{fmt(b.total_price)}</td>
                              <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {b.status === 'pending' && (
                                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}
                                      onClick={async () => {
                                        try {
                                          await bookingsApi.updateStatus(b.booking_id, 'confirmed', '1');
                                          showToast('✅ Đã xác nhận đặt phòng');
                                          const res = await bookingsApi.getAll() as { data: MockBooking[] };
                                          setAllBookings(res.data);
                                        } catch { showToast('Lỗi xác nhận', 'error'); }
                                      }}>✓ Duyệt</button>
                                  )}
                                  {b.status === 'confirmed' && (
                                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}
                                      onClick={async () => {
                                        try {
                                          await bookingsApi.updateStatus(b.booking_id, 'completed', '1');
                                          showToast('✅ Hoàn thành');
                                          const res = await bookingsApi.getAll() as { data: MockBooking[] };
                                          setAllBookings(res.data);
                                        } catch { showToast('Lỗi', 'error'); }
                                      }}>✓ Hoàn thành</button>
                                  )}
                                  {['pending','confirmed'].includes(b.status) && (
                                    <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }}
                                      onClick={async () => {
                                        try {
                                          await bookingsApi.updateStatus(b.booking_id, 'cancelled', '1');
                                          showToast('Đã hủy đặt phòng', 'warning');
                                          const res = await bookingsApi.getAll() as { data: MockBooking[] };
                                          setAllBookings(res.data);
                                        } catch { showToast('Lỗi hủy', 'error'); }
                                      }}>✕ Hủy</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── SEARCH ANALYTICS (Thành viên 2: NoSQL + MongoDB Aggregation) ─── */}
                {page === 'search-analytics' && (
                  <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                      <div className="card-header">
                        <span className="card-title">🍃 MongoDB — Polyglot Persistence</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Aggregation Pipeline</span>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                          {[
                            { label: 'Collection', val: 'customer_search_logs', color: 'var(--success)' },
                            { label: 'Index 1', val: '{ city: 1, createdAt: -1 }', color: 'var(--accent2)' },
                            { label: 'Index 2', val: '{ city: 1, converted: 1 }', color: 'var(--gold)' },
                            { label: 'Full-text', val: '{ city: "text" }', color: 'var(--accent2)' },
                          ].map(b => (
                            <div key={b.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
                              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: 1 }}>{b.label}</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: b.color, fontFamily: 'monospace', marginTop: 3 }}>{b.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid-cols-2" style={{ marginBottom: 20 }}>
                      <div className="card">
                        <div className="card-header"><span className="card-title">🏙️ Top Thành phố tìm kiếm</span></div>
                        <div className="card-body" style={{ padding: 0 }}>
                          <table>
                            <thead><tr><th>Thành phố</th><th>Tìm kiếm</th><th>Chuyển đổi</th><th>Tỷ lệ</th></tr></thead>
                            <tbody>
                              {searchAnalytics.topCities.map((c: any, i) => (
                                <tr key={c.city}>
                                  <td>
                                    <span style={{ background: 'rgba(240,165,0,.15)', color: 'var(--gold)', padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginRight: 6 }}>#{i+1}</span>
                                    {c.city}
                                  </td>
                                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{c.search_count?.toLocaleString()}</td>
                                  <td style={{ color: 'var(--success)' }}>{c.converted_count}</td>
                                  <td><span style={{ color: c.conversion_rate > 20 ? 'var(--success)' : 'var(--gold)', fontWeight: 600 }}>{c.conversion_rate}%</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="card">
                        <div className="card-header"><span className="card-title">🏷️ Tiện nghi phổ biến</span></div>
                        <div className="card-body">
                          {searchAnalytics.amenities.map((a: any) => {
                            const max = Math.max(...searchAnalytics.amenities.map((x: any) => x.count));
                            return (
                              <div key={a.amenity} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                  <span style={{ color: 'var(--text2)' }}>{a.amenity}</span>
                                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{a.count?.toLocaleString()}</span>
                                </div>
                                <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 5 }}>
                                  <div style={{ height: '100%', width: `${(a.count / max) * 100}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 4 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header"><span className="card-title">📈 Xu hướng tìm kiếm (14 ngày)</span></div>
                      <div className="card-body">
                        <div className="chart-wrap">
                          {searchAnalytics.trend.map((d: any, i) => {
                            const maxS = Math.max(...searchAnalytics.trend.map((x: any) => x.searches));
                            return (
                              <div key={i} className="bar-group">
                                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 'calc(100% - 24px)', flex: 1, width: '100%' }}>
                                  <div className="bar bar-gold" style={{ height: `${(d.searches / maxS) * 100}%`, minHeight: 4, width: '60%' }} title={`${d.date}: ${d.searches} tìm kiếm`} />
                                  <div className="bar bar-blue" style={{ height: `${(d.conversions / maxS) * 100}%`, minHeight: 2, width: '30%' }} title={`${d.date}: ${d.conversions} chuyển đổi`} />
                                </div>
                                <div className="bar-label">{d.date?.slice(5)}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--gold)', display: 'inline-block' }} />Tìm kiếm</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)', display: 'inline-block' }} />Chuyển đổi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── SUPPORT (Thành viên 2: MongoDB Support Tickets) ─── */}
                {page === 'support' && (
                  <div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
                      {['', 'open', 'in_progress', 'resolved'].map(s => (
                        <button key={s} className={`btn ${supportFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setSupportFilter(s)} style={{ padding: '6px 14px', fontSize: 12 }}>
                          {s === '' ? 'Tất cả' : s === 'in_progress' ? 'Đang xử lý' : s === 'open' ? 'Mới' : 'Đã giải quyết'}
                        </button>
                      ))}
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">📨 Tickets hỗ trợ (MongoDB)</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {(supportFilter ? supportTickets.filter((t: any) => t.status === supportFilter) : supportTickets).length} tickets
                        </span>
                      </div>
                      <table>
                        <thead><tr><th>Khách hàng</th><th>Chủ đề</th><th>Danh mục</th><th>Ưu tiên</th><th>Trạng thái</th><th>Thời gian</th><th>Hành động</th></tr></thead>
                        <tbody>
                          {(supportFilter ? supportTickets.filter((t: any) => t.status === supportFilter) : supportTickets).map((t: any) => (
                            <tr key={t._id}>
                              <td style={{ fontWeight: 600, color: 'var(--text)' }}>{t.user_name}</td>
                              <td style={{ fontSize: 12 }}>{t.subject}</td>
                              <td><span className="badge" style={{ background: 'rgba(79,135,255,.1)', color: 'var(--accent2)', border: '1px solid rgba(79,135,255,.3)' }}>{t.category}</span></td>
                              <td>
                                <span style={{ color: t.priority === 'high' || t.priority === 'urgent' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--gold)' : 'var(--text3)', fontWeight: 600, fontSize: 12 }}>
                                  {t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : t.priority === 'medium' ? '🟡' : '🟢'} {t.priority}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${t.status === 'open' ? 'badge-pending' : t.status === 'resolved' ? 'badge-active' : ''}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {t.status !== 'resolved' && (
                                    <>
                                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}
                                        onClick={async () => {
                                          const replyMsg = window.prompt('Nhập nội dung trả lời:');
                                          if (replyMsg) {
                                            try {
                                              await supportApi.reply(t._id, String(user?.user_id || '1'), user?.full_name || 'Admin', replyMsg);
                                              showToast('Đã gửi phản hồi');
                                              const res = await supportApi.getAll() as { data: any[] };
                                              setSupportTickets(res.data);
                                            } catch { showToast('Lỗi gửi phản hồi', 'error'); }
                                          }
                                        }}>Trả lời</button>
                                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}
                                        onClick={async () => {
                                          try {
                                            await supportApi.resolve(t._id, '1');
                                            showToast('✅ Ticket đã giải quyết');
                                            const res = await supportApi.getAll() as { data: any[] };
                                            setSupportTickets(res.data);
                                          } catch { showToast('Lỗi', 'error'); }
                                        }}>✓ Giải quyết</button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── OCCUPANCY ─── */}
                {page === 'occupancy' && (
                  <div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                      {hotels.map(h => (
                        <div key={h.hotel_id} className="stat-card">
                          <div className="stat-label-s">🏨 {h.name}</div>
                          <div className="stat-value-s" style={{ color: h.occupancy_rate > 80 ? 'var(--success)' : h.occupancy_rate > 60 ? 'var(--gold)' : 'var(--danger)' }}>{h.occupancy_rate}%</div>
                          <div style={{ marginTop: 8, background: 'var(--bg3)', borderRadius: 4, height: 6, overflow: 'hidden' }} role="progressbar" aria-valuenow={h.occupancy_rate} aria-valuemin={0} aria-valuemax={100} aria-label={`Tỷ lệ lấp đầy ${h.name}`}>
                            <div style={{ height: '100%', width: `${h.occupancy_rate}%`, background: h.occupancy_rate > 80 ? 'var(--success)' : h.occupancy_rate > 60 ? 'var(--gold)' : 'var(--danger)', borderRadius: 4 }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>
                            <span>{Math.round(h.total_rooms * h.occupancy_rate / 100)}/{h.total_rooms} phòng</span>
                            <span>{h.city}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── MODAL: ADD USER ── */}
      {modalOpen === 'addUser' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)} role="dialog" aria-modal="true" aria-labelledby="modal-user-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" id="modal-user-title">👤 Thêm người dùng mới</div>
              <button className="modal-close" onClick={() => setModalOpen(null)} title="Đóng modal" aria-label="Đóng modal thêm người dùng">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="user-firstname">Tên</label>
                  <input
                    id="user-firstname"
                    type="text"
                    value={modalUserName}
                    onChange={e => setModalUserName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    title="Nhập tên người dùng"
                    autoComplete="given-name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="user-phone">SĐT</label>
                  <input
                    id="user-phone"
                    type="tel"
                    value={modalUserPhone}
                    onChange={e => setModalUserPhone(e.target.value)}
                    placeholder="0901234567"
                    title="Nhập số điện thoại"
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  type="email"
                  value={modalUserEmail}
                  onChange={e => setModalUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  title="Nhập địa chỉ email"
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="user-password">Mật khẩu (sẽ được bcrypt hash)</label>
                <input
                  id="user-password"
                  type="password"
                  value={modalUserPassword}
                  onChange={e => setModalUserPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  title="Nhập mật khẩu tối thiểu 8 ký tự"
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="user-role">Vai trò</label>
                <select
                  id="user-role"
                  value={modalUserRole}
                  onChange={e => setModalUserRole(e.target.value)}
                  title="Chọn vai trò người dùng"
                >
                  <option value="customer">customer</option>
                  <option value="staff">staff</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => { showToast('✓ Tạo người dùng thành công (mock)'); setModalOpen(null); }}>✓ Tạo người dùng</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD ROOM ── */}
      {modalOpen === 'addRoom' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)} role="dialog" aria-modal="true" aria-labelledby="modal-room-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" id="modal-room-title">🛏️ Thêm loại phòng mới</div>
              <button className="modal-close" onClick={() => setModalOpen(null)} title="Đóng modal" aria-label="Đóng modal thêm loại phòng">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="room-name">Tên loại phòng</label>
                <input
                  id="room-name"
                  type="text"
                  value={modalRoomName}
                  onChange={e => setModalRoomName(e.target.value)}
                  placeholder="VD: Deluxe Ocean View"
                  title="Nhập tên loại phòng"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="room-hotel">Khách sạn</label>
                  <select
                    id="room-hotel"
                    value={modalRoomHotel}
                    onChange={e => setModalRoomHotel(e.target.value)}
                    title="Chọn khách sạn"
                  >
                    {hotels.map(h => <option key={h.hotel_id} value={h.hotel_id}>{h.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="room-capacity">Sức chứa</label>
                  <input
                    id="room-capacity"
                    type="number"
                    value={modalRoomCapacity}
                    onChange={e => setModalRoomCapacity(+e.target.value)}
                    min={1}
                    max={10}
                    title="Nhập sức chứa phòng (số khách tối đa)"
                    placeholder="2"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="room-price">Giá hiện tại (₫)</label>
                  <input
                    id="room-price"
                    type="number"
                    value={modalRoomPrice}
                    onChange={e => setModalRoomPrice(+e.target.value)}
                    placeholder="2000000"
                    title="Nhập giá phòng theo VND"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="room-total">Tổng số phòng</label>
                  <input
                    id="room-total"
                    type="number"
                    value={modalRoomTotal}
                    onChange={e => setModalRoomTotal(+e.target.value)}
                    placeholder="10"
                    title="Nhập tổng số phòng loại này"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="room-description">Mô tả</label>
                <textarea
                  id="room-description"
                  rows={3}
                  value={modalRoomDesc}
                  onChange={e => setModalRoomDesc(e.target.value)}
                  placeholder="Mô tả ngắn về loại phòng..."
                  title="Nhập mô tả ngắn về loại phòng"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveRoom}>
                {editingRoom ? '✓ Cập nhật' : '✓ Tạo loại phòng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD/EDIT HOTEL ── */}
      {modalOpen === 'hotel' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)} role="dialog" aria-modal="true" aria-labelledby="modal-hotel-title">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" id="modal-hotel-title">🏨 {editingHotel ? 'Sửa chi nhánh' : 'Thêm chi nhánh mới'}</div>
              <button className="modal-close" onClick={() => setModalOpen(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên khách sạn *</label>
                <input type="text" value={modalHotelName} onChange={e => setModalHotelName(e.target.value)} placeholder="VD: Mường Thanh Grand" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Thành phố *</label>
                  <input type="text" value={modalHotelCity} onChange={e => setModalHotelCity(e.target.value)} placeholder="VD: Hà Nội" />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input type="text" value={modalHotelPhone} onChange={e => setModalHotelPhone(e.target.value)} placeholder="0901234567" />
                </div>
              </div>
              <div className="form-group">
                <label>Địa chỉ</label>
                <input type="text" value={modalHotelAddress} onChange={e => setModalHotelAddress(e.target.value)} placeholder="Số nhà, đường, quận, tỉnh..." />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={modalHotelEmail} onChange={e => setModalHotelEmail(e.target.value)} placeholder="hotel@example.com" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveHotel}>
                {editingHotel ? '✓ Cập nhật' : '✓ Tạo chi nhánh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD PRICING RULE ── */}
      {modalOpen === 'addRule' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)} role="dialog" aria-modal="true" aria-labelledby="modal-rule-title">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingRule ? 'Sửa quy tắc' : 'Thêm quy tắc mới'}</h2>
              <button className="modal-close" onClick={() => { setModalOpen(null); setEditingRule(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên quy tắc</label>
                <input type="text" value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="VD: Peak Season June" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Loại</label>
                  <select value={ruleType} onChange={e => setRuleType(e.target.value)}>
                    <option value="occupancy">Occupancy</option>
                    <option value="season">Season</option>
                    <option value="demand">Demand</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ưu tiên</label>
                  <input type="number" value={isNaN(priority) ? '' : priority} onChange={e => setPriority(parseInt(e.target.value) || 0)} />
                </div>
              </div>

              {/* ── HIỆN THEO LOẠI QUY TẮC ── */}
              {ruleType === 'occupancy' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label>Occupancy Min (%)</label>
                    <input type="number" value={isNaN(tMin) ? '' : tMin} onChange={e => setTMin(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Occupancy Max (%)</label>
                    <input type="number" value={isNaN(tMax) ? '' : tMax} onChange={e => setTMax(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label>Từ ngày</label>
                    <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Đến ngày</label>
                    <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} />
                  </div>
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
                  <label>Giá trị (Âm để giảm giá)</label>
                  <input type="number" value={isNaN(adjVal) ? '' : adjVal} onChange={e => setAdjVal(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  const payload = {
                    rule_name: ruleName,
                    rule_type: ruleType,
                    threshold_min: ruleType === 'occupancy' ? tMin : 0,
                    threshold_max: ruleType === 'occupancy' ? tMax : 100,
                    valid_from: ruleType !== 'occupancy' ? validFrom : null,
                    valid_to: ruleType !== 'occupancy' ? validTo : null,
                    adjustment_type: adjType,
                    adjustment_value: adjVal,
                    priority: priority
                  };

                  if (editingRule) {
                    await pricingApi.updateRule(editingRule.rule_id, payload);
                    showToast('Cập nhật quy tắc thành công', 'success');
                  } else {
                    await pricingApi.createRule(payload);
                    showToast('Thêm quy tắc thành công', 'success');
                  }

                  setModalOpen(null);
                  setEditingRule(null);
                  const res = await pricingApi.getRules() as any;
                  setPricingRules(res.data);
                } catch (e: any) {
                  showToast(e.message || 'Lỗi lưu quy tắc', 'error');
                }
              }}>Lưu quy tắc</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast-fixed toast-${toast.type}`} role="alert" aria-live="polite">
          <span>{toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : '❌'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}