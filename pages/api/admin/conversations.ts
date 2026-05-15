import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function checkAdmin(req: NextApiRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = req.headers['x-admin-password'];
  return typeof provided === 'string' && provided === expected;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const uid = (req.query.uid as string | undefined)?.trim();
  if (!uid) {
    return res.status(400).json({ error: 'uid query param required' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: conversations, error: convErr } = await supabase
      .from('conversations')
      .select('id,title,updated_at,created_at')
      .eq('user_uid', uid)
      .order('updated_at', { ascending: false });

    if (convErr) return res.status(500).json({ error: convErr.message });

    const convIds = (conversations ?? []).map((c) => c.id);

    let messagesByConv: Record<string, any[]> = {};
    if (convIds.length > 0) {
      const { data: messages, error: msgErr } = await supabase
        .from('messages')
        .select('id,conversation_id,role,content,images,created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true });

      if (msgErr) return res.status(500).json({ error: msgErr.message });

      for (const m of messages ?? []) {
        if (!messagesByConv[m.conversation_id]) messagesByConv[m.conversation_id] = [];
        messagesByConv[m.conversation_id].push(m);
      }
    }

    return res.status(200).json({
      conversations: (conversations ?? []).map((c) => ({
        ...c,
        messages: messagesByConv[c.id] ?? []
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
