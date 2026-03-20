import React, { useState, useRef, useEffect } from 'react';
import { LifeBuoy, BookOpen, Ticket, Plus } from 'lucide-react';
import { useAuth } from '@/src/features/auth/AuthContext';
import { useTickets } from './hooks/useTickets';
import { useArticles } from './hooks/useArticles';
import HelpCenter from './HelpCenter';
import TicketList from './TicketList';
import TicketDetail from './TicketDetail';
import NewTicketModal from './NewTicketModal';
import type { SupportTicket, TicketStatus } from './support.types';

type Tab = 'help' | 'tickets';

const SupportPage: React.FC = () => {
  const { user, currentUserRole } = useAuth();
  const isAdmin = currentUserRole === 'admin';
  const userId = user?.id ?? null;

  const [activeTab, setActiveTab] = useState<Tab>('help');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // SupportPage owns these hooks — passes categories down to avoid duplicate fetches
  const { categories } = useArticles();
  const { tickets, loading: ticketsLoading, createTicket, updateTicketStatus } = useTickets(isAdmin, userId);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'help', label: 'Central de Ajuda', icon: BookOpen },
    { key: 'tickets', label: isAdmin ? 'Fila de Chamados' : 'Meus Chamados', icon: Ticket },
  ];

  useEffect(() => {
    const idx = tabs.findIndex(t => t.key === activeTab);
    const el = tabRefs.current[idx];
    if (el) setPillStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    await updateTicketStatus(ticketId, status);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status } : null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20 cursor-default">
            <LifeBuoy className="w-4 h-4" />
            <span>Suporte</span>
          </button>
        </div>
        {activeTab === 'tickets' && !selectedTicket && (
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Chamado
          </button>
        )}
      </div>

      {/* Sliding pill tabs */}
      <div className="relative bg-slate-900/60 border border-blue-500/10 rounded-xl p-1 flex w-fit">
        <div
          className="absolute top-1 bottom-1 bg-blue-500/10 border border-blue-500/20 rounded-lg transition-all duration-300 pointer-events-none"
          style={{ left: pillStyle.left, width: pillStyle.width }}
        />
        {tabs.map((tab, idx) => (
          <button
            key={tab.key}
            ref={el => { tabRefs.current[idx] = el; }}
            onClick={() => { setActiveTab(tab.key); setSelectedTicket(null); }}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key ? 'text-blue-400' : 'text-slate-500 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'help' && <HelpCenter categories={categories} />}

      {activeTab === 'tickets' && (
        selectedTicket ? (
          <TicketDetail
            ticket={selectedTicket}
            isAdmin={isAdmin}
            currentUserId={userId ?? ''}
            onBack={() => setSelectedTicket(null)}
            onStatusChange={handleStatusChange}
          />
        ) : ticketsLoading ? (
          <div className="text-slate-500 text-sm">Carregando chamados...</div>
        ) : (
          <TicketList tickets={tickets} onSelect={setSelectedTicket} />
        )
      )}

      {showNewTicket && (
        <NewTicketModal
          categories={categories}
          onSubmit={async (subject, catId, priority) => {
            await createTicket(subject, catId, priority);
            setShowNewTicket(false);
          }}
          onClose={() => setShowNewTicket(false)}
        />
      )}
    </div>
  );
};

export default SupportPage;
