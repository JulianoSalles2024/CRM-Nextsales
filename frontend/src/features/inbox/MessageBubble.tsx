import React, { useState } from 'react';
import { Bot, FileText, ImageOff, MicOff } from 'lucide-react';
import type { OmniMessage } from './hooks/useMessages';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

interface MessageBubbleProps {
  message: OmniMessage;
}

const LABEL: Record<string, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { sender_type, content, sent_at, content_type, media_url } = message;
  const [imgError, setImgError] = useState(false);
  const [audioError, setAudioError] = useState(false);

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
    if (content_type === 'image') {
      if (media_url && !imgError) {
        return (
          <div className="flex flex-col gap-1.5">
            <img
              src={media_url}
              alt="Imagem"
              className="rounded-xl max-w-[260px] max-h-[320px] object-cover cursor-pointer"
              onClick={() => {
                const win = window.open('', '_blank');
                if (win) win.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${media_url}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`);
              }}
              onError={() => setImgError(true)}
            />
            {content && <span className="text-sm leading-relaxed">{content}</span>}
          </div>
        );
      }
      return (
        <span className="flex items-center gap-1.5 text-xs italic text-slate-400">
          <ImageOff className="w-3.5 h-3.5" /> Imagem não disponível
        </span>
      );
    }

    // Audio
    if (content_type === 'audio') {
      if (media_url && !audioError) {
        return (
          <div className="flex flex-col gap-1.5">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={media_url} style={{ display: 'block', width: '260px' }} onError={() => setAudioError(true)} />
            {content && (
              <p className="text-xs text-slate-300 italic leading-relaxed">
                🎤 {content}
              </p>
            )}
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs italic text-slate-400">
            <MicOff className="w-3.5 h-3.5" /> Áudio não disponível
          </span>
          {content && (
            <p className="text-xs text-slate-300 italic leading-relaxed">
              🎤 {content}
            </p>
          )}
        </div>
      );
    }

    // Video
    if (content_type === 'video' && media_url) {
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video controls src={media_url} className="rounded-xl max-w-[260px] max-h-[240px]" />
      );
    }

    // Document
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

    // Text / unknown / media types without URL
    if (content_type === 'text' || content_type === 'unknown') {
      return <span>{content ?? ''}</span>;
    }

    // Other media types without a valid URL
    if (!media_url) {
      return (
        <span className="italic text-slate-400 text-xs">
          [{LABEL[content_type] ?? content_type}]
        </span>
      );
    }

    return <span>{content ?? ''}</span>;
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
