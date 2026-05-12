'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchApi, bookingsApi, roomsApi } from '@/lib/api';
import Link from 'next/link';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const city = searchParams.get('city') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = parseInt(searchParams.get('guests') || '1');
  const amenitiesParam = searchParams.get('amenities') || '';
  const amenities = amenitiesParam
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [searchCity, setSearchCity] = useState(city);
  const [searchCheckIn, setSearchCheckIn] = useState(checkIn);
  const [searchCheckOut, setSearchCheckOut] = useState(checkOut);
  const [searchGuests, setSearchGuests] = useState(guests);
  const [amenitiesList, setAmenitiesList] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(amenities);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const amenitiesRef = useRef<HTMLDivElement | null>(null);

  const handleRefineSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchCity) query.set('city', searchCity.trim());
    if (searchCheckIn) query.set('checkIn', searchCheckIn);
    if (searchCheckOut) query.set('checkOut', searchCheckOut);
    query.set('guests', String(searchGuests || 1));
    if (selectedAmenities.length > 0) query.set('amenities', selectedAmenities.join(','));

    router.push(`/search?${query.toString()}`);
  };

  useEffect(() => {
    setSearchCity(city);
    setSearchCheckIn(checkIn);
    setSearchCheckOut(checkOut);
    setSearchGuests(guests);
    setSelectedAmenities(amenities);
  }, [city, checkIn, checkOut, guests, amenitiesParam]);

  useEffect(() => {
    const loadAmenities = async () => {
      try {
        const res = await roomsApi.getAmenities();
        setAmenitiesList(res.data || []);
      } catch {
        setAmenitiesList([]);
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

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      const start = Date.now();
      try {
        const res: any = await searchApi.searchRooms({
          city,
          checkIn,
          checkOut,
          guests,
          amenities: amenities.length > 0 ? amenities : undefined,
        });
        setRooms(res.data);
        
        // Log the search (Thành viên 2)
        const sid = 'guest_session_' + Math.random().toString(36).substring(7);
        setSessionId(sid);
        searchApi.logSearch({
          city: city || 'Unknown',
          check_in: checkIn || new Date().toISOString(),
          check_out: checkOut || new Date(Date.now() + 86400000).toISOString(),
          guests,
          filters: amenities.length > 0 ? { amenities } : {},
          results_count: res.data.length,
          session_id: sid,
          response_time_ms: Date.now() - start
        });

      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [city, checkIn, checkOut, guests, amenitiesParam]);

  const handleBook = async () => {
    if (!bookingModal) return;
    if (!isAuthenticated || !user) {
      alert('Vui lòng đăng nhập để tiếp tục.');
      router.push('/auth');
      return;
    }
    setBookingLoading(true);
    try {
      const availRes = await bookingsApi.checkAvailability(bookingModal.room_type_id, checkIn, checkOut);
      if (!(availRes as any).is_available) {
        alert('Phòng đã hết chỗ trong khoảng thời gian này.');
        return;
      }

      await bookingsApi.create({
        room_type_id: bookingModal.room_type_id,
        check_in_date: checkIn,
        check_out_date: checkOut,
      });
      alert('Đặt phòng thành công! Giao dịch đã được xác nhận.');
      
      // Mark as converted
      if (sessionId) {
        await searchApi.markConverted(sessionId, String(bookingModal.room_type_id));
      }

      setBookingModal(null);
    } catch (err: any) {
      alert(err.message || 'Phát hiện trùng đặt phòng, giao dịch đã hoàn tác.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d13] text-white">
      {/* Mini Nav */}
      <nav className="flex items-center justify-between px-10 py-6 border-b border-white/10 bg-[#0a0d13]/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#aa7c11] flex items-center justify-center font-bold text-sm text-white">
            L
          </div>
          <span className="text-xl font-bold tracking-widest uppercase">LuxeStay</span>
        </Link>
        <div className="flex gap-4 text-sm font-medium items-center">
          <div className="glass px-4 py-2 rounded-full text-white/80">
            {city || 'Tất cả điểm đến'} • {checkIn} đến {checkOut} • {guests} khách{amenities.length > 0 ? ` • ${amenities.join(', ')}` : ''}
          </div>
          {isAuthenticated ? (
            <Link href="/profile" className="hover:text-[#d4af37] transition-colors ml-4">Hồ sơ của tôi</Link>
          ) : (
            <Link href="/auth" className="hover:text-[#d4af37] transition-colors ml-4">Đăng nhập</Link>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <form onSubmit={handleRefineSearch} className="glass-panel mb-8 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-end">
          <div className="xl:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1">Điểm đến</label>
            <input
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Bạn muốn đi đâu?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#d4af37]"
            />
          </div>
          <div className="xl:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1">Nhận phòng</label>
            <input
              type="date"
              value={searchCheckIn}
              onChange={(e) => setSearchCheckIn(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] [color-scheme:dark]"
            />
          </div>
          <div className="xl:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1">Trả phòng</label>
            <input
              type="date"
              value={searchCheckOut}
              onChange={(e) => setSearchCheckOut(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37] [color-scheme:dark]"
            />
          </div>
          <div className="xl:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1">Số khách</label>
            <select
              value={String(searchGuests)}
              onChange={(e) => setSearchGuests(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37]"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n} className="bg-[#1a1f2e]">
                  {n} khách
                </option>
              ))}
            </select>
          </div>
          <div className="xl:col-span-4">
            <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1">Tiện nghi</label>
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
                    {amenitiesList.length === 0 ? (
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
                        {amenitiesList.map((a) => {
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
                Tìm lại
              </button>
            </div>
          </div>
        </form>

        <h1 className="text-3xl font-light mb-8">
          Tìm thấy <span className="font-bold text-[#d4af37]">{rooms.length}</span> lựa chọn lưu trú
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="glass-panel h-80 rounded-2xl animate-pulse bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room, i) => (
              <div key={room.room_type_id} className="glass-panel rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="h-48 bg-gray-800 relative">
                  {/* We simulate an image since MongoDB stores image arrays */}
                  <img
                    src={room.images?.[0]?.url || room.images?.[0] || `https://placehold.co/1200x800/png?text=Room+${room.room_type_id}`}
                    className="w-full h-full object-cover opacity-80"
                    alt={room.name}
                  />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#d4af37]">
                    ₫{room.base_price?.toLocaleString()} / night
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold mb-1">{room.name}</h3>
                  <p className="text-xs text-white/50 mb-4">{room.hotel_name || 'LuxeStay Central'}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {room.amenities?.slice(0, 3).map((a: string) => (
                      <span key={a} className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-1 rounded border border-white/10">
                        {a}
                      </span>
                    ))}
                    {room.amenities?.length > 3 && <span className="text-[10px] text-white/50 py-1">+{room.amenities.length - 3} tiện nghi</span>}
                  </div>

                  <div className="mt-auto">
                    <button 
                      onClick={() => setBookingModal(room)}
                      className="w-full btn-luxury py-3 rounded-xl text-sm font-semibold tracking-wider uppercase"
                    >
                      Đặt ngay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel p-8 rounded-2xl w-full max-w-md animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-2 text-[#d4af37]">Xác nhận đặt phòng</h2>
            <p className="text-sm text-white/70 mb-6">Bạn sắp đặt {bookingModal.name} tại {bookingModal.hotel_name || 'LuxeStay'}.</p>
            
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-white/50">Nhận phòng</span>
                <span>{checkIn}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-white/50">Trả phòng</span>
                <span>{checkOut}</span>
              </div>
              <div className="flex justify-between font-bold text-[#d4af37] pt-2 border-t border-white/10">
                <span>Giá mỗi đêm</span>
                <span>₫{bookingModal.base_price?.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setBookingModal(null)} className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/10 transition">
                Hủy
              </button>
              <button onClick={handleBook} disabled={bookingLoading} className="flex-1 btn-luxury py-3 rounded-xl font-semibold">
                {bookingLoading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0d13] flex items-center justify-center text-[#d4af37]">Loading...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
