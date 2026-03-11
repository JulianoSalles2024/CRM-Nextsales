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
      className={`bg-white/5 backdrop-blur-md border border-white/5 rounded-xl p-4 ${className}`}
    >
      {children}
    </div>
  );
};
