import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    User, 
    DollarSign,
    Tag as TagIcon, 
    Clock,
    Trash2,
    MessageSquare,
    ArrowRight,
    TrendingUp,
    Sparkles,
    FileText,
    Mail,
    BookOpen,
    Circle,
    CheckCircle2,
    RotateCcw,
    Plus,
    Send,
    MoreVertical,
    Check,
    Edit3
} from 'lucide-react';
import type { Lead, Tag, Activity, EmailDraft, Id, CreateEmailDraftData, Tone, Playbook, Task, PlaybookHistoryEntry, Board } from '../types';

interface LeadDetailSlideoverProps {
  lead: Lead;
  boards: Board[];
  activities: Activity[];
  emailDrafts: EmailDraft[];
  tasks: Task[];
  playbooks: Playbook[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveStage: (columnId: Id) => void;
  onReopen: () => void;
  onAddNote: (noteText: string) => void;
  onSendEmailActivity: (subject: string) => void;
  onAddTask: () => void;
  onSaveDraft: (draftData: CreateEmailDraftData) => void;
  onDeleteDraft: (draftId: Id) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  onUpdateTaskStatus: (taskId: Id, status: 'pending' | 'completed') => void;
  onDeactivatePlaybook: () => void;
  onApplyPlaybook: (playbookId: Id) => void;
}

const LeadDetailSlideover: React.FC<LeadDetailSlideoverProps> = ({
    lead,
    boards,
    activities,
    emailDrafts,
    tasks,
    playbooks,
    onClose,
    onEdit,
    onDelete,
    onMoveStage,
    onReopen,
    onAddNote,
    onSendEmailActivity,
    onAddTask,
    onSaveDraft,
    onDeleteDraft,
    showNotification,
    onUpdateTaskStatus,
    onDeactivatePlaybook,
    onApplyPlaybook
}) => {
  const [activeTab, setActiveTab] = useState('Timeline');
  const tabs = ['Timeline', 'Playbook', 'Produtos', 'IA Insights'];
  const [newNote, setNewNote] = useState('');
  const [timelinePage, setTimelinePage] = useState(1);
  const TIMELINE_PER_PAGE = 3;
  
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });

  const handleAddNoteClick = () => {
    if (newNote.trim() === '') return;
    onAddNote(newNote);
    setNewNote('');
  };

  // Pipeline dinâmico: encontra o board ao qual este lead pertence
  const leadBoard = useMemo(
    () => boards.find(b => b.columns.some(c => c.id === lead.columnId)),
    [boards, lead.columnId]
  );
  const pipelineStages = leadBoard?.columns ?? [];
  const activeStageIdx = pipelineStages.findIndex(c => c.id === lead.columnId);

  // Status badge derivado do tipo da coluna atual — atualiza junto com o Kanban
  const statusBadge = useMemo(() => {
    const currentCol = pipelineStages.find(c => c.id === lead.columnId);
    if (currentCol) {
      if (currentCol.type === 'won')  return { label: 'GANHO',   cls: 'bg-emerald-500/20 text-emerald-400' };
      if (currentCol.type === 'lost') return { label: 'PERDIDO', cls: 'bg-red-500/20 text-red-400' };
      return { label: 'ATIVO', cls: 'bg-sky-500/20 text-sky-400' };
    }
    // Fallback apenas se o board não foi encontrado
    const s = (lead.status ?? '').toLowerCase();
    if (s === 'ganho')                        return { label: 'GANHO',   cls: 'bg-emerald-500/20 text-emerald-400' };
    if (s === 'encerrado' || s === 'perdido') return { label: 'PERDIDO', cls: 'bg-red-500/20 text-red-400' };
    return { label: 'ATIVO', cls: 'bg-sky-500/20 text-sky-400' };
  }, [lead.columnId, lead.status, pipelineStages]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#0B0E14] border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {lead.name}
              </h2>
              <p className="text-sky-400 text-xl font-bold mt-1">{currencyFormatter.format(lead.value)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${statusBadge.cls}`}>
                <Check className="w-3 h-3" /> {statusBadge.label}
              </span>
              <button 
                onClick={onEdit}
                className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-sky-500/20 flex items-center gap-2 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={onReopen}
                className="bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700/50 flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reabrir
              </button>
              <button onClick={onDelete} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Pipeline Progress — dinâmico via board_stages */}
          <div className="mt-8 flex items-center gap-4 flex-wrap">
            {pipelineStages.map((stage, i) => {
              const isActive = i === activeStageIdx;
              const isPast   = i < activeStageIdx;
              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => onMoveStage(stage.id)}
                    className="flex items-center gap-2 group"
                    title={`Mover para ${stage.title}`}
                  >
                    <div className={`w-3 h-3 rounded-full transition-colors ${isActive ? 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]' : isPast ? 'bg-sky-800' : 'bg-slate-700 group-hover:bg-slate-500'}`} />
                    <span className={`text-xs font-bold tracking-tight transition-colors ${isActive ? 'text-white' : isPast ? 'text-sky-700' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {stage.title}
                    </span>
                  </button>
                  {i < pipelineStages.length - 1 && <div className="h-[1px] w-8 bg-slate-800" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden border-t border-slate-800/50">
          {/* Sidebar */}
          <div className="w-72 border-r border-slate-800/50 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                <User className="w-3 h-3" /> CONTATO PRINCIPAL
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                  {lead.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{lead.name}</span>
                    <span className="bg-emerald-500 text-[8px] font-bold px-1.5 py-0.5 rounded text-white">CLIENTE</span>
                  </div>
                  <p className="text-xs text-slate-500">{lead.email || 'Sem e-mail'}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4">DETALHES</h3>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Prioridade</span>
                <span className="text-white font-medium">Alta</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Criado em</span>
                <span className="text-white font-medium">{new Date(lead.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Probabilidade</span>
                <span className="text-white font-bold">{lead.probability || 0}%</span>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                <TagIcon className="w-3 h-3" /> TAGS
              </h3>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map(tag => (
                  <span key={tag.id} className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                    {tag.name} <X className="w-3 h-3 cursor-pointer" />
                  </span>
                ))}
                {lead.tags.length === 0 && <span className="text-xs text-slate-600 italic">Sem tags</span>}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4">ADICIONAR TAG</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ex: VIP, Urgente, Q4..." 
                  className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50"
                />
                <button className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 p-2 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </section>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-slate-800/50 px-8">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-4 text-sm font-bold transition-all relative ${activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              {activeTab === 'Timeline' && (
                <div className="space-y-8">
                  <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                    <textarea 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Escreva uma nota..."
                      className="w-full bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none resize-none min-h-[24px]"
                    />
                    <div className="flex justify-end mt-4 pt-4 border-t border-slate-800/50">
                      <button 
                        onClick={handleAddNoteClick}
                        className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                      >
                        <Check className="w-4 h-4" /> Enviar
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(activities.length / TIMELINE_PER_PAGE));
                    const page = Math.min(timelinePage, totalPages);
                    const paged = activities.slice((page - 1) * TIMELINE_PER_PAGE, page * TIMELINE_PER_PAGE);
                    return (
                      <div className="space-y-4">
                        {activities.length > 0 ? (
                          <>
                            <div className="space-y-4">
                              {paged.map(activity => (
                                <div key={activity.id} className="flex gap-4">
                                  <div className="mt-1">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                                      {activity.type === 'note' && <FileText className="w-4 h-4 text-sky-400" />}
                                      {activity.type === 'status_change' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                                      {activity.type === 'email_sent' && <Mail className="w-4 h-4 text-amber-400" />}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-bold text-white">{activity.authorName}</span>
                                      <span className="text-[10px] text-slate-500">{new Date(activity.timestamp).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <p className="text-sm text-slate-400">{activity.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {totalPages > 1 && (
                              <div className="flex items-center justify-center gap-1 pt-4">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                  <button
                                    key={p}
                                    onClick={() => setTimelinePage(p)}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${p === page ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-slate-500 text-sm italic">Nenhuma atividade registrada.</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'Playbook' && (
                <div className="space-y-6">
                  {lead.activePlaybook ? (
                    <div className="space-y-6">
                      <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{lead.activePlaybook.playbookName}</h4>
                              <p className="text-xs text-slate-500">Iniciado em {new Date(lead.activePlaybook.startedAt).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                          <button 
                            onClick={onDeactivatePlaybook}
                            className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                          >
                            Desativar
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {tasks.filter(t => t.leadId === lead.id && t.playbookId === lead.activePlaybook?.playbookId).map(task => (
                            <div key={task.id} className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                              <button 
                                onClick={() => onUpdateTaskStatus(task.id, task.status === 'pending' ? 'completed' : 'pending')}
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700 hover:border-sky-500'}`}
                              >
                                {task.status === 'completed' && <Check className="w-3 h-3" />}
                              </button>
                              <div className="flex-1">
                                <p className={`text-xs font-medium ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-white'}`}>{task.title}</p>
                                <p className="text-[10px] text-slate-500">Vence em {new Date(task.dueDate).toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
                          <BookOpen className="w-8 h-8" />
                        </div>
                        <h4 className="text-white font-bold">Nenhum Playbook Ativo</h4>
                        <p className="text-slate-500 text-xs mt-1">Selecione uma cadência abaixo para iniciar o acompanhamento.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {playbooks.map(playbook => (
                          <button
                            key={playbook.id}
                            onClick={() => onApplyPlaybook(playbook.id)}
                            className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-2xl hover:border-sky-500/50 hover:bg-slate-900/50 transition-all text-left group"
                          >
                            <div>
                              <h5 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">{playbook.name}</h5>
                              <p className="text-xs text-slate-500 mt-1">{playbook.steps.length} passos • {playbook.steps.reduce((acc, s) => acc + s.day, 0)} dias de duração</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 transition-all" />
                          </button>
                        ))}
                      </div>

                      {lead.playbookHistory && lead.playbookHistory.length > 0 && (
                        <div className="mt-8">
                          <h4 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4">HISTÓRICO DE PLAYBOOKS</h4>
                          <div className="space-y-3">
                            {lead.playbookHistory.map((entry, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/20 border border-slate-800/50 rounded-xl">
                                <div>
                                  <p className="text-xs font-bold text-white">{entry.playbookName}</p>
                                  <p className="text-[10px] text-slate-500">Concluído em {new Date(entry.completedAt).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab !== 'Timeline' && activeTab !== 'Playbook' && (
                <div className="flex items-center justify-center h-full text-slate-500 italic">
                  Em breve...
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LeadDetailSlideover;
