import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'classnames';
import { sendEmailVerification, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';

type ProfilePageProps = {
  colorScheme?: 'light' | 'dark';
  toggleColorScheme?: () => void;
};

type StatusMessage = {
  type: 'success' | 'error';
  message: string;
};

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || 'Eco AI';
  const parts = source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return source.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function ProfilePage({ colorScheme = 'light', toggleColorScheme }: ProfilePageProps) {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setPhotoUrl(user.photoURL ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin?from=profile');
    }
  }, [authLoading, user, router]);

  const backgroundClass = clsx(
    'min-h-screen bg-gradient-to-br transition-colors duration-500',
    colorScheme === 'dark'
      ? 'from-slate-950 via-slate-900 to-slate-800 text-slate-100'
      : 'from-emerald-50 via-sky-50 to-white text-slate-900'
  );

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setStatus(null);
    setIsSaving(true);

    const trimmedName = displayName.trim();
    const trimmedPhoto = photoUrl.trim();

    try {
      await updateProfile(user, {
        displayName: trimmedName.length > 0 ? trimmedName : null,
        photoURL: trimmedPhoto.length > 0 ? trimmedPhoto : null
      });

      await user.reload();
      const refreshedUser = auth.currentUser;
      setDisplayName(refreshedUser?.displayName ?? trimmedName);
      setPhotoUrl(refreshedUser?.photoURL ?? trimmedPhoto);

      setStatus({
        type: 'success',
        message: 'Profile updated successfully.'
      });
    } catch (err) {
      console.error('Failed to update profile', err);
      setStatus({
        type: 'error',
        message: 'Unable to update profile right now. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user) return;
    setStatus(null);
    setIsSendingVerification(true);

    try {
      await sendEmailVerification(user);
      setStatus({
        type: 'success',
        message: 'Verification email sent. Please check your inbox.'
      });
    } catch (err) {
      console.error('Failed to send verification email', err);
      setStatus({
        type: 'error',
        message: 'Unable to send verification email. Please try again later.'
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      setStatus({
        type: 'error',
        message: 'No email is associated with this account.'
      });
      return;
    }

    setStatus(null);
    setIsSendingReset(true);

    try {
      await sendPasswordResetEmail(auth, user.email);
      setStatus({
        type: 'success',
        message: 'Password reset email sent. Follow the instructions in your inbox.'
      });
    } catch (err) {
      console.error('Failed to send password reset email', err);
      setStatus({
        type: 'error',
        message: 'Unable to send a password reset email right now. Please try again.'
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!user) return false;
    const trimmedName = displayName.trim();
    const trimmedPhoto = photoUrl.trim();
    const initialName = user.displayName ?? '';
    const initialPhoto = user.photoURL ?? '';
    return trimmedName !== initialName || trimmedPhoto !== initialPhoto;
  }, [displayName, photoUrl, user]);

  if (authLoading || (!user && typeof window !== 'undefined')) {
    return (
      <div className={backgroundClass}>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-3xl border border-white/60 bg-white/85 px-8 py-6 text-center text-slate-600 shadow-xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200">
            <p className="text-sm">Loading your profile…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const joinedAt = user.metadata?.creationTime ? new Date(user.metadata.creationTime) : null;
  const lastSignInAt = user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null;
  const userInitials = getInitials(user.displayName, user.email);
  const emailVerified = Boolean(user.emailVerified);

  return (
    <div className={backgroundClass}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/80 px-5 py-4 shadow-xl backdrop-blur-xl transition dark:border-slate-700/60 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-semibold text-white shadow-lg">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? user.email ?? 'Account avatar'}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                userInitials
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Your Eco AI Profile</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Manage your account details and preferences.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/chat"
              className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-200"
            >
              Back to chat
            </Link>
            <button
              type="button"
              onClick={() => toggleColorScheme?.()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-600 transition hover:-translate-y-0.5 hover:text-emerald-500 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-200"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? '🌞' : '🌙'}
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push('/auth/signin');
              }}
              className="inline-flex items-center rounded-full border border-transparent bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-100 dark:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Profile details</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Update your display name or avatar. Changes sync instantly across Eco AI.
            </p>

            <form onSubmit={handleUpdateProfile} className="mt-6 space-y-5">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Add your name"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                />
              </div>
              <div>
                <label htmlFor="photoUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Avatar URL
                </label>
                <input
                  id="photoUrl"
                  type="url"
                  value={photoUrl}
                  onChange={(event) => setPhotoUrl(event.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Provide a public image link (PNG, JPG, or GIF). Leave blank to use your initials.
                </p>
              </div>

              {status ? (
                <div
                  className={clsx(
                    'rounded-2xl px-4 py-3 text-sm font-medium',
                    status.type === 'success'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-900/20 dark:text-emerald-200'
                      : 'border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/50 dark:bg-rose-900/20 dark:text-rose-200'
                  )}
                >
                  {status.message}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!hasChanges || isSaving}
                  className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) return;
                    setDisplayName(user.displayName ?? '');
                    setPhotoUrl(user.photoURL ?? '');
                    setStatus(null);
                  }}
                  disabled={isSaving || !hasChanges}
                  className="inline-flex items-center rounded-full border border-slate-200/70 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-slate-100"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section className="flex flex-col gap-5">
            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account overview</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Email</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{user.email ?? '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Verification</span>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                      emailVerified
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                    )}
                  >
                    {emailVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                {joinedAt ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Joined</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{joinedAt.toLocaleString()}</span>
                  </div>
                ) : null}
                {lastSignInAt ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Last active</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {lastSignInAt.toLocaleString()}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">UID</span>
                  <span className="truncate font-medium text-slate-800 dark:text-slate-100">{user.uid}</span>
                </div>
              </div>

              {!emailVerified ? (
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isSendingVerification}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-emerald-400 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {isSendingVerification ? 'Sending verification…' : 'Send verification email'}
                </button>
              ) : null}
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Security</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Reset your password via email to keep your account secure.
              </p>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={isSendingReset}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-slate-100"
              >
                {isSendingReset ? 'Sending reset email…' : 'Send password reset email'}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

