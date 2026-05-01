import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Avatar, Button, Card, Text } from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { useThread } from '@/hooks/use-messaging';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts, radii } from '@/lib/theme';
import type { Message, Profile } from '@/types/db';

type PeerLite = Pick<
  Profile,
  'id' | 'full_name' | 'profile_photo_url' | 'app_number' | 'status'
>;

export default function ThreadScreen() {
  const { id: peerId } = useLocalSearchParams<{ id: string }>();
  const { profile, session } = useAuth();
  const me = session?.user.id;
  const { messages, loading, error, sendMessage, markRead } = useThread(peerId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [peer, setPeer] = useState<PeerLite | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const canMessage =
    profile?.status === 'paid' || profile?.role === 'admin';

  // Load peer profile
  useEffect(() => {
    let active = true;
    if (!peerId || !isSupabaseConfigured) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url, app_number, status')
        .eq('id', peerId)
        .maybeSingle();
      if (!active) return;
      setPeer((data as PeerLite | null) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [peerId]);

  // Mark thread read on focus + when new messages arrive
  useFocusEffect(
    useCallback(() => {
      markRead();
    }, [markRead]),
  );
  useEffect(() => {
    markRead();
  }, [messages.length, markRead]);

  // Auto-scroll to latest
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    const result = await sendMessage(draft);
    setSending(false);
    if (!result.ok) {
      console.error('[thread] send failed', result.error);
      showError('Could not send', result.error ?? 'Unknown error');
      return;
    }
    setDraft('');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Stack.Screen
        options={{
          title: peer?.full_name ?? 'Member',
          headerShown: true,
        }}
      />

      <View style={styles.peerHeader}>
        <Pressable
          onPress={() =>
            peer?.id
              ? router.push({ pathname: '/u/[id]', params: { id: peer.id } })
              : null
          }
          style={({ pressed }) => [
            styles.peerInner,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Avatar
            url={peer?.profile_photo_url}
            name={peer?.full_name}
            size="md"
          />
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold" numberOfLines={1}>
              {peer?.full_name ?? 'Member'}
              {peer?.app_number
                ? ` · #${String(peer.app_number).padStart(3, '0')}`
                : ''}
            </Text>
            <Text variant="caption" tone="muted">
              TAP TO VIEW PROFILE
            </Text>
          </View>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Card variant="inset">
            <Text tone="muted">Couldn{'’'}t load: {error}</Text>
          </Card>
        ) : loading && messages.length === 0 ? (
          <Text tone="muted">Loading…</Text>
        ) : messages.length === 0 ? (
          <Card variant="inset">
            <Text variant="bodyBold">No messages yet.</Text>
            <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
              Say hi.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {messages.map((m, i) => (
              <Bubble
                key={m.id}
                message={m}
                fromMe={m.sender_id === me}
                showTime={shouldShowTime(messages, i)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {canMessage ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
          />
          <Button
            label={sending ? '…' : 'Send'}
            size="sm"
            disabled={!draft.trim() || sending}
            loading={sending}
            onPress={handleSend}
          />
        </View>
      ) : (
        <View style={styles.composerLocked}>
          <Text variant="small" tone="muted" style={{ textAlign: 'center' }}>
            Paid members can send messages. Upgrade your tier from the home
            tab.
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Bubble({
  message,
  fromMe,
  showTime,
}: {
  message: Message;
  fromMe: boolean;
  showTime: boolean;
}) {
  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: fromMe ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.bubble,
          fromMe ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: fromMe ? colors.ink : colors.textPrimary },
          ]}
        >
          {message.content}
        </Text>
        {showTime ? (
          <Text
            style={[
              styles.bubbleTime,
              {
                color: fromMe
                  ? 'rgba(11, 11, 13, 0.6)'
                  : colors.textMuted,
              },
            ]}
          >
            {new Date(message.created_at).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function shouldShowTime(messages: Message[], i: number): boolean {
  if (i === messages.length - 1) return true;
  const cur = new Date(messages[i].created_at).getTime();
  const next = new Date(messages[i + 1].created_at).getTime();
  return next - cur > 5 * 60 * 1000; // > 5 min gap
}

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  peerHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  peerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scroll: {
    padding: 16,
    paddingBottom: 24,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    width: '100%',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.lg,
  },
  bubbleMine: {
    backgroundColor: colors.terracotta,
    borderTopRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTime: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  composerLocked: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
