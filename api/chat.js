export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const body = await req.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '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',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: corsHeaders,
  });
}
