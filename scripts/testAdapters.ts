import { OpenAIAdapter } from '@/lib/models/openai';
import { SimulatedAdapter } from '@/lib/models/simulated';

const schema = {
  type: 'object',
  properties: { foo: { type: 'string' } },
  required: ['foo'],
  additionalProperties: false,
} as const;

const req = {
  system: 'You are a helpful assistant. Output only valid JSON.',
  user: "Return foo with value 'bar'.",
  jsonSchema: schema,
  maxTokens: 50,
  temperature: 0,
  timeoutMs: 5000,
};

async function run() {
  // Simulated
  try {
    const sim = new SimulatedAdapter();
    const r = await sim.complete(req);
    console.log(`[adapter=${sim.name}] rawText=`, r.rawText);
    console.log(`[adapter=${sim.name}] parsed=`, r.parsed);
    console.log(`[adapter=${sim.name}] latencyMs=`, r.latencyMs);
    if (!r.parsed || (r as any).parsed.foo !== 'bar') {
      throw new Error('SimulatedAdapter did not return expected { foo: "bar" }');
    }
  } catch (e) {
    console.error('SimulatedAdapter test failed:', e);
  }

  // OpenAI (only if key present)
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAIAdapter('gpt-4.1');
      const r = await openai.complete(req);
      console.log(`[adapter=${openai.name}] rawText=`, r.rawText);
      console.log(`[adapter=${openai.name}] parsed=`, r.parsed);
      console.log(`[adapter=${openai.name}] tokens in/out=`, r.tokensIn, r.tokensOut);
      console.log(`[adapter=${openai.name}] latencyMs=`, r.latencyMs);
      if (!r.parsed || (r as any).parsed.foo !== 'bar') {
        throw new Error('OpenAIAdapter did not return expected { foo: "bar" }');
      }
    } catch (e) {
      console.error('OpenAIAdapter test failed:', e);
    }
  } else {
    console.log('Skipping OpenAIAdapter test: OPENAI_API_KEY not set');
  }
}

run().catch((e) => {
  console.error('Unhandled error in testAdapters:', e);
});


