import fs from 'node:fs';
import path from 'node:path';
import { readLatestDayFiles } from '@/lib/storage';

export async function saveDailyCard() {
  const latest = readLatestDayFiles();
  if (!latest) return;

  // Fetch from our own social card API
  const res = await fetch('http://localhost:3000/api/social-card');
  if (!res.ok) return;

  const buffer = await res.arrayBuffer();
  const publicDir = path.join(process.cwd(), 'public');
  fs.writeFileSync(path.join(publicDir, 'daily.png'), Buffer.from(buffer));
}
