import { format } from 'date-fns';

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

export default function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm shadow-xs ${
          isOwn
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-medium mb-1 text-indigo-500">{message.senderName}</p>
        )}

        {message.type === 'text' && <p className="leading-relaxed">{message.content}</p>}

        {(message.type === 'image' || message.type === 'file') && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            className={`underline text-xs ${isOwn ? 'text-indigo-100' : 'text-indigo-600'}`}
          >
            📎 {message.fileName || 'View attachment'}
          </a>
        )}

        <p className={`text-xs mt-1.5 text-right ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
          {format(new Date(message.createdAt), 'HH:mm')}
        </p>
      </div>
    </div>
  );
}
