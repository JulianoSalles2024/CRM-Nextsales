import React from 'react';

interface FlatCardProps {
  children: React.ReactNode;
  className?: string;
}

const FlatCard: React.FC<FlatCardProps> = ({ children, className }) => {
  return (
    <div
      className={`
        bg-slate-900/50
        border border-slate-800
        rounded-xl
        ${className ?? ''}
      `}
    >
      {children}
    </div>
  );
};

export default FlatCard;
