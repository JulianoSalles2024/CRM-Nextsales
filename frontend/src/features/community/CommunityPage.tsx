import React, { useState, useRef, useEffect } from 'react';
import { Users, Search, Plus, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '@/src/features/auth/AuthContext';
import { usePosts } from './hooks/usePosts';
import { useVotes } from './hooks/useVotes';
import CategoryFilter from './CategoryFilter';
import PostCard from './PostCard';
import PostDetail from './PostDetail';
import NewPostModal from './NewPostModal';
import type { CommunityPost, SortMode } from './community.types';

const CommunityPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { posts, categories, loading, createPost, refetch } = usePosts(selectedCategory, search, sortMode, userId);
  const { toggleVote } = useVotes(userId);

  const sortTabs: { key: SortMode; label: string; icon: React.ElementType }[] = [
    { key: 'recent', label: 'Recente', icon: Clock },
    { key: 'popular', label: 'Popular', icon: TrendingUp },
  ];

  useEffect(() => {
    const idx = sortTabs.findIndex(t => t.key === sortMode);
    const el = tabRefs.current[idx];
    if (el) setPillStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [sortMode]);

  const handlePostVote = async (postId: string, voted: boolean) => {
    await toggleVote('post', postId, voted);
    refetch();
  };

  if (selectedPost) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <PostDetail
          post={selectedPost}
          authorName={user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Usuário'}
          currentUserId={userId ?? ''}
          onBack={() => setSelectedPost(null)}
          onPostVote={handlePostVote}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 mb-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-900/20 cursor-default">
            <Users className="w-4 h-4" />
            <span>Comunidade</span>
          </button>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Post
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar posts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0B1220] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative bg-slate-900/60 border border-blue-500/10 rounded-xl p-1 flex">
          <div
            className="absolute top-1 bottom-1 bg-blue-500/10 border border-blue-500/20 rounded-lg transition-all duration-300 pointer-events-none"
            style={{ left: pillStyle.left, width: pillStyle.width }}
          />
          {sortTabs.map((tab, idx) => (
            <button
              key={tab.key}
              ref={el => { tabRefs.current[idx] = el; }}
              onClick={() => setSortMode(tab.key)}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                sortMode === tab.key ? 'text-blue-400' : 'text-slate-500 hover:text-white'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Carregando posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          {search ? 'Nenhum post encontrado.' : 'Seja o primeiro a postar nesta categoria!'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              authorName="Usuário"
              onClick={() => setSelectedPost(post)}
            />
          ))}
        </div>
      )}

      {showNewPost && (
        <NewPostModal
          categories={categories}
          onSubmit={async (title, content, catId, hideCompany) => {
            await createPost(title, content, catId, hideCompany);
            setShowNewPost(false);
          }}
          onClose={() => setShowNewPost(false)}
        />
      )}
    </div>
  );
};

export default CommunityPage;
