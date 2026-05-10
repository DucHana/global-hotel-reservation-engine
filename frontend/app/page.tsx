'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { roomsApi } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState('');

  useEffect(() => {
    const loadAmenities = async () => {
      try {
        const res = await roomsApi.getAmenities();
        setAmenities(res.data || []);
      } catch {
        setAmenities([]);
      }
    };
    loadAmenities();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (city) query.set('city', city);
    if (checkIn) query.set('checkIn', checkIn);
    if (checkOut) query.set('checkOut', checkOut);
    query.set('guests', String(guests));
    if (selectedAmenity) query.set('amenities', selectedAmenity);
    router.push(`/search?${query.toString()}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0d13]">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/hero.png" 
          alt="Luxury Hotel Hero" 
          fill 
          className="object-cover opacity-80 mix-blend-screen scale-105 animate-[pulse_10s_ease-in-out_infinite_alternate]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d13]/40 via-transparent to-[#0a0d13]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#aa7c11] flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(212,175,55,0.4)]">
            L
          </div>
          <span className="text-2xl font-bold tracking-widest text-white uppercase drop-shadow-md">LuxeStay</span>
        </div>
        <div className="flex gap-8 items-center text-sm font-medium text-white/80 uppercase tracking-widest">
          <Link href="/" className="hover:text-[#d4af37] transition-colors">Điểm đến</Link>
          <Link href="/" className="hover:text-[#d4af37] transition-colors">Trải nghiệm</Link>
          {isAuthenticated ? (
            <div className="flex gap-4 items-center">
              <Link href="/profile" className="hover:text-[#d4af37] transition-colors">Hồ sơ của tôi</Link>
              <button onClick={logout} className="px-5 py-2 rounded-full border border-white/20 hover:border-[#d4af37] hover:text-[#d4af37] transition-all">
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link href="/auth" className="px-5 py-2 rounded-full border border-white/20 hover:border-[#d4af37] hover:text-[#d4af37] transition-all">
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-32 px-6">
        <div className="text-center animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-light text-white mb-6 tracking-tight leading-tight drop-shadow-2xl">
            Tái định nghĩa <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#d4af37] via-[#f9e596] to-[#aa7c11]">đẳng cấp</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-light mb-12 drop-shadow-md">
            Khám phá kỳ nghỉ đẳng cấp với trải nghiệm tinh tế và tiện nghi vượt trội cùng LuxeStay.
          </p>
        </div>

        {/* Search Widget */}
        <form onSubmit={handleSearch} className="glass-panel w-full max-w-7xl p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4 items-end animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="w-full xl:col-span-2">
            <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">Điểm đến</label>
            <input 
              type="text" 
              placeholder="Bạn muốn đi đâu?" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="w-full">
            <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">Nhận phòng</label>
            <input 
              type="date" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all [color-scheme:dark]"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </div>
          <div className="w-full">
            <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">Trả phòng</label>
            <input 
              type="date" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all [color-scheme:dark]"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </div>

          <div className="w-full">
            <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">Số khách</label>
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all appearance-none"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-[#1a1f2e]">{n} khách</option>)}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">Tiện nghi</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all appearance-none"
              value={selectedAmenity}
              onChange={(e) => setSelectedAmenity(e.target.value)}
            >
              <option value="" className="bg-[#1a1f2e]">Tất cả tiện nghi</option>
              {amenities.length === 0 && (
                <option value="" disabled className="bg-[#1a1f2e]">Chưa có dữ liệu tiện nghi (cần chạy seed)</option>
              )}
              {amenities.map((a) => (
                <option key={a} value={a} className="bg-[#1a1f2e]">{a}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-luxury w-full px-4 py-3 rounded-xl text-sm font-semibold h-[50px] xl:mt-[26px] whitespace-nowrap">
            Tìm phòng
          </button>
        </form>
      </main>
    </div>
  );
}