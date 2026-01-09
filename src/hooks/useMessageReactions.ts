import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export function useMessageReactions(messageId: string) {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch reactions for this message
  const fetchReactions = useCallback(async () => {
    if (!workspaceId || !messageId) return;

    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('message_id', messageId);

      if (error) throw error;
      setReactions(data || []);
    } catch (err) {
      console.error('[useMessageReactions] fetch error:', err);
    }
  }, [workspaceId, messageId]);

  // Add or toggle reaction
  const toggleReaction = useCallback(async (emoji: string) => {
    if (!workspaceId || !messageId || !user?.id) return;

    setLoading(true);
    try {
      // Check if user already reacted with this emoji
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
        setReactions(prev => prev.filter(r => r.id !== existingReaction.id));
      } else {
        // Add reaction
        const { data, error } = await supabase
          .from('message_reactions')
          .insert({
            workspace_id: workspaceId,
            message_id: messageId,
            user_id: user.id,
            emoji,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setReactions(prev => [...prev, data]);
        }
      }
    } catch (err) {
      console.error('[useMessageReactions] toggle error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, messageId, user?.id, reactions]);

  // Group reactions by emoji
  const groupedReactions: GroupedReaction[] = reactions.reduce((acc, reaction) => {
    const existing = acc.find(g => g.emoji === reaction.emoji);
    if (existing) {
      existing.count++;
      if (reaction.user_id === user?.id) {
        existing.userReacted = true;
      }
    } else {
      acc.push({
        emoji: reaction.emoji,
        count: 1,
        userReacted: reaction.user_id === user?.id,
      });
    }
    return acc;
  }, [] as GroupedReaction[]);

  // Fetch on mount
  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  return {
    reactions,
    groupedReactions,
    toggleReaction,
    loading,
    refetch: fetchReactions,
  };
}
