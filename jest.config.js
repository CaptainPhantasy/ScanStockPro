const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Custom Jest configuration
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Test patterns
  testMatch: [
    '<rootDir>/scanstock-pro/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/scanstock-pro/src/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'scanstock-pro/src/**/*.{js,jsx,ts,tsx}',
    '!scanstock-pro/src/**/*.d.ts',
    '!scanstock-pro/src/**/*.stories.{js,jsx,ts,tsx}',
    '!scanstock-pro/src/**/__mocks__/**',
    '!scanstock-pro/src/**/node_modules/**',
  ],
  
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/scanstock-pro/src/$1',
    '^@/components/(.*)$': '<rootDir>/scanstock-pro/src/components/$1',
    '^@/utils/(.*)$': '<rootDir>/scanstock-pro/src/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/scanstock-pro/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/scanstock-pro/src/types/$1',
    '^@/agent1/(.*)$': '<rootDir>/scanstock-pro/src/agent1-foundation/$1',
    '^@/agent2/(.*)$': '<rootDir>/scanstock-pro/src/agent2-interface/$1',
    '^@/agent3/(.*)$': '<rootDir>/scanstock-pro/src/agent3-features/$1',
    '^@/agent4/(.*)$': '<rootDir>/scanstock-pro/src/agent4-quality/$1',
  },
  
  // Setup files
  setupFiles: ['<rootDir>/tests/setup.js'],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
  ],
  
  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  
  // Verbose output
  verbose: true,
  
  // Timeouts
  testTimeout: 10000,
}

// Export the Jest configuration
module.exports = createJestConfig(customJestConfig)