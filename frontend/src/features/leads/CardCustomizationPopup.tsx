
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CardDisplaySettings } from '@/types';

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-600'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
);

interface CardCustomizationPopupProps {
    settings: CardDisplaySettings;
    onUpdate: (newSettings: CardDisplaySettings) => void;
    onClose: () => void;
}

const CardCustomizationPopup: React.FC<CardCustomizationPopupProps> = ({ settings, onUpdate, onClose }) => {
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

    const handleToggle = (key: keyof CardDisplaySettings) => {
        onUpdate({ ...settings, [key]: !settings[key] });
    };

    const settingOptions: { key: keyof CardDisplaySettings; label: string }[] = [
        { key: 'showValue', label: 'Mostrar Valor do Lead' },
        { key: 'showTags', label: 'Mostrar Tags' },
        { key: 'showProbability', label: 'Mostrar Probabilidade' },
        { key: 'showAssignedTo', label: 'Mostrar Usuário Responsável' },
        { key: 'showEmail', label: 'Mostrar E-mail' },
        { key: 'showPhone', label: 'Mostrar Telefone' },
        { key: 'showCreatedAt', label: 'Mostrar Data de Captura' },
    ];

    return (
        <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg z-20"
        >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Personalizar Cards</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Escolha quais campos exibir.</p>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
                {settingOptions.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800/50">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">{label}</label>
                        <ToggleSwitch checked={settings[key]} onChange={() => handleToggle(key)} />
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default CardCustomizationPopup;
