#!/usr/bin/env node

// Final setup validation for ScanStock Pro 4-Agent Architecture
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating ScanStock Pro 4-Agent Setup...\n');

// Required paths and files
const requiredPaths = [
  'src/agent1-foundation',
  'src/agent2-interface',
  'src/agent3-features',
  'src/agent4-quality',
  'src/shared/contracts',
  'src/shared/mocks',
  'src/shared/events',
  'coordination/shared-state.json',
  'coordination/locks',
  'coordination/metrics',
  'scripts/setup-branches.sh',
  'scripts/checkpoint.js',
  'scripts/start-agent.sh',
  'package.json',
  'README.md',
  'tailwind.config.js',
  'env.example'
];

// Required files with content validation
const requiredFiles = [
  {
    path: 'coordination/shared-state.json',
    check: (content) => content.includes('"mobile_first": true') && content.includes('"openai_key_source": "client_provided"')
  },
  {
    path: 'src/shared/contracts/agent-interfaces.ts',
    check: (content) => content.includes('Foundation_To_Interface') && content.includes('Foundation_To_Features')
  },
  {
    path: 'src/shared/mocks/agent-mocks.ts',
    check: (content) => content.includes('Agent1Mock') && content.includes('Agent2Mock') && content.includes('MockRegistry')
  },
  {
    path: 'src/shared/events/event-bus.ts',
    check: (content) => content.includes('EventBus') && content.includes('broadcast')
  },
  {
    path: 'coordination/locks/lock-manager.ts',
    check: (content) => content.includes('LockManager') && content.includes('acquireLock')
  },
  {
    path: 'coordination/locks/conflict-resolver.ts',
    check: (content) => content.includes('ConflictResolver') && content.includes('priority')
  },
  {
    path: 'coordination/metrics/metrics-collector.ts',
    check: (content) => content.includes('MetricsCollector') && content.includes('collectDailyMetrics')
  },
  {
    path: 'package.json',
    check: (content) => content.includes('"name": "scanstock-pro"') && content.includes('"next": "^14.0.0"')
  },
  {
    path: 'README.md',
    check: (content) => content.includes('4-Agent Parallel Development') && content.includes('MOBILE-FIRST')
  },
  {
    path: 'tailwind.config.js',
    check: (content) => content.includes('mobile-first breakpoints') && content.includes('375px')
  }
];

let allValid = true;
let validationResults = [];

console.log('📁 Checking directory structure...');
requiredPaths.forEach(p => {
  const exists = fs.existsSync(path.join(process.cwd(), p));
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${p}`);
  
  if (!exists) {
    allValid = false;
    validationResults.push(`Missing: ${p}`);
  }
});

console.log('\n📄 Validating file contents...');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file.path);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const isValid = file.check(content);
      const status = isValid ? '✅' : '❌';
      console.log(`${status} ${file.path} (content valid)`);
      
      if (!isValid) {
        allValid = false;
        validationResults.push(`Content invalid: ${file.path}`);
      }
    } catch (error) {
      console.log(`❌ ${file.path} (read error)`);
      allValid = false;
      validationResults.push(`Read error: ${file.path}`);
    }
  } else {
    console.log(`❌ ${file.path} (missing)`);
    allValid = false;
    validationResults.push(`Missing: ${file.path}`);
  }
});

// Check script permissions
console.log('\n🔧 Checking script permissions...');
const scripts = ['scripts/setup-branches.sh', 'scripts/start-agent.sh'];
scripts.forEach(script => {
  const scriptPath = path.join(process.cwd(), script);
  if (fs.existsSync(scriptPath)) {
    try {
      const stats = fs.statSync(scriptPath);
      const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;
      const status = isExecutable ? '✅' : '❌';
      console.log(`${status} ${script} (executable: ${isExecutable})`);
      
      if (!isExecutable) {
        console.log(`   Run: chmod +x ${script}`);
      }
    } catch (error) {
      console.log(`❌ ${script} (permission check failed)`);
    }
  }
});

// Validate package.json scripts
console.log('\n📦 Checking package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = [
    'agent1', 'agent2', 'agent3', 'agent4',
    'checkpoint:alpha', 'checkpoint:beta', 'checkpoint:gamma', 'checkpoint:delta'
  ];
  
  requiredScripts.forEach(script => {
    const exists = packageJson.scripts && packageJson.scripts[script];
    const status = exists ? '✅' : '❌';
    console.log(`${status} npm run ${script}`);
    
    if (!exists) {
      allValid = false;
      validationResults.push(`Missing script: ${script}`);
    }
  });
} catch (error) {
  console.log('❌ Failed to parse package.json');
  allValid = false;
}

// Check for critical mobile-first indicators
console.log('\n📱 Checking mobile-first configuration...');
try {
  const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
  const hasMobileBreakpoints = tailwindConfig.includes('375px') && tailwindConfig.includes('mobile-first');
  const status = hasMobileBreakpoints ? '✅' : '❌';
  console.log(`${status} Mobile-first Tailwind config`);
  
  if (!hasMobileBreakpoints) {
    allValid = false;
    validationResults.push('Mobile-first Tailwind configuration missing');
  }
} catch (error) {
  console.log('❌ Failed to read Tailwind config');
}

// Final validation summary
console.log('\n' + '='.repeat(60));
if (allValid) {
  console.log('✅ All 4 agents ready for parallel development!');
  console.log('\n📱 Remember: MOBILE-FIRST design for all features!');
  console.log('🔑 Note: Client will provide OpenAI API key');
  console.log('\n🚀 Next steps:');
  console.log('   1. Run: ./scripts/setup-branches.sh');
  console.log('   2. Choose your agent (1-4)');
  console.log('   3. Start development: ./scripts/start-agent.sh [number]');
  console.log('   4. Follow checkpoints for integration');
  console.log('\n🎯 Success targets:');
  console.log('   - Alpha checkpoint: Week 2 (25%)');
  console.log('   - Beta checkpoint: Week 4 (50%)');
  console.log('   - Gamma checkpoint: Week 6 (75%)');
  console.log('   - Delta checkpoint: Week 8 (100%)');
} else {
  console.log('❌ Setup incomplete. Issues found:');
  validationResults.forEach(result => {
    console.log(`   - ${result}`);
  });
  console.log('\n🔧 Fix the issues above and run validation again.');
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 ScanStock Pro 4-Agent Architecture Setup Complete!');
console.log('   Ready for mobile-first inventory management development.');
