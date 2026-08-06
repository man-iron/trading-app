import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import type { StorybookConfig } from '@storybook/react-vite';

const storybookDir = dirname(fileURLToPath(import.meta.url));

/**
 * Storybook configuration — react-vite framework, colocated stories, and a
 * viteFinal hook that merges the app's '@' -> src alias so stories can use
 * the same import paths as application code.
 */
const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: ['../src/**/*.stories.@(tsx|jsx)'],
  addons: ['@storybook/addon-essentials'],
  viteFinal: async (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: {
        alias: {
          '@': resolve(storybookDir, '../src'),
        },
      },
    }),
};

export default config;
