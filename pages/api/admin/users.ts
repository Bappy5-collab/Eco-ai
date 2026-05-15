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

  try {
    const supabase = getSupabaseAdmin();

    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('uid,email,display_name,photo_url,created_at,updated_at')
      .order('updated_at', { ascending: false });

    if (profilesErr) {
      return res.status(500).json({ error: profilesErr.message });
    }

    const uids = (profiles ?? []).map((p) => p.uid);

    const counts: Record<string, { conversations: number; messages: number }> = {};
    if (uids.length > 0) {
      const { data: convCounts } = await supabase
        .from('conversations')
        .select('user_uid')
        .in('user_uid', uids);
      const { data: msgCounts } = await supabase
        .from('messages')
        .select('user_uid')
        .in('user_uid', uids);

      for (const uid of uids) counts[uid] = { conversations: 0, messages: 0 };
      for (const row of convCounts ?? []) {
        if (counts[row.user_uid]) counts[row.user_uid].conversations += 1;
      }
      for (const row of msgCounts ?? []) {
        if (counts[row.user_uid]) counts[row.user_uid].messages += 1;
      }
    }

    return res.status(200).json({
      users: (profiles ?? []).map((p) => ({
        ...p,
        conversation_count: counts[p.uid]?.conversations ?? 0,
        message_count: counts[p.uid]?.messages ?? 0
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
