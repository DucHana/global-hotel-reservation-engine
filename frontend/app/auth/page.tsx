'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';

// ── Types ──
type TabType = 'login' | 'register';
type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  show: boolean;
  type: ToastType;
  title: string;
  message: string;
}

// ── Password strength checker ──
function calcStrength(pwd: string) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

const STRENGTH_LABELS = ['', 'Yếu', 'Yếu', 'Trung bình', 'Mạnh'];
const STRENGTH_COLORS = ['', '#ff4d6d', '#ff4d6d', '#f0a500', '#00c896'];

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [tab, setTab] = useState<TabType>('login');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, type: 'info', title: '', message: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Register form
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const pwdStrength = calcStrength(regPwd);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  }, []);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePhone = (p: string) => /^(0|\+84)[0-9]{9,10}$/.test(p.replace(/\s/g, ''));

  // ── LOGIN ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!validateEmail(loginEmail)) errs.email = 'Vui lòng nhập email hợp lệ';
    if (!loginPwd) errs.pwd = 'Vui lòng nhập mật khẩu';
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }
    setLoginErrors({});
    setLoading(true);
    try {
      await login(loginEmail, loginPwd, rememberMe);
      showToast('success', 'Đăng nhập thành công', 'Đang chuyển hướng...');
      setTimeout(() => router.push('/admin/dashboard'), 1000);
    } catch (err: unknown) {
      setLoading(false);
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 401) {
        showToast('error', 'Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng');
        setLoginErrors({ pwd: 'Email hoặc mật khẩu không đúng' });
      } else {
        showToast('error', 'Lỗi kết nối', apiErr.message || 'Vui lòng thử lại');
      }
    }
  };

  // ── REGISTER ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!regFirstName) errs.firstName = 'Vui lòng nhập tên';
    if (!regLastName) errs.lastName = 'Vui lòng nhập họ';
    if (!validateEmail(regEmail)) errs.email = 'Email không hợp lệ';
    if (regPhone && !validatePhone(regPhone)) errs.phone = 'Số điện thoại không hợp lệ';
    if (regPwd.length < 8) errs.pwd = 'Mật khẩu phải có ít nhất 8 ký tự';
    if (regPwd !== regConfirm) errs.confirm = 'Mật khẩu không khớp';
    if (Object.keys(errs).length) { setRegErrors(errs); return; }
    setRegErrors({});
    setLoading(true);
    try {
      await authApi.register({
        full_name: `${regFirstName} ${regLastName}`,
        email: regEmail,
        password: regPwd,
        phone: regPhone || undefined,
        role: 'customer',
      });
      showToast('success', 'Đăng ký thành công! 🎉', 'Tài khoản đã được tạo. Vui lòng đăng nhập.');
      setTimeout(() => { setTab('login'); setLoading(false); }, 1500);
    } catch (err: unknown) {
      setLoading(false);
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 409) {
        showToast('error', 'Email đã tồn tại', 'Vui lòng dùng email khác hoặc đăng nhập');
        setRegErrors({ email: 'Email này đã được đăng ký' });
      } else {
        showToast('error', 'Lỗi', apiErr.message || 'Vui lòng thử lại');
      }
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        :root {
          --bg:#0a0d13;--bg2:#111520;--bg3:#171d2e;--card:#1a2035;
          --border:#252d44;--border2:#2e3a55;
          --gold:#f0a500;--gold2:#ffc233;
          --accent:#4f87ff;--danger:#ff4d6d;--success:#00c896;
          --text:#e8ecf5;--text2:#9aa5c0;--text3:#5c6b8a;
        }
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif}
        input,select,textarea,button{font-family:inherit}
        .auth-layout{display:grid;grid-template-columns:1fr 1fr;min-height:100vh}
        @media(max-width:768px){.auth-layout{grid-template-columns:1fr}.left-panel{display:none}}
        .left-panel{
          background:var(--bg2);border-right:1px solid var(--border);
          display:flex;flex-direction:column;padding:48px;position:relative;overflow:hidden
        }
        .left-panel::before{
          content:'';position:absolute;inset:0;
          background-image:linear-gradient(rgba(240,165,0,.04) 1px,transparent 1px),
            linear-gradient(90deg,rgba(240,165,0,.04) 1px,transparent 1px);
          background-size:40px 40px;pointer-events:none
        }
        .left-panel::after{
          content:'';position:absolute;width:500px;height:500px;
          background:radial-gradient(circle,rgba(240,165,0,.07) 0%,transparent 70%);
          bottom:-150px;left:-100px;pointer-events:none
        }
        .brand{display:flex;align-items:center;gap:14px;margin-bottom:60px;position:relative;z-index:1;text-decoration:none}
        .brand-icon{
          width:48px;height:48px;background:linear-gradient(135deg,var(--gold),#e09600);
          border-radius:14px;display:flex;align-items:center;justify-content:center;
          font-size:22px;box-shadow:0 0 30px rgba(240,165,0,.25);flex-shrink:0
        }
        .brand-name{font-family:'DM Serif Display',serif;font-size:22px;color:var(--text);display:block}
        .brand-tagline{font-size:11px;color:var(--gold);letter-spacing:2px;text-transform:uppercase;font-weight:500}
        .left-hero{flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1}
        .hero-eyebrow{
          display:inline-flex;align-items:center;gap:8px;
          background:rgba(240,165,0,.1);border:1px solid rgba(240,165,0,.25);
          color:var(--gold);font-size:11px;font-weight:600;letter-spacing:1.5px;
          text-transform:uppercase;padding:6px 14px;border-radius:30px;width:fit-content;margin-bottom:28px
        }
        .hero-title{font-family:'DM Serif Display',serif;font-size:42px;line-height:1.15;color:var(--text);margin-bottom:20px}
        .hero-title em{font-style:italic;color:var(--gold)}
        .hero-desc{font-size:15px;color:var(--text2);line-height:1.8;max-width:380px;margin-bottom:40px}
        .stats-row{display:flex;gap:32px}
        .stat-value{font-family:'DM Serif Display',serif;font-size:28px;color:var(--text);line-height:1}
        .stat-label{font-size:12px;color:var(--text3);margin-top:4px}
        .stat-divider{width:1px;background:var(--border);align-self:stretch}
        .right-panel{display:flex;align-items:center;justify-content:center;padding:48px 56px;background:var(--bg)}
        .auth-box{width:100%;max-width:420px}
        .auth-tabs{
          display:flex;background:var(--bg2);border:1px solid var(--border);
          border-radius:20px;padding:4px;margin-bottom:36px;gap:4px
        }
        .tab-btn{
          flex:1;padding:10px;border:none;border-radius:16px;background:transparent;
          color:var(--text2);font-size:14px;font-weight:500;cursor:pointer;transition:all .25s
        }
        .tab-btn.active{background:var(--card);color:var(--text);border:1px solid var(--border2);box-shadow:0 4px 16px rgba(0,0,0,.3)}
        .form-title{font-family:'DM Serif Display',serif;font-size:26px;color:var(--text);margin-bottom:6px}
        .form-subtitle{font-size:14px;color:var(--text2);margin-bottom:28px}
        .form-group{margin-bottom:18px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        label{display:block;font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
        .input-wrap{position:relative}
        input[type=text],input[type=email],input[type=password],input[type=tel],select{
          width:100%;padding:12px 16px;background:var(--bg2);border:1.5px solid var(--border);
          border-radius:12px;color:var(--text);font-size:14px;outline:none;transition:all .2s
        }
        input:focus,select:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(240,165,0,.1)}
        input.error,select.error{border-color:var(--danger)}
        .pwd-toggle{
          position:absolute;right:14px;top:50%;transform:translateY(-50%);
          background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0
        }
        .field-error{font-size:12px;color:var(--danger);margin-top:6px;display:none}
        .field-error.show{display:block}
        .strength-meter{margin-top:8px;display:none}
        .strength-meter.show{display:block}
        .strength-bars{display:flex;gap:4px;margin-bottom:4px}
        .strength-bar{height:3px;flex:1;background:var(--border);border-radius:2px;transition:background .3s}
        .strength-text{font-size:11px;color:var(--text3)}
        .btn-primary{
          width:100%;padding:14px;background:linear-gradient(135deg,var(--gold),#e09600);
          border:none;border-radius:12px;color:#0a0d13;font-size:15px;font-weight:700;
          cursor:pointer;transition:all .2s;margin-top:8px;position:relative;overflow:hidden
        }
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(240,165,0,.35)}
        .btn-primary:active{transform:translateY(0)}
        .btn-primary.loading{pointer-events:none;opacity:.8}
        .btn-primary.loading::after{
          content:'';position:absolute;inset:0;
          background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.2) 50%,transparent 100%);
          animation:shimmer 1s infinite
        }
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        .divider{display:flex;align-items:center;gap:16px;margin:20px 0;color:var(--text3);font-size:12px}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border)}
        .social-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
        .btn-social{
          padding:10px 16px;background:var(--bg2);border:1.5px solid var(--border);
          border-radius:12px;color:var(--text2);font-size:13px;font-weight:500;
          cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
          transition:all .2s
        }
        .btn-social:hover{border-color:var(--border2);color:var(--text);background:var(--bg3)}
        .remember-row{display:flex;align-items:center;justify-content:space-between;margin:16px 0}
        .check-label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);cursor:pointer}
        input[type=checkbox]{width:16px;height:16px;accent-color:var(--gold);cursor:pointer}
        .link{color:var(--gold);text-decoration:none;font-size:13px}
        .link:hover{text-decoration:underline}
        .toast{
          position:fixed;top:24px;right:24px;z-index:1000;
          background:var(--card);border:1px solid var(--border);border-radius:16px;
          padding:16px 20px;display:flex;align-items:flex-start;gap:12px;min-width:300px;
          transform:translateY(-20px);opacity:0;transition:all .3s;pointer-events:none
        }
        .toast.show{transform:translateY(0);opacity:1;pointer-events:auto}
        .toast.success{border-color:rgba(0,200,150,.3)}
        .toast.error{border-color:rgba(255,77,109,.3)}
        .toast-icon{
          width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:14px;font-weight:700;flex-shrink:0
        }
        .toast.success .toast-icon{background:rgba(0,200,150,.15);color:var(--success)}
        .toast.error .toast-icon{background:rgba(255,77,109,.15);color:var(--danger)}
        .toast.info .toast-icon{background:rgba(79,135,255,.15);color:var(--accent)}
        .toast-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px}
        .toast-msg{font-size:12px;color:var(--text2)}
        .demo-note{
          background:rgba(240,165,0,.06);border:1px solid rgba(240,165,0,.2);
          border-radius:10px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:var(--gold)
        }
      `}</style>

      <div className="auth-layout">
        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <a className="brand" href="/">
            <div className="brand-icon">🏨</div>
            <div>
              <span className="brand-name">LuxeStay</span>
              <span className="brand-tagline">Hotel Management</span>
            </div>
          </a>
          <div className="left-hero">
            <div className="hero-eyebrow">⭐ 5-Star Portfolio</div>
            <h1 className="hero-title">
              Quản lý<br /><em>thông minh</em>,<br />vận hành hiệu quả
            </h1>
            <p className="hero-desc">
              Nền tảng quản lý khách sạn hiện đại với Dynamic Pricing Engine,
              Real-time Analytics và RBAC. Được thiết kế cho chuỗi khách sạn cao cấp.
            </p>
            <div className="stats-row">
              <div>
                <div className="stat-value">3</div>
                <div className="stat-label">Chi nhánh</div>
              </div>
              <div className="stat-divider" />
              <div>
                <div className="stat-value">365</div>
                <div className="stat-label">Phòng</div>
              </div>
              <div className="stat-divider" />
              <div>
                <div className="stat-value">72%</div>
                <div className="stat-label">Avg. Occupancy</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <div className="auth-box">
            {/* Tabs */}
            <div className="auth-tabs">
              <button
                className={`tab-btn${tab === 'login' ? ' active' : ''}`}
                onClick={() => setTab('login')}
              >🔑 Đăng nhập</button>
              <button
                className={`tab-btn${tab === 'register' ? ' active' : ''}`}
                onClick={() => setTab('register')}
              >✨ Đăng ký</button>
            </div>

            {/* Demo note */}
            {tab === 'login' && (
              <div className="demo-note">
                💡 Demo: <strong>admin@luxestay.vn</strong> / <strong>admin123</strong>
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <p className="form-title">Chào mừng trở lại</p>
                <p className="form-subtitle">Đăng nhập để quản lý hệ thống khách sạn</p>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="admin@luxestay.vn"
                    className={loginErrors.email ? 'error' : ''}
                  />
                  {loginErrors.email && <div className="field-error show">{loginErrors.email}</div>}
                </div>

                <div className="form-group">
                  <label>Mật khẩu</label>
                  <div className="input-wrap">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={loginPwd}
                      onChange={e => setLoginPwd(e.target.value)}
                      placeholder="••••••••"
                      className={loginErrors.pwd ? 'error' : ''}
                    />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                  {loginErrors.pwd && <div className="field-error show">{loginErrors.pwd}</div>}
                </div>

                <div className="remember-row">
                  <label className="check-label">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                    Ghi nhớ đăng nhập
                  </label>
                  <a href="#" className="link" onClick={(e) => { e.preventDefault(); alert('Tính năng đang phát triển'); }}>
                    Quên mật khẩu?
                  </a>
                </div>

                <button type="submit" className={`btn-primary${loading ? ' loading' : ''}`}>
                  {loading ? 'Đang đăng nhập...' : '→ Đăng nhập'}
                </button>

                <div className="divider">hoặc</div>
                <div className="social-row">
                  <button type="button" className="btn-social" onClick={() => alert('Tính năng đang phát triển')}>
                    🔵 Google
                  </button>
                  <button type="button" className="btn-social" onClick={() => alert('Tính năng đang phát triển')}>
                    🔷 Facebook
                  </button>
                </div>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {tab === 'register' && (
              <form onSubmit={handleRegister}>
                <p className="form-title">Tạo tài khoản</p>
                <p className="form-subtitle">Tham gia hệ thống quản lý LuxeStay</p>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tên</label>
                    <input type="text" value={regFirstName} onChange={e => setRegFirstName(e.target.value)}
                      placeholder="Văn A" className={regErrors.firstName ? 'error' : ''} />
                    {regErrors.firstName && <div className="field-error show">{regErrors.firstName}</div>}
                  </div>
                  <div className="form-group">
                    <label>Họ</label>
                    <input type="text" value={regLastName} onChange={e => setRegLastName(e.target.value)}
                      placeholder="Nguyễn" className={regErrors.lastName ? 'error' : ''} />
                    {regErrors.lastName && <div className="field-error show">{regErrors.lastName}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    placeholder="user@example.com" className={regErrors.email ? 'error' : ''} />
                  {regErrors.email && <div className="field-error show">{regErrors.email}</div>}
                </div>

                <div className="form-group">
                  <label>Số điện thoại (tuỳ chọn)</label>
                  <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                    placeholder="0901 234 567" className={regErrors.phone ? 'error' : ''} />
                  {regErrors.phone && <div className="field-error show">{regErrors.phone}</div>}
                </div>

                <div className="form-group">
                  <label>Mật khẩu</label>
                  <div className="input-wrap">
                    <input type={showPwd ? 'text' : 'password'} value={regPwd}
                      onChange={e => setRegPwd(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự" className={regErrors.pwd ? 'error' : ''} />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                  {regPwd && (
                    <div className={`strength-meter show`}>
                      <div className="strength-bars">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="strength-bar" style={{
                            background: i <= pwdStrength ? STRENGTH_COLORS[pwdStrength] : 'var(--border)'
                          }} />
                        ))}
                      </div>
                      <span className="strength-text" style={{ color: STRENGTH_COLORS[pwdStrength] }}>
                        {STRENGTH_LABELS[pwdStrength]}
                      </span>
                    </div>
                  )}
                  {regErrors.pwd && <div className="field-error show">{regErrors.pwd}</div>}
                </div>

                <div className="form-group">
                  <label>Xác nhận mật khẩu</label>
                  <div className="input-wrap">
                    <input type={showConfirm ? 'text' : 'password'} value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                      placeholder="Nhập lại mật khẩu" className={regErrors.confirm ? 'error' : ''} />
                    <button type="button" className="pwd-toggle" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? '🙈' : '👁'}
                    </button>
                  </div>
                  {regErrors.confirm && <div className="field-error show">{regErrors.confirm}</div>}
                </div>

                <button type="submit" className={`btn-primary${loading ? ' loading' : ''}`}>
                  {loading ? 'Đang tạo tài khoản...' : '✨ Tạo tài khoản'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toast.type}${toast.show ? ' show' : ''}`}>
        <div className="toast-icon">
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
        </div>
        <div>
          <div className="toast-title">{toast.title}</div>
          <div className="toast-msg">{toast.message}</div>
        </div>
      </div>
    </>
  );
}