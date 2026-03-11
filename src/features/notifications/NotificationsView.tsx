import React from 'react';
import { Bell, CheckCheck, Trash2, MessageSquare, ClipboardList, UserPlus, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { Id, Notification, NotificationType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationsViewProps {
    notifications: Notification[];
    onMarkAsRead: (id: Id) => void;
    onMarkAllAsRead: () => void;
    onClearAll: () => void;
    onNavigate: (link: Notification['link']) => void;
}

const notificationIcons: Record<NotificationType, React.ElementType> = {
    new_message: MessageSquare,
    task_due_soon: ClipboardList,
    task_overdue: AlertCircle,
    lead_assigned: UserPlus,
    mention: (props: any) => <span {...props}>@</span>,
    system_update: Zap,
    lead_reactivation: RefreshCw,
};

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

const NotificationItem: React.FC<{ notification: Notification; onMarkAsRead: (id: Id) => void; onNavigate: (link: Notification['link']) => void }> = ({ notification, onMarkAsRead, onNavigate }) => {
    const Icon = notificationIcons[notification.type] || Bell;

    const handleClick = () => {
        if (!notification.isRead) {
            onMarkAsRead(notification.id);
        }
        if (notification.link) {
            onNavigate(notification.link);
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
            className={`flex items-start gap-4 p-4 border border-zinc-700 rounded-lg transition-colors cursor-pointer ${notification.isRead ? 'bg-zinc-900/50 hover:bg-zinc-800/50' : 'bg-violet-900/30 hover:bg-violet-900/50'}`}
        >
            {!notification.isRead && <div className="w-2.5 h-2.5 bg-violet-500 rounded-full flex-shrink-0 mt-1.5 animate-pulse"></div>}
            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${notification.isRead ? 'bg-zinc-700' : 'bg-violet-800/50'}`}>
                <Icon className={`w-4 h-4 ${notification.isRead ? 'text-zinc-400' : 'text-violet-400'}`} />
            </div>
            <div className="flex-1">
                <p className={`text-sm ${notification.isRead ? 'text-zinc-300' : 'text-white font-medium'}`}>{notification.text}</p>
                <p className="text-xs text-zinc-500 mt-1">{formatTimestamp(notification.createdAt)}</p>
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

const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onMarkAsRead, onMarkAllAsRead, onClearAll, onNavigate }) => {
    const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const groupedNotifications = sortedNotifications.reduce((acc, notif) => {
        const date = new Date(notif.createdAt);
        if (isToday(date)) {
            acc.today.push(notif);
        } else if (isYesterday(date)) {
            acc.yesterday.push(notif);
        } else {
            acc.older.push(notif);
        }
        return acc;
    }, { today: [] as Notification[], yesterday: [] as Notification[], older: [] as Notification[] });

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
                    <button onClick={onMarkAllAsRead} className="flex items-center gap-2 text-sm bg-zinc-700 text-white px-3 py-1.5 rounded-md hover:bg-zinc-600">
                        <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
                    </button>
                    <button
                        onClick={onClearAll}
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
                                {groupedNotifications.today.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={onMarkAsRead} onNavigate={onNavigate} />)}
                            </NotificationGroup>
                        )}
                        {groupedNotifications.yesterday.length > 0 && (
                            <NotificationGroup title="Ontem">
                                {groupedNotifications.yesterday.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={onMarkAsRead} onNavigate={onNavigate} />)}
                            </NotificationGroup>
                        )}
                        {groupedNotifications.older.length > 0 && (
                            <NotificationGroup title="Anteriores">
                                {groupedNotifications.older.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={onMarkAsRead} onNavigate={onNavigate} />)}
                            </NotificationGroup>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default NotificationsView;
