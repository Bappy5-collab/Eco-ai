import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type IncomingMessage = {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: number;
  images?: string[];
};

type LogChatBody = {
  user: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  };
  conversation: {
    id: string;
    title: string;
  };
  messages: IncomingMessage[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as LogChatBody;
    if (!body?.user?.uid || !body?.conversation?.id || !Array.isArray(body?.messages)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const supabase = getSupabaseAdmin();

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(
        {
          uid: body.user.uid,
          email: body.user.email ?? null,
          display_name: body.user.displayName ?? null,
          photo_url: body.user.photoURL ?? null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'uid' }
      );

    if (profileErr) {
      console.error('profiles upsert error', profileErr);
      return res.status(500).json({ error: 'Failed to upsert profile', detail: profileErr.message });
    }

    const { error: convErr } = await supabase
      .from('conversations')
      .upsert(
        {
          id: body.conversation.id,
          user_uid: body.user.uid,
          title: body.conversation.title ?? 'New Chat',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );

    if (convErr) {
      console.error('conversations upsert error', convErr);
      return res.status(500).json({ error: 'Failed to upsert conversation', detail: convErr.message });
    }

    const rows = body.messages
      .filter((m) => m && m.id && m.role && typeof m.content === 'string')
      .map((m) => ({
        id: m.id!,
        conversation_id: body.conversation.id,
        user_uid: body.user.uid,
        role: m.role,
        content: m.content,
        images: m.images ?? null,
        created_at: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString()
      }));

    if (rows.length > 0) {
      const { error: msgErr } = await supabase
        .from('messages')
        .upsert(rows, { onConflict: 'id' });
      if (msgErr) {
        console.error('messages upsert error', msgErr);
        return res.status(500).json({ error: 'Failed to upsert messages', detail: msgErr.message });
      }
    }

    return res.status(200).json({ ok: true, count: rows.length });
  } catch (err: any) {
    console.error('log-chat error', err);
    return res.status(500).json({ error: 'Server error', detail: err?.message ?? String(err) });
  }
}
