'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ChatWindow from '@/components/ChatWindow';
import toast from 'react-hot-toast';
import { LogOut, MessageCircle, Phone, Video, Clock, Star } from 'lucide-react';

type Session = {
  _id: string;
  type: 'chat' | 'voice' | 'video';
  status: 'pending' | 'active' | 'ended';
  createdAt: string;
  durationSecs?: number;
};

type Astrologer = {
  _id: string;
  fullName: string;
  email: string;
};

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [astrologer,     setAstrologer]     = useState<Astrologer | null>(null);
  const [sessions,       setSessions]       = useState<Session[]>([]);
  const [activeSession,  setActiveSession]  = useState<Session | null>(null);
  const [requesting,     setRequesting]     = useState(false);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role === 'astrologer') { router.push('/astrologer'); return; }

    api.get('/api/astrologer').then(r => setAstrologer(r.data)).catch(() => {});
    api.get('/api/sessions').then(r => setSessions(r.data)).catch(() => {});
  }, [user, router]);

  const requestSession = async (type: 'chat' | 'voice' | 'video') => {
    if (!astrologer) { toast.error('No astrologer available'); return; }
    setRequesting(true);
    try {
      const { data } = await api.post('/api/sessions', {
        astrologerId: astrologer._id,
        type,
      });
      setSessions(prev => [data, ...prev]);
      setActiveSession(data);
      toast.success('Session requested! Waiting for astrologer to accept...');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create session');
    } finally {
      setRequesting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return '--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const statusColor = (status: string) => {
    if (status === 'active')  return 'text-green-600 bg-green-50';
    if (status === 'ended')   return 'text-gray-500 bg-gray-100';
    return 'text-amber-600 bg-amber-50';
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-lg">✦</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">AstroChat</p>
              <p className="text-xs text-gray-500">Welcome, {user.fullName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-5">

          {/* Astrologer card */}
          {astrologer ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Your Astrologer</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold text-lg">
                  {astrologer.fullName[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{astrologer.fullName}</p>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3">Start a new session:</p>
              <div className="space-y-2">
                <button
                  disabled={requesting}
                  onClick={() => requestSession('chat')}
                  className="w-full flex items-center gap-2 text-sm py-2.5 px-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition disabled:opacity-50"
                >
                  <MessageCircle size={15} /> Chat session
                </button>
                <button
                  disabled={requesting}
                  onClick={() => requestSession('voice')}
                  className="w-full flex items-center gap-2 text-sm py-2.5 px-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition disabled:opacity-50"
                >
                  <Phone size={15} /> Voice session
                </button>
                <button
                  disabled={requesting}
                  onClick={() => requestSession('video')}
                  className="w-full flex items-center gap-2 text-sm py-2.5 px-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition disabled:opacity-50"
                >
                  <Video size={15} /> Video session
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
              <p className="text-sm text-gray-400">No astrologer registered yet.</p>
            </div>
          )}

          {/* Profile summary */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Your Birth Details</p>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Date of birth',  value: user.dateOfBirth  || '—' },
                { label: 'Time of birth',  value: user.timeOfBirth  || '—' },
                { label: 'Place of birth', value: user.placeOfBirth || '—' },
                { label: 'Gender',         value: user.gender       || '—' },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="text-gray-800 font-medium text-right max-w-[60%] truncate">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Session history */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Session History</p>
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-400">No sessions yet</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.map(s => (
                  <button
                    key={s._id}
                    onClick={() => setActiveSession(s)}
                    className={`w-full text-left py-2.5 px-3 rounded-lg transition ${
                      activeSession?._id === s._id
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium capitalize text-gray-700">{s.type} session</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      {s.durationSecs ? ` · ${formatDuration(s.durationSecs)}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: chat */}
        <div className="lg:col-span-2 h-[600px]">
          {activeSession ? (
            <ChatWindow
              sessionId={activeSession._id}
              currentUserId={user._id}
              token={token!}
              sessionStatus={activeSession.status}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 text-center px-8">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-3xl mb-4">✦</div>
              <p className="font-medium text-gray-700 mb-1">No active session</p>
              <p className="text-sm text-gray-400">
                Select a past session from the left panel, or start a new chat, voice, or video session with your astrologer.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
