import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useNotifications } from './useNotifications';
import { NotificationsDropdown } from './NotificationsDropdown';

export const NotificationsBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, deleteNotification, deleteAll } =
    useNotifications(user?.id ?? null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="relative p-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold ring-2 ring-slate-950 leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <NotificationsDropdown
            notifications={notifications}
            onMarkAsRead={async (id) => {
              await markAsRead(id);
            }}
            onDelete={async (id) => {
              await deleteNotification(id);
            }}
            onDeleteAll={async () => {
              await deleteAll();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
