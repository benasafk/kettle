import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { creatorPipelinePreviewServer } from '../../apps/panel/creator-pipeline/preview-server.mjs';

test('creator pipeline read-only component', async t => {
  const server = await creatorPipelinePreviewServer();
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:672,height:1100}});
  const errors = [], external = [];
  page.on('pageerror', error=>errors.push(error.message));
  page.on('request', request=>{if(!request.url().startsWith(base))external.push(request.url());});
  const captures = fileURLToPath(new URL('../../.context/creator-pipeline/',import.meta.url));
  await mkdir(captures,{recursive:true});
  try {
    const response = await page.goto(base);
    assert.match(response.headers()['content-security-policy'],/connect-src 'none'/);
    const review = page.locator('#review');
    const scenario = name=>page.selectOption('#scenario',name);
    await t.test('ideas show grounding, lineage, chat selection, dates and zero/unknown metrics',async()=> {
      assert.match(await review.textContent(),/Captured DNA version1/);
      assert.match(await review.textContent(),/Later DNA corrections do not change this result/);
      assert.match(await review.textContent(),/Contains fictional test data/);
      assert.match(await review.textContent(),/Why it fits.*Evidence.*How to film it/s);
      assert.match(await review.textContent(),/tell Kettle in chat.*from batch/s);
      await review.locator('summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await review.locator('details').evaluate(n=>n.open),true);
      assert.match(await review.textContent(),/Retrieved2026-10-09 12:00:00 UTC/);
      assert.match(await review.textContent(),/Views120/);
      assert.equal(await review.locator('a,button').count(),0);
      await scenario('empty');
      assert.equal(await review.locator('article').count(),0);
      assert.match(await review.textContent(),/No evidence-backed ideas returned/);
      assert.match(await review.textContent(),/Contains fictional test data/);
      await scenario('three-ideas');
      assert.equal(await review.locator('article').count(),3);
      assert.match(await review.textContent(),/PublishedUnknown.*ViewsUnknown/s);
    });
    await t.test('waiting, failures and uncertain outcomes never offer implicit retry',async()=> {
      for (const state of ['queued','running','failed','needs_reconciliation']) {
        await scenario(state);
        assert.equal(await review.locator('article,details,a,button').count(),0);
        assert.doesNotMatch(await review.textContent(),/One useful desk change|Captured DNA/);
        assert.match(await review.textContent(),/chat/);
      }
      assert.match(await review.getByRole('status').textContent(),/reconcile.*before retrying/);
      assert.match(await review.textContent(),/outcome is uncertain/i);
      await scenario('scan');
      assert.match(await review.textContent(),/Saved version 1/);
      assert.match(await review.textContent(),/Contains fictional test data/);
      assert.match(await review.textContent(),/To get ideas.*DNA version 1/s);
    });
    await t.test('two or three script variants preserve all filming fields and historical lineage',async()=> {
      await scenario('scripts');
      assert.equal(await review.locator('details').count(),2);
      assert.match(await review.textContent(),/Captured DNA version1/);
      for (const field of ['Hook','Opening visual','Script','Shots','B-roll','On-screen text','Showcase timing','Call to action','Pacing','Reference IDs','Variant limitations']) {
        assert.match(await review.textContent(),new RegExp(field));
      }
      assert.match(await review.textContent(),/reopen that batch for source links and dates/);
      assert.equal(await review.locator('a,button').count(),0);
      await scenario('three-variants');
      assert.equal(await review.locator('details').count(),3);
      const summary = review.locator('summary').last();
      assert.match(await summary.ariaSnapshot(),/Experimental/);
      await summary.focus(); await page.keyboard.press('Space');
      assert.equal(await review.locator('details').last().evaluate(n=>n.open),true);
      await page.keyboard.press('Tab'); // Native controls remain keyboard reachable.
    });
    await t.test('narrow/light/dark, long and hostile text, enlarged text',async()=> {
      for (const name of ['ideas','scripts']) for (const width of [320,640]) for (const theme of ['light','dark']) {
        await page.setViewportSize({width:width===640?672:320,height:1100});
        await page.selectOption('#theme',theme); await scenario(name);
        await review.locator('summary').first().evaluate(n=>n.parentElement.open=true);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await review.screenshot({path:`${captures}/${name}-${width}-${theme}.png`});
      }
      await page.setViewportSize({width:320,height:1100}); await scenario('long');
      await review.locator('summary').click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.addStyleTag({content:'.kettle-pipeline :is(h2,h3,h4,p,dt,dd,summary,li) { font-size:200% !important;line-height:1.5 !important }'});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await scenario('long-scripts');
      await review.locator('summary').first().evaluate(n=>n.parentElement.open=true);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await scenario('hostile');
      assert.match(await review.textContent(),/<img src=x onerror=alert\(1\)>/);
      assert.equal(await review.locator('img,script,iframe').count(),0);
    });
    await t.test('lifecycle, same-job focus, identity isolation, stable announcements and safe links',async()=> {
      const bundle = await build({stdin:{contents:`
        import { mountCreatorPipeline } from './apps/panel/creator-pipeline/index.ts';
        import { creatorJobFixture } from './evals/creator-loop/pipeline-fixtures.ts';
        import { CreatorJobView } from './packages/contracts/creator-pipeline.ts';
        window.pipelineTest={mountCreatorPipeline,creatorJobFixture,CreatorJobView};
      `,resolveDir:fileURLToPath(new URL('../../',import.meta.url))},bundle:true,write:false,format:'iife',platform:'browser'});
      await page.route(`${base}/test.js`,route=>route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text}));
      await page.addScriptTag({url:`${base}/test.js`});
      const result = await page.evaluate(()=> {
        const {mountCreatorPipeline,creatorJobFixture,CreatorJobView}=pipelineTest;
        const root=document.createElement('div'); document.body.append(root);
        const ui=mountCreatorPipeline(root);
        let calls=0; const oldFetch=window.fetch;window.fetch=()=>{calls++;throw new Error('No network');};
        const job=creatorJobFixture();ui.render(CreatorJobView.parse(job));
        let details=root.querySelector('details');details.open=true;details.querySelector('summary').focus();
        const status=root.querySelector('[role=status]');const observer=new MutationObserver(()=>{});
        observer.observe(status,{childList:true,characterData:true,subtree:true});
        ui.render(job);
        const stable=observer.takeRecords().length===0;observer.disconnect();
        const retained=root.querySelector('details').open && document.activeElement.tagName==='SUMMARY';
        const historical=structuredClone(job);historical.revision++;historical.result.batch.dna_version=2;
        ui.render(CreatorJobView.parse(historical));
        const captured=root.textContent.includes('Captured DNA version2') && !root.textContent.includes('Captured DNA version1');
        ui.render(CreatorJobView.parse(job));
        const history=root.textContent.includes('Captured DNA version1'); // Host may explicitly reopen historical jobs.
        const failed={...job,state:'failed',result:null,message:'Safe recovery message'};
        ui.render(CreatorJobView.parse(failed));
        const recovered=document.activeElement.tagName==='H2' && !root.querySelector('details');
        document.querySelector('#theme').focus();ui.render(job);
        const externalFocus=document.activeElement.id==='theme';
        root.querySelector('details').open=true;
        const other=structuredClone(job);other.id='00000000-0000-4000-8000-000000000999';ui.render(other);
        const isolated=!root.querySelector('details').open;
        const live=structuredClone(job);live.result.batch.contains_fixture_data=false;
        live.result.batch.references[0].origin='live';live.result.batch.references[0].views=0;
        live.result.batch.references[0].url='https://www.tiktok.com/@fictional_kettle_creator/video/9000000000000000011';ui.render(CreatorJobView.parse(live));
        const link=root.querySelector('a');const safe=link.href==='https://www.tiktok.com/@fictional_kettle_creator/video/9000000000000000011' && link.rel==='noopener noreferrer';
        const zero=root.textContent.includes('Views0');
        live.result.batch.references[0].url='javascript:alert(1)';ui.render(live);
        const unsafe=!root.querySelector('a');
        const missing=structuredClone(job);missing.result.batch.references=[];ui.render(missing);
        const withheld=root.textContent.includes('Idea withheld') && !root.textContent.includes('How to film it');
        ui.dispose();ui.dispose();ui.render(job);
        const empty=root.childElementCount===0;root.remove();window.fetch=oldFetch;
        return {stable,retained,captured,history,recovered,externalFocus,isolated,safe,zero,unsafe,withheld,empty,calls};
      });
      assert.deepEqual(result,{stable:true,retained:true,captured:true,history:true,recovered:true,externalFocus:true,isolated:true,safe:true,zero:true,unsafe:true,withheld:true,empty:true,calls:0});
    });
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
});
