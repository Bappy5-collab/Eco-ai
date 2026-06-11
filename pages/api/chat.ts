import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';

export const config = {
  api: {
    bodyParser: false
  }
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type RequestBody = {
  messages: ChatMessage[];
};

async function bufferRequest(req: NextApiRequest): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
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
    const rawBody = await bufferRequest(req);
    const requestBody = JSON.parse(rawBody) as RequestBody;
    if (!Array.isArray(requestBody.messages)) {
      return res.status(400).json({ error: 'Invalid request payload.' });
    }

    const upstreamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        stream: true,
        temperature: 0.7,
        messages: requestBody.messages
      })
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorPayload = await upstreamResponse.text();
      console.error('OpenAI API error', errorPayload);
      res.status(upstreamResponse.status).json({ error: 'Failed to fetch from OpenAI.' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });

    const stream = Readable.fromWeb(upstreamResponse.body as unknown as WebReadableStream<Uint8Array>);

    stream.on('data', (chunk) => {
      res.write(chunk);
    });

    stream.on('error', (error) => {
      console.error('Stream error', error);
      res.end();
    });

    stream.on('end', () => {
      res.end();
    });
  } catch (error) {
    console.error('Unexpected error', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
