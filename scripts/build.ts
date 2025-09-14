import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  sourcemap: true,
  minify: true,
  platform: 'browser',
  target: ['es2020']
}).then(() => {
  console.log('Build complete: dist/index.js');
  esbuild.stop();
}).catch((err: unknown) => {
  console.error(err);
  esbuild.stop();
  process.exit(1);
});
