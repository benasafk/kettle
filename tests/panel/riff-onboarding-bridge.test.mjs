import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { build } from 'esbuild';

test('Riff onboarding bridge mounts safely without a parent host and disposes', async (t) => {
  const bundle = await build({ stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `
    import { mountRiffOnboardingBridge } from './apps/panel/riff-onboarding-bridge.ts';
    window.bridge=mountRiffOnboardingBridge(document.getElementById('root'), {timeoutMs:25});
  ` }, bundle: true, platform: 'browser', format: 'iife', write: false });
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`<div id="root"></div><script>${bundle.outputFiles[0].text}</script>`);
  assert.equal(await page.getByRole('heading', { name: 'Welcome to Riff' }).count(), 1);
  await page.evaluate(() => window.bridge.dispose());
  assert.equal(await page.locator('#root').textContent(), '');
});
