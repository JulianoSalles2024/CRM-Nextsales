import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { CommunityPost, CommunityCategory, SortMode } from '../community.types';

export function usePosts(categoryId: string | null, searchQuery: string, sortMode: SortMode, userId?: string | null) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('community_categories')
      .select('*')
      .order('order');
    setCategories((data ?? []) as CommunityCategory[]);
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('community_posts')
      .select('*, category:community_categories(*)');

    if (categoryId) query = query.eq('category_id', categoryId);
    if (searchQuery.trim()) query = query.ilike('title', `%${searchQuery}%`);

    if (sortMode === 'popular') {
      query = query.order('upvotes', { ascending: false });
    } else {
      query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    }

    const { data } = await query.limit(50);
    setPosts((data ?? []) as CommunityPost[]);
    setLoading(false);
  }, [categoryId, searchQuery, sortMode]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const createPost = async (
    title: string,
    content: string,
    catId: string,
    hideCompany: boolean
  ) => {
    const { error } = await supabase.from('community_posts').insert({
      title,
      content,
      category_id: catId,
      hide_company: hideCompany,
      ...(userId ? { author_id: userId } : {}),
    });
    if (!error) fetchPosts();
    return { error };
  };

  return { posts, categories, loading, createPost, refetch: fetchPosts };
}
