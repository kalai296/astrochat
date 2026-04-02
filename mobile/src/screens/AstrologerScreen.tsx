import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import api from '../lib/api';
import Toast from 'react-native-toast-message';

type Session = {
  _id: string;
  type: 'chat' | 'voice' | 'video';
  status: 'pending' | 'active' | 'ended';
  createdAt: string;
  userId?: {
    _id: string; fullName: string; email: string;
    dateOfBirth?: string; timeOfBirth?: string;
    placeOfBirth?: string; gender?: string;
  };
};

export default function AstrologerScreen({ navigation }: any) {
  const { user, token, logout } = useAuth();
  const [sessions,         setSessions]         = useState<Session[]>([]);
  const [incomingRequest,  setIncomingRequest]  = useState<any>(null);
  const [refreshing,       setRefreshing]       = useState(false);
  const [loadingInit,      setLoadingInit]      = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/api/sessions');
      setSessions(data);
    } catch {}
    setLoadingInit(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    const socket = getSocket(token!);

    socket.on('new_session_request', (data: any) => {
      setIncomingRequest(data);
      Toast.show({ type: 'info', text1: '🔔 New session request!',
                   text2: `Type: ${data.type}`, visibilityTime: 8000 });
    });

    socket.on('session_status', ({ status }: { status: string }) => {
      setSessions(prev =>
        prev.map(s => s._id === incomingRequest?.sessionId
          ? { ...s, status: status as any } : s)
      );
    });

    return () => {
      socket.off('new_session_request');
      socket.off('session_status');
    };
  }, [token]);

  const acceptRequest = async () => {
    if (!incomingRequest) return;
    try {
      const { data } = await api.patch(`/api/sessions/${incomingRequest.sessionId}`, {
        status: 'active',
      });
      setSessions(prev => [data, ...prev.filter(s => s._id !== data._id)]);
      setIncomingRequest(null);
      Toast.show({ type: 'success', text1: 'Session accepted! You are live.' });
      navigation.navigate('Chat', {
        sessionId: data._id,
        sessionType: data.type,
        userName: data.userId?.fullName || 'User',
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to accept session' });
    }
  };

  const declineRequest = () => {
    setIncomingRequest(null);
    Toast.show({ type: 'info', text1: 'Request declined' });
  };

  const endSession = async (sessionId: string) => {
    try {
      const { data } = await api.patch(`/api/sessions/${sessionId}`, { status: 'ended' });
      setSessions(prev => prev.map(s => s._id === data._id ? data : s));
      Toast.show({ type: 'success', text1: 'Session ended' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to end session' });
    }
  };

  const todayCount  = sessions.filter(s =>
    new Date(s.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const activeCount = sessions.filter(s => s.status === 'active').length;

  const statusColor = (status: string) => {
    if (status === 'active') return '#16A34A';
    if (status === 'ended')  return '#9CA3AF';
    return '#D97706';
  };

  if (loadingInit) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{user?.fullName}</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>Live as Astrologer</Text>
          </View>
        </View>
        <TouchableOpacity onPress={async () => { await logout(); }} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: "Today",  value: todayCount         },
          { label: "Total",  value: sessions.length    },
          { label: "Active", value: activeCount        },
        ].map(stat => (
          <View key={stat.label} style={s.statCard}>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Incoming request */}
      {incomingRequest && (
        <View style={s.incomingCard}>
          <View style={s.incomingIconWrap}>
            <Text style={s.incomingIcon}>🔔</Text>
          </View>
          <View style={s.incomingInfo}>
            <Text style={s.incomingTitle}>
              New {incomingRequest.type} request
            </Text>
            <Text style={s.incomingSub}>A user is waiting for you</Text>
          </View>
          <View style={s.incomingBtns}>
            <TouchableOpacity style={s.acceptBtn} onPress={acceptRequest} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.declineBtn} onPress={declineRequest} activeOpacity={0.8}>
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sessions */}
      <View style={s.card}>
        <Text style={s.cardTitle}>All Sessions</Text>
        {sessions.length === 0 ? (
          <Text style={s.emptyText}>No sessions yet. Waiting for users...</Text>
        ) : (
          sessions.map(sess => (
            <View key={sess._id} style={s.sessionItem}>
              <TouchableOpacity
                style={s.sessionItemLeft}
                onPress={() => navigation.navigate('Chat', {
                  sessionId: sess._id,
                  sessionType: sess.type,
                  userName: sess.userId?.fullName || 'User',
                })}
                activeOpacity={0.7}
              >
                <View style={s.sessionAvatar}>
                  <Text style={s.sessionAvatarText}>
                    {(sess.userId?.fullName || 'U')[0]}
                  </Text>
                </View>
                <View style={s.sessionInfo}>
                  <Text style={s.sessionName} numberOfLines={1}>
                    {sess.userId?.fullName || 'User'}
                  </Text>
                  <Text style={s.sessionMeta}>
                    {sess.type} · {new Date(sess.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short',
                    })}
                  </Text>
                  {sess.userId?.placeOfBirth && (
                    <Text style={s.sessionBirth} numberOfLines={1}>
                      📍 {sess.userId.placeOfBirth}
                      {sess.userId.dateOfBirth ? ` · ${sess.userId.dateOfBirth}` : ''}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              <View style={s.sessionRight}>
                <View style={[s.statusBadge, { backgroundColor: statusColor(sess.status) + '20' }]}>
                  <Text style={[s.statusText, { color: statusColor(sess.status) }]}>
                    {sess.status}
                  </Text>
                </View>
                {sess.status === 'active' && (
                  <TouchableOpacity
                    style={s.endBtn}
                    onPress={() => endSession(sess._id)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.endBtnTxt}>End</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFFBEB' },
  content:         { padding: 16, paddingBottom: 32 },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:          { flexDirection: 'row', justifyContent: 'space-between',
                     alignItems: 'flex-start', marginBottom: 16 },
  greeting:        { fontSize: 20, fontWeight: '700', color: '#111827' },
  onlineRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  onlineDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  onlineText:      { fontSize: 12, color: '#16A34A', fontWeight: '500' },
  logoutBtn:       { padding: 4 },
  statsRow:        { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard:        { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
                     alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statValue:       { fontSize: 24, fontWeight: '700', color: '#111827' },
  statLabel:       { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  incomingCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB',
                     borderWidth: 1.5, borderColor: '#FCD34D', borderRadius: 14,
                     padding: 14, marginBottom: 14, gap: 10 },
  incomingIconWrap:{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7',
                     alignItems: 'center', justifyContent: 'center' },
  incomingIcon:    { fontSize: 20 },
  incomingInfo:    { flex: 1 },
  incomingTitle:   { fontSize: 14, fontWeight: '600', color: '#92400E', textTransform: 'capitalize' },
  incomingSub:     { fontSize: 12, color: '#B45309', marginTop: 1 },
  incomingBtns:    { flexDirection: 'row', gap: 8 },
  acceptBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16A34A',
                     alignItems: 'center', justifyContent: 'center' },
  declineBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
                     alignItems: 'center', justifyContent: 'center' },
  card:            { backgroundColor: '#fff', borderRadius: 16, padding: 16,
                     borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14 },
  cardTitle:       { fontSize: 12, fontWeight: '600', color: '#9CA3AF',
                     textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  emptyText:       { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
  sessionItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                     borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sessionItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionAvatar:   { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF',
                     alignItems: 'center', justifyContent: 'center' },
  sessionAvatarText:{ fontSize: 16, fontWeight: '700', color: '#4F46E5' },
  sessionInfo:     { flex: 1 },
  sessionName:     { fontSize: 14, fontWeight: '600', color: '#111827' },
  sessionMeta:     { fontSize: 12, color: '#9CA3AF', marginTop: 1, textTransform: 'capitalize' },
  sessionBirth:    { fontSize: 11, color: '#6B7280', marginTop: 2 },
  sessionRight:    { alignItems: 'flex-end', gap: 6 },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:      { fontSize: 11, fontWeight: '600' },
  endBtn:          { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4,
                     borderRadius: 8 },
  endBtnTxt:       { fontSize: 11, fontWeight: '600', color: '#DC2626' },
});
