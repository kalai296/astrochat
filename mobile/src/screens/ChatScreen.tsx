import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { getSocket } from '../lib/socket';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

type Message = {
  _id: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
};

export default function ChatScreen({ route, navigation }: any) {
  const { sessionId, sessionType, userName } = route.params;
  const { user, token } = useAuth();
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [text,        setText]        = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const listRef = useRef<FlatList>(null);
  const socket  = getSocket(token!);

  useEffect(() => {
    navigation.setOptions({ title: userName || `Session #${sessionId.slice(-6).toUpperCase()}` });

    api.get(`/api/sessions/${sessionId}/messages`)
      .then(r => setMessages(r.data))
      .catch(() => {});

    socket.emit('join_session', { sessionId });

    socket.on('new_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('typing', ({ isTyping }: { isTyping: boolean }) => {
      setOtherTyping(isTyping);
    });

    return () => {
      socket.off('new_message');
      socket.off('typing');
    };
  }, [sessionId]);

  const sendText = () => {
    if (!text.trim()) return;
    socket.emit('send_message', { sessionId, content: text, type: 'text' });
    socket.emit('typing', { sessionId, isTyping: false });
    setText('');
  };

  const handleTyping = (v: string) => {
    setText(v);
    socket.emit('typing', { sessionId, isTyping: v.length > 0 });
  };

  const pickAndUpload = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Permission required to pick images' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    const asset = result.assets[0];
    const fd    = new FormData();
    fd.append('file', {
      uri:  asset.uri,
      name: 'upload.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const { data } = await api.post('/api/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      socket.emit('send_message', {
        sessionId,
        type: 'image',
        fileUrl: data.url,
        fileName: 'image',
        content: 'Image',
      });
      Toast.show({ type: 'success', text1: 'Image sent!' });
    } catch {
      Toast.show({ type: 'error', text1: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item: m }: { item: Message }) => {
    const isOwn = m.senderId === user?._id;
    return (
      <View style={[ms.row, isOwn ? ms.ownRow : ms.otherRow]}>
        <View style={[ms.bubble, isOwn ? ms.ownBubble : ms.otherBubble]}>
          {!isOwn && <Text style={ms.senderName}>{m.senderName}</Text>}
          {m.type === 'text' && (
            <Text style={[ms.msgText, isOwn && ms.ownText]}>{m.content}</Text>
          )}
          {(m.type === 'image' || m.type === 'file') && (
            <Text style={[ms.msgText, isOwn && ms.ownText]}>
              📎 {m.fileName || 'Attachment'}
            </Text>
          )}
          <Text style={[ms.time, isOwn && ms.ownTime]}>
            {format(new Date(m.createdAt), 'HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={cs.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={i => i._id}
        renderItem={renderMessage}
        contentContainerStyle={cs.msgList}
        onContentSizeChange={() =>
          messages.length > 0 && listRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={cs.emptyWrap}>
            <Text style={cs.emptyText}>No messages yet. Say hello! 👋</Text>
          </View>
        }
      />

      {otherTyping && (
        <View style={cs.typingBar}>
          <Text style={cs.typingText}>Typing...</Text>
        </View>
      )}

      {/* Input bar */}
      <View style={cs.inputBar}>
        <TouchableOpacity onPress={pickAndUpload} style={cs.attachBtn} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color="#6B7280" />
            : <Ionicons name="attach" size={22} color="#6B7280" />
          }
        </TouchableOpacity>

        <TextInput
          style={cs.input}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={handleTyping}
          onSubmitEditing={sendText}
          returnKeyType="send"
          multiline
        />

        <TouchableOpacity
          style={[cs.sendBtn, !text.trim() && cs.sendBtnDisabled]}
          onPress={sendText}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const cs = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: '#F9FAFB' },
  msgList:        { padding: 12, paddingBottom: 8 },
  emptyWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText:      { fontSize: 14, color: '#9CA3AF' },
  typingBar:      { paddingHorizontal: 16, paddingBottom: 4 },
  typingText:     { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  inputBar:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8,
                    paddingHorizontal: 12, paddingVertical: 10,
                    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  attachBtn:      { padding: 6, justifyContent: 'center' },
  input:          { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20,
                    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14,
                    color: '#111827', backgroundColor: '#F9FAFB', maxHeight: 100 },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: '#4F46E5',
                    alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ opacity: 0.4 },
});

const ms = StyleSheet.create({
  row:        { marginBottom: 6 },
  ownRow:     { alignItems: 'flex-end' },
  otherRow:   { alignItems: 'flex-start' },
  bubble:     { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  ownBubble:  { backgroundColor: '#4F46E5', borderBottomRightRadius: 4 },
  otherBubble:{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, color: '#6B7280', marginBottom: 3, fontWeight: '600' },
  msgText:    { fontSize: 14, color: '#111827', lineHeight: 20 },
  ownText:    { color: '#fff' },
  time:       { fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  ownTime:    { color: 'rgba(255,255,255,0.6)' },
});
