import { useState } from 'react';
import { getAppearance } from '../data/appearances';
import type { useFriends } from '../hooks/useFriends';

interface Props {
  friends: ReturnType<typeof useFriends>;
  onClose: () => void;
}

export function FriendsModal({ friends, onClose }: Props) {
  const { demoMode, ready, username, friends: list, incoming, outgoing, claimUsername, sendFriendRequest, respondToRequest } = friends;
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [friendInput, setFriendInput] = useState('');
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSent, setFriendSent] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-emerald-900">Friends</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50">
            Close
          </button>
        </div>

        {!ready && <p className="text-sm text-emerald-600">Connecting...</p>}

        {ready && demoMode && (
          <p className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Preview community — sample friends so you can see how this looks. Connect Supabase (
            <code>.env.example</code>, <code>supabase/schema.sql</code>) to make it real.
          </p>
        )}

        {ready && !username && (
          <div>
            <p className="mb-3 text-sm text-emerald-700">Pick a username so friends can find you.</p>
            <div className="flex gap-2">
              <input
                value={usernameDraft}
                onChange={(e) => setUsernameDraft(e.target.value)}
                placeholder="username"
                maxLength={20}
                className="flex-1 rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <button
                onClick={async () => {
                  setUsernameError(null);
                  const trimmed = usernameDraft.trim();
                  if (!trimmed) return;
                  const result = await claimUsername(trimmed);
                  if (!result.ok) setUsernameError(result.error);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Claim
              </button>
            </div>
            {usernameError && <p className="mt-2 text-xs text-rose-500">{usernameError}</p>}
          </div>
        )}

        {ready && username && (
          <>
            <p className="mb-4 font-mono text-xs text-emerald-500">You're @{username}</p>

            <div className="mb-4 flex gap-2">
              <input
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                placeholder="Add a friend by username"
                className="flex-1 rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <button
                onClick={async () => {
                  setFriendError(null);
                  setFriendSent(false);
                  const trimmed = friendInput.trim();
                  if (!trimmed) return;
                  const result = await sendFriendRequest(trimmed);
                  if (!result.ok) setFriendError(result.error);
                  else {
                    setFriendSent(true);
                    setFriendInput('');
                  }
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>
            {friendError && <p className="mb-3 -mt-2 text-xs text-rose-500">{friendError}</p>}
            {friendSent && <p className="mb-3 -mt-2 text-xs text-emerald-500">Request sent!</p>}

            {incoming.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-500">Requests</h3>
                <ul className="space-y-2">
                  {incoming.map((req) => (
                    <li
                      key={req.id}
                      className="flex items-center justify-between rounded-xl border border-emerald-100 px-3 py-2"
                    >
                      <span className="text-sm text-emerald-800">@{req.otherUsername}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToRequest(req.id, true)}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondToRequest(req.id, false)}
                          className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600"
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {outgoing.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-500">Pending</h3>
                <ul className="space-y-1">
                  {outgoing.map((req) => (
                    <li key={req.id} className="text-xs text-emerald-500">
                      @{req.otherUsername} — waiting
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-500">Leaderboard</h3>
            {list.length === 0 ? (
              <p className="text-sm text-emerald-500">No friends yet — add one above.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((friend, i) => {
                  const appearance = getAppearance(friend.appearanceId || 'octopus');
                  return (
                    <li
                      key={friend.id}
                      className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2"
                    >
                      <span className="w-5 text-center text-xs font-bold text-emerald-400">#{i + 1}</span>
                      <img src={appearance.image} alt="" className="h-8 w-8 object-contain" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-emerald-900">{friend.nickname || `@${friend.username}`}</p>
                        <p className="text-[11px] text-emerald-500">@{friend.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-emerald-700">Lv{friend.level}</p>
                        <p className="text-[11px] text-orange-500">🔥 {friend.streakCount}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
