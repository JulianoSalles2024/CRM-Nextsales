import React, { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { useArticles } from './hooks/useArticles';
import ArticleView from './ArticleView';
import type { SupportArticle, SupportCategory } from './support.types';

interface HelpCenterProps {
  categories: SupportCategory[];
}

const HelpCenter: React.FC<HelpCenterProps> = ({ categories }) => {
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<SupportArticle | null>(null);
  const { articles, loading } = useArticles(search);

  if (selectedArticle) {
    return <ArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  const grouped = categories.map(cat => ({
    ...cat,
    articles: articles.filter(a => a.category_id === cat.id),
  })).filter(g => g.articles.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar artigos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0B1220] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-500"
        />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Carregando artigos...</div>
      ) : grouped.length === 0 ? (
        <div className="text-slate-500 text-sm text-center py-8">
          {search ? 'Nenhum artigo encontrado.' : 'Nenhum artigo publicado ainda.'}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(group => (
            <div key={group.id}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {group.name}
              </h3>
              <div className="flex flex-col gap-1">
                {group.articles.map(article => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="flex items-center justify-between px-4 py-3 bg-[#0B1220] border border-slate-800 rounded-xl text-left hover:border-blue-500/30 hover:bg-blue-950/20 transition-all group"
                  >
                    <span className="text-sm text-slate-300 group-hover:text-white">{article.title}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HelpCenter;
