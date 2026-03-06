import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Share2, Award, Plus, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ArenaPost, ArenaProfile } from '../types';

export const ArenaFeed: React.FC = () => {
  const [posts, setPosts] = useState<ArenaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: newPostContent,
          type: 'text'
        });

      if (error) throw error;
      setNewPostContent('');
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Create Post */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 space-y-4">
        <div className="flex space-x-4">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="O que está treinando hoje?"
            className="w-full bg-transparent border-none focus:ring-0 text-zinc-100 placeholder-zinc-500 resize-none h-20"
          />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <div className="flex space-x-4">
            <button className="text-zinc-500 hover:text-emerald-500 transition-colors">
              <ImageIcon size={20} />
            </button>
            <button className="text-zinc-500 hover:text-emerald-500 transition-colors">
              <Award size={20} />
            </button>
          </div>
          <button
            onClick={handleCreatePost}
            disabled={!newPostContent.trim()}
            className="bg-emerald-500 text-black px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest disabled:opacity-50"
          >
            Postar
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden"
            >
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                    {post.author?.avatar_url && (
                      <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">{post.author?.full_name || 'Atleta'}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">@{post.author?.username || 'user'}</p>
                  </div>
                </div>
                {post.type === 'result' && (
                  <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full flex items-center space-x-1">
                    <Award size={12} />
                    <span className="text-[10px] font-black uppercase">Resultado</span>
                  </div>
                )}
              </div>

              {/* Post Content */}
              <div className="px-4 pb-4">
                <p className="text-zinc-300 text-sm leading-relaxed">{post.content}</p>
                {post.media_url && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/5">
                    <img src={post.media_url} alt="" className="w-full h-auto" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              {/* Post Actions */}
              <div className="px-4 py-3 border-t border-white/5 flex items-center space-x-6">
                <button className="flex items-center space-x-2 text-zinc-500 hover:text-rose-500 transition-colors">
                  <Heart size={18} />
                  <span className="text-xs font-bold">{post.likes_count}</span>
                </button>
                <button className="flex items-center space-x-2 text-zinc-500 hover:text-emerald-500 transition-colors">
                  <MessageCircle size={18} />
                  <span className="text-xs font-bold">{post.comments_count}</span>
                </button>
                <button className="flex items-center space-x-2 text-zinc-500 hover:text-blue-500 transition-colors ml-auto">
                  <Share2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
