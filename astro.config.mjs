// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	markdown: {
		gfm: true,
		shikiConfig: {
			theme: 'github-light',
		},
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
