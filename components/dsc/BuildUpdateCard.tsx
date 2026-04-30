import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts, radii } from '@/lib/theme';
import type { BuildUpdate } from '@/types/db';
import { Avatar } from './Avatar';
import { Text } from './Text';

export type BuildUpdateWithMeta = BuildUpdate & {
  like_count: number;
  i_liked: boolean;
  comment_count: number;
};

export type CommentRow = {
  id: string;
  build_update_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    full_name: string | null;
    profile_photo_url: string | null;
  } | null;
};

export function BuildUpdateCard({
  update,
  comments,
  onToggleLike,
  onCommentAdded,
}: {
  update: BuildUpdateWithMeta;
  comments: CommentRow[];
  onToggleLike: (updateId: string) => void;
  onCommentAdded?: (updateId: string) => void;
}) {
  const { profile } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const photos = update.photo_urls ?? [];
  const date = new Date(update.created_at);

  async function submitComment() {
    if (!profile?.id || !draft.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('build_update_comments').insert({
      build_update_id: update.id,
      user_id: profile.id,
      content: draft.trim(),
    });
    setSubmitting(false);
    if (error) {
      console.error('[build-update] comment failed', error);
      return;
    }
    setDraft('');
    onCommentAdded?.(update.id);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="caption" tone="muted">
          {date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}{' '}
          ·{' '}
          {date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <Text style={styles.body}>{update.content}</Text>

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12, marginHorizontal: -2 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
        >
          {photos.map((url, idx) => (
            <Image
              key={`${update.id}-${idx}`}
              source={{ uri: url }}
              style={styles.thumb}
              contentFit="cover"
              transition={120}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => onToggleLike(update.id)}
          style={({ pressed }) => [styles.action, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text
            style={[
              styles.actionText,
              { color: update.i_liked ? colors.terracotta : colors.textSecondary },
            ]}
          >
            {update.i_liked ? '♥' : '♡'} {update.like_count}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={({ pressed }) => [styles.action, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.actionText}>
            💬 {update.comment_count}
          </Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.commentsBlock}>
          {comments.length === 0 ? (
            <Text variant="caption" tone="muted">
              No comments yet.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <Avatar
                    url={c.author?.profile_photo_url}
                    name={c.author?.full_name}
                    size="sm"
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" tone="muted">
                      {c.author?.full_name ?? 'Member'} ·{' '}
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text variant="small" style={{ marginTop: 2 }}>
                      {c.content}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.commentForm}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Drop a comment…"
              placeholderTextColor={colors.textMuted}
              style={styles.commentInput}
              multiline
            />
            <Pressable
              onPress={submitComment}
              disabled={submitting || !draft.trim()}
              style={({ pressed }) => [
                styles.commentSubmit,
                {
                  opacity: submitting || !draft.trim() ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.commentSubmitText}>POST</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  body: {
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  thumb: {
    width: 240,
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  action: {
    paddingVertical: 4,
  },
  actionText: {
    color: colors.textSecondary,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  commentsBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  commentForm: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 13,
    minHeight: 36,
  },
  commentSubmit: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.terracotta,
  },
  commentSubmitText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
  },
});
