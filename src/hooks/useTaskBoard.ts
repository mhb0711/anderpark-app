import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_SHARED_TASKS } from '../data/demoCommunity';
import { ensureAnonymousSession, supabase, supabaseConfigured } from '../lib/supabase';
import type { NeedType } from '../types';

export interface SharedTask {
  id: string;
  needType: NeedType;
  label: string;
  restoreAmount: number;
  username: string;
  useCount: number;
  createdAt: number;
  ownedByMe: boolean;
}

type ActionResult = { ok: true } | { ok: false; error: string };

// Until a real Supabase project is connected, the board runs on sample data
// — see DEMO_SHARED_TASKS — so it reads as an active community instead of
// an empty "not connected" state. Sharing/using/removing still work, they
// just edit local state instead of a shared backend.
const demoMode = !supabaseConfigured;

function demoInitialTasks(): SharedTask[] {
  const now = Date.now();
  return DEMO_SHARED_TASKS.map((t, i) => ({
    ...t,
    createdAt: now - i * 3_600_000,
    ownedByMe: false,
  }));
}

// Community task board backed by Supabase: anyone signed in can publish one
// of their own goal tasks and anyone else can browse the board and copy an
// entry into their own goals. Every method is a no-op (or returns a clear
// "not connected" error) until .env.local has real project credentials —
// see .env.example / supabase/schema.sql.
export function useTaskBoard() {
  const [ready, setReady] = useState(demoMode);
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<SharedTask[]>(demoMode ? demoInitialTasks() : []);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;

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
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!supabase) return;
    const { data: rows, error: fetchError } = await supabase
      .from('shared_tasks')
      .select('id, need_type, label, restore_amount, submitted_by, use_count, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (fetchError || !rows) {
      if (fetchError) setError(fetchError.message);
      return;
    }

    const submitterIds = [...new Set(rows.map((r) => r.submitted_by as string))];
    const { data: profiles } = submitterIds.length
      ? await supabase.from('profiles').select('id, username').in('id', submitterIds)
      : { data: [] };
    const usernameById = new Map((profiles ?? []).map((p) => [p.id as string, p.username as string]));

    setTasks(
      rows.map((r) => ({
        id: r.id as string,
        needType: r.need_type as NeedType,
        label: r.label as string,
        restoreAmount: r.restore_amount as number,
        username: usernameById.get(r.submitted_by as string) ?? 'someone',
        useCount: r.use_count as number,
        createdAt: new Date(r.created_at as string).getTime(),
        ownedByMe: r.submitted_by === userIdRef.current,
      })),
    );
  }, []);

  useEffect(() => {
    if (!ready || !supabase) return;
    refetch();

    const client = supabase;
    const channel = client
      .channel('task-board-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_tasks' }, refetch)
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [ready, refetch]);

  const shareTask = useCallback(
    async (needType: NeedType, label: string, restoreAmount: number): Promise<ActionResult> => {
      if (demoMode) {
        setTasks((prev) => [
          { id: `demo-you-${Date.now()}`, needType, label, restoreAmount, username: 'you', useCount: 0, createdAt: Date.now(), ownedByMe: true },
          ...prev,
        ]);
        return { ok: true };
      }
      if (!supabase || !userId) return { ok: false, error: 'Not connected' };
      const { error: insertError } = await supabase
        .from('shared_tasks')
        .insert({ need_type: needType, label, restore_amount: restoreAmount, submitted_by: userId });
      if (insertError) return { ok: false, error: insertError.message };
      await refetch();
      return { ok: true };
    },
    [userId, refetch],
  );

  // Marks a board entry as copied — bumps its use count via an RPC (rather
  // than a direct update) so any signed-in user can do this without needing
  // general write access to rows they don't own.
  const useTask = useCallback(
    async (taskId: string) => {
      if (demoMode) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, useCount: t.useCount + 1 } : t)));
        return;
      }
      if (!supabase) return;
      await supabase.rpc('increment_shared_task_use', { task_id: taskId });
      await refetch();
    },
    [refetch],
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      if (demoMode) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        return;
      }
      if (!supabase) return;
      await supabase.from('shared_tasks').delete().eq('id', taskId);
      await refetch();
    },
    [refetch],
  );

  return { enabled: supabaseConfigured, demoMode, ready, tasks, error, shareTask, useTask, removeTask };
}
