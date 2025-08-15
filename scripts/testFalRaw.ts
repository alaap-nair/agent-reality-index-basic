import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

function urlJoin(base: string, p: string) {
  return base.replace(/\/+$/, '') + '/' + p.replace(/^\/+/, '');
}

async function main() {
  const base = process.env.FAL_BASE_URL || 'https://fal.run';
  const path = process.env.FAL_COMPLETIONS_PATH || '/fal-ai/any-llm';
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error('Missing FAL_API_KEY');
  const url = urlJoin(base, path);

  const body = {
    model: 'openai/gpt-4o-mini',
    prompt: 'Respond with {"foo":"bar"} and nothing else.',
    system_prompt: 'Return ONLY valid JSON: {"foo":"bar"}',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(res.status, text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


