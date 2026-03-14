import React from 'react';
import { Bot, FileText } from 'lucide-react';
import type { OmniMessage } from './hooks/useMessages';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

interface MessageBubbleProps {
  message: OmniMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { sender_type, content, sent_at, content_type, media_url } = message;

  // System event — centered
  if (sender_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
          {content ?? 'Evento do sistema'}
        </span>
      </div>
    );
  }

  const isOutbound = sender_type === 'agent' || sender_type === 'bot';

  const renderContent = () => {
    // Image
    if (content_type === 'image' && media_url) {
      return (
        <div className="flex flex-col gap-1.5">
          <img
            src={media_url}
            alt="Imagem"
            className="rounded-xl max-w-[260px] max-h-[320px] object-cover cursor-pointer"
            onClick={() => window.open(media_url, '_blank')}
          />
          {content && <span className="text-sm leading-relaxed">{content}</span>}
        </div>
      );
    }

    // Audio
    if (content_type === 'audio' && media_url) {
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={media_url} className="max-w-[260px] h-10" />
      );
    }

    // Video
    if (content_type === 'video' && media_url) {
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video controls src={media_url} className="rounded-xl max-w-[260px] max-h-[240px]" />
      );
    }

    // Document / fallback with URL
    if (content_type === 'document' && media_url) {
      return (
        <a
          href={media_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm underline underline-offset-2 hover:opacity-80"
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          {content ?? 'Documento'}
        </a>
      );
    }

    // Text / unknown / media without URL (fallback placeholder)
    if (content_type === 'text' || content_type === 'unknown' || !media_url) {
      return <span>{content ?? ''}</span>;
    }

    // Remaining content types without URL
    return (
      <span className="italic text-slate-300 text-xs">
        [{content_type === 'image' ? 'Imagem' :
          content_type === 'audio' ? 'Áudio' :
          content_type === 'video' ? 'Vídeo' :
          content_type === 'document' ? 'Documento' : content_type}]
      </span>
    );
  };

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[70%] flex flex-col gap-1 ${isOutbound ? 'items-end' : 'items-start'}`}>
        {sender_type === 'bot' && (
          <span className="flex items-center gap-1 text-[10px] text-purple-400 font-medium">
            <Bot className="w-3 h-3" /> IA
          </span>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isOutbound
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-slate-700 text-slate-100 rounded-bl-sm'
          }`}
        >
          {renderContent()}
        </div>
        <span className="text-[10px] text-slate-500">{formatTime(sent_at)}</span>
      </div>
    </div>
  );
};
