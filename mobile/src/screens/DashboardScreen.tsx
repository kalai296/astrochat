import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Toast from 'react-native-toast-message';

type Astrologer = { _id: string; fullName: string; email: string };
type Session = {
  _id: string;
  type: 'chat' | 'voice' | 'video';
  status: 'pending' | 'active' | 'ended';
  createdAt: string;
  durationSecs?: number;
};

const SESSION_TYPES = [
  { type: 'chat',  label: 'Chat',  icon: 'chatbubble-outline'  },
  { type: 'voice', label: 'Voice', icon: 'call-outline'        },
  { type: 'video', label: 'Video', icon: 'videocam-outline'    },
] as const;

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [astrologer,  setAstrologer]  = useState<Astrologer | null>(null);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [requesting,  setRequesting]  = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);

  const load = async () => {
    try {
      const [a, s] = await Promise.all([
        api.get('/api/astrologer'),
        api.get('/api/sessions'),
      ]);
      setAstrologer(a.data);
      setSessions(s.data);
    } catch {}
    setLoadingInit(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const requestSession = async (type: 'chat' | 'voice' | 'video') => {
    if (!astrologer) { Toast.show({ type: 'error', text1: 'No astrologer available' }); return; }
    setRequesting(true);
    try {
      const { data } = await api.post('/api/sessions', {
        astrologerId: astrologer._id, type,
      });
      setSessions(prev => [data, ...prev]);
      Toast.show({ type: 'success', text1: 'Session requested!', text2: 'Waiting for astrologer...' });
      navigation.navigate('Chat', {
        sessionId: data._id,
        sessionType: type,
        userName: astrologer.fullName,
      });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.response?.data?.error || 'Failed to create session' });
    } finally {
      setRequesting(false);
    }
  };

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
          <Text style={s.greeting}>Hello, {user?.fullName?.split(' ')[0]} 👋</Text>
          <Text style={s.greetingSub}>What do you seek guidance on today?</Text>
        </View>
        <TouchableOpacity onPress={async () => { await logout(); }} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Birth details card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Your Birth Details</Text>
        <View style={s.detailGrid}>
          {[
            { label: 'Date', value: user?.dateOfBirth  || '—' },
            { label: 'Time', value: user?.timeOfBirth  || '—' },
            { label: 'Place',value: user?.placeOfBirth || '—' },
            { label: 'Gender',value: user?.gender      || '—' },
          ].map(r => (
            <View key={r.label} style={s.detailItem}>
              <Text style={s.detailLabel}>{r.label}</Text>
              <Text style={s.detailValue} numberOfLines={1}>{r.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Astrologer + start session */}
      {astrologer ? (
        <View style={s.card}>
          <View style={s.astroHeader}>
            <View style={s.astroAvatar}>
              <Text style={s.astroAvatarText}>{astrologer.fullName[0]}</Text>
            </View>
            <View style={s.astroInfo}>
              <Text style={s.astroName}>{astrologer.fullName}</Text>
              <View style={s.onlineRow}>
                <View style={s.onlineDot} />
                <Text style={s.onlineText}>Online now</Text>
              </View>
            </View>
          </View>

          <Text style={s.startLabel}>Start a session</Text>
          <View style={s.sessionBtns}>
            {SESSION_TYPES.map(({ type, label, icon }) => (
              <TouchableOpacity
                key={type}
                style={[s.sessionBtn, requesting && s.sessionBtnDisabled]}
                onPress={() => requestSession(type)}
                disabled={requesting}
                activeOpacity={0.75}
              >
                <Ionicons name={icon as any} size={20} color="#4F46E5" />
                <Text style={s.sessionBtnTxt}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={[s.card, s.centered]}>
          <Text style={s.emptyText}>No astrologer available yet.</Text>
        </View>
      )}

      {/* Session history */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Session History</Text>
        {sessions.length === 0 ? (
          <Text style={s.emptyText}>No sessions yet. Start your first one!</Text>
        ) : (
          sessions.map(sess => (
            <TouchableOpacity
              key={sess._id}
              style={s.sessionRow}
              onPress={() => navigation.navigate('Chat', {
                sessionId: sess._id,
                sessionType: sess.type,
                userName: astrologer?.fullName || 'Astrologer',
              })}
              activeOpacity={0.7}
            >
              <View style={s.sessionRowLeft}>
                <Ionicons
                  name={
                    sess.type === 'chat'  ? 'chatbubble-outline' :
                    sess.type === 'voice' ? 'call-outline' : 'videocam-outline'
                  }
                  size={18}
                  color="#6B7280"
                />
                <View style={s.sessionRowText}>
                  <Text style={s.sessionRowTitle} numberOfLines={1}>
                    {sess.type.charAt(0).toUpperCase() + sess.type.slice(1)} session
                  </Text>
                  <Text style={s.sessionRowDate}>
                    {new Date(sess.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
              <View style={[s.statusBadge, { backgroundColor: statusColor(sess.status) + '20' }]}>
                <Text style={[s.statusText, { color: statusColor(sess.status) }]}>
                  {sess.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F5F3FF' },
  content:            { padding: 16, paddingBottom: 32 },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:             { flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'flex-start', marginBottom: 16 },
  greeting:           { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  greetingSub:        { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logoutBtn:          { padding: 4 },
  card:               { backgroundColor: '#fff', borderRadius: 16, padding: 16,
                        borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14 },
  cardTitle:          { fontSize: 12, fontWeight: '600', color: '#9CA3AF',
                        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  detailGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem:         { width: '47%', backgroundColor: '#F9FAFB', borderRadius: 8,
                        padding: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  detailLabel:        { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  detailValue:        { fontSize: 13, fontWeight: '600', color: '#374151' },
  astroHeader:        { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  astroAvatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7',
                        alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  astroAvatarText:    { fontSize: 18, fontWeight: '700', color: '#92400E' },
  astroInfo:          { flex: 1 },
  astroName:          { fontSize: 16, fontWeight: '600', color: '#111827' },
  onlineRow:          { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  onlineText:         { fontSize: 12, color: '#16A34A' },
  startLabel:         { fontSize: 12, color: '#9CA3AF', fontWeight: '600',
                        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  sessionBtns:        { flexDirection: 'row', gap: 10 },
  sessionBtn:         { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
                        borderWidth: 1, borderColor: '#E0E7FF', backgroundColor: '#EEF2FF', gap: 4 },
  sessionBtnDisabled: { opacity: 0.5 },
  sessionBtnTxt:      { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
  sessionRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sessionRowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sessionRowText:     { flex: 1 },
  sessionRowTitle:    { fontSize: 14, fontWeight: '500', color: '#374151' },
  sessionRowDate:     { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  statusBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:         { fontSize: 11, fontWeight: '600' },
  emptyText:          { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
});
