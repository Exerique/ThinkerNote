// Verification script to check project setup
import { existsSync } from 'fs';
import { join } from 'path';

const checks = [
  { name: 'Client package.json', path: 'client/package.json' },
  { name: 'Server package.json', path: 'server/package.json' },
  { name: 'Shared package.json', path: 'shared/package.json' },
  { name: 'Client tsconfig.json', path: 'client/tsconfig.json' },
  { name: 'Server tsconfig.json', path: 'server/tsconfig.json' },
  { name: 'Shared tsconfig.json', path: 'shared/tsconfig.json' },
  { name: 'Shared types', path: 'shared/src/types.ts' },
  { name: 'Client App.tsx', path: 'client/src/App.tsx' },
  { name: 'Server index.ts', path: 'server/src/index.ts' },
  { name: 'Vite config', path: 'client/vite.config.ts' },
  { name: 'Client index.html', path: 'client/index.html' },
  { name: 'Root package.json', path: 'package.json' },
  { name: 'README.md', path: 'README.md' },
  { name: '.gitignore', path: '.gitignore' },
];

console.log('🔍 Verifying project setup...\n');

let allPassed = true;

checks.forEach(check => {
  const exists = existsSync(check.path);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  if (!exists) allPassed = false;
});

console.log('\n📦 Checking dependencies...\n');

const dependencies = [
  'react',
  'react-dom',
  'socket.io',
  'socket.io-client',
  'matter-js',
  'framer-motion',
  'react-zoom-pan-pinch',
  'express',
  'cors',
  'uuid',
  'typescript',
];

dependencies.forEach(dep => {
  try {
    const depPath = join('node_modules', dep);
    const exists = existsSync(depPath);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${dep}`);
    if (!exists) allPassed = false;
  } catch (e) {
    console.log(`❌ ${dep}`);
    allPassed = false;
  }
});

console.log('\n' + (allPassed ? '✅ All checks passed!' : '❌ Some checks failed'));
process.exit(allPassed ? 0 : 1);
