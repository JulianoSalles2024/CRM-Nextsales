import React, { useState } from 'react';
import { HelpCircle, X, BookOpen, Ticket } from 'lucide-react';
import { useAuth } from '@/src/features/auth/AuthContext';
import HelpCenter from './HelpCenter';
import NewTicketModal from './NewTicketModal';
import { useArticles } from './hooks/useArticles';
import { useTickets } from './hooks/useTickets';

// Panel mounts only when open=true — hooks fire queries only after user opens widget
const HelpWidgetPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, currentUserRole } = useAuth();
  const isAdmin = currentUserRole === 'admin';
  const [view, setView] = useState<'menu' | 'help'>('menu');
  const [showNewTicket, setShowNewTicket] = useState(false);

  const { categories } = useArticles();
  const { createTicket } = useTickets(isAdmin, user?.id ?? null);

  return (
    <div className="fixed bottom-20 right-6 z-[100] w-96 max-h-[70vh] bg-[#0B1220] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
        <span className="text-white font-semibold text-sm">
          {view === 'menu' ? 'Como podemos ajudar?' : 'Central de Ajuda'}
        </span>
        <div className="flex items-center gap-2">
          {view !== 'menu' && (
            <button onClick={() => setView('menu')} className="text-slate-500 hover:text-white text-xs">
              ← Voltar
            </button>
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {view === 'menu' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setView('help')}
              className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-blue-500/30 transition-all text-left"
            >
              <BookOpen className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white text-sm font-medium">Central de Ajuda</div>
                <div className="text-slate-500 text-xs">Artigos e tutoriais</div>
              </div>
            </button>
            <button
              onClick={() => setShowNewTicket(true)}
              className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-blue-500/30 transition-all text-left"
            >
              <Ticket className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-white text-sm font-medium">Abrir Chamado</div>
                <div className="text-slate-500 text-xs">Fale com o suporte</div>
              </div>
            </button>
          </div>
        )}
        {view === 'help' && <HelpCenter categories={categories} />}
      </div>

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

const HelpWidget: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-[100] w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-900/40 flex items-center justify-center transition-all hover:scale-105"
        title="Ajuda"
      >
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </button>

      {/* HelpWidgetPanel only mounts when open=true — defers all Supabase queries */}
      {open && <HelpWidgetPanel onClose={() => setOpen(false)} />}
    </>
  );
};

export default HelpWidget;
