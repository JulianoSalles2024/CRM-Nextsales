import React from 'react';
import { Task, Id } from '@/types';
import { Edit, Trash2, Check, Calendar, Circle, CheckCircle2, Undo2 } from 'lucide-react';

interface TaskItemProps {
    task: Task;
    leadName: string;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: Id) => void;
    onUpdateTaskStatus: (taskId: Id, status: 'pending' | 'completed') => void;
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const TaskItem: React.FC<TaskItemProps> =
({ task, leadName, onEditTask, onDeleteTask, onUpdateTaskStatus }) => {

    const isPending = task.status === 'pending';

    return (
         <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50">
            <div className="flex-shrink-0 mt-1">
                {isPending ? <Circle className="w-5 h-5 text-slate-500" /> : <CheckCircle2 className="w-5 h-5 text-green-400" />}
            </div>
            <div className="flex-1">
                <p className={`font-medium text-white ${!isPending ? 'line-through text-slate-500' : ''}`}>{task.title}</p>
                {task.description && <p className={`text-sm text-slate-400 mt-1 ${!isPending ? 'line-through' : ''}`}>{task.description}</p>}
                <div className="flex items-center gap-6 text-xs text-slate-500 mt-2">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3"/>
                        <span>{formatDate(task.dueDate)}</span>
                    </div>
                     <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400">Lead:</span>
                        <span>{leadName}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isPending ? (
                    <button onClick={() => onUpdateTaskStatus(task.id, 'completed')} className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-md" title="Concluir tarefa">
                        <Check className="w-4 h-4"/>
                    </button>
                ) : (
                    <button onClick={() => onUpdateTaskStatus(task.id, 'pending')} className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded-md" title="Reabrir tarefa">
                        <Undo2 className="w-4 h-4"/>
                    </button>
                )}
                <button onClick={() => onEditTask(task)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md" title="Editar tarefa">
                    <Edit className="w-4 h-4"/>
                </button>
                 <button onClick={() => onDeleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700 rounded-md" title="Excluir tarefa">
                    <Trash2 className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );
};

export default TaskItem;
