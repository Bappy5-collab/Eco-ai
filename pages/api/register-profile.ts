import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type RegisterProfileBody = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as RegisterProfileBody;
    if (!body?.uid) {
      return res.status(400).json({ error: 'Missing uid' });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          uid: body.uid,
          email: body.email ?? null,
          display_name: body.displayName ?? null,
          photo_url: body.photoURL ?? null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'uid' }
      );

    if (error) {
      console.error('register-profile upsert error', error);
      return res.status(500).json({ error: 'Failed to upsert profile', detail: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('register-profile error', err);
    return res.status(500).json({ error: 'Server error', detail: err?.message ?? String(err) });
  }
}
