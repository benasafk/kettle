// Standalone fixture preview/test server. Not part of runtime/build configuration.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fictional creator review preview</title>
<style>html { color-scheme:light; background:light-dark(#edf0f5,#10151e); color:light-dark(#17191e,#f2f3f7); font:16px/1.5 system-ui } body { margin:0; padding:16px } main { max-width:640px; margin:auto } header { padding-bottom:16px } label { display:inline-block; margin:8px 12px 8px 0 } select { font:inherit; min-height:44px; max-width:100% } h1 { font-size:18px; margin:0 } p { margin:8px 0 } #review { min-width:0 } @media(max-width:420px) {body {padding:0} header {padding:16px}} </style>
<main><header><h1>Fictional component preview</h1><p>No live scan, provider calls, or saved changes.</p><label>Scenario <select id="scenario"></select></label><label>Theme <select id="theme"><option>light</option><option>dark</option></select></label></header><div id="review"></div></main><script src="/preview.js"></script></html>`;
export async function creatorPreviewServer() {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL('preview.ts', import.meta.url))], bundle:true, write:false, format:'iife', platform:'browser' });
  return createServer((request, response) => {
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'");
    response.setHeader('Cache-Control', 'no-store');
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/') { response.setHeader('Content-Type','text/html; charset=utf-8'); response.end(html); }
    else if (path === '/preview.js') { response.setHeader('Content-Type','text/javascript'); response.end(bundle.outputFiles[0].text); }
    else response.writeHead(404).end();
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4175);
  (await creatorPreviewServer()).listen(port, '127.0.0.1', () => console.log(`Fictional preview: http://127.0.0.1:${port}`));
}
