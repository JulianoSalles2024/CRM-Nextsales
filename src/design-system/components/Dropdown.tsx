import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  items,
  align = 'right',
  width = 'w-48',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.13 }}
            className={[
              'absolute top-full mt-2 z-50 py-1',
              'bg-slate-900 border border-slate-700 rounded-lg shadow-lg',
              width,
              align === 'right' ? 'right-0' : 'left-0',
            ].join(' ')}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.onClick(); onClose(); }}
                className={[
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                  item.danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-slate-200 hover:bg-slate-800',
                ].join(' ')}
              >
                {item.icon && <span className="shrink-0 opacity-60">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;
