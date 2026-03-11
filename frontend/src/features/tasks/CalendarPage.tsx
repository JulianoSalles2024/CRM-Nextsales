
import React, { useState, useMemo } from 'react';
import { Task, Lead, Id } from '@/types';
import { Calendar as CalendarIcon, Plus, Mail, Phone, Users, FileText, CheckSquare } from 'lucide-react';
import MiniCalendar from './MiniCalendar';
import TaskItem from './TaskItem';
import { GlassCard } from '@/src/shared/components/GlassCard';
import { GlassSection } from '@/src/shared/components/GlassSection';

interface CalendarPageProps {
    tasks: Task[];
    leads: Lead[];
    onNewActivity: (date: string) => void;
    onEditActivity: (task: Task) => void;
    onDeleteTask: (taskId: Id) => void;
    onUpdateTaskStatus: (taskId: Id, status: 'pending' | 'completed') => void;
}

const activityTypeConfig = {
    email: { label: 'Email', icon: Mail },
    call: { label: 'Ligação', icon: Phone },
    meeting: { label: 'Reunião', icon: Users },
    note: { label: 'Nota', icon: FileText },
    task: { label: 'Tarefa', icon: CheckSquare }
};

type ActivityType = keyof typeof activityTypeConfig;

const CalendarPage: React.FC<CalendarPageProps> = ({ tasks, leads, onNewActivity, onEditActivity, onDeleteTask, onUpdateTaskStatus }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeFilters, setActiveFilters] = useState<ActivityType[]>([]);
    const [showCompleted, setShowCompleted] = useState(true);

    const leadsMap = useMemo(() => new Map(leads.map(lead => [lead.id, lead.name])), [leads]);

    const handleFilterToggle = (type: ActivityType) => {
        setActiveFilters(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            const isSameDay = taskDate.getUTCFullYear() === selectedDate.getUTCFullYear() &&
                              taskDate.getUTCMonth() === selectedDate.getUTCMonth() &&
                              taskDate.getUTCDate() === selectedDate.getUTCDate();

            if (!isSameDay) return false;
            if (!showCompleted && task.status === 'completed') return false;
            if (activeFilters.length > 0 && !activeFilters.includes(task.type)) return false;

            return true;
        }).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [tasks, selectedDate, showCompleted, activeFilters]);

    const pendingTasks = filteredTasks.filter(task => task.status === 'pending');
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');

    const selectedDateString = selectedDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="flex flex-col h-full">
             <div className="flex items-center gap-4 mb-6">
                <CalendarIcon className="w-8 h-8 text-violet-400" />
                <div>
                    <h1 className="text-2xl font-bold text-white">Calendário</h1>
                    <p className="text-slate-400">Visualize seus compromissos e eventos agendados</p>
                </div>
            </div>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Left Column */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <GlassCard className="p-4">
                        <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                    </GlassCard>
                     <GlassCard className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-white">Filtros</h3>
                            <button onClick={() => setActiveFilters([])} className="text-xs text-violet-400 hover:text-violet-300">Limpar</button>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm text-slate-400">Tipos de Atividade</p>
                             <div className="flex flex-wrap gap-2">
                                {Object.entries(activityTypeConfig).map(([key, { label, icon: Icon }]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleFilterToggle(key as ActivityType)}
                                        className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${activeFilters.includes(key as ActivityType) ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        <Icon className="w-3 h-3"/>
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="pt-2 flex justify-between items-center">
                                <span className="text-sm text-slate-300">Mostrar concluídas</span>
                                <button onClick={() => setShowCompleted(!showCompleted)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showCompleted ? 'bg-violet-600' : 'bg-slate-700'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showCompleted ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>
                {/* Right Column */}
                <GlassCard className="lg:col-span-2 flex flex-col overflow-hidden p-0">
                     <div className="flex-shrink-0 p-4 flex justify-between items-center border-b border-white/10">
                        <h2 className="font-semibold text-white capitalize">{selectedDateString}</h2>
                        <button onClick={() => onNewActivity(selectedDate.toISOString().split('T')[0])} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200">
                            <Plus className="w-4 h-4" />
                            <span>Nova Atividade</span>
                        </button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4">
                        {filteredTasks.length > 0 ? (
                            <div className="space-y-6">
                                {pendingTasks.length > 0 && (
                                    <div>
                                        <h3 className="text-md font-semibold text-white mb-3">Pendentes</h3>
                                        <div className="space-y-3">
                                            {pendingTasks.map(task => (
                                                <TaskItem
                                                    key={task.id}
                                                    task={task}
                                                    leadName={leadsMap.get(task.leadId) || 'N/A'}
                                                    onEditTask={onEditActivity}
                                                    onDeleteTask={onDeleteTask}
                                                    onUpdateTaskStatus={onUpdateTaskStatus}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {completedTasks.length > 0 && showCompleted && (
                                     <div>
                                        <h3 className="text-md font-semibold text-white mb-3">Concluídas</h3>
                                        <div className="space-y-3">
                                            {completedTasks.map(task => (
                                                <TaskItem
                                                    key={task.id}
                                                    task={task}
                                                    leadName={leadsMap.get(task.leadId) || 'N/A'}
                                                    onEditTask={onEditActivity}
                                                    onDeleteTask={onDeleteTask}
                                                    onUpdateTaskStatus={onUpdateTaskStatus}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <p className="font-semibold text-slate-300">Nenhuma atividade agendada</p>
                                <p className="text-sm text-slate-500 mb-4">Nenhuma atividade agendada para este dia</p>
                            </div>
                        )}
                     </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default CalendarPage;
