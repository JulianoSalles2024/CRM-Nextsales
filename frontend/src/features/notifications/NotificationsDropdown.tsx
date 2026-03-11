import React from 'react';
import { Trash2, UserPlus, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppNotification, NotificationEventType } from './notifications.types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function NotificationIcon({ type }: { type: NotificationEventType }) {
  if (type === 'lead_created') {
    return (
      <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
        <UserPlus className="w-4 h-4 text-blue-400" />
      </div>
    );
  }
  if (type === 'lead_won') {
    return (
      <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
      <TrendingDown className="w-4 h-4 text-red-400" />
    </div>
  );
}

interface Props {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}

export const NotificationsDropdown: React.FC<Props> = ({
  notifications,
  onMarkAsRead,
  onDelete,
  onDeleteAll,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-slate-950/60 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <span className="text-sm font-semibold text-white">Notificações</span>
        {notifications.length > 0 && (
          <button
            onClick={onDeleteAll}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-600">
              <Bell className="w-8 h-8" />
              <span className="text-sm">Sem notificações</span>
            </div>
          ) : (
            notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                onClick={() => !n.is_read && onMarkAsRead(n.id)}
                className={`flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 cursor-pointer transition-colors group ${
                  n.is_read
                    ? 'hover:bg-slate-800/30'
                    : 'bg-blue-500/5 hover:bg-blue-500/10'
                }`}
              >
                <NotificationIcon type={n.type} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-xs font-semibold leading-tight ${
                        n.is_read ? 'text-slate-400' : 'text-white'
                      }`}
                    >
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                    {n.description}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {timeAgo(n.created_at)}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                  title="Excluir notificação"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
