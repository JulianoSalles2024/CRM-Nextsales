import React from 'react';
import { ThumbsUp, MessageSquare, Pin, CheckCircle2 } from 'lucide-react';
import type { CommunityPost } from './community.types';
import ReputationBadge from './ReputationBadge';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

interface PostCardProps {
  post: CommunityPost;
  authorName: string;
  authorPoints?: number;
  onClick: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, authorName, authorPoints = 0, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-4 px-5 py-4 bg-[#0B1220] border border-slate-800 rounded-xl text-left hover:border-blue-500/30 hover:bg-blue-950/10 transition-all group"
  >
    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
      <ThumbsUp className={`w-4 h-4 ${post.user_voted ? 'text-blue-400' : 'text-slate-600'}`} />
      <span className="text-xs font-semibold text-slate-400">{post.upvotes}</span>
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {post.is_pinned && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
        {post.is_solved && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
        <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 truncate transition-colors">
          {post.title}
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {post.category && (
          <span className="text-blue-400/70">{post.category.name}</span>
        )}
        <span>{authorName}</span>
        <ReputationBadge points={authorPoints} size="xs" />
        <span>{timeAgo(post.created_at)}</span>
      </div>
    </div>

    <div className="flex items-center gap-1 text-slate-600 flex-shrink-0 pt-0.5">
      <MessageSquare className="w-3.5 h-3.5" />
      <span className="text-xs">{post.comment_count ?? 0}</span>
    </div>
  </button>
);

export default PostCard;
