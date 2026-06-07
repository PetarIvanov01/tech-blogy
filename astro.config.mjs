// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import tailwindcss from '@tailwindcss/vite';

import { rehypeExternalLinks } from './src/lib/rehypeExternalLinks.js';
import { remarkCallouts } from './src/lib/remarkCallouts.js';

// https://astro.build/config
export default defineConfig({
	integrations: [
		expressiveCode({
			themes: ['github-light'],
			styleOverrides: {
				borderRadius: '0.5rem',
				frames: {
					frameBoxShadowCssValue: 'none',
				},
			},
		}),
	],
	markdown: {
		gfm: true,
		remarkPlugins: [remarkDirective, remarkCallouts],
		rehypePlugins: [
			rehypeSlug,
			rehypeExternalLinks,
			[
				rehypeAutolinkHeadings,
				{
					behavior: 'append',
					properties: {
						className: ['heading-anchor'],
						ariaHidden: 'true',
						tabIndex: -1,
					},
					content: {
						type: 'text',
						value: '#',
					},
				},
			],
		],
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
