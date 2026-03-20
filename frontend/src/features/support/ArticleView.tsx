import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import type { SupportArticle } from './support.types';

interface ArticleViewProps {
  article: SupportArticle;
  onBack: () => void;
}

const ArticleView: React.FC<ArticleViewProps> = ({ article, onBack }) => (
  <div className="flex flex-col gap-4">
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-fit"
    >
      <ArrowLeft className="w-4 h-4" />
      Voltar
    </button>
    <div className="bg-[#0B1220] border border-slate-800 rounded-2xl p-6">
      {article.category && (
        <span className="text-xs text-blue-400 font-medium uppercase tracking-wide mb-2 block">
          {article.category.name}
        </span>
      )}
      <h1 className="text-xl font-bold text-white mb-4">{article.title}</h1>
      <div className="prose prose-invert prose-sm max-w-none text-slate-300">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>
    </div>
  </div>
);

export default ArticleView;
