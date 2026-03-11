import React from 'react';
import { Bell, CheckCheck, Trash2, MessageSquare, ClipboardList, UserPlus, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useNotifications } from './useNotifications';
import type { AppNotification, NotificationEventType } from './notifications.types';

const notificationIcons: Record<NotificationEventType, React.ElementType> = {
    lead_created: UserPlus,
    lead_won: ClipboardList,
    lead_lost: AlertCircle,
    lead_reactivation: RefreshCw,
};

const fallbackIcon = Bell;

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s atrás`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;

    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
};

const isToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
        someDate.getMonth() === today.getMonth() &&
        someDate.getFullYear() === today.getFullYear();
};

const isYesterday = (someDate: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return someDate.getDate() === yesterday.getDate() &&
        someDate.getMonth() === yesterday.getMonth() &&
        someDate.getFullYear() === yesterday.getFullYear();
};

const NotificationItem: React.FC<{
    notification: AppNotification;
    onMarkAsRead: (id: string) => void;
}> = ({ notification, onMarkAsRead }) => {
    const Icon = notificationIcons[notification.type] ?? fallbackIcon;

    const handleClick = () => {
        if (!notification.is_read) {
            onMarkAsRead(notification.id);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={handleClick}
            className={`flex items-start gap-4 p-4 border border-zinc-700 rounded-lg transition-colors cursor-pointer ${notification.is_read ? 'bg-zinc-900/50 hover:bg-zinc-800/50' : 'bg-violet-900/30 hover:bg-violet-900/50'}`}
        >
            {!notification.is_read && <div className="w-2.5 h-2.5 bg-violet-500 rounded-full flex-shrink-0 mt-1.5 animate-pulse"></div>}
            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${notification.is_read ? 'bg-zinc-700' : 'bg-violet-800/50'}`}>
                <Icon className={`w-4 h-4 ${notification.is_read ? 'text-zinc-400' : 'text-violet-400'}`} />
            </div>
            <div className="flex-1">
                <p className={`text-sm ${notification.is_read ? 'text-zinc-300' : 'text-white font-medium'}`}>{notification.description}</p>
                <p className="text-xs text-zinc-500 mt-1">{formatTimestamp(notification.created_at)}</p>
            </div>
        </motion.div>
    );
};

const NotificationGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-sm font-semibold uppercase text-zinc-500 tracking-wider mb-3">{title}</h2>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const NotificationsView: React.FC = () => {
    const { user: authUser } = useAuth();
    const { notifications, markAsRead, deleteAll } = useNotifications(authUser?.id ?? null);

    const sortedNotifications = [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const groupedNotifications = sortedNotifications.reduce((acc, notif) => {
        const date = new Date(notif.created_at);
        if (isToday(date)) {
            acc.today.push(notif);
        } else if (isYesterday(date)) {
            acc.yesterday.push(notif);
        } else {
            acc.older.push(notif);
        }
        return acc;
    }, { today: [] as AppNotification[], yesterday: [] as AppNotification[], older: [] as AppNotification[] });

    const handleMarkAllAsRead = async () => {
        for (const n of notifications.filter(n => !n.is_read)) {
            await markAsRead(n.id);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Bell className="w-8 h-8 text-violet-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Notificações</h1>
                        <p className="text-zinc-400">Suas atualizações e alertas recentes</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleMarkAllAsRead} className="flex items-center gap-2 text-sm bg-zinc-700 text-white px-3 py-1.5 rounded-md hover:bg-zinc-600">
                        <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
                    </button>
                    <button
                        onClick={deleteAll}
                        title="Limpar tudo"
                        aria-label="Limpar tudo"
                        className="p-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-4 space-y-6">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Bell className="w-16 h-16 text-zinc-700 mb-4" />
                        <h3 className="text-lg font-semibold text-white">Tudo em dia!</h3>
                        <p className="text-zinc-500">Você não tem nenhuma notificação nova.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {groupedNotifications.today.length > 0 && (
                            <NotificationGroup title="Hoje">
                                {groupedNotifications.today.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={markAsRead} />)}
                            </NotificationGroup>
                        )}
                        {groupedNotifications.yesterday.length > 0 && (
                            <NotificationGroup title="Ontem">
                                {groupedNotifications.yesterday.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={markAsRead} />)}
                            </NotificationGroup>
                        )}
                        {groupedNotifications.older.length > 0 && (
                            <NotificationGroup title="Anteriores">
                                {groupedNotifications.older.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={markAsRead} />)}
                            </NotificationGroup>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default NotificationsView;
