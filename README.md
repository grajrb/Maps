# maps
To install dependencies:

```bash
bun install
```

Dev server (starts at http://localhost:1234):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

The dev server compiles `src/*.ts` files on demand using `esbuild` and serves `index.html`.

Environment
-----------

The Google Maps API key is read from the environment variable `MAPS_API_KEY` and exposed to the browser via the dev server endpoint `/env.js`. Set it before running the dev server, for example:

Windows (cmd.exe):

```
set MAPS_API_KEY=your_key_here
npm run dev
```

Or PowerShell:

```
$env:MAPS_API_KEY = 'your_key_here'
npm run dev
```

Testing
-------

Run unit tests with Vitest:

```
npm test
```

Run tests in watch mode:

```
npm run test:watch
```

Faker (community fork)

The original Faker project is unmaintained; use the community fork and install with:

```bash
npm install @faker-js/faker@7.6.0
```

Import in your TypeScript files as:

```ts
import { faker } from "@faker-js/faker";
```
