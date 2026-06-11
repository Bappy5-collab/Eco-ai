import { ClipboardDocumentIcon, ArrowPathIcon, UserIcon, SparklesIcon, SpeakerWaveIcon, StopIcon, CheckIcon } from '@heroicons/react/24/outline';
import clsx from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'react';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessageData {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  images?: string[]; // Array of image URLs or base64 data URLs
}

type ChatMessageProps = {
  message: ChatMessageData;
  onCopy: (message: ChatMessageData) => void;
  onRegenerate?: (message: ChatMessageData) => void;
  onSpeak?: (message: ChatMessageData) => void;
  onStopSpeak?: () => void;
  canSpeak?: boolean;
  isSpeaking?: boolean;
  isStreaming?: boolean;
};

type Theme = {
  row: string;
  align: string;
  bubble: string;
  avatar: string;
  icon: JSX.Element;
  label: string;
};

const roleTheme: Record<ChatRole, Theme> = {
  user: {
    row: 'flex-row-reverse',
    align: 'items-end',
    bubble:
      'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl rounded-br-md shadow-lg shadow-emerald-500/25',
    avatar:
      'bg-gradient-to-br from-slate-700 to-slate-900 text-white ring-2 ring-white/80 dark:ring-slate-800',
    icon: <UserIcon className="h-[18px] w-[18px]" />,
    label: 'You'
  },
  assistant: {
    row: 'flex-row',
    align: 'items-start',
    bubble:
      'bg-white/95 text-slate-800 ring-1 ring-slate-200/80 rounded-3xl rounded-bl-md shadow-lg shadow-slate-900/5 dark:bg-slate-800/90 dark:text-slate-100 dark:ring-slate-700/70',
    avatar:
      'bg-gradient-to-br from-emerald-400 to-teal-500 text-white ring-2 ring-white/80 shadow-md shadow-emerald-500/30 dark:ring-slate-800',
    icon: <SparklesIcon className="h-[18px] w-[18px]" />,
    label: 'Eco AI'
  },
  system: {
    row: 'flex-row',
    align: 'items-center',
    bubble:
      'bg-slate-100 text-slate-600 ring-1 ring-slate-200 rounded-2xl dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600/60',
    avatar: 'bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
    icon: <SparklesIcon className="h-[18px] w-[18px]" />,
    label: 'System'
  }
};

export function ChatMessage({ message, onCopy, onRegenerate, onSpeak, onStopSpeak, canSpeak, isSpeaking, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const theme = roleTheme[message.role];
  const prevTokenCountRef = useRef(0);
  const animateFromRef = useRef(0);

  const tokens = useMemo(() => message.content.match(/[^\s]+|\s+/g) ?? [], [message.content]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isStreaming) {
      if (tokens.length > prevTokenCountRef.current) {
        animateFromRef.current = prevTokenCountRef.current;
      }
    } else {
      animateFromRef.current = tokens.length;
    }
    prevTokenCountRef.current = tokens.length;
  }, [tokens.length, isStreaming]);

  const handleCopy = () => {
    onCopy(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const showRegenerate = Boolean(onRegenerate) && message.role === 'assistant';
  const showSpeak = message.role === 'assistant' && canSpeak;
  const showSkeleton = isStreaming && message.role === 'assistant' && message.content.length === 0;
  const timestamp = mounted
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const actionButtonClass =
    'flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm backdrop-blur transition hover:-translate-y-px hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600/70 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:border-emerald-400/50 dark:hover:text-emerald-300';

  return (
    <div className={clsx('group flex w-full items-end gap-2.5 sm:gap-3', theme.row)}>
      <div
        className={clsx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          theme.avatar
        )}
      >
        {theme.icon}
      </div>

      <div className={clsx('flex min-w-0 max-w-[85%] flex-col gap-1 sm:max-w-[42rem]', theme.align)}>
        <div className={clsx('relative px-4 py-3 transition', theme.bubble)}>
          {message.images && message.images.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.images.map((imageUrl, idx) => (
                <img
                  key={idx}
                  src={imageUrl}
                  alt={`Image ${idx + 1}`}
                  className="max-h-64 max-w-full rounded-xl object-contain ring-1 ring-black/5"
                />
              ))}
            </div>
          ) : null}

          <div className="whitespace-pre-wrap break-words text-[15px] leading-7">
            {showSkeleton ? (
              <div className="flex flex-col gap-2 py-0.5">
                <span className="skeleton-line h-3 w-28" />
                <span className="skeleton-line h-3 w-56" />
                <span className="skeleton-line h-3 w-40" />
              </div>
            ) : (
              <>
                {tokens.map((token, index) => {
                  const shouldAnimate = isStreaming && index >= animateFromRef.current;
                  return (
                    <span
                      key={`${message.id}-${index}`}
                      className={shouldAnimate ? 'typing-token' : undefined}
                      style={shouldAnimate ? { animationDelay: `${(index - animateFromRef.current) * 30}ms` } : undefined}
                    >
                      {token}
                    </span>
                  );
                })}
                {isStreaming && message.role === 'assistant' ? (
                  <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse rounded-full bg-emerald-500 align-middle dark:bg-emerald-400" />
                ) : null}
              </>
            )}
          </div>
        </div>

        <div
          className={clsx(
            'flex items-center gap-2 px-1',
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {timestamp ? (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{timestamp}</span>
          ) : null}
          {!showSkeleton ? (
            <div className="flex flex-wrap gap-1 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
              <button type="button" onClick={handleCopy} className={actionButtonClass} aria-label="Copy message">
                {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {showRegenerate ? (
                <button type="button" onClick={() => onRegenerate?.(message)} className={actionButtonClass} aria-label="Regenerate response">
                  <ArrowPathIcon className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              ) : null}
              {showSpeak ? (
                <button
                  type="button"
                  onClick={() => (isSpeaking ? onStopSpeak?.() : onSpeak?.(message))}
                  className={actionButtonClass}
                  aria-label={isSpeaking ? 'Stop playback' : 'Listen to message'}
                >
                  {isSpeaking ? <StopIcon className="h-3.5 w-3.5" /> : <SpeakerWaveIcon className="h-3.5 w-3.5" />}
                  {isSpeaking ? 'Stop' : 'Listen'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
