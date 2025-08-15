import { ModelAdapter, ModelRequest, ModelResponse } from '@/lib/models/base';

export class SimulatedAdapter implements ModelAdapter {
  public readonly name = 'simulated';

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const schemaUnknown = req.jsonSchema ?? {};
    const schema = schemaUnknown as { properties?: Record<string, unknown> };
    let payload: Record<string, unknown> = {};

    if (schema.properties?.foo) {
      payload = { foo: 'bar' };
    } else if (schema.properties?.word) {
      payload = { word: 'TEST', path: [0, 1, 2, 3] };
    } else if (schema.properties?.assignments) {
      payload = { assignments: [0, 2, 1, 3] };
    } else if (schema.properties?.action) {
      // Simplified: if action relates to placement or firing
      if (schema.properties?.ships) {
        payload = { action: 'place', ships: [{ x: 0, y: 0, len: 2, dir: 'H' }, { x: 2, y: 2, len: 2, dir: 'V' }] };
      } else {
      payload = { action: 'fire', x: Math.floor(Math.random() * 5), y: Math.floor(Math.random() * 5) };
      }
    } else if (schema.properties?.sequence) {
      payload = { sequence: Array.from({ length: 12 }, (_, i) => `A${i}`) };
    } else if (schema.properties?.guess) {
      payload = { guess: 0 };
    }

    const rawText = JSON.stringify(payload);
    return { rawText, parsed: payload, latencyMs: 5, tokensIn: 10, tokensOut: 5 };
  }
}



