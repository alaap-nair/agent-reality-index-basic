import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { FalAdapter } from '../lib/models/fal';
import type { ModelRequest } from '../lib/models/base';

async function main() {
  const adapter = new FalAdapter();
  const schema = {
    type: 'object',
    properties: { foo: { type: 'string' } },
    required: ['foo'],
    additionalProperties: false,
  } as const;
  const req: ModelRequest = {
    system: 'You are a careful assistant. Output ONLY valid JSON.',
    user: 'Return {"foo":"bar"}.',
    jsonSchema: schema,
    maxTokens: 50,
    temperature: 0,
    timeoutMs: 8000,
  };

  const res = await adapter.complete(req);
  // eslint-disable-next-line no-console
  console.log('raw:', res.rawText);
  // eslint-disable-next-line no-console
  console.log('parsed:', res.parsed);
  // eslint-disable-next-line no-console
  console.log('latencyMs:', res.latencyMs);

  type Foo = { foo: string };
  const parsed = res.parsed as Foo | undefined;
  if (!parsed || parsed.foo !== 'bar') {
    throw new Error("FAL adapter did not return valid JSON {foo:'bar'}");
  }
  // eslint-disable-next-line no-console
  console.log('OK');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});



