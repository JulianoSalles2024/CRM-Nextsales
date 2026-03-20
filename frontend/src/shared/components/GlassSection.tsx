import React from 'react';

interface GlassSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassSection: React.FC<GlassSectionProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-slate-900/40 border border-slate-800 rounded-xl p-4 ${className}`}
    >
      {children}
    </div>
  );
};
