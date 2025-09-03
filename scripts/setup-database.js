const { execSync } = require('child_process');
const path = require('path');

console.log('Setting up Tennis Tinder database...');

try {
  // Compile TypeScript first
  console.log('Compiling TypeScript...');
  execSync('npx tsc --build', { stdio: 'inherit' });
  
  // Import players from CSV
  console.log('Importing players from CSV...');
  const importScript = path.join(__dirname, '..', 'dist', 'src', 'lib', 'import-players.js');
  execSync(`node ${importScript}`, { stdio: 'inherit' });
  
  console.log('Database setup complete!');
} catch (error) {
  console.error('Error setting up database:', error.message);
  process.exit(1);
}