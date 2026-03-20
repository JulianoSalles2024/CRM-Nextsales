export interface CommunityCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  order: number;
  only_admins: boolean;
}

export interface CommunityAuthor {
  id: string;
  full_name: string;
  email: string;
  company_name?: string;
}

export interface CommunityPost {
  id: string;
  category_id: string;
  author_id: string;
  company_id: string;
  title: string;
  content: string;
  upvotes: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_solved: boolean;
  hide_company: boolean;
  created_at: string;
  updated_at: string;
  category?: CommunityCategory;
  comment_count?: number;
  user_voted?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  upvotes: number;
  is_solution: boolean;
  created_at: string;
  replies?: CommunityComment[];
  user_voted?: boolean;
}

export type SortMode = 'recent' | 'popular';

export type ReputationLevel = 'Novato' | 'Contribuidor' | 'Especialista' | 'Embaixador';

export function getReputationLevel(points: number): ReputationLevel {
  if (points >= 500) return 'Embaixador';
  if (points >= 200) return 'Especialista';
  if (points >= 50) return 'Contribuidor';
  return 'Novato';
}
