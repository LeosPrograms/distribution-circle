import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
	plugins: [wasm(), topLevelAwait(), sveltekit()],
	build: {
		target: 'esnext',
	},
	esbuild: {
		target: 'esnext',
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	optimizeDeps: {
		// Automerge uses WASM and must not be pre-bundled by Vite
		exclude: ['@automerge/automerge', '@automerge/automerge-repo'],
		// CJS dependencies of excluded packages must be explicitly pre-bundled
		// so Vite can convert their CommonJS exports to named ESM exports
		include: ['eventemitter3', 'bs58check', 'debug', 'fast-sha256', 'uuid', 'xstate', 'isomorphic-ws', 'ws'],
	},
	css: {
		preprocessorOptions: {
			scss: {
				// Silence Bootstrap 5 deprecation warnings from Sass 1.80+
				silenceDeprecations: ['import', 'if-function', 'legacy-js-api'],
			},
		},
	},
	server: {
		host: 'localhost',
		port: 3000,
		open: 'http://localhost:3000',
		headers: {
			// 'wasm-unsafe-eval' is required for WebAssembly (Automerge)
			"Content-Security-Policy": "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' http://localhost:8888 http://localhost:3000; connect-src 'self' ws://localhost:3000 wss://sync.automerge.org",
		},
	fs: {
	  // Allow serving files from the "public" directory
	  allow: ['./static'],
	},
  },
});
