// Gemini LLM provider
// Expects options: { apiKey?: string, model?: string }
// ARCH-02: generate() uses fetchWithRetry (30s timeout, up to 3 attempts).
// ARCH-05: generate() accepts an optional AbortSignal for ARCH-04 cancellation.

import { fetchWithRetry } from '../retry.js';

export function createGeminiLLM({ apiKey = '', model = 'gemini-2.0-flash' } = {}, baseUrl = 'https://generativelanguage.googleapis.com') {
  const endpoint = `${baseUrl}/v1beta/models/${model}:generateContent`;
  const listEndpoint = `${baseUrl}/v1beta/models`;

  return {
    name: 'gemini',
    // SEC-02: API key sent via x-goog-api-key header instead of URL query param
    // to prevent key exposure in browser history, server logs, and referrer headers.
    // ARCH-02: Uses fetchWithRetry for timeout + exponential backoff.
    async generate(prompt, signal) {
      const payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
      const res = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-goog-api-key': apiKey } : {}),
          },
          body: JSON.stringify(payload),
        },
        {},
        signal,
      );
      if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },
    async listModels() {
      const fallback = [model, 'gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash']
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);
      if (!apiKey) return fallback;
      try {
        const res = await fetch(listEndpoint, {
          method: 'GET',
          headers: { 'x-goog-api-key': apiKey },
        });
        if (!res.ok) return fallback;
        const data = await res.json();
        const names = (data?.models || [])
          .map((m) => m?.name?.replace('models/', '') || '')
          .filter(Boolean);
        return Array.from(new Set([model, ...names]));
      } catch {
        return fallback;
      }
    },
  };
}
