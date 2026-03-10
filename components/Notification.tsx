
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const colors: Record<NotificationType, string> = {
  success: 'bg-blue-950 border-blue-700 text-blue-300',
  error:   'bg-red-950 border-red-700 text-red-300',
  warning: 'bg-amber-950 border-amber-700 text-amber-300',
  info:    'bg-slate-900 border-slate-700 text-slate-300',
};

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`fixed bottom-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-medium shadow-lg border ${colors[type]}`}
    >
      {message}
    </motion.div>
  );
};

export default Notification;
