'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import ChatWindow from '@/components/ChatWindow';
import toast from 'react-hot-toast';
import { LogOut, CheckCircle, XCircle, Clock, Users, Activity } from 'lucide-react';

type Session = {
  _id: string;
  type: 'chat' | 'voice' | 'video';
  status: 'pending' | 'active' | 'ended';
  userId?: { _id: string; fullName: string; email: string; dateOfBirth?: string; timeOfBirth?: string; placeOfBirth?: string; gender?: string };
  createdAt: string;
  startedAt?: string;
  durationSecs?: number;
};

export default function AstrologerPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [sessions,        setSessions]        = useState<Session[]>([]);
  const [activeSession,   setActiveSession]   = useState<Session | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role !== 'astrologer') { router.push('/dashboard'); return; }

    api.get('/api/sessions').then(r => setSessions(r.data)).catch(() => {});

    const socket = getSocket(token!);

    socket.on('new_session_request', (data: any) => {
      setIncomingRequest(data);
      toast('New session request!', { icon: '🔔', duration: 8000 });
    });

    socket.on('session_status', ({ status }: { status: string }) => {
      setSessions(prev =>
        prev.map(s => (s._id === activeSession?._id ? { ...s, status: status as any } : s))
      );
      if (activeSession) setActiveSession(prev => prev ? { ...prev, status: status as any } : prev);
    });

    return () => {
      socket.off('new_session_request');
      socket.off('session_status');
    };
  }, [user, router, token]);

  const acceptRequest = async () => {
    if (!incomingRequest) return;
    try {
      const { data } = await api.patch(`/api/sessions/${incomingRequest.sessionId}`, {
        status: 'active',
      });
      setSessions(prev => [data, ...prev.filter(s => s._id !== data._id)]);
      setActiveSession(data);
      setIncomingRequest(null);
      toast.success('Session accepted! You are now live.');
    } catch {
      toast.error('Failed to accept session');
    }
  };

  const declineRequest = () => {
    setIncomingRequest(null);
    toast('Request declined', { icon: '❌' });
  };

  const endSession = async () => {
    if (!activeSession) return;
    try {
      const { data } = await api.patch(`/api/sessions/${activeSession._id}`, { status: 'ended' });
      setSessions(prev => prev.map(s => s._id === data._id ? data : s));
      setActiveSession(data);
      toast.success('Session ended');
    } catch {
      toast.error('Failed to end session');
    }
  };

  const todayCount  = sessions.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length;
  const activeCount = sessions.filter(s => s.status === 'active').length;
  const pendingCount= sessions.filter(s => s.status === 'pending').length;

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
            <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-lg">✦</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{user.fullName}</p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Live as Astrologer
              </p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Today's sessions", value: todayCount,   icon: <Clock size={18} />    },
            { label: 'Total sessions',   value: sessions.length, icon: <Users size={18} /> },
            { label: 'Active now',       value: activeCount,  icon: <Activity size={18} /> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Incoming request banner */}
        {incomingRequest && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 font-bold animate-pulse">
                !
              </div>
              <div>
                <p className="font-semibold text-amber-800 text-sm">
                  New {incomingRequest.type} session request
                </p>
                <p className="text-xs text-amber-600">A user is waiting for you to accept</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={acceptRequest}
                className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <CheckCircle size={15} /> Accept
              </button>
              <button
                onClick={declineRequest}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                <XCircle size={15} /> Decline
              </button>
            </div>
          </div>
        )}

        {pendingCount > 0 && !incomingRequest && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-sm text-blue-700">
            {pendingCount} session(s) pending — refresh to see new requests.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session list */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">All Sessions</p>
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-400">No sessions yet. Waiting for users...</p>
              ) : (
                <div className="space-y-1.5">
                  {sessions.map(s => (
                    <button
                      key={s._id}
                      onClick={() => setActiveSession(s)}
                      className={`w-full text-left py-3 px-3 rounded-lg border transition ${
                        activeSession?._id === s._id
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {s.userId?.fullName || 'User'}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-1 ${statusColor(s.status)}`}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 capitalize">{s.type} · {new Date(s.createdAt).toLocaleDateString('en-IN')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected user birth details */}
            {activeSession?.userId && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">User Birth Details</p>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Name',          value: activeSession.userId.fullName },
                    { label: 'Date of birth', value: activeSession.userId.dateOfBirth  || '—' },
                    { label: 'Time of birth', value: activeSession.userId.timeOfBirth  || '—' },
                    { label: 'Place',         value: activeSession.userId.placeOfBirth || '—' },
                    { label: 'Gender',        value: activeSession.userId.gender       || '—' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between gap-2">
                      <span className="text-gray-400 shrink-0">{r.label}</span>
                      <span className="text-gray-800 font-medium text-right">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat window */}
          <div className="lg:col-span-2">
            {activeSession ? (
              <div className="flex flex-col gap-3 h-[560px]">
                {activeSession.status === 'active' && (
                  <button
                    onClick={endSession}
                    className="flex items-center justify-center gap-2 text-sm text-red-600 border border-red-200 rounded-lg py-2 hover:bg-red-50 transition"
                  >
                    <XCircle size={15} /> End session
                  </button>
                )}
                <div className="flex-1 min-h-0">
                  <ChatWindow
                    sessionId={activeSession._id}
                    currentUserId={user._id}
                    token={token!}
                    sessionStatus={activeSession.status}
                  />
                </div>
              </div>
            ) : (
              <div className="h-[560px] flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 text-center px-8">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-3xl mb-4">✦</div>
                <p className="font-medium text-gray-700 mb-1">No session selected</p>
                <p className="text-sm text-gray-400">
                  Accept an incoming request or click a session from the list to open the chat.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
