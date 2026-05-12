'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const amenitiesRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!amenitiesRef.current) return;
      if (!amenitiesRef.current.contains(event.target as Node)) {
        setAmenitiesOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (city) query.set('city', city);
    if (checkIn) query.set('checkIn', checkIn);
    if (checkOut) query.set('checkOut', checkOut);
    query.set('guests', String(guests));
    if (selectedAmenities.length > 0) query.set('amenities', selectedAmenities.join(','));
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
        <form onSubmit={handleSearch} className="glass-panel w-full max-w-7xl p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-end animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="xl:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1 font-semibold">Điểm đến</label>
            <input 
              type="text" 
              placeholder="Bạn muốn đi đâu?" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#d4af37] transition-all"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="xl:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1 font-semibold">Nhận phòng</label>
            <input 
              type="date" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] transition-all [color-scheme:dark]"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </div>
          <div className="xl:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1 font-semibold">Trả phòng</label>
            <input 
              type="date" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] transition-all [color-scheme:dark]"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </div>

          <div className="xl:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1 font-semibold">Số khách</label>
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] transition-all appearance-none"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-[#1a1f2e]">{n} khách</option>)}
            </select>
          </div>

          <div className="xl:col-span-4">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1 font-semibold">Tiện nghi</label>
            <div className="flex gap-2" ref={amenitiesRef}>
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setAmenitiesOpen((prev) => !prev)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-left text-white/90 focus:outline-none focus:border-[#d4af37] transition-all flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedAmenities.length > 0 ? `${selectedAmenities.length} tiện nghi đã chọn` : 'Chọn tiện nghi'}
                  </span>
                  <span className="text-white/50 text-[10px]">▼</span>
                </button>
                {amenitiesOpen && (
                  <div className="absolute z-30 mt-2 w-full max-h-56 overflow-y-auto rounded-xl border border-white/15 bg-[#111827]/95 backdrop-blur-md shadow-2xl p-2">
                    {amenities.length === 0 ? (
                      <div className="text-xs text-white/50 px-2 py-2">Chưa có dữ liệu tiện nghi</div>
                    ) : (
                      <>
                        <div className="flex justify-end px-2 py-1">
                          <button
                            type="button"
                            onClick={() => setSelectedAmenities([])}
                            className="text-[11px] text-[#d4af37] hover:text-[#f5d77f] transition-colors"
                          >
                            Xóa chọn
                          </button>
                        </div>
                        {amenities.map((a) => {
                          const checked = selectedAmenities.includes(a);
                          return (
                            <label
                              key={a}
                              className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                checked ? 'bg-[#d4af37]/15 text-[#f5d77f]' : 'text-white/85 hover:bg-white/10'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedAmenities((prev) =>
                                    prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
                                  )
                                }
                                className="accent-[#d4af37]"
                              />
                              <span>{a}</span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
              <button type="submit" className="btn-luxury px-6 rounded-xl text-sm font-semibold whitespace-nowrap min-w-[120px]">
                Tìm phòng
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}