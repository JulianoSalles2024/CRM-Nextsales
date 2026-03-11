
import React, { useState } from 'react';
import { X, Download, Upload, Copy, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Board } from '@/types';

interface ExportImportModalProps {
    boards: Board[];
    onClose: () => void;
    onImport: (importedBoards: Board[]) => void;
}

const ExportImportModal: React.FC<ExportImportModalProps> = ({ boards, onClose, onImport }) => {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>(boards.map(b => b.id));
    const [exportName, setExportName] = useState(boards[0]?.name || 'Template');
    const [copied, setCopied] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [isInstalling, setIsInstalling] = useState(false);

    const handleToggleBoard = (id: string) => {
        setSelectedBoardIds(prev => 
            prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
        );
    };

    const getExportData = () => {
        const selectedBoards = boards.filter(b => selectedBoardIds.includes(b.id));
        return JSON.stringify({
            name: exportName,
            version: '1.0',
            exportedAt: new Date().toISOString(),
            boards: selectedBoards
        }, null, 2);
    };

    const handleDownload = () => {
        const data = getExportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportName.toLowerCase().replace(/\s+/g, '-')}-template.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getExportData());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImport = () => {
        try {
            const data = JSON.parse(importJson);
            if (data && Array.isArray(data.boards)) {
                setIsInstalling(true);
                setTimeout(() => {
                    onImport(data.boards);
                    setIsInstalling(false);
                    onClose();
                }, 1500);
            } else {
                alert('Formato de JSON inválido. Certifique-se de que é um template válido.');
            }
        } catch (e) {
            alert('Erro ao processar JSON. Verifique se o texto está correto.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImportJson(event.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Exportar template (comunidade)</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    <div className="flex bg-slate-800 p-1 rounded-lg self-start">
                        <button 
                            onClick={() => setActiveTab('export')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'export' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Exportar
                        </button>
                        <button 
                            onClick={() => setActiveTab('import')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Importar JSON
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'export' ? (
                            <motion.div 
                                key="export"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Exportar template</h4>
                                    <span className="text-xs text-slate-500">Selecione 1 board (template simples) ou vários (jornada).</span>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-6 space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-white">1) Baixar arquivo do template</p>
                                        <p className="text-xs text-slate-500">Esse arquivo é o que você vai guardar/publicar na comunidade.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Nome (aparece na comunidade)</label>
                                        <input 
                                            type="text"
                                            value={exportName}
                                            onChange={(e) => setExportName(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-xs font-medium text-slate-400 uppercase">boards da jornada (ordem importa)</label>
                                        <p className="text-xs text-slate-500">Ordem que será exportada: {boards.filter(b => selectedBoardIds.includes(b.id)).map(b => b.name).join(', ')}</p>
                                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                                            {boards.map((board, index) => (
                                                <div key={board.id} className="flex items-center justify-between p-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="checkbox"
                                                            checked={selectedBoardIds.includes(board.id)}
                                                            onChange={() => handleToggleBoard(board.id)}
                                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                                                        />
                                                        <span className="text-sm text-slate-300">{board.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button className="p-1 text-slate-500 hover:text-white transition-colors"><ArrowUp className="w-4 h-4" /></button>
                                                        <button className="p-1 text-slate-500 hover:text-white transition-colors"><ArrowDown className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleDownload}
                                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-semibold transition-all"
                                        >
                                            <Download className="w-4 h-4" />
                                            Baixar arquivo
                                        </button>
                                        <button 
                                            onClick={handleCopy}
                                            className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-4 py-2.5 rounded-lg font-semibold transition-all"
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            Copiar arquivo (texto)
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="import"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-6 space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-white">Importar template (arquivo JSON)</p>
                                        <p className="text-xs text-slate-500">Faça upload do arquivo exportado e clique em Instalar.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Escolher Arquivo</label>
                                            <input 
                                                type="file" 
                                                accept=".json"
                                                onChange={handleFileChange}
                                                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Colar JSON manualmente (avançado)</label>
                                            <textarea 
                                                value={importJson}
                                                onChange={(e) => setImportJson(e.target.value)}
                                                placeholder="Cole o conteúdo do arquivo JSON aqui..."
                                                rows={6}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleImport}
                                        disabled={!importJson || isInstalling}
                                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-3 rounded-lg font-semibold transition-all"
                                    >
                                        {isInstalling ? (
                                            <>
                                                <motion.div 
                                                    animate={{ rotate: 360 }}
                                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                >
                                                    <Upload className="w-5 h-5" />
                                                </motion.div>
                                                Instalando...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5 rotate-180" />
                                                Instalar jornada
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ExportImportModal;
