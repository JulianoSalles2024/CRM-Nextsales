import React from 'react';
import { getReputationLevel } from './community.types';

const colors = {
  Novato: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  Contribuidor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Especialista: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Embaixador: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

interface ReputationBadgeProps {
  points: number;
  size?: 'sm' | 'xs';
}

const ReputationBadge: React.FC<ReputationBadgeProps> = ({ points, size = 'sm' }) => {
  const level = getReputationLevel(points);
  return (
    <span className={`font-medium border rounded-full px-2 py-0.5 ${colors[level]} ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
      {level}
    </span>
  );
};

export default ReputationBadge;
