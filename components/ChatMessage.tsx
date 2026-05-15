import { ClipboardDocumentIcon, ArrowPathIcon, UserIcon, SparklesIcon, SpeakerWaveIcon, StopIcon } from '@heroicons/react/24/outline';
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

const roleTheme: Record<ChatRole, { wrapper: string; bubble: string; icon: JSX.Element }> = {
  user: {
    wrapper: 'justify-end',
    bubble: 'bg-blue-600 text-white dark:bg-blue-500',
    icon: <UserIcon className="h-5 w-5" />
  },
  assistant: {
    wrapper: 'justify-start',
    bubble: 'bg-surface-light text-slate-900 dark:bg-surface-dark dark:text-slate-100 border border-slate-200 dark:border-slate-700',
    icon: <SparklesIcon className="h-5 w-5" />
  },
  system: {
    wrapper: 'justify-center',
    bubble: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-200',
    icon: <SparklesIcon className="h-5 w-5" />
  }
};

export function ChatMessage({ message, onCopy, onRegenerate, onSpeak, onStopSpeak, canSpeak, isSpeaking, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const theme = roleTheme[message.role];
  const prevTokenCountRef = useRef(0);
  const animateFromRef = useRef(0);

  const tokens = useMemo(() => message.content.match(/[^\s]+|\s+/g) ?? [], [message.content]);

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

  return (
    <div className={clsx('flex w-full gap-2', theme.wrapper)}>
      <div className="flex flex-shrink-0 items-start justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
          {theme.icon}
        </div>
      </div>
      <div className={clsx('group relative max-w-2xl rounded-2xl px-4 py-3 shadow-sm transition-colors', theme.bubble)}>
        {message.images && message.images.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.images.map((imageUrl, idx) => (
              <div key={idx} className="relative">
                <img
                  src={imageUrl}
                  alt={`Uploaded image ${idx + 1}`}
                  className="max-h-64 max-w-full rounded-lg object-contain"
                />
              </div>
            ))}
          </div>
        ) : null}
        <div className="whitespace-pre-wrap break-words text-sm leading-6">
          {showSkeleton ? (
            <div className="flex flex-col gap-2">
              <span className="skeleton-line h-3 w-28" />
              <span className="skeleton-line h-3 w-56" />
              <span className="skeleton-line h-3 w-40" />
            </div>
          ) : (
            tokens.map((token, index) => {
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
            })
          )}
        </div>
        {isStreaming ? (
          <span className="absolute -bottom-5 left-4 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="flex h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="flex h-2 w-2 animate-bounce rounded-full bg-current" />
          </span>
        ) : null}
        <div className="absolute -bottom-11 right-0 flex flex-wrap gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy'}
          </button>
          {showRegenerate ? (
            <button
              type="button"
              onClick={() => onRegenerate?.(message)}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Regenerate
            </button>
          ) : null}
          {showSpeak ? (
            <button
              type="button"
              onClick={() => (isSpeaking ? onStopSpeak?.() : onSpeak?.(message))}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
            >
              {isSpeaking ? <StopIcon className="h-4 w-4" /> : <SpeakerWaveIcon className="h-4 w-4" />}
              {isSpeaking ? 'Stop' : 'Listen'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;

