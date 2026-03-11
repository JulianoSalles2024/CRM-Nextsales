import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  rows?: number;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

const baseInput = [
  'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2',
  'text-sm text-slate-100 placeholder-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  'transition-colors duration-150',
].join(' ');

export const Input: React.FC<InputProps> = ({ label, error, hint, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
    <input className={`${baseInput} ${error ? 'border-red-500' : ''} ${className}`} {...props} />
    {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export const Textarea: React.FC<TextareaProps> = ({ label, error, hint, rows = 3, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
    <textarea
      rows={rows}
      className={`${baseInput} resize-none ${error ? 'border-red-500' : ''} ${className}`}
      {...props}
    />
    {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export const Select: React.FC<SelectProps> = ({ label, error, children, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
    <select
      className={`${baseInput} appearance-none ${error ? 'border-red-500' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export default Input;
