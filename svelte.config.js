import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const production = process.env.NODE_ENV === 'production'

const baseCsp = [
	'self',
	'https://www.gstatic.com/recaptcha/', // recaptcha
	'https://accounts.google.com/gsi/', // sign-in w/google
	'https://www.google.com/recaptcha/', // recapatcha
	'https://fonts.gstatic.com/', // recaptcha fonts
	'http://localhost:8888', // local dev
	'http://localhost:3000', // local dev
	'blob:',
]

const connectSrc = [
	'self',
	'http://localhost:8888',
	'http://localhost:3000',
	'wss://sync.automerge.org', // Automerge sync server
]

if (!production) {
	baseCsp.push('ws://localhost:3000')
	connectSrc.push('ws://localhost:3000')
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			strict: false
		}),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': [...baseCsp],
				'script-src': ['unsafe-inline', 'wasm-unsafe-eval', ...baseCsp],
				'img-src': ['data:', 'blob:', ...baseCsp],
				'style-src': ['unsafe-inline', ...baseCsp],
				'connect-src': [...connectSrc],
				'object-src': ['none'],
				'base-uri': ['self']
			}
		},
		files: {
			serviceWorker: 'src/service-worker.ts'
		}
	}
}

export default config
