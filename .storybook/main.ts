import type { StorybookConfig } from "@storybook/react-vite";
import { fileURLToPath, URL } from 'node:url'
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  async viteFinal(config) {
    // Merge custom configuration into the default Vite config
    return mergeConfig(config, {
      // Add dependencies to pre-optimization
      optimizeDeps: {
        include: ['@storybook/testing-library'],
      },
       resolve: {
        alias: {
          '@': fileURLToPath(new URL('../src', import.meta.url))
        }
      },
    });
  },
  staticDirs: ['./public'],
};
export default config;
