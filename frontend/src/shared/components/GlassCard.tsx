import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  topColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  header,
  topColor,
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg shadow-black/20 ${className}`}
    >
      {topColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1 z-10"
          style={{ backgroundColor: topColor }}
        />
      )}
      {header && (
        <div className="px-6 py-4 border-b border-white/10">
          {header}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
