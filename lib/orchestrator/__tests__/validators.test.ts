import { describe, it, expect } from 'vitest';
import { forceJSON, validateAgainstSchema } from '@/lib/orchestrator/validators';

describe('forceJSON', () => {
  it('parses from ```json fenced block', () => {
    const ok = forceJSON('```json\n{"a":1}\n```');
    expect(ok.ok).toBe(true);
    expect((ok.parsed as any).a).toBe(1);
  });

  it('parses first balanced object and ignores trailing prose', () => {
    const raw = 'Here is your answer:\n{ "foo": { "bar": 2 } }\nSome trailing notes.';
    const ok = forceJSON(raw);
    expect(ok.ok).toBe(true);
    expect((ok.parsed as any).foo.bar).toBe(2);
  });

  it('repairs trailing commas once', () => {
    const raw = '{"a":1, "b":2,}';
    const ok = forceJSON(raw);
    expect(ok.ok).toBe(true);
    expect((ok.parsed as any).b).toBe(2);
  });

  it('fails when no JSON object present', () => {
    const bad = forceJSON('not json');
    expect(bad.ok).toBe(false);
    expect(bad.cleaned).toContain('not json');
  });
});

describe('validateAgainstSchema', () => {
  it('checks required and disallows additionalProperties', () => {
    const schema = {
      type: 'object',
      required: ['x'],
      additionalProperties: false,
      properties: {
        x: { type: 'number' },
      },
    } as const;
    expect(validateAgainstSchema({ x: 1 }, schema).ok).toBe(true);
    expect(validateAgainstSchema({ }, schema).ok).toBe(false);
    const extra = validateAgainstSchema({ x: 1, y: 2 }, schema);
    expect(extra.ok).toBe(false);
    expect(extra.error).toMatch(/not allowed/);
  });

  it('validates primitive types', () => {
    expect(validateAgainstSchema('s', { type: 'string' }).ok).toBe(true);
    expect(validateAgainstSchema(1, { type: 'integer' }).ok).toBe(true);
    expect(validateAgainstSchema(1.2, { type: 'integer' }).ok).toBe(false);
    expect(validateAgainstSchema(1.2, { type: 'number' }).ok).toBe(true);
  });

  it('validates arrays with items and size constraints', () => {
    const schema = { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } } as const;
    expect(validateAgainstSchema(['a','b'], schema).ok).toBe(true);
    expect(validateAgainstSchema(['a'], schema).ok).toBe(false);
    expect(validateAgainstSchema(['a','b','c','d'], schema).ok).toBe(false);
    expect(validateAgainstSchema(['a', 2], schema).ok).toBe(false);
  });

  it('validates nested object properties', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' }, name: { type: 'string' } },
          additionalProperties: false,
        },
      },
      required: ['user'],
    } as const;
    expect(validateAgainstSchema({ user: { id: 1, name: 'x' } }, schema).ok).toBe(true);
    expect(validateAgainstSchema({ user: { id: 1, name: 'x', x: 1 } }, schema).ok).toBe(false);
    expect(validateAgainstSchema({ user: { name: 'x' } }, schema).ok).toBe(false);
  });
});


