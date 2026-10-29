// Smoke test against a deployed API base URL.
// Usage: node scripts/smokeTest.js <apiBaseUrl> [cronSecret]
const base = (process.argv[2] || '').replace(/\/+$/, '');
const cronSecret = process.argv[3];

if (!base) {
  console.error('Usage: node scripts/smokeTest.js <apiBaseUrl> [cronSecret]');
  process.exit(1);
}

let pass = true;
const check = async (name, fn) => {
  try {
    await fn();
    console.log('PASS', name);
  } catch (e) {
    pass = false;
    console.log('FAIL', name, '-', e.message);
  }
};

const assertStatus = (r, expected) => {
  if (r.status !== expected) throw new Error(`expected ${expected}, got ${r.status}`);
  return r;
};

await check('GET /api/health is 200 with success true', async () => {
  const r = assertStatus(await fetch(`${base}/api/health`), 200);
  const j = await r.json();
  if (j.success !== true) throw new Error('success was not true');
});

await check('bad login is 401 with { success: false }', async () => {
  const r = assertStatus(
    await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smoke@invalid.test', password: 'wrongpassword' }),
    }),
    401,
  );
  const j = await r.json();
  if (j.success !== false) throw new Error('success was not false');
});

await check('GET /api/bills without a token is 401', async () => {
  assertStatus(await fetch(`${base}/api/bills`), 401);
});

await check('a /api/dev/* route is 404 in production', async () => {
  assertStatus(await fetch(`${base}/api/dev/run-all-reminders`, { method: 'POST' }), 404);
});

await check('no X-Powered-By header', async () => {
  const r = await fetch(`${base}/api/health`);
  if (r.headers.get('x-powered-by')) throw new Error('X-Powered-By present');
});

await check('GET /api/test/* temp route is 404 in production', async () => {
  assertStatus(await fetch(`${base}/api/test/protected`), 404);
});

if (cronSecret) {
  await check('/api/internal/run-reminders is 401 WITHOUT the secret', async () => {
    assertStatus(await fetch(`${base}/api/internal/run-reminders`, { method: 'POST' }), 401);
  });
  await check('/api/internal/run-reminders is 200 WITH the secret', async () => {
    assertStatus(
      await fetch(`${base}/api/internal/run-reminders`, {
        method: 'POST',
        headers: { 'x-cron-secret': cronSecret },
      }),
      200,
    );
  });
} else {
  console.log('SKIP internal run-reminders checks (no cron secret argument passed)');
}

process.exit(pass ? 0 : 1);
