// Read-only authentication check; never submits a research question.
// Run: node --env-file=.env.lightreel scripts/lightreel-check.mjs
const key = process.env.LIGHTREEL_API_KEY?.trim();
if (!key) {
  console.error('LIGHTREEL_API_KEY is missing. No request made.');
  process.exitCode = 1;
} else {
  try {
    const response = await fetch('https://api.lightreel.ai/v1/chats', {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    // Do not print or persist private conversation contents or provider errors.
    await response.body?.cancel();
    if (response.ok) {
      console.log(`Lightreel authentication accepted (HTTP ${response.status}). No research request submitted. Chat contents discarded.`);
    } else {
      console.error(`Lightreel connection check failed (HTTP ${response.status}). No research request submitted.`);
      process.exitCode = 1;
    }
  } catch {
    console.error('Lightreel connection check failed or timed out. No retry made; error details suppressed to protect credentials.');
    process.exitCode = 1;
  }
}
