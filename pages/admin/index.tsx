import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

type AdminUser = {
  uid: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  conversation_count: number;
  message_count: number;
};

type AdminMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images: string[] | null;
  created_at: string;
};

type AdminConversation = {
  id: string;
  title: string | null;
  updated_at: string | null;
  created_at: string | null;
  messages: AdminMessage[];
};

const PASSWORD_STORAGE_KEY = 'eco-ai-admin-password';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [convsError, setConvsError] = useState<string | null>(null);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(PASSWORD_STORAGE_KEY);
    if (stored) {
      setPassword(stored);
      setAuthed(true);
    }
  }, []);

  const fetchUsers = useCallback(async (pw: string) => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-password': pw }
      });
      if (res.status === 401) {
        setAuthed(false);
        setUsersError('Unauthorized. Wrong password.');
        if (typeof window !== 'undefined') window.sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err: any) {
      setUsersError(err?.message ?? String(err));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (authed && password) fetchUsers(password);
  }, [authed, password, fetchUsers]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    if (!password.trim()) {
      setLoginError('Enter the admin password.');
      return;
    }
    const res = await fetch('/api/admin/users', {
      headers: { 'x-admin-password': password.trim() }
    });
    if (res.status === 401) {
      setLoginError('Wrong password.');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoginError(data?.error ? `Login failed: ${data.error}` : `Login failed (${res.status})`);
      return;
    }
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(PASSWORD_STORAGE_KEY, password.trim());
    }
    setAuthed(true);
  };

  const handleLogout = () => {
    setAuthed(false);
    setPassword('');
    setUsers([]);
    setSelectedUid(null);
    setConversations([]);
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
  };

  const handleSelectUser = useCallback(
    async (uid: string) => {
      setSelectedUid(uid);
      setExpandedConvId(null);
      setLoadingConvs(true);
      setConvsError(null);
      setConversations([]);
      try {
        const res = await fetch(`/api/admin/conversations?uid=${encodeURIComponent(uid)}`, {
          headers: { 'x-admin-password': password }
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }
        const data = await res.json();
        setConversations(data.conversations ?? []);
      } catch (err: any) {
        setConvsError(err?.message ?? String(err));
      } finally {
        setLoadingConvs(false);
      }
    },
    [password]
  );

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((u) => u.uid === selectedUid) ?? null,
    [users, selectedUid]
  );

  if (!authed) {
    return (
      <>
        <Head>
          <title>Admin · Eco AI</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur"
          >
            <h1 className="text-2xl font-semibold">Eco AI Admin</h1>
            <p className="mt-2 text-sm text-slate-400">Enter the admin password to view users and conversations.</p>
            <div className="mt-6">
              <label htmlFor="admin-password" className="block text-sm font-medium text-slate-200">
                Admin password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                autoFocus
              />
            </div>
            {loginError ? <p className="mt-3 text-sm text-rose-400">{loginError}</p> : null}
            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400"
            >
              Sign in
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin · Eco AI</title>
      </Head>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Eco AI Admin</h1>
              <p className="text-xs text-slate-400">All users, conversations, and AI replies</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchUsers(password)}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-rose-400 hover:text-rose-300"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Users ({users.length})
              </h2>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, name, or uid…"
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            {loadingUsers ? <p className="mt-4 text-sm text-slate-400">Loading users…</p> : null}
            {usersError ? <p className="mt-4 text-sm text-rose-400">{usersError}</p> : null}
            <ul className="mt-4 flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
              {filteredUsers.map((u) => (
                <li key={u.uid}>
                  <button
                    onClick={() => handleSelectUser(u.uid)}
                    className={
                      'w-full rounded-xl border px-3 py-2 text-left transition ' +
                      (selectedUid === u.uid
                        ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-600')
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-500/80 text-sm font-semibold text-white">
                        {u.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (u.display_name || u.email || u.uid).slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {u.display_name || u.email || u.uid}
                        </div>
                        <div className="truncate text-xs text-slate-400">{u.email ?? u.uid}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5">
                        {u.conversation_count} chats
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5">
                        {u.message_count} messages
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5">
                        last: {formatDate(u.updated_at)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
              {!loadingUsers && filteredUsers.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                  No users yet. Conversations will appear here once users chat with Eco AI.
                </li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            {!selectedUser ? (
              <div className="flex h-full min-h-[60vh] items-center justify-center text-sm text-slate-500">
                Select a user on the left to view their conversations.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedUser.display_name || selectedUser.email || selectedUser.uid}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {selectedUser.email ?? '—'} · uid {selectedUser.uid}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      {selectedUser.conversation_count} conversations
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      {selectedUser.message_count} messages
                    </span>
                  </div>
                </div>

                {loadingConvs ? <p className="mt-4 text-sm text-slate-400">Loading conversations…</p> : null}
                {convsError ? <p className="mt-4 text-sm text-rose-400">{convsError}</p> : null}

                <div className="mt-4 flex flex-col gap-3">
                  {conversations.map((conv) => {
                    const isOpen = expandedConvId === conv.id;
                    return (
                      <div key={conv.id} className="rounded-xl border border-slate-800 bg-slate-950/40">
                        <button
                          onClick={() => setExpandedConvId(isOpen ? null : conv.id)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-100">
                              {conv.title || 'New Chat'}
                            </div>
                            <div className="text-xs text-slate-400">
                              {conv.messages.length} messages · updated {formatDate(conv.updated_at)}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
                        </button>
                        {isOpen ? (
                          <div className="border-t border-slate-800 px-4 py-4">
                            {conv.messages.length === 0 ? (
                              <p className="text-sm text-slate-500">No messages saved yet.</p>
                            ) : (
                              <ul className="flex flex-col gap-3">
                                {conv.messages.map((m) => (
                                  <li
                                    key={m.id}
                                    className={
                                      'rounded-xl border px-3 py-2 text-sm ' +
                                      (m.role === 'assistant'
                                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100'
                                        : m.role === 'user'
                                        ? 'border-slate-700 bg-slate-900 text-slate-100'
                                        : 'border-slate-800 bg-slate-950 text-slate-400')
                                    }
                                  >
                                    <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
                                      <span>
                                        {m.role === 'assistant'
                                          ? 'Eco AI'
                                          : m.role === 'user'
                                          ? 'User'
                                          : 'System'}
                                      </span>
                                      <span>{formatDate(m.created_at)}</span>
                                    </div>
                                    <div className="whitespace-pre-wrap break-words text-sm text-slate-100">
                                      {m.content}
                                    </div>
                                    {m.images && m.images.length > 0 ? (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {m.images.map((src, i) => (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            key={i}
                                            src={src}
                                            alt=""
                                            className="h-24 w-24 rounded-lg object-cover"
                                          />
                                        ))}
                                      </div>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!loadingConvs && conversations.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                      No conversations for this user yet.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
