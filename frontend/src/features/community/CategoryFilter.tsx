import React from 'react';
import type { CommunityCategory } from './community.types';

interface CategoryFilterProps {
  categories: CommunityCategory[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selected, onSelect }) => (
  <div className="flex flex-wrap gap-2">
    <button
      onClick={() => onSelect(null)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        selected === null
          ? 'bg-blue-950/40 border-blue-500/30 text-blue-400'
          : 'border-slate-700 text-slate-500 hover:text-white hover:bg-white/5'
      }`}
    >
      Todos
    </button>
    {categories.map(cat => (
      <button
        key={cat.id}
        onClick={() => onSelect(cat.id)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          selected === cat.id
            ? 'bg-blue-950/40 border-blue-500/30 text-blue-400'
            : 'border-slate-700 text-slate-500 hover:text-white hover:bg-white/5'
        }`}
      >
        {cat.name}
      </button>
    ))}
  </div>
);

export default CategoryFilter;
