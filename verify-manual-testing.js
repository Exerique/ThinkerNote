/**
 * Automated verification script for manual testing checklist
 * This script checks aspects that can be verified programmatically
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Collaborative Note Board - Manual Testing Verification\n');

// Color definitions from design spec
const colors = {
  background: '#F5F5F7',
  canvas: '#FFFFFF',
  accent: '#007AFF',
  textPrimary: '#1D1D1F',
  textSecondary: '#86868B',
  noteColors: {
    yellow: '#FFD60A',
    orange: '#FF9F0A',
    red: '#FF453A',
    pink: '#FF375F',
    purple: '#BF5AF2',
    blue: '#0A84FF',
    teal: '#5AC8FA',
    green: '#32D74B'
  }
};

// Check if files exist
function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

// Check CSS files for color values
function checkCSSColors(filePath, colorName, expectedColor) {
  if (!checkFileExists(filePath)) {
    return { found: false, message: `File not found: ${filePath}` };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const found = content.includes(expectedColor.toLowerCase()) || 
                content.includes(expectedColor.toUpperCase());
  
  return { 
    found, 
    message: found ? `✓ ${colorName} found` : `✗ ${colorName} not found (${expectedColor})`
  };
}

// Check for animation durations
function checkAnimationDurations(filePath) {
  if (!checkFileExists(filePath)) {
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const durations = [];
  
  // Look for transition and animation durations
  const transitionRegex = /transition:\s*[^;]*?(\d+)ms/g;
  const animationRegex = /animation:\s*[^;]*?(\d+)ms/g;
  
  let match;
  while ((match = transitionRegex.exec(content)) !== null) {
    durations.push({ type: 'transition', duration: parseInt(match[1]) });
  }
  while ((match = animationRegex.exec(content)) !== null) {
    durations.push({ type: 'animation', duration: parseInt(match[1]) });
  }
  
  return durations;
}

// Check for ARIA labels
function checkARIALabels(filePath) {
  if (!checkFileExists(filePath)) {
    return { count: 0, found: false };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const ariaLabelCount = (content.match(/aria-label=/g) || []).length;
  const ariaDescribedByCount = (content.match(/aria-describedby=/g) || []).length;
  
  return {
    count: ariaLabelCount + ariaDescribedByCount,
    found: ariaLabelCount > 0 || ariaDescribedByCount > 0
  };
}

// Main verification
console.log('📁 Checking File Structure...\n');

const criticalFiles = [
  'client/src/App.tsx',
  'client/src/components/Note/Note.tsx',
  'client/src/components/Note/Note.module.css',
  'client/src/components/Sidebar/Sidebar.tsx',
  'client/src/components/Sidebar/Sidebar.module.css',
  'client/src/components/Board/Board.tsx',
  'client/src/components/Toolbar/Toolbar.tsx',
  'server/src/index.ts',
  'server/src/services/stateManager.ts',
  'server/src/services/persistence.ts'
];

let filesFound = 0;
criticalFiles.forEach(file => {
  const exists = checkFileExists(file);
  console.log(`${exists ? '✓' : '✗'} ${file}`);
  if (exists) filesFound++;
});

console.log(`\n${filesFound}/${criticalFiles.length} critical files found\n`);

// Check CSS color implementations
console.log('🎨 Checking Color Implementation...\n');

const cssFiles = [
  'client/src/components/Note/Note.module.css',
  'client/src/components/Sidebar/Sidebar.module.css',
  'client/src/components/Board/Board.module.css'
];

cssFiles.forEach(file => {
  if (checkFileExists(file)) {
    console.log(`\nChecking ${file}:`);
    
    // Check for accent color
    const accentCheck = checkCSSColors(file, 'Accent Blue', colors.accent);
    console.log(`  ${accentCheck.message}`);
    
    // Check for note colors
    Object.entries(colors.noteColors).forEach(([name, color]) => {
      const check = checkCSSColors(file, name, color);
      if (check.found) {
        console.log(`  ${check.message}`);
      }
    });
  }
});

// Check animation durations
console.log('\n⏱️  Checking Animation Durations...\n');

cssFiles.forEach(file => {
  const durations = checkAnimationDurations(file);
  if (durations.length > 0) {
    console.log(`${file}:`);
    durations.forEach(d => {
      const status = d.duration <= 500 ? '✓' : '⚠️';
      console.log(`  ${status} ${d.type}: ${d.duration}ms`);
    });
  }
});

// Check for accessibility features
console.log('\n♿ Checking Accessibility Features...\n');

const componentFiles = [
  'client/src/components/Note/Note.tsx',
  'client/src/components/Toolbar/Toolbar.tsx',
  'client/src/components/Sidebar/Sidebar.tsx'
];

componentFiles.forEach(file => {
  const ariaCheck = checkARIALabels(file);
  const status = ariaCheck.found ? '✓' : '✗';
  console.log(`${status} ${file}: ${ariaCheck.count} ARIA labels`);
});

// Check for keyboard shortcuts
console.log('\n⌨️  Checking Keyboard Shortcuts...\n');

const toolbarFile = 'client/src/components/Toolbar/Toolbar.tsx';
if (checkFileExists(toolbarFile)) {
  const content = fs.readFileSync(toolbarFile, 'utf8');
  
  const shortcuts = [
    { key: 'Ctrl+N', description: 'New Note' },
    { key: 'Ctrl+-', description: 'Zoom Out' },
    { key: 'Ctrl+=', description: 'Zoom In' },
    { key: 'Ctrl+0', description: 'Reset Zoom' },
    { key: 'Ctrl+F', description: 'Fit to Screen' }
  ];
  
  shortcuts.forEach(shortcut => {
    const found = content.includes(shortcut.key);
    console.log(`${found ? '✓' : '✗'} ${shortcut.key}: ${shortcut.description}`);
  });
}

// Check for error handling
console.log('\n🛡️  Checking Error Handling...\n');

const errorFiles = [
  'client/src/contexts/WebSocketContext.tsx',
  'server/src/services/persistence.ts',
  'server/src/services/stateManager.ts'
];

errorFiles.forEach(file => {
  if (checkFileExists(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const tryCatchCount = (content.match(/try\s*{/g) || []).length;
    const errorHandlerCount = (content.match(/catch\s*\(/g) || []).length;
    
    console.log(`${file}:`);
    console.log(`  ${tryCatchCount > 0 ? '✓' : '✗'} ${tryCatchCount} try-catch blocks`);
    console.log(`  ${errorHandlerCount > 0 ? '✓' : '✗'} ${errorHandlerCount} error handlers`);
  }
});

// Check for responsive design
console.log('\n📱 Checking Responsive Design...\n');

cssFiles.forEach(file => {
  if (checkFileExists(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const mediaQueries = (content.match(/@media/g) || []).length;
    
    if (mediaQueries > 0) {
      console.log(`✓ ${file}: ${mediaQueries} media queries`);
    }
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log(`
This automated check verified:
✓ File structure and critical components
✓ Color palette implementation
✓ Animation duration specifications
✓ Accessibility features (ARIA labels)
✓ Keyboard shortcuts
✓ Error handling patterns
✓ Responsive design media queries

⚠️  MANUAL TESTING STILL REQUIRED:
- Visual appearance and design fidelity
- Animation smoothness (60fps target)
- Physics interactions and feel
- Touch/trackpad gesture responsiveness
- Cross-browser compatibility
- Color contrast ratios (use WCAG tools)
- Complete keyboard navigation flow
- Error message clarity and helpfulness
- Real-time collaboration testing
- Performance under load

📋 See MANUAL_TESTING_CHECKLIST.md for complete testing guide
`);

console.log('='.repeat(60) + '\n');
