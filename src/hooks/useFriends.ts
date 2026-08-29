import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_FRIENDS, mintDemoFriend } from '../data/demoCommunity';
import { ensureAnonymousSession, supabase, supabaseConfigured } from '../lib/supabase';

// Until a real Supabase project is connected, Friends runs on sample data —
// see DEMO_FRIENDS — so the UI reads as a populated community instead of an
// empty "not connected" state. Every mutating action below still works, it
// just edits local state instead of a shared backend.
const demoMode = !supabaseConfigured;

export interface FriendProfile {
  id: string;
  username: string;
  nickname: string;
  appearanceId: string;
  level: number;
  streakCount: number;
  longestStreak: number;
  hyenaHighScore: number;
  hyenaLevelReached: number;
  berryHighScore: number;
  berryLevelReached: number;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  otherUsername: string;
}

export interface SyncedStats {
  nickname: string;
  appearanceId: string;
  level: number;
  streakCount: number;
  longestStreak: number;
  hyenaHighScore: number;
  hyenaLevelReached: number;
  berryHighScore: number;
  berryLevelReached: number;
}

type ActionResult = { ok: true } | { ok: false; error: string };

// Anonymous-auth friends/leaderboard backed by Supabase. Every method is a
// no-op (or returns a clear "not connected" error) until .env.local has real
// project credentials — see .env.example / supabase/schema.sql.
export function useFriends() {
  const [ready, setReady] = useState(demoMode);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>(demoMode ? DEMO_FRIENDS : []);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const statsRef = useRef<SyncedStats | null>(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;
    let cancelled = false;

    (async () => {
      let uid: string | null;
      try {
        uid = await ensureAnonymousSession();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        return;
      }
      if (cancelled || !uid) return;
      setUserId(uid);

      const { data: profile } = await supabase.from('profiles').select('username').eq('id', uid).maybeSingle();
      if (!cancelled) {
        setUsername(profile?.username ?? null);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data: rows, error: fetchError } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (fetchError || !rows) {
      if (fetchError) setError(fetchError.message);
      return;
    }

    const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
    const { data: profiles } = otherIds.length
      ? await supabase.from('profiles').select('*').in('id', otherIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    const friendsList: FriendProfile[] = [];
    const incomingList: FriendRequest[] = [];
    const outgoingList: FriendRequest[] = [];

    for (const r of rows) {
      const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
      const other = profileById.get(otherId);
      if (!other) continue;
      if (r.status === 'accepted') {
        friendsList.push({
          id: otherId,
          username: other.username,
          nickname: other.nickname,
          appearanceId: other.appearance_id,
          level: other.level,
          streakCount: other.streak_count,
          longestStreak: other.longest_streak,
          hyenaHighScore: other.hyena_high_score ?? 0,
          hyenaLevelReached: other.hyena_level_reached ?? 1,
          berryHighScore: other.berry_high_score ?? 0,
          berryLevelReached: other.berry_level_reached ?? 1,
        });
      } else if (r.status === 'pending') {
        const req: FriendRequest = { id: r.id, requesterId: r.requester_id, otherUsername: other.username };
        if (r.requester_id === userId) outgoingList.push(req);
        else incomingList.push(req);
      }
    }

    friendsList.sort((a, b) => b.level - a.level || b.streakCount - a.streakCount);
    setFriends(friendsList);
    setIncoming(incomingList);
    setOutgoing(outgoingList);
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId || !supabase) return;
    refetch();

    const client = supabase;
    const channel = client
      .channel('friends-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refetch)
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [ready, userId, refetch]);

  const claimUsername = useCallback(
    async (name: string): Promise<ActionResult> => {
      if (demoMode) {
        setUsername(name);
        return { ok: true };
      }
      if (!supabase || !userId) return { ok: false, error: 'Not connected' };
      const stats = statsRef.current;
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userId,
        username: name,
        nickname: stats?.nickname ?? '',
        appearance_id: stats?.appearanceId ?? '',
        level: stats?.level ?? 1,
        streak_count: stats?.streakCount ?? 0,
        longest_streak: stats?.longestStreak ?? 0,
        hyena_high_score: stats?.hyenaHighScore ?? 0,
        hyena_level_reached: stats?.hyenaLevelReached ?? 1,
        berry_high_score: stats?.berryHighScore ?? 0,
        berry_level_reached: stats?.berryLevelReached ?? 1,
        updated_at: new Date().toISOString(),
      });
      if (upsertError) {
        return { ok: false, error: upsertError.message.includes('duplicate') ? 'That username is taken' : upsertError.message };
      }
      setUsername(name);
      return { ok: true };
    },
    [userId],
  );

  // Called whenever the local character changes — keeps the leaderboard
  // fresh without the player having to do anything.
  const syncStats = useCallback(
    (stats: SyncedStats) => {
      statsRef.current = stats;
      if (!supabase || !userId || !username) return;
      supabase
        .from('profiles')
        .update({
          nickname: stats.nickname,
          appearance_id: stats.appearanceId,
          level: stats.level,
          streak_count: stats.streakCount,
          longest_streak: stats.longestStreak,
          hyena_high_score: stats.hyenaHighScore,
          hyena_level_reached: stats.hyenaLevelReached,
          berry_high_score: stats.berryHighScore,
          berry_level_reached: stats.berryLevelReached,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .then();
    },
    [userId, username],
  );

  const sendFriendRequest = useCallback(
    async (targetUsername: string): Promise<ActionResult> => {
      if (demoMode) {
        if (targetUsername === username) return { ok: false, error: "That's you!" };
        if (friends.some((f) => f.username === targetUsername)) return { ok: false, error: 'Already friends' };
        setFriends((prev) => [...prev, mintDemoFriend(targetUsername)].sort((a, b) => b.level - a.level || b.streakCount - a.streakCount));
        return { ok: true };
      }
      if (!supabase || !userId) return { ok: false, error: 'Not connected' };
      const { data: target } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', targetUsername)
        .maybeSingle();
      if (!target) return { ok: false, error: 'No one with that username' };
      if (target.id === userId) return { ok: false, error: "That's you!" };
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({ requester_id: userId, addressee_id: target.id, status: 'pending' });
      if (insertError) {
        return { ok: false, error: insertError.message.includes('duplicate') ? 'Already sent' : insertError.message };
      }
      await refetch();
      return { ok: true };
    },
    [userId, refetch, username, friends],
  );

  const respondToRequest = useCallback(
    async (requestId: string, accept: boolean) => {
      if (!supabase) return;
      if (accept) {
        await supabase.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', requestId);
      } else {
        await supabase.from('friendships').delete().eq('id', requestId);
      }
      await refetch();
    },
    [refetch],
  );

  return {
    enabled: supabaseConfigured,
    demoMode,
    ready,
    username,
    friends,
    incoming,
    outgoing,
    error,
    claimUsername,
    syncStats,
    sendFriendRequest,
    respondToRequest,
  };
}
