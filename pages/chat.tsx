import { ChatMessage, ChatMessageData } from '@/components/ChatMessage';
import {
  Bars3Icon,
  EllipsisVerticalIcon,
  MoonIcon,
  SunIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  StopIcon as StopSolidIcon,
  XMarkIcon,
  PhotoIcon,
  SparklesIcon as SparklesSolidIcon
} from '@heroicons/react/24/solid';
import clsx from 'classnames';
import Link from 'next/link';
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

const CHAT_STORAGE_KEY = 'eco-ai-chat-history';
const CHAT_MEMORY_KEY = 'eco-ai-memory';
const CONVERSATIONS_STORAGE_KEY = 'eco-ai-conversations';
const SYSTEM_PROMPT: ApiMessage = {
  role: 'system',
  content:
    'You are Eco AI 🌿, an intelligent, calm, and creative multimodal assistant built by Chandon Kumar. You can: (1) understand and analyse images that the user uploads (describe contents, read text, identify objects, judge style, answer follow-up questions about pictures); (2) generate brand-new images from a description when the user asks you to "draw", "create an image", "generate a picture", or similar; (3) hold normal text conversations. When the user uploads images, refer to what is actually visible. When asked to generate an image, briefly confirm and produce one. Keep replies helpful, concise, and lightly witty with sparing emoji use. Reference earlier context when it helps, ask clarifying questions when unsure, and always introduce yourself as Eco AI when asked about your identity.'
};

const IMAGE_GENERATION_REGEX = /\b(draw|sketch|paint|illustrate|render|design|generate|create|make|produce|imagine)\b[^.?!]{0,80}\b(image|picture|photo|photograph|illustration|artwork|art|drawing|sketch|painting|logo|poster|wallpaper|portrait|scene|render|design|icon)\b/i;

function looksLikeImageGenerationRequest(text: string): boolean {
  if (!text) return false;
  const normalized = text.trim();
  if (normalized.length === 0) return false;
  return IMAGE_GENERATION_REGEX.test(normalized);
}
const INITIAL_GREETING =
  'Hey there! I’m Eco AI 🌿—built by Chandon Kumar to help with code, green ideas, and whatever else you need. What can I do for you today?';

type HomePageProps = {
  colorScheme?: 'light' | 'dark';
  toggleColorScheme?: () => void;
};

type ApiMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessageData[];
  updatedAt: number;
  memory?: string;
};

type ApiResponseChunk = {
  id: string;
  choices: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

function createMessage(role: ApiMessage['role'], content: string): ChatMessageData {
  return {
    id: generateId(),
    role,
    content,
    createdAt: Date.now()
  };
}

const MAX_MEMORY_MESSAGES = 6;

function generateConversationSummary(history: ChatMessageData[]): string {
  const recent = history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-MAX_MEMORY_MESSAGES);

  if (recent.length === 0) return '';

  const lines = recent
    .map((message) => {
      const speaker = message.role === 'assistant' ? 'Eco AI' : 'User';
      const content = message.content?.replace(/\s+/g, ' ').trim() ?? '';
      if (!content) {
        return null;
      }
      return `${speaker}: ${content}`;
    })
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) return '';

  const summary = lines.join(' | ');
  return summary.length > 600 ? `${summary.slice(0, 597)}...` : summary;
}

function deriveConversationTitle(history: ChatMessageData[]): string {
  const firstUserMessage = history.find((message) => message.role === 'user' && message.content.trim().length > 0);
  if (!firstUserMessage) {
    return 'New Chat';
  }
  const trimmed = firstUserMessage.content.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

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

type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort?: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: ((event: any) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function ChatPage({ colorScheme = 'light', toggleColorScheme }: HomePageProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const storageSuffix = user?.uid ? `:${user.uid}` : ':guest';
  const chatStorageKey = `${CHAT_STORAGE_KEY}${storageSuffix}`;
  const memoryStorageKey = `${CHAT_MEMORY_KEY}${storageSuffix}`;
  const conversationsStorageKey = `${CONVERSATIONS_STORAGE_KEY}${storageSuffix}`;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageData[]>(() => [createMessage('assistant', INITIAL_GREETING)]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechInputSupported, setSpeechInputSupported] = useState(false);
  const [speechOutputSupported, setSpeechOutputSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [memory, setMemory] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechDraftRef = useRef('');
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceTranscriptRef = useRef('');
  const cancelledRecordingRef = useRef(false);
  const sendPromptRef = useRef<(text: string) => Promise<void>>(async () => {});
  const inputRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const recentChats = useMemo(() => {
    if (conversations.length === 0) return [] as Conversation[];
    return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10);
  }, [conversations]);

  const displayName = user?.displayName || user?.email || 'Account';
  const userInitials = useMemo(() => getInitials(user?.displayName, user?.email), [user?.displayName, user?.email]);
  const avatarUrl = user?.photoURL ?? '';

  const mapMessagesToApi = useCallback(
    (history: ChatMessageData[]): ApiMessage[] =>
      history
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          role: message.role,
          content: message.content?.trim() ?? ''
        }))
        .filter((message) => message.content.length > 0),
    []
  );

  const handleNewConversation = () => {
    stopSpeaking();
    setMenuOpenId(null);
    setMobileMenuOpen(false);
    const initialMessages = [createMessage('assistant', INITIAL_GREETING)];
    const newConversation: Conversation = {
      id: generateId(),
      title: 'New Chat',
      messages: initialMessages,
      updatedAt: Date.now(),
      memory: ''
    };
    setConversations((prev) => [newConversation, ...prev].slice(0, 25));
    setActiveConversationId(newConversation.id);
    setMessages(initialMessages);
    setMemory('');
    setInput('');
    setUploadedImages([]);
    setError(null);
    setIsStreaming(false);
  };

  const handleSelectConversation = (conversationId: string) => {
    if (conversationId === activeConversationId) return;
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    stopSpeaking();
    setMenuOpenId(null);
    setMobileMenuOpen(false);
    setActiveConversationId(conversationId);
    setMessages(conversation.messages);
    setMemory(conversation.memory ?? '');
    setInput('');
    setUploadedImages([]);
    setError(null);
    setIsStreaming(false);
  };

  const handleRemoveConversation = (conversationId: string) => {
    setMenuOpenId(null);
    setMobileMenuOpen(false);
    const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
    setConversations(remaining);

    if (conversationId === activeConversationId) {
      if (remaining.length === 0) {
        handleNewConversation();
      } else {
        const nextConversation = remaining[0];
        setActiveConversationId(nextConversation.id);
        setMessages(nextConversation.messages);
        setMemory(nextConversation.memory ?? '');
        setInput('');
        setError(null);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsHydrated(false);

    const storedConversationsRaw = window.localStorage.getItem(conversationsStorageKey);
    let initialConversations: Conversation[] | null = null;

    if (storedConversationsRaw) {
      try {
        const parsed = JSON.parse(storedConversationsRaw) as Conversation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialConversations = parsed.map((conversation) => ({
            ...conversation,
            messages:
              Array.isArray(conversation.messages) && conversation.messages.length > 0
                ? conversation.messages
                : [createMessage('assistant', INITIAL_GREETING)]
          }));
        }
      } catch (err) {
        console.error('Failed to parse stored conversations', err);
      }
    }

    if (!initialConversations || initialConversations.length === 0) {
      const legacyMessages = window.localStorage.getItem(chatStorageKey);
      let messagesFromLegacy: ChatMessageData[] = [createMessage('assistant', INITIAL_GREETING)];
      if (legacyMessages) {
        try {
          const parsedLegacy = JSON.parse(legacyMessages) as ChatMessageData[];
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            messagesFromLegacy = parsedLegacy;
          }
        } catch (err) {
          console.error('Failed to parse legacy chat history', err);
        }
      }
      initialConversations = [
        {
          id: generateId(),
          title: deriveConversationTitle(messagesFromLegacy),
          messages: messagesFromLegacy,
          updatedAt: Date.now(),
          memory: window.localStorage.getItem(memoryStorageKey) ?? ''
        }
      ];
    }

    const firstConversation = initialConversations[0];
    setConversations(initialConversations);
    setActiveConversationId(firstConversation.id);
    setMessages(firstConversation.messages);
    setMemory(firstConversation.memory ?? '');
    setInput('');
    setError(null);
    setIsStreaming(false);
    setVoiceError(null);
    setIsHydrated(true);
  }, [conversationsStorageKey, chatStorageKey, memoryStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.onstart = () => {
          speechDraftRef.current = inputRef.current;
          voiceTranscriptRef.current = '';
          setVoiceError(null);
        };
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              voiceTranscriptRef.current = `${voiceTranscriptRef.current} ${chunk}`.trim();
            } else {
              interimTranscript += chunk;
            }
          }
          const combined = [speechDraftRef.current.trim(), voiceTranscriptRef.current, interimTranscript.trim()]
            .filter(Boolean)
            .join(' ')
            .trim();
          if (combined) {
            setInput(combined);
          }
        };
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event);
          setIsRecording(false);
          cancelledRecordingRef.current = true;
          voiceTranscriptRef.current = '';
          setVoiceError('Voice input error. Please check microphone permissions and try again.');
        };
        recognition.onend = async () => {
          setIsRecording(false);
          const finalTranscript = (voiceTranscriptRef.current || inputRef.current).trim();
          voiceTranscriptRef.current = '';
          if (cancelledRecordingRef.current) {
            cancelledRecordingRef.current = false;
            return;
          }
          if (finalTranscript) {
            setInput(finalTranscript);
            await sendPromptRef.current?.(finalTranscript);
          }
        };
        recognitionRef.current = recognition;
        setSpeechInputSupported(true);
      } catch (err) {
        console.error('Speech recognition init failed', err);
      }
    }

    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      setSpeechOutputSupported(true);
    }

    return () => {
      recognitionRef.current?.abort?.();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return;
    window.localStorage.setItem(chatStorageKey, JSON.stringify(messages));
  }, [messages, isHydrated, chatStorageKey]);

  useEffect(() => {
    if (!isHydrated || !activeConversationId) return;
    setConversations((prev) => {
      const index = prev.findIndex((conversation) => conversation.id === activeConversationId);
      if (index === -1) return prev;
      const existing = prev[index];
      const derivedTitle = deriveConversationTitle(messages);
      const newTitle = existing.title === 'New Chat' && derivedTitle !== 'New Chat' ? derivedTitle : existing.title || derivedTitle;
      if (existing.messages === messages && existing.memory === memory && existing.title === newTitle) {
        return prev;
      }
      const updated: Conversation = {
        ...existing,
        title: newTitle,
        messages,
        memory,
        updatedAt: Date.now()
      };
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, [messages, memory, activeConversationId, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(conversationsStorageKey, JSON.stringify(conversations));
  }, [conversations, isHydrated, conversationsStorageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!isHydrated) return;
    if (messages.length === 0) {
      setMessages([createMessage('assistant', INITIAL_GREETING)]);
      return;
    }
    const first = messages[0];
    if (first.role !== 'assistant' || first.content.trim().length === 0) {
      setMessages([createMessage('assistant', INITIAL_GREETING), ...messages]);
    }
  }, [isHydrated, messages]);

  useEffect(() => {
    if (!isHydrated || isStreaming || !user || !activeConversationId) return;
    if (messages.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/log-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          },
          conversation: {
            id: activeConversationId,
            title: deriveConversationTitle(messages)
          },
          messages
        })
      }).catch((err) => {
        if (err?.name !== 'AbortError') console.error('log-chat failed', err);
      });
    }, 800);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [messages, isStreaming, isHydrated, user, activeConversationId]);

  useEffect(() => {
    if (!isHydrated || isStreaming) return;
    if (messages.length < 4) return;
    const summary = generateConversationSummary(messages);
    if (!summary || summary === memory) return;
    setMemory(summary);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(memoryStorageKey, summary);
    }
  }, [messages, isStreaming, isHydrated, memory, memoryStorageKey]);

  const stopSpeaking = () => {
    if (!speechOutputSupported || typeof window === 'undefined') return;
    window.speechSynthesis?.cancel();
    speechUtteranceRef.current = null;
    setSpeakingMessageId(null);
  };

  const handleSpeakMessage = (message: ChatMessageData) => {
    if (!speechOutputSupported || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (speakingMessageId === message.id) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      setSpeakingMessageId(null);
      speechUtteranceRef.current = null;
    };
    utterance.onerror = (event) => {
      console.error('Speech synthesis error', event);
      setSpeakingMessageId(null);
      speechUtteranceRef.current = null;
    };

    speechUtteranceRef.current = utterance;
    setSpeakingMessageId(message.id);
    synth.speak(utterance);
  };

  const handleToggleRecording = async () => {
    if (!speechInputSupported || !recognitionRef.current) return;
    const recognition = recognitionRef.current;

    if (isRecording) {
      cancelledRecordingRef.current = true;
      recognition.stop();
      return;
    }

    try {
      setVoiceError(null);
      speechDraftRef.current = inputRef.current;
      voiceTranscriptRef.current = '';
      cancelledRecordingRef.current = false;
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Unable to start speech recognition', err);
      setIsRecording(false);
      setVoiceError('Unable to access the microphone. Please check browser permissions and try again.');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    const skipped = files.length - imageFiles.length;

    if (imageFiles.length === 0) {
      setError('Please choose image files (PNG, JPG, etc.).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_BYTES = 8 * 1024 * 1024;
    const oversized = imageFiles.filter((file) => file.size > MAX_BYTES);
    const readable = imageFiles.filter((file) => file.size <= MAX_BYTES);

    try {
      const dataUrls = await Promise.all(
        readable.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result;
                if (typeof result === 'string' && result.length > 0) {
                  resolve(result);
                } else {
                  reject(new Error(`Failed to read ${file.name}`));
                }
              };
              reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
              reader.readAsDataURL(file);
            })
        )
      );

      if (dataUrls.length > 0) {
        setUploadedImages((prev) => [...prev, ...dataUrls].slice(0, 8));
        setError(null);
      }

      const issues: string[] = [];
      if (skipped > 0) issues.push(`${skipped} non-image file${skipped === 1 ? '' : 's'} skipped`);
      if (oversized.length > 0) issues.push(`${oversized.length} image${oversized.length === 1 ? '' : 's'} over 8MB skipped`);
      if (issues.length > 0) setError(issues.join(' · '));
    } catch (err) {
      console.error('Image upload failed', err);
      setError('Could not read one or more images. Please try again.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };


  const sendTextMessage = async (history: ApiMessage[]) => {
    setIsStreaming(true);
    setError(null);
    stopSpeaking();
    if (history.length === 0) {
      setIsStreaming(false);
      return;
    }

    const systemMessages: ApiMessage[] = memory
      ? [
          SYSTEM_PROMPT,
          {
            role: 'system',
            content: `Long-term memory summary: ${memory}`
          }
        ]
      : [SYSTEM_PROMPT];
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: [...systemMessages, ...history] })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantMessage = createMessage('assistant', '');

      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunkValue = decoder.decode(value, { stream: true });
        const lines = chunkValue.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payload = trimmed.replace(/^data:\s*/, '');
          if (payload === '[DONE]') {
            setIsStreaming(false);
            return;
          }
          try {
            const parsed = JSON.parse(payload) as ApiResponseChunk;
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              assistantMessage = {
                ...assistantMessage,
                content: assistantMessage.content + delta
              };
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = assistantMessage;
                return next;
              });
            }
          } catch (err) {
            console.error('Error parsing chunk', err);
          }
        }
      }
      setIsStreaming(false);
    } catch (err) {
      console.error(err);
      setIsStreaming(false);
      setError('Something went wrong, try again.');
      setMessages((prev) => prev.filter((msg) => msg.role !== 'assistant' || msg.content));
    }
  };

  const handleAnalyzeImage = useCallback(async (images: string[], prompt: string) => {
    if (images.length === 0) return;
    if (isStreaming || !isHydrated) return;

    setError(null);
    setIsStreaming(true);
    stopSpeaking();

    const analysisPrompt = prompt.trim() || 'What is in this image? Describe it in detail.';
    const userMessage = createMessage('user', analysisPrompt);
    userMessage.images = images;
    const historyBeforeAnalysis = mapMessagesToApi(messages);
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          images,
          prompt: analysisPrompt,
          history: historyBeforeAnalysis.slice(-6)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      const assistantMessage = createMessage('assistant', data.analysis);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze image. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  }, [isHydrated, isStreaming, mapMessagesToApi, messages]);

  const handleGenerateImage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isGeneratingImage || isStreaming || !isHydrated) return;

    setError(null);
    setIsGeneratingImage(true);
    stopSpeaking();

    const userMessage = createMessage('user', `Generate an image: ${prompt}`);
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size: '1024x1024',
          quality: 'standard'
        })
      });

      const data = await response.json().catch(() => ({} as any));

      if (!response.ok) {
        const detail = (data?.detail || data?.error || `Request failed (${response.status})`) as string;
        console.error('generate-image failed', data);
        setError(`Image generation failed: ${detail}`);
        return;
      }

      const assistantMessage = createMessage('assistant', `Here's the generated image based on your prompt: "${data.revisedPrompt || prompt}"`);
      assistantMessage.images = [data.imageUrl];
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to generate image: ${err?.message ?? 'unknown error'}`);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [isHydrated, isStreaming, isGeneratingImage]);

  const sendUserPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || isStreaming || !isHydrated) return;
      setError(null);

      if (uploadedImages.length > 0) {
        const imagesToAnalyze = [...uploadedImages];
        setUploadedImages([]);
        setInput('');
        await handleAnalyzeImage(imagesToAnalyze, trimmed);
        return;
      }

      if (looksLikeImageGenerationRequest(trimmed)) {
        setInput('');
        await handleGenerateImage(trimmed);
        return;
      }

      const userMessage = createMessage('user', trimmed);
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');

      const apiMessages = mapMessagesToApi(updatedMessages);
      await sendTextMessage(apiMessages);
    },
    [isHydrated, isStreaming, mapMessagesToApi, messages, uploadedImages, handleAnalyzeImage, handleGenerateImage]
  );

  useEffect(() => {
    sendPromptRef.current = sendUserPrompt;
  }, [sendUserPrompt]);

  const submitMessage = async () => {
    if (!input.trim()) return;
    await sendUserPrompt(input.trim());
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitMessage();
  };

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // Use smaller max height on mobile screens (640px breakpoint)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const maxHeight = isMobile ? 150 : 200; // 150px on mobile, 200px on larger screens
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, []);

  const resetTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }
  }, []);

  useEffect(() => {
    if (input === '') {
      resetTextareaHeight();
    }
  }, [input, resetTextareaHeight]);

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      await submitMessage();
    }
  };

  const handleCopy = (message: ChatMessageData) => {
    if (typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(message.content).catch((err) => console.error('Copy failed', err));
  };

  const handleRegenerate = async (message: ChatMessageData) => {
    if (isStreaming) return;
    const lastAssistantIndex = messages.findIndex((msg) => msg.id === message.id);
    if (lastAssistantIndex !== messages.length - 1 || message.role !== 'assistant') return;

    const trimmedMessages = messages.slice(0, lastAssistantIndex);
    setMessages(trimmedMessages);

    const apiMessages = mapMessagesToApi(trimmedMessages);
    await sendTextMessage(apiMessages);
  };

  const clearChat = () => {
    const resetMessages = [createMessage('assistant', INITIAL_GREETING)];
    stopSpeaking();
    setMobileMenuOpen(false);
    const updatedConversations = conversations.map((conversation) =>
      conversation.id === activeConversationId
        ? { ...conversation, title: 'New Chat', messages: resetMessages, memory: '', updatedAt: Date.now() }
        : conversation
    );
    setMessages(resetMessages);
    setMemory('');
    setInput('');
    setUploadedImages([]);
    setConversations(updatedConversations);
    setMenuOpenId(null);
    setIsStreaming(false);
    setVoiceError(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(chatStorageKey);
      window.localStorage.removeItem(memoryStorageKey);
      window.localStorage.setItem(conversationsStorageKey, JSON.stringify(updatedConversations));
    }
  };

  const backgroundClass = clsx(
    'min-h-screen transition-colors duration-500',
    colorScheme === 'dark'
      ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100'
      : 'bg-gradient-to-br from-emerald-50 via-sky-50 to-white text-slate-900'
  );

  if (authLoading || (user && !isHydrated)) {
    return (
      <div className={backgroundClass}>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-3xl border border-white/60 bg-white/80 px-8 py-6 text-center text-slate-600 shadow-xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200">
            <p className="text-sm">Eco AI is getting ready…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={backgroundClass}>
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
          <div className="flex w-full items-center justify-between">
            <Link href="/" className="text-2xl font-semibold transition hover:text-emerald-500">
              Eco AI 🌿
            </Link>
            <button
              type="button"
              onClick={toggleColorScheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/60 bg-white/80 text-slate-600 transition hover:-translate-y-0.5 hover:text-emerald-500 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/85 p-8 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold">Sign in to continue</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Eco AI remembers your conversations securely when you sign in with email and password.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/auth/signin')}
                className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => router.push('/auth/signup')}
                className="inline-flex w-full max-w-xs items-center justify-center rounded-full border border-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-300/60 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
              >
                Create account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={backgroundClass}>
      <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-10" onClick={() => setMenuOpenId(null)}>
        <aside
          className="sticky top-8 hidden h-[calc(100vh-4rem)] w-full max-w-xs shrink-0 flex-col gap-4 overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70 lg:flex"
          onClick={(event) => event.stopPropagation()}
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Eco AI 🌿</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Your intelligent, calm, and creative AI assistant built by Chandon Kumar.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewConversation}
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400"
          >
            New Chat
          </button>
          <div className="no-scrollbar mt-6 flex-1 overflow-y-auto pr-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent Chats</h3>
            <nav className="mt-3 flex flex-col gap-2">
              {recentChats.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No conversations yet.</p>
              ) : (
                recentChats.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={(event) => event.stopPropagation()}
                    className={clsx(
                      'group relative flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50/80 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/10',
                      conversation.id === activeConversationId
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200'
                        : 'bg-white/80 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className="flex-1 text-left"
                    >
                      <div className="truncate text-sm font-medium">
                        {conversation.title || 'New Chat'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(conversation.updatedAt).toLocaleString()}
                      </div>
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpenId((prev) => (prev === conversation.id ? null : conversation.id))}
                        className="rounded-full p-1 text-slate-400 hover:text-emerald-600 focus:outline-none dark:text-slate-500 dark:hover:text-emerald-300"
                        aria-label="Conversation menu"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                      {menuOpenId === conversation.id ? (
                        <div className="absolute right-0 top-8 z-20 w-40 rounded-2xl border border-slate-200 bg-white py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => handleRemoveConversation(conversation.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </nav>
          </div>
        </aside>

        <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 flex-col" onClick={() => setMenuOpenId(null)}>
          <header className="sticky top-0 z-20 mb-6 rounded-3xl border border-white/50 bg-white/70 p-4 shadow-lg backdrop-blur-xl ring-1 ring-emerald-500/10 dark:border-slate-700/60 dark:bg-slate-900/70 dark:ring-emerald-400/10">
            <div className="flex w-full items-center justify-between sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/60 bg-white/80 text-slate-600 transition hover:-translate-y-0.5 hover:text-emerald-500 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
                aria-label="Open navigation menu"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Eco AI</span>
                {activeConversation?.title && activeConversation.title !== 'New Chat' ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {activeConversation.title}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Fresh conversation</span>
                )}
              </div>
              <button
                type="button"
                onClick={toggleColorScheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/60 bg-white/80 text-slate-600 transition hover:-translate-y-0.5 hover:text-emerald-500 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
                aria-label="Toggle color scheme"
              >
                {colorScheme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>
            </div>

            <div className="hidden w-full items-center justify-between gap-3 sm:flex">
              <div>
                <h1 className="text-xl font-semibold sm:text-2xl">Eco AI</h1>
                <p className="text-sm text-slate-600/80 dark:text-slate-300/80">
                  Your intelligent, calm, and creative AI assistant built by Chandon Kumar.
                </p>
                {activeConversation?.title && activeConversation.title !== 'New Chat' ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Current chat: {activeConversation.title}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/profile"
                  className="hidden items-center gap-3 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-200 sm:flex"
                >
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-sm">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      userInitials
                    )}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-100">{displayName}</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-300">View profile</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="inline-flex items-center rounded-full border border-emerald-400 bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-400 lg:hidden"
                >
                  New chat
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-full border border-slate-300/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
                >
                  Clear chat
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                  }}
                  className="rounded-full border border-slate-300/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={toggleColorScheme}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/60 bg-white/80 text-slate-600 transition hover:-translate-y-0.5 hover:text-emerald-500 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
                  aria-label="Toggle color scheme"
                >
                  {colorScheme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </header>

          {mobileMenuOpen ? (
            <div className="fixed inset-0 z-40 sm:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/50"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="absolute inset-x-4 top-16 bottom-4 overflow-y-auto rounded-3xl border border-white/70 bg-white/95 p-5 backdrop-blur-2xl transition dark:border-slate-700/70 dark:bg-slate-900/95">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-full w-full rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Navigate Eco AI</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 transition hover:text-emerald-500 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
                    aria-label="Close navigation menu"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-600/70 dark:bg-slate-800/70"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/90 text-base font-semibold text-white shadow-md">
                      {userInitials}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{displayName}</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-300">View profile</span>
                    </div>
                  </Link>

                  <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-600/70 dark:bg-slate-800/70">
                    <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Quick actions</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleNewConversation}
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-400"
                      >
                        New chat
                      </button>
                      <button
                        type="button"
                        onClick={clearChat}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300/80 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
                      >
                        Clear chat
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          toggleColorScheme?.();
                          setMobileMenuOpen(false);
                        }}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300/80 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-100"
                      >
                        {colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setMobileMenuOpen(false);
                          await signOut();
                        }}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-transparent bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-100 dark:text-slate-900"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-600/70 dark:bg-slate-800/70">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Recent chats
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {recentChats.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No conversations yet.</p>
                      ) : (
                        recentChats.map((conversation) => (
                          <button
                            key={conversation.id}
                            type="button"
                            onClick={() => handleSelectConversation(conversation.id)}
                            className={clsx(
                              'flex flex-col rounded-xl border px-3 py-2 text-left transition',
                              conversation.id === activeConversationId
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-slate-600/70 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/10'
                            )}
                          >
                            <span className="text-sm font-medium">{conversation.title || 'New Chat'}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(conversation.updatedAt).toLocaleString()}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-xl transition dark:border-slate-700/60 dark:bg-slate-900/70">
            <main className="flex-1 overflow-hidden">
              <div className="no-scrollbar flex h-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onCopy={handleCopy}
                    onRegenerate={handleRegenerate}
                    onSpeak={handleSpeakMessage}
                    onStopSpeak={stopSpeaking}
                    canSpeak={speechOutputSupported}
                    isSpeaking={speakingMessageId === message.id}
                    isStreaming={isStreaming && index === messages.length - 1}
                  />
                ))}
                <div ref={endRef} />
              </div>
            </main>

            <footer className="sticky bottom-0 border-t border-slate-200/60 bg-white/85 px-3 py-3 sm:px-4 sm:py-5 shadow-inner backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80">
              <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-4xl flex-col gap-2 sm:gap-3">
                {uploadedImages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {uploadedImages.map((imageUrl, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={imageUrl}
                          alt={`Upload ${idx + 1}`}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition hover:bg-rose-600"
                          aria-label="Remove image"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="relative flex items-end gap-2 sm:gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600/70 dark:bg-slate-800/70 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
                    aria-label="Upload image"
                  >
                    <PhotoIcon className="h-4 w-4" />
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      setTimeout(() => adjustTextareaHeight(), 0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={uploadedImages.length > 0 ? "Add a description or question about the image…" : "Type your message…"}
                    rows={1}
                    className="no-scrollbar flex-1 min-w-0 resize-none rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/90 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40 max-h-[150px] sm:max-h-[200px]"
                    style={{ minHeight: '44px' }}
                    disabled={isStreaming || isGeneratingImage}
                  />
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateImage(input)}
                      className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600/70 dark:bg-slate-800/70 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
                      disabled={isStreaming || isGeneratingImage || !input.trim()}
                      aria-label="Generate image"
                    >
                      <SparklesSolidIcon className="h-4 w-4" />
                    </button>
                    {speechInputSupported ? (
                      <button
                        type="button"
                        onClick={handleToggleRecording}
                        className={clsx(
                          'inline-flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:text-slate-200 dark:focus:ring-offset-slate-900',
                          isRecording
                            ? 'border-transparent bg-rose-500 text-white shadow-lg focus:ring-rose-300'
                            : 'border-slate-200/70 bg-white/80 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600/70 dark:bg-slate-800/70 dark:hover:border-emerald-400 dark:hover:text-emerald-300'
                        )}
                        aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
                        aria-pressed={isRecording}
                      >
                        {isRecording ? <StopSolidIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <MicrophoneIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="inline-flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-300"
                      disabled={isStreaming || isGeneratingImage || (!input.trim() && uploadedImages.length === 0)}
                      aria-label="Send message"
                    >
                      <PaperAirplaneIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              </form>
              {isRecording ? <p className="mt-2 text-xs font-medium text-rose-500">Listening… speak freely, then tap stop.</p> : null}
              {isGeneratingImage ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Generating image…</p> : null}
              {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
              {voiceError ? <p className="mt-2 text-xs text-rose-500">{voiceError}</p> : null}
              {isStreaming ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Eco AI is thinking…</p> : null}
              {!speechInputSupported ? <p className="mt-2 text-xs text-slate-400">Voice input isn't supported in this browser.</p> : null}
              {!speechOutputSupported ? <p className="mt-1 text-xs text-slate-400">Voice playback isn't supported in this browser.</p> : null}
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
