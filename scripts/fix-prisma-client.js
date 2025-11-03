const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '../node_modules/.prisma/client');

// Ensure the directory exists
if (!fs.existsSync(clientDir)) {
  console.error('Prisma client directory does not exist. Run "prisma generate" first.');
  process.exit(1);
}

// Check if client.js exists (with prisma-client-js generator)
const clientJsExists = fs.existsSync(path.join(clientDir, 'client.js'));

if (clientJsExists) {
  // Use the JavaScript file directly (prisma-client-js generator)
  const indexJsPath = path.join(clientDir, 'index.js');
  const indexJsContent = `// Prisma Client index bridge
// Require the JavaScript file directly (no webpack compilation needed)
module.exports = require('./client.js');
`;

  fs.writeFileSync(indexJsPath, indexJsContent);
  console.log('Created index.js (using client.js)');
} else {
  // Fallback: use TypeScript file (prisma-client generator)
  const indexJsPath = path.join(clientDir, 'index.js');
  const indexJsContent = `// Prisma Client index bridge
// Webpack will process require('./client.ts') during build
let clientModule;

try {
  clientModule = require('./client.ts');
} catch (error) {
  throw new Error(
    'Prisma Client not properly compiled. Please ensure webpack processes node_modules/.prisma/client files.'
  );
}

module.exports = clientModule;
`;

  fs.writeFileSync(indexJsPath, indexJsContent);
  console.log('Created index.js (using client.ts - requires webpack)');
}

// Create default.js that points to index.js
const defaultJsPath = path.join(clientDir, 'default.js');
const defaultJsContent = `// Prisma Client default export
// Export from index which handles the client import
module.exports = require('./index.js');
`;

fs.writeFileSync(defaultJsPath, defaultJsContent);
console.log('Created default.js');

// Create or update default.d.ts
const defaultDtsPath = path.join(clientDir, 'default.d.ts');
const defaultDtsContent = `export * from './client';
`;

fs.writeFileSync(defaultDtsPath, defaultDtsContent);
console.log('Created/updated default.d.ts');

// Create index.d.ts
const indexDtsPath = path.join(clientDir, 'index.d.ts');
const indexDtsContent = `export * from './client';
`;

fs.writeFileSync(indexDtsPath, indexDtsContent);
console.log('Created/updated index.d.ts');

console.log('Prisma Client fix completed!');
