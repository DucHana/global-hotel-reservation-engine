'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { bookingsApi, supportApi } from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'bookings' | 'support'>('bookings');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  
  // Support form state
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user && activeTab === 'bookings') {
      fetchBookings();
    } else if (user && activeTab === 'support') {
      fetchTickets();
    }
  }, [user, activeTab]);

  const fetchBookings = async () => {
    if (!user) return;
    setLoadingBookings(true);
    try {
      const res: any = await bookingsApi.getMyBookings(String(user.user_id));
      setBookings(res.data || []);
    } catch (err) {
      console.error('Error fetching bookings', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const res: any = await supportApi.getMyTickets(String(user.user_id));
      setTickets(res.data || []);
    } catch (err) {
      console.error('Error fetching tickets', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đặt phòng này?')) return;
    try {
      await bookingsApi.cancel(bookingId, String(user?.user_id));
      alert('Hủy phòng thành công');
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi hủy phòng');
    }
  };

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMessage) {
      alert('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    setIsSubmittingSupport(true);
    try {
      await supportApi.createTicket({
        user_id: String(user?.user_id),
        user_name: user?.full_name || '',
        user_email: user?.email || '',
        subject: supportSubject,
        message: supportMessage,
      });
      alert('Gửi yêu cầu hỗ trợ thành công. Chúng tôi sẽ liên hệ lại sớm.');
      setSupportSubject('');
      setSupportMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi yêu cầu hỗ trợ');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0d13] flex items-center justify-center text-[#d4af37]">
        Loading...
      </div>
    );
  }

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
          <Link href="/" className="hover:text-[#d4af37] transition-colors ml-4">Home</Link>
          <Link href="/search" className="hover:text-[#d4af37] transition-colors ml-4">Search Rooms</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Profile */}
          <div className="w-full md:w-1/3">
            <div className="glass-panel p-8 rounded-2xl sticky top-24">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#d4af37] to-[#aa7c11] flex items-center justify-center text-3xl font-bold mb-4">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <h2 className="text-2xl font-bold mb-1">{user?.full_name}</h2>
              <p className="text-sm text-white/50 mb-6">{user?.email}</p>
              
              <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('bookings')}
                  className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'bookings' ? 'bg-[#d4af37]/20 text-[#d4af37] font-semibold border border-[#d4af37]/30' : 'hover:bg-white/5 text-white/70'}`}
                >
                  My Bookings
                </button>
                <button 
                  onClick={() => setActiveTab('support')}
                  className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'support' ? 'bg-[#d4af37]/20 text-[#d4af37] font-semibold border border-[#d4af37]/30' : 'hover:bg-white/5 text-white/70'}`}
                >
                  Support
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full md:w-2/3">
            {activeTab === 'bookings' && (
              <div className="animate-fade-in-up">
                <h3 className="text-2xl font-light mb-6 border-b border-white/10 pb-4">Booking History</h3>
                {loadingBookings ? (
                  <p className="text-white/50">Loading your reservations...</p>
                ) : bookings.length === 0 ? (
                  <div className="glass-panel p-12 text-center rounded-2xl border border-white/5">
                    <p className="text-white/50 mb-4">You have no bookings yet.</p>
                    <Link href="/search" className="btn-luxury px-6 py-2 rounded-xl inline-block">Explore Rooms</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div key={booking.booking_id} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold">Booking #{booking.booking_id.substring(0,8)}</h4>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
                              booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <div className="text-sm text-white/70 space-y-1">
                            <p>Check-in: <span className="text-white">{new Date(booking.check_in || booking.check_in_date).toLocaleDateString()}</span></p>
                            <p>Check-out: <span className="text-white">{new Date(booking.check_out || booking.check_out_date).toLocaleDateString()}</span></p>
                            <p>Total Price: <span className="text-[#d4af37] font-semibold">₫{booking.total_price?.toLocaleString() || 'N/A'}</span></p>
                          </div>
                        </div>
                        {booking.status === 'pending' && (
                          <div className="w-full md:w-auto">
                            <button 
                              onClick={() => handleCancelBooking(booking.booking_id)}
                              className="w-full md:w-auto px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl transition text-sm font-semibold"
                            >
                              Cancel Booking
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'support' && (
              <div className="animate-fade-in-up">
                <h3 className="text-2xl font-light mb-6 border-b border-white/10 pb-4">Contact Support</h3>
                <div className="glass-panel p-8 rounded-2xl border border-white/5">
                  <p className="text-white/70 text-sm mb-6">Need help with your reservation or have a question? Send us a message and our support team will get back to you shortly.</p>
                  
                  <form onSubmit={handleSubmitSupport} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">Subject</label>
                      <input 
                        type="text" 
                        value={supportSubject}
                        onChange={(e) => setSupportSubject(e.target.value)}
                        placeholder="E.g., Issue with booking #123" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-semibold">Message</label>
                      <textarea 
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        placeholder="How can we help you today?" 
                        rows={5}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all resize-none"
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmittingSupport}
                      className="btn-luxury px-8 py-3 rounded-xl font-semibold uppercase tracking-widest w-full mt-4"
                    >
                      {isSubmittingSupport ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </div>

                <div className="mt-12">
                  <h4 className="text-xl font-light mb-4 border-b border-white/10 pb-2">My Tickets</h4>
                  {loadingTickets ? (
                    <p className="text-white/50">Loading tickets...</p>
                  ) : tickets.length === 0 ? (
                    <p className="text-white/50">You have no support tickets.</p>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map(ticket => (
                        <div key={ticket._id} className="glass-panel p-6 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-bold text-lg">{ticket.subject}</h5>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
                              ticket.status === 'resolved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              ticket.status === 'open' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 mb-4">{ticket.message}</p>
                          {ticket.admin_reply && (
                            <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 p-4 rounded-xl mt-4">
                              <p className="text-xs text-[#d4af37] font-bold mb-1">Reply from {ticket.admin_name || 'Admin'}:</p>
                              <p className="text-sm text-white/90">{ticket.admin_reply}</p>
                            </div>
                          )}
                          <p className="text-xs text-white/40 mt-4">{new Date(ticket.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
