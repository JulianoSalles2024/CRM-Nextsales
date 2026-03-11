import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { Tag as TagType } from '@/types';

interface TagFilterPopupProps {
    allTags: TagType[];
    selectedTags: TagType[];
    onTagToggle: (tag: TagType) => void;
    onClose: () => void;
    onClear: () => void;
}

const TagFilterPopup: React.FC<TagFilterPopupProps> = ({ allTags, selectedTags, onTagToggle, onClose, onClear }) => {
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const isSelected = (tag: TagType) => selectedTags.some(selected => selected.id === tag.id);

    return (
        <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-72 bg-slate-900 rounded-lg border border-slate-800 shadow-xl shadow-slate-950/50 z-50 overflow-hidden"
        >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <div>
                    <h3 className="font-semibold text-white">Filtrar por Tags</h3>
                    <p className="text-sm text-slate-400">Selecione uma ou mais tags.</p>
                </div>
                <button onClick={() => { onClear(); onClose(); }} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Limpar</button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar bg-slate-900">
                {allTags.length > 0 ? allTags.map((tag) => (
                    <button
                        key={tag.id}
                        onClick={() => onTagToggle(tag)}
                        className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-slate-800 transition-colors text-left group"
                    >
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all" style={{ backgroundColor: tag.color }}></span>
                            <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{tag.name}</span>
                        </div>
                        {isSelected(tag) && <Check className="w-4 h-4 text-violet-500" />}
                    </button>
                )) : (
                    <p className="p-6 text-center text-sm text-slate-500">Nenhuma tag encontrada.</p>
                )}
            </div>
        </motion.div>
    );
};

export default TagFilterPopup;