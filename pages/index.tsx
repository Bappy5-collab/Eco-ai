import Link from 'next/link';
import Head from 'next/head';
import { useState } from 'react';
import {
  SparklesIcon,
  PhotoIcon,
  MicrophoneIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  Square3Stack3DIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  MoonIcon,
  SunIcon,
  Bars3Icon,
  XMarkIcon,
  CheckIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

type LandingProps = {
  colorScheme?: 'light' | 'dark';
  toggleColorScheme?: () => void;
};

const FEATURES = [
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Conversational intelligence',
    description: 'A composed, context-aware assistant that streams responses in real time and keeps the thread of your ideas.'
  },
  {
    icon: SparklesIcon,
    title: 'Image generation',
    description: 'Turn a sentence into a finished visual — concepts, logos, and scenes rendered on request.'
  },
  {
    icon: PhotoIcon,
    title: 'Visual understanding',
    description: 'Upload images and Eco AI reads text, recognises objects, and answers follow-up questions precisely.'
  },
  {
    icon: MicrophoneIcon,
    title: 'Voice interface',
    description: 'Dictate prompts and listen to answers with built-in speech recognition and natural playback.'
  },
  {
    icon: Square3Stack3DIcon,
    title: 'Persistent memory',
    description: 'Conversations are saved per account with a rolling summary, so context survives across sessions.'
  },
  {
    icon: BoltIcon,
    title: 'Fast & secure',
    description: 'Streaming responses and encrypted email authentication keep every session quick and private.'
  }
];

const STEPS = [
  { title: 'Create an account', description: 'Register with email in seconds — no card, no setup overhead.' },
  { title: 'Open a conversation', description: 'Ask, upload an image, or generate visuals from a single prompt.' },
  { title: 'Resume anytime', description: 'Every chat is preserved, so your work continues exactly where it stopped.' }
];

const STATS = [
  { value: '3-in-1', label: 'Chat, vision & generation' },
  { value: '<1s', label: 'To first streamed token' },
  { value: '100%', label: 'Conversations saved' },
  { value: '24/7', label: 'Always available' }
];

export default function LandingPage({ colorScheme = 'dark', toggleColorScheme }: LandingProps) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const primaryHref = user ? '/chat' : '/auth/signup';
  const primaryLabel = user ? 'Open Eco AI' : 'Get started';

  return (
    <>
      <Head>
        <title>Eco AI — A professional multimodal assistant</title>
        <meta
          name="description"
          content="Eco AI is a refined multimodal assistant for conversation, image generation, visual understanding, and voice — in one quiet, focused workspace."
        />
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-white text-slate-900 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-100">
        {/* Subtle background texture */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="grid-pattern absolute inset-0 opacity-[0.55] dark:opacity-100" />
          <div className="absolute left-1/2 top-[-12rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-500/15" />
        </div>

        {/* Nav */}
        <header className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <SparklesIcon className="h-5 w-5" />
            </span>
            Eco AI
          </Link>

          <nav className="hidden items-center gap-9 text-sm text-slate-600 dark:text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-slate-900 dark:hover:text-slate-100">Features</a>
            <a href="#how" className="transition hover:text-slate-900 dark:hover:text-slate-100">How it works</a>
            <Link href="/chat" className="transition hover:text-slate-900 dark:hover:text-slate-100">Open chat</Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleColorScheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <Link
              href={primaryHref}
              className="hidden items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 sm:inline-flex"
            >
              {primaryLabel}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {mobileOpen ? (
          <div className="relative z-30 mx-5 mb-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <nav className="flex flex-col gap-0.5 text-sm">
              <a href="#features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Features</a>
              <a href="#how" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">How it works</a>
              <Link href="/chat" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Open chat</Link>
              <Link href={primaryHref} className="mt-1.5 rounded-lg bg-slate-900 px-3 py-2.5 text-center font-medium text-white dark:bg-white dark:text-slate-900">
                {primaryLabel}
              </Link>
            </nav>
          </div>
        ) : null}

        {/* Hero */}
        <main className="relative z-10">
          <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col items-start gap-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Multimodal AI workspace
              </span>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                A professional assistant for{' '}
                <span className="text-emerald-600 dark:text-emerald-400">thinking, creating</span> and getting things
                done.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
                Eco AI unifies conversation, image generation, visual understanding, and voice in a single quiet
                workspace — designed to keep you focused, not distracted.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {primaryLabel}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
                >
                  Open the chat
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> No credit card</span>
                <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Free to start</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Secure sign-in</span>
              </div>
            </div>

            {/* Product preview */}
            <div className="float-card relative">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="ml-2 text-xs font-medium text-slate-400">Eco AI · workspace</span>
                </div>
                <div className="flex flex-col gap-3 p-5">
                  <div className="ml-auto max-w-[82%] rounded-xl rounded-br-sm bg-slate-900 px-3.5 py-2.5 text-sm text-white dark:bg-slate-100 dark:text-slate-900">
                    Summarise this report and draft a cover image.
                  </div>
                  <div className="max-w-[88%] rounded-xl rounded-bl-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
                    Done. Key points are below, and here is a cover concept.
                  </div>
                  <div className="flex max-w-[88%] items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 py-7 dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
                    <PhotoIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                  </div>
                  <div className="flex items-center gap-1.5 pl-1">
                    <span className="dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="dot h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ animationDelay: '0.15s' }} />
                    <span className="dot h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ animationDelay: '0.3s' }} />
                    <span className="ml-1 text-xs text-slate-400">Eco AI is responding</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <div className="grid grid-cols-2 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="px-5 py-6 text-center">
                  <div className="text-2xl font-semibold tracking-tight sm:text-3xl">{stat.value}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section id="features" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="max-w-2xl">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Capabilities</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                One assistant, every modality
              </h2>
              <p className="mt-3 text-slate-600 dark:text-slate-400">
                Conversation, creativity, and comprehension in a single, considered interface — no context switching.
              </p>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group bg-white p-7 transition hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:group-hover:text-emerald-400">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section id="how" className="mx-auto w-full max-w-6xl px-5 py-4 pb-16 sm:px-8 sm:pb-24">
            <div className="max-w-2xl">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Getting started</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Live in three steps</h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="text-sm font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-8 py-14 sm:px-14 dark:border-slate-800">
              <div aria-hidden className="grid-pattern-dark pointer-events-none absolute inset-0 opacity-40" />
              <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-emerald-500/15 blur-[100px]" />
              <div className="relative max-w-xl">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Bring focus back to your work.
                </h2>
                <p className="mt-3 text-slate-400">
                  Start with Eco AI today and turn ideas, images, and questions into outcomes — in one calm workspace.
                </p>
                <Link
                  href={primaryHref}
                  className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
                >
                  {primaryLabel}
                  <ArrowUpRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:px-8">
            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <SparklesIcon className="h-4 w-4" />
              </span>
              Eco AI
            </div>
            <p>Built by Chandon Kumar · © {new Date().getFullYear()}</p>
            <div className="flex items-center gap-5">
              <Link href="/chat" className="transition hover:text-slate-900 dark:hover:text-slate-100">Chat</Link>
              <Link href="/auth/signin" className="transition hover:text-slate-900 dark:hover:text-slate-100">Sign in</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
