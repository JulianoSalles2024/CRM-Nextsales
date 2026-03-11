import React, { useEffect } from 'react';
import { Lead, Task, Activity } from '@/types';

interface PrintableLeadsReportProps {
    leads: Lead[];
    tasks: Task[];
    activities: Activity[];
    onPrintEnd: () => void;
}

const PrintableLeadsReport: React.FC<PrintableLeadsReportProps> = ({ leads, tasks, activities, onPrintEnd }) => {
    useEffect(() => {
        const handleAfterPrint = () => {
            onPrintEnd();
        };

        window.addEventListener('afterprint', handleAfterPrint);
        
        // Timeout to ensure content is rendered before printing
        const timer = setTimeout(() => {
             window.print();
        }, 100);

        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
            clearTimeout(timer);
        };
    }, [onPrintEnd]);

    const getTasksForLead = (leadId: Lead['id']) => tasks.filter(t => t.leadId === leadId);
    const getActivitiesForLead = (leadId: Lead['id']) => activities.filter(a => a.leadId === leadId);
    const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });


    return (
        <div className="bg-white text-black p-8 printable-report">
            <style>
                {`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .printable-report {
                        margin: 0;
                        padding: 0;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                }
                `}
            </style>
            <h1 className="text-3xl font-bold mb-2 text-center text-gray-800">Relatório de Leads</h1>
            <p className="text-center text-gray-600 mb-8">Gerado em: {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            {leads.map((lead, index) => (
                <div key={lead.id} className={`pt-8 ${index > 0 ? 'page-break border-t-2 border-gray-200' : ''}`}>
                    <div className="bg-gray-100 p-4 rounded-lg mb-6 border-l-4 border-violet-500">
                        <h2 className="text-2xl font-bold text-violet-700">{lead.name}</h2>
                        <p className="text-gray-700">{lead.company}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                        <div><strong className="text-gray-600">Email:</strong> {lead.email || 'N/A'}</div>
                        <div><strong className="text-gray-600">Telefone:</strong> {lead.phone || 'N/A'}</div>
                        <div><strong className="text-gray-600">Valor:</strong> {currencyFormatter.format(lead.value)}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-2 border-b pb-1 text-gray-700">Atividades Recentes</h3>
                            {getActivitiesForLead(lead.id).length > 0 ? (
                                <ul className="space-y-3 text-sm">
                                    {getActivitiesForLead(lead.id).map(activity => (
                                        <li key={activity.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                                            <p className="font-medium text-gray-800">{activity.text}</p>
                                            <p className="text-xs text-gray-500 mt-1">{activity.authorName} - {new Date(activity.timestamp).toLocaleString('pt-BR')}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-gray-500 italic">Nenhuma atividade registrada.</p>}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2 border-b pb-1 text-gray-700">Tarefas</h3>
                             {getTasksForLead(lead.id).length > 0 ? (
                                <ul className="space-y-3 text-sm">
                                    {getTasksForLead(lead.id).map(task => (
                                        <li key={task.id} className={`p-3 rounded-md border ${task.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                            <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>{task.title}</p>
                                            <p className="text-xs text-gray-500 mt-1">Vencimento: {new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-gray-500 italic">Nenhuma tarefa associada.</p>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PrintableLeadsReport;
