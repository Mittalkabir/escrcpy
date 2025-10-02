import { resolve } from 'node:path' // Node path helper to create absolute paths
import useI18n from '@intlify/unplugin-vue-i18n/vite' // Vue i18n plugin for translation files
import useVueRouter from 'unplugin-vue-router/vite' // File-system based router for Vue
import useVue from '@vitejs/plugin-vue' // Vue SFC support
import useVueJsx from '@vitejs/plugin-vue-jsx' // JSX support for Vue components
import useUnoCSS from 'unocss/vite' // UnoCSS utility-first engine
import { defineConfig, mergeConfig } from 'vite' // Vite helpers

import useElectron from 'vite-plugin-electron/simple' // Simple electron build integration
import useRenderer from 'vite-plugin-electron-renderer' // Renderer helpers (ipc/remote helpers)
import useSvg from 'vite-svg-loader' // Import SVGs as Vue components

import postcssConfig from './postcss.config.js' // PostCSS config used by the css.postcss option

import useAutoImports from './src/plugins/auto.js' // Your custom auto-imports helper (returns plugin(s))

// Path aliases to simplify imports across the project.
// Example: import Foo from '$/components/Foo' resolves to src/components/Foo
const alias = {
  $: resolve('src'),
  $root: resolve(), // project root
  $docs: resolve('docs'),
  $renderer: resolve('src'), // legacy alias mapping to src (keeps older imports working)
  $electron: resolve('electron'),
  $control: resolve('control'),
}

/**
 * mergeCommon
 *
 * Utility that merges a common (shared) Vite configuration (currently `resolve.alias`) with
 * any specific config passed later. Used to ensure nested/electron vite configs receive the same aliases.
 *
 * @param {object} config - vite config piece to merge with the common settings
 * @param {object} [opts] - optional; destructures { command } but here we don't use it
 * @returns merged vite config
 */
function mergeCommon(config, { command = '' } = {}) {
  return mergeConfig(
    {
      resolve: {
        alias,
      },
    },
    config,
  )
}

/**
 * Default export: main function that returns a Vite config.
 *
 * `args` is forwarded to sub-vite configs (important for electron plugin sub-builds).
 */
export default function (args) {
  return mergeCommon(
    defineConfig({
      // Dev server options
      server: {
        port: 1535, // dev server port
      },

      // Build options: provide multiple HTML entry points (for main app + control panel)
      build: {
        rollupOptions: {
          input: {
            main: resolve('index.html'), // primary app entry
            control: resolve('control/index.html'), // separate entry (e.g., admin/control panel)
          },
        },
      },

      // Plugins array - ordered, each plugin modifies the dev/build behaviour
      plugins: [
        useUnoCSS(), // utility CSS engine - on-demand CSS generation
        useSvg(), // lets you import SVG files as Vue components: `import Icon from './icon.svg'`
        useVueRouter({
          // configure file-based router - exclude internal component directories
          exclude: ['src/pages/**/components'],
        }),
        useVue(), // enable Vue single-file components (.vue)
        useVueJsx(), // enable JSX support in Vue components
        useI18n({
          // include translation files for the i18n plugin (absolute path recommended)
          include: [resolve('src/locales/languages/**')],
        }),

        // Electron integration - creates separate vite builds for main & preload scripts
        useElectron({
          // Main process build configuration
          main: {
            entry: 'electron/main.js', // electron main process entry file
            vite: mergeCommon({}, args), // merge aliases into this sub-vite config
          },
          // Preload script build configuration
          preload: {
            input: 'electron/preload.js', // preload script entry
            vite: mergeCommon({}, args), // ensure aliases available in preload build too
          },
        }),

        useRenderer(), // helps renderer process talk to electron APIs (safely expose ipc, etc.)

        // Spread any auto-import plugins from your custom plugin file (e.g., imports for Vue, router)
        ...useAutoImports(),
      ],

      // CSS configuration
      css: {
        postcss: postcssConfig, // apply your PostCSS config (e.g., autoprefixer)
      },
    }),
  )
}
