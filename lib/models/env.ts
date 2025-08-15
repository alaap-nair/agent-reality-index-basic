function mask(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return value.slice(0, 2) + '***' + value.slice(-2);
}

export function getFalConfigFromEnv() {
  const baseUrl = process.env.FAL_BASE_URL || 'https://fal.run';
  const path = process.env.FAL_COMPLETIONS_PATH || '/fal-ai/any-llm';
  const apiKey = process.env.FAL_API_KEY;
  const modelId = process.env.FAL_MODEL_ID || 'gpt-4o-mini';

  if (process.env.DEBUG_FAL === '1') {
    // eslint-disable-next-line no-console
    console.log('[FAL DEBUG] baseUrl=', baseUrl, 'path=', path, 'apiKey=', mask(apiKey), 'modelId=', modelId);
  }

  if (!apiKey) {
    throw new Error('FAL_API_KEY missing');
  }

  return { baseUrl, path, apiKey, modelId } as const;
}


