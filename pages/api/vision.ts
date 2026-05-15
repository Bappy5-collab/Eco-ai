import type { NextApiRequest, NextApiResponse } from 'next';

type HistoryMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type VisionRequest = {
  image?: string;
  images?: string[];
  prompt?: string;
  history?: HistoryMessage[];
};

function toDataUrl(image: string): string {
  if (image.startsWith('data:')) return image;
  return `data:image/jpeg;base64,${image.includes(',') ? image.split(',')[1] : image}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key is not configured.' });
  }

  try {
    const body = (req.body ?? {}) as VisionRequest;
    const prompt = body.prompt?.trim() || 'What is in this image? Describe it in detail.';

    const incoming: string[] = [];
    if (Array.isArray(body.images)) incoming.push(...body.images);
    if (body.image) incoming.push(body.image);
    const images = incoming.filter((img): img is string => typeof img === 'string' && img.length > 0);

    if (images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required.' });
    }

    const systemMessage = {
      role: 'system' as const,
      content:
        'You are Eco AI 🌿, a multimodal assistant built by Chandon Kumar. You can see and analyse images, then describe, identify, read text, count objects, judge style/quality, and answer follow-up questions about them. Reply concisely, reference what is visible in the picture, and use prior conversation context when relevant.'
    };

    const historyMessages = Array.isArray(body.history)
      ? body.history
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const userContent: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [{ type: 'text', text: prompt }];

    for (const img of images.slice(0, 8)) {
      userContent.push({ type: 'image_url', image_url: { url: toDataUrl(img) } });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.6,
        max_tokens: 1200,
        messages: [systemMessage, ...historyMessages, { role: 'user', content: userContent }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI Vision API error', errorData);
      return res.status(response.status).json({ error: 'Failed to analyze image.' });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'Unable to analyze image.';

    res.status(200).json({ analysis });
  } catch (error) {
    console.error('Vision API error', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
