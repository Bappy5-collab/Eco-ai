import type { NextApiRequest, NextApiResponse } from 'next';

type ImageGenerationRequest = {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
};

function parseSize(size: string | undefined): { width: number; height: number } {
  const match = /^(\d+)x(\d+)$/.exec(size ?? '');
  if (match) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  return { width: 1024, height: 1024 };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, size = '1024x1024' } = req.body as ImageGenerationRequest;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const cleanPrompt = prompt.trim();
    const { width, height } = parseSize(size);
    const seed = Math.floor(Math.random() * 1_000_000);

    const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}`);
    url.searchParams.set('width', String(width));
    url.searchParams.set('height', String(height));
    url.searchParams.set('seed', String(seed));
    url.searchParams.set('model', 'flux');
    url.searchParams.set('nologo', 'true');
    url.searchParams.set('enhance', 'true');

    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'image/*' }
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('Pollinations error', { status: upstream.status, detail });
      return res.status(upstream.status).json({
        error: 'Failed to generate image.',
        detail: detail || `Upstream returned ${upstream.status}`,
        provider: 'pollinations'
      });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    const arrayBuffer = await upstream.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    res.status(200).json({
      imageUrl: dataUrl,
      revisedPrompt: cleanPrompt,
      provider: 'pollinations',
      model: 'flux'
    });
  } catch (error: any) {
    console.error('Image generation API error', error);
    res.status(500).json({
      error: 'Something went wrong. Please try again.',
      detail: error?.message ?? String(error)
    });
  }
}
