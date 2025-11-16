#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

const sqlPath = path.join(process.cwd(), 'database', '03-import-assignments.sql');
const outDir = path.join(process.cwd(), 'data');
const outFile = path.join(outDir, 'assignments-from-sql.json');

if (!fs.existsSync(sqlPath)) {
  console.error('SQL file not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf-8');

// Regex to extract ('ratee','rater') pairs
const re = /\('\s*([^']+?)\s*'\s*,\s*'\s*([^']+?)\s*'\s*\)/g;
const assignments: Array<{ rateeEmail: string; raterEmail: string }> = [];
const seen = new Set<string>();

let m: RegExpExecArray | null;
while ((m = re.exec(sql)) !== null) {
  const ratee = m[1].trim().toLowerCase();
  const rater = m[2].trim().toLowerCase();
  const key = `${rater}||${ratee}`;
  if (!seen.has(key)) {
    assignments.push({ rateeEmail: ratee, raterEmail: rater });
    seen.add(key);
  }
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(outFile, JSON.stringify(assignments, null, 2), 'utf-8');

console.log(`Wrote ${assignments.length} assignments to ${outFile}`);
