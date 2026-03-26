import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Sun, Moon, Bot, User as UserIcon, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@/types';
import { useAuth } from '@/src/features/auth/AuthContext';
import { NotificationsBell } from '@/src/features/notifications/NotificationsBell';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  unreadCount?: number;
  onOpenSdrBot: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
  onMobileMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  theme,
  onThemeToggle,
  unreadCount,
  onOpenSdrBot,
  activeView,
  onNavigate,
  onMobileMenuToggle,
}) => {
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { currentUserRole } = useAuth();
  const isAdmin = currentUserRole === 'admin';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex-shrink-0 bg-transparent px-6 h-20 flex items-center justify-between z-[200]">
      {/* Hamburger - mobile only */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-3 ml-auto">
        {/* SDR Bot Button */}
        <button
          onClick={onOpenSdrBot}
          className="p-2.5 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-105 transition-all duration-200 group"
          title="SDR Bot (IA)"
        >
          <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onThemeToggle}
          className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={theme}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Notifications Bell */}
        <NotificationsBell />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((p) => !p)}
            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-white leading-tight">{currentUser.name}</p>
              <p className="text-xs text-slate-500 capitalize">{currentUserRole}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-blue-900/20">
              {currentUser.name.split(' ').map((n) => n[0]).join('')}
            </div>
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute top-full right-0 mt-2 w-64 bg-slate-900 rounded-xl border border-slate-800 shadow-xl shadow-slate-950/50 z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                  <p className="font-semibold text-sm text-white truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { onNavigate('Meu Perfil'); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Meu Perfil</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;