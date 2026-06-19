import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    reporters: process.env.GITHUB_ACTIONS ? ['dot', 'github-actions', 'json'] : ['dot'],
    exclude: [
      '**/node_modules/**',
      '/.serverless/',
      '/.vscode/',
      '/.idea/',
      '/.build/',
      '/.esbuild/',
      '/build/',
      '**/aws-sdk'
    ],
    coverage: {
      enabled: true,
      reporter: ['text', 'json-summary'],
      exclude: [
        '**/node_modules/**',
        '/.serverless/',
        '/.vscode/',
        '/.idea/',
        '/.build/',
        '/build/',
        '**/aws-sdk',
        'test/**',
        '**/__mocks__/**',
        '**/.esbuild/**',
        '*.js'
      ]
    },
    globals: true,
    setupFiles: './test/setupBeforeEach.ts'
  }
});
