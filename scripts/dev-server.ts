import esbuild from "esbuild";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync, existsSync } from "fs";
import { extname, dirname } from "path";

const port = 1234;

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const reqUrl = req.url ?? '/';
  const url = new URL(reqUrl, `http://localhost:${port}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  let fsPath = `.${pathname}`;

  // If the request is extensionless (e.g. import '/src/User'), try common extensions
  if (!extname(fsPath)) {
    const tryTs = `${fsPath}.ts`;
    const tryTsx = `${fsPath}.tsx`;
    const tryJs = `${fsPath}.js`;
    if (existsSync(tryTs)) fsPath = tryTs;
    else if (existsSync(tryTsx)) fsPath = tryTsx;
    else if (existsSync(tryJs)) fsPath = tryJs;
  }

  try {
    // Special endpoint to expose environment variables to the client in a controlled way
    if (pathname === '/env.js') {
      const key = process.env.MAPS_API_KEY || '';
      const body = `window.__ENV = { MAPS_API_KEY: ${JSON.stringify(key)} };`;
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(body);
      return;
    }
    if (fsPath.endsWith('.ts') || fsPath.endsWith('.tsx')) {
      const source = readFileSync(fsPath, 'utf8');
      // Bundle with esbuild so bare imports (node_modules) are resolved and inlined
      const loader = fsPath.endsWith('.tsx') ? 'tsx' : 'ts';
      const buildResult = await esbuild.build({
        stdin: { contents: source, resolveDir: dirname(fsPath), sourcefile: fsPath, loader },
        bundle: true,
        platform: 'browser',
        format: 'esm',
        sourcemap: 'inline',
        target: ['es2020'],
        write: false
      });
      const output = buildResult.outputFiles && buildResult.outputFiles[0] && buildResult.outputFiles[0].text;
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(output);
      return;
    }

    const data = readFileSync(fsPath, 'utf8');
    const ext = extname(fsPath);
    const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/plain';
    // add cache headers for static assets
    const headers: any = { 'Content-Type': contentType };
    if (ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

const server = createServer(handleRequest);
server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});
