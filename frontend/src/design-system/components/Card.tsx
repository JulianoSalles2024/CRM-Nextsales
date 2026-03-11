import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', padding = true }) => (
  <div className={[
    'bg-slate-900 border border-slate-700 rounded-xl shadow-sm',
    padding ? 'p-6' : '',
    className,
  ].join(' ')}>
    {children}
  </div>
);

export default Card;
