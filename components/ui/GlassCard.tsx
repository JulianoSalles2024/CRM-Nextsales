import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className }) => {
  return (
    <div
      className={`
        bg-[rgba(10,16,28,0.72)]
        backdrop-blur-[14px]
        border border-white/5
        ${className ?? ''}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;