export function forceJSON(raw: string): { ok: boolean; parsed?: unknown; cleaned: string } {
  const original = raw;
  let s = raw.trim();
  // Strip leading/trailing code fences (``` or ```json)
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z0-9_-]*\n?/, '');
    if (s.endsWith('```')) s = s.replace(/```\s*$/, '');
    s = s.trim();
  }

  // Find first '{' and its matching '}' using depth counter (respecting strings)
  const start = s.indexOf('{');
  if (start === -1) {
    return { ok: false, cleaned: original };
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  if (end === -1) {
    return { ok: false, cleaned: original };
  }
  let cleaned = s.slice(start, end + 1);

  // First attempt
  try {
    const parsed = JSON.parse(cleaned);
    return { ok: true, parsed, cleaned };
  } catch {}

  // Remove trailing commas and try once more
  const withoutTrailingCommas = cleaned.replace(/,\s*([}\]])/g, '$1');
  try {
    const parsed = JSON.parse(withoutTrailingCommas);
    return { ok: true, parsed, cleaned: withoutTrailingCommas };
  } catch {}

  return { ok: false, cleaned };
}

type JSONSchema = {
  type?: 'string' | 'number' | 'integer' | 'array' | 'object';
  required?: string[];
  additionalProperties?: boolean;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  minItems?: number;
  maxItems?: number;
};

export function validateAgainstSchema(obj: unknown, schema: object): { ok: boolean; error?: string } {
  try {
    if (!schema || typeof schema !== 'object') return { ok: true };
    const s = schema as JSONSchema;

    const fail = (msg: string) => ({ ok: false as const, error: msg });

    const check = (value: unknown, sch: JSONSchema, path: string): { ok: boolean; error?: string } => {
      const t = sch.type;
      if (!t) return { ok: true };
      if (t === 'string') return typeof value === 'string' ? { ok: true } : fail(`${path} expected string`);
      if (t === 'number') return typeof value === 'number' && Number.isFinite(value as number) ? { ok: true } : fail(`${path} expected number`);
      if (t === 'integer') return typeof value === 'number' && Number.isInteger(value as number) ? { ok: true } : fail(`${path} expected integer`);
      if (t === 'array') {
        if (!Array.isArray(value)) return fail(`${path} expected array`);
        const arr = value as unknown[];
        if (typeof sch.minItems === 'number' && arr.length < sch.minItems) return fail(`${path} minItems ${sch.minItems}`);
        if (typeof sch.maxItems === 'number' && arr.length > sch.maxItems) return fail(`${path} maxItems ${sch.maxItems}`);
        if (sch.items) {
          for (let i = 0; i < arr.length; i += 1) {
            const r = check(arr[i], sch.items, `${path}[${i}]`);
            if (!r.ok) return r;
          }
        }
        return { ok: true };
      }
      if (t === 'object') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail(`${path} expected object`);
        const rec = value as Record<string, unknown>;
        const required = sch.required ?? [];
        for (const key of required) {
          if (!(key in rec)) return fail(`${path}.${key} missing required`);
        }
        const props = sch.properties ?? {};
        // Type-check present properties
        for (const [key, val] of Object.entries(rec)) {
          if (props[key]) {
            const r = check(val, props[key], `${path}.${key}`);
            if (!r.ok) return r;
          } else if (sch.additionalProperties === false) {
            return fail(`${path}.${key} is not allowed`);
          }
        }
        return { ok: true };
      }
      return { ok: true };
    };

    const base = check(obj, s, '$');
    return base.ok ? { ok: true } : base;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'schema validation error' };
  }
}


