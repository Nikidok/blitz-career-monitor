import { readFile } from 'node:fs/promises';
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
if (!token || !repository) throw new Error('GitHub runtime configuration is missing');
const status = JSON.parse(await readFile('.monitor-state.json', 'utf8'));
const weekStart = new Date();
weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
const week = weekStart.toISOString().slice(0, 10);
const url = 'https://api.github.com/repos/' + repository + '/contents/monitor-status.json';
const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' };
const existing = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
let sha;
if (existing.ok) {
  const file = await existing.json();
  const saved = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  if (saved.weekStart === week) { console.log('Weekly availability record is current'); process.exit(0); }
  sha = file.sha;
} else if (existing.status !== 404) throw new Error('Could not read weekly availability record: HTTP ' + existing.status);
const content = Buffer.from(JSON.stringify({ weekStart: week, status: status.status, checkedAt: status.checkedAt }, null, 2) + '\n').toString('base64');
const response = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ message: 'Record weekly website availability', content, ...(sha ? {sha} : {}) }), signal: AbortSignal.timeout(10000) });
if (!response.ok) throw new Error('Could not save weekly availability record: HTTP ' + response.status);
console.log('Recorded weekly website availability');
