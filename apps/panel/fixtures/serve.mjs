// Standalone fixture helper only; never imported by the application or live resource.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../../', import.meta.url);
const paths = new Set(['apps/panel/fixtures/preview.ts', 'apps/panel/fixtures/projects.ts', 'apps/panel/project-review.ts', 'apps/panel/project-review-styles.ts']);
export function fixtureServer() {
  return createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname.slice(1);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'");
    try {
      if (!path) {
        response.setHeader('Content-Type', 'text/html');
        response.end(await readFile(new URL('index.html', import.meta.url)));
      } else if (paths.has(path)) {
        response.setHeader('Content-Type', 'text/javascript');
        const source = await readFile(new URL(path, base), 'utf8');
        response.end(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
      } else { response.writeHead(404).end(); }
    } catch { response.writeHead(500).end('Fixture could not load'); }
  });
}
if (process.argv[1] && new URL(process.argv[1], 'file:').href === import.meta.url) {
  const port = Number(process.env.PORT ?? 4173);
  fixtureServer().listen(port, '127.0.0.1', () => console.log(`Fixture preview: http://127.0.0.1:${port}`));
}
