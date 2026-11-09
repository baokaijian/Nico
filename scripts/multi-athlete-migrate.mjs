import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeState } from '../shared/domain.mjs';
import { migrateMultiAthleteState } from '../shared/athletes-coaches.mjs';

export function runMultiAthleteMigration(inputState, options = {}) {
  const validated = normalizeState(inputState);
  const outcome = migrateMultiAthleteState(validated, options);
  normalizeState(outcome.data);
  return outcome;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) {
    console.error('用法: node scripts/multi-athlete-migrate.mjs <json-file>');
    process.exit(1);
  }
  const resolved = path.resolve(target);
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const state = raw.format === 'nico-backup-v1' ? raw.data : raw;
  const { data, migrated, recordsStamped } = runMultiAthleteMigration(state);
  if (migrated) {
    const out = raw.format === 'nico-backup-v1' ? { ...raw, data } : data;
    fs.writeFileSync(resolved, JSON.stringify(out, null, 2) + '\n');
  }
  console.log(JSON.stringify({ ok: true, migrated, recordsStamped, athletesCount: data.athletes.length }));
}
