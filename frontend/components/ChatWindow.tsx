'use client';
import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';
import MessageBubble from './MessageBubble';
import FileUpload from './FileUpload';
import { Send, Phone, Video, X } from 'lucide-react';

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

export default function ChatWindow({
  sessionId,
  currentUserId,
  token,
  sessionStatus,
  onCallRequest,
}: {
  sessionId: string;
  currentUserId: string;
  token: string;
  sessionStatus?: string;
  onCallRequest?: (type: 'voice' | 'video') => void;
}) {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [text,        setText]        = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket    = getSocket(token);

  useEffect(() => {
    api.get(`/api/sessions/${sessionId}/messages`).then(r => setMessages(r.data));

    socket.emit('join_session', { sessionId });

    socket.on('new_message', (msg: Message) =>
      setMessages(prev => [...prev, msg])
    );
    socket.on('typing', ({ isTyping }: { userId: string; isTyping: boolean }) =>
      setOtherTyping(isTyping)
    );

    return () => {
      socket.off('new_message');
      socket.off('typing');
    };
  }, [sessionId, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  const sendText = () => {
    if (!text.trim()) return;
    socket.emit('send_message', { sessionId, content: text, type: 'text' });
    socket.emit('typing', { sessionId, isTyping: false });
    setText('');
  };

  const onFileUploaded = ({ url, originalName }: { url: string; originalName: string }) => {
    socket.emit('send_message', {
      sessionId,
      type: 'file',
      fileUrl: url,
      fileName: originalName,
      content: originalName,
    });
  };

  const handleTextChange = (v: string) => {
    setText(v);
    socket.emit('typing', { sessionId, isTyping: v.length > 0 });
  };

  const isEnded = sessionStatus === 'ended';

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <div>
          <p className="font-medium text-sm text-gray-800">
            Session #{sessionId.slice(-6).toUpperCase()}
          </p>
          <p className={`text-xs ${isEnded ? 'text-red-400' : 'text-green-500'}`}>
            {isEnded ? '● Ended' : '● Active'}
          </p>
        </div>
        {!isEnded && (
          <div className="flex gap-1">
            <button
              onClick={() => onCallRequest?.('voice')}
              title="Voice call"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
            >
              <Phone size={16} />
            </button>
            <button
              onClick={() => onCallRequest?.('video')}
              title="Video call"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
            >
              <Video size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map(m => (
          <MessageBubble key={m._id} message={m} isOwn={m.senderId === currentUserId} />
        ))}
        {otherTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs text-gray-400 italic">
              Typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {!isEnded ? (
        <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white">
          <FileUpload token={token} onUploaded={onFileUploaded} />
          <input
            className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition bg-gray-50"
            placeholder="Type a message..."
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendText()}
          />
          <button
            onClick={sendText}
            disabled={!text.trim()}
            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-gray-100 text-center text-xs text-gray-400 bg-white">
          This session has ended. Start a new session to continue chatting.
        </div>
      )}
    </div>
  );
}
