import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Columns,
  Users,
  Users2,
  ClipboardList,
  Calendar,
  BarChart,
  Contact,
  PanelLeft,
  Settings,
  Cpu,
  Bell,
  HelpCircle,
  MessageSquare,
  Inbox as InboxIcon,
  ToyBrick,
  BookOpen,
  ScanLine,
  Bot,
  LifeBuoy,
  Package,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useAiEscalationCount } from '@/src/features/inbox/hooks/useAiEscalationCount';
import { supabase } from '@/src/lib/supabase';

function useSupportTicketCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'reopened'])
      .then(({ count: c }) => setCount(c ?? 0));
  }, []);
  return count;
}

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  isChatEnabled: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NavItem: React.FC<{
  item: { icon: React.ElementType; label: string };
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  badge?: number;
}> = ({ item, isActive, isCollapsed, onClick, badge }) => (
  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={isCollapsed ? item.label : undefined}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group border ${
      isActive
        ? 'bg-sky-500/5 border-sky-500/30 text-sky-400 shadow-sm shadow-sky-900/20'
        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
    } ${isCollapsed ? 'justify-center' : ''}`}
  >
    <div className="relative flex-shrink-0">
      <item.icon
        className={`w-5 h-5 transition-colors ${
          isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
        }`}
      />
      {badge != null && badge > 0 && isCollapsed && (
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
    {!isCollapsed && <span className="flex-1">{item.label}</span>}
    {!isCollapsed && badge != null && badge > 0 && (
      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[10px] font-bold text-black flex items-center justify-center">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </a>
);

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  isCollapsed,
  onToggle,
  isChatEnabled,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const { currentPermissions, currentUserRole, isRoleReady } = useAuth();
  const aiEscalationCount = useAiEscalationCount();
  const supportTicketCount = useSupportTicketCount();
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  if (!isRoleReady) return null;

  // ✅ Secondary nav
  const secondaryNavItems = [
    // { icon: Calendar, label: 'Calendário' },   // ❌ COMENTADO
    // { icon: Bell, label: 'Notificações' },    // ❌ COMENTADO

    { icon: LifeBuoy, label: 'Suporte' },
    { icon: Users2, label: 'Comunidade' },
    { icon: CreditCard, label: 'Plano' },
    { icon: Settings, label: 'Configurações' },
  ].filter(item => {
    if (item.label === 'Plano' && currentUserRole !== 'admin') return false;
    return true;
  });

  const mainNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard' },
    { icon: ScanLine, label: 'Painel 360' },
    { icon: Columns, label: 'Pipeline' },
    { icon: BookOpen, label: 'Playbooks' },
    { icon: Users, label: 'Leads' },
    // { icon: Contact, label: 'Clientes' }, // Disabled
    { icon: ClipboardList, label: 'Tarefas' },
    { icon: BarChart, label: 'Relatórios' },
    { icon: InboxIcon, label: 'Omnichannel' },
    { icon: Bot, label: 'Agentes' },
    { icon: Package, label: 'Portfólio' },
    { icon: MessageSquare, label: 'Chat' },
    // { icon: ToyBrick, label: 'Integrações' }, // Removed: moved to Settings
  ].filter((item) => {
    if (!isChatEnabled && item.label === 'Chat') return false;
    if (!currentPermissions.canViewDashboard && item.label === 'Dashboard') return false;
    if (!currentPermissions.canViewReports && item.label === 'Relatórios') return false;
    if (currentUserRole !== 'admin' && item.label === 'Painel 360') return false;
    if (currentUserRole === 'admin' && item.label === 'Pipeline') return false;
    if (currentUserRole === 'admin' && item.label === 'Playbooks') return false;
    if (currentUserRole !== 'admin' && item.label === 'Agentes') return false;
    if (currentUserRole !== 'admin' && item.label === 'Portfólio') return false;
    if (currentUserRole === 'admin' && item.label === 'Tarefas') return false;
    return true;
  });

  const renderNavItems = mainNavItems.map((item) => {
    if (item.label === 'Dashboard')
      return { ...item, label: 'Visão Geral', originalKey: 'Dashboard' as const };
    return { ...item, originalKey: item.label };
  });

  const sidebarContent = (isCollapsedMode: boolean, onToggleFn: () => void) => (
    <>
      <div className={`flex items-center gap-3 mb-10 px-2 ${isCollapsedMode ? 'justify-center' : ''}`}>
        {!isCollapsedMode && (
          <>
            <span className="text-xl font-bold text-white whitespace-nowrap tracking-tight">
              <span className="text-sky-400">Next</span>Sales
            </span>
            <button
              onClick={onToggleFn}
              className="ml-auto p-1.5 rounded-md text-slate-500 hover:bg-slate-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-700"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          </>
        )}
        {isCollapsedMode && (
          <button
            onClick={onToggleFn}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-700"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar">
        <ul className="space-y-1">
          {renderNavItems.map((item) => (
            <li key={item.originalKey}>
              <NavItem
                item={item}
                isActive={activeView === item.originalKey}
                onClick={() => { onNavigate(item.originalKey); onMobileClose?.(); }}
                isCollapsed={isCollapsedMode}
                badge={
                  item.originalKey === 'Omnichannel' ? aiEscalationCount :
                  item.originalKey === 'Suporte' && currentUserRole === 'admin' ? supportTicketCount :
                  undefined
                }
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-800/50">
        <ul className="space-y-1">
          {secondaryNavItems.map((item) => (
            <li key={item.label}>
              <NavItem
                item={item}
                isActive={activeView === item.label}
                onClick={() => { onNavigate(item.label); onMobileClose?.(); }}
                isCollapsed={isCollapsedMode}
                badge={
                  item.label === 'Suporte' && currentUserRole === 'admin' ? supportTicketCount : undefined
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className={`relative flex flex-col bg-[#0B1220] border-r border-white/5 p-4 h-full overflow-y-auto transition-all duration-300 ease-in-out ${isMobileCollapsed ? 'w-20' : 'w-64'}`}>
            {sidebarContent(isMobileCollapsed, () => setIsMobileCollapsed((p) => !p))}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
      className={`hidden md:flex flex-col bg-[#0B1220]/80 backdrop-blur-md border-r border-white/5 p-4 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {sidebarContent(isCollapsed, onToggle)}
    </aside>
    </>
  );
};

// Helper component for Inbox icon
function Inbox(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export default Sidebar;