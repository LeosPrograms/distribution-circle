import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	server: {
		host: 'localhost',
		port: 3000,
		open: 'http://localhost:3000',
		headers: {
			"Content-Security-Policy": "script-src 'self'  http://localhost:8888  http://localhost:3000 connect-src 'self'"
		},
	fs: {
	  // Allow serving files from the "public" directory
	  allow: ['./static'],
	},
  },
});
