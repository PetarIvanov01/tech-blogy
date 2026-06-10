import type { CollectionEntry } from 'astro:content';

export interface SeriesMetadata {
	key: string;
	slug: string;
	title: string;
	description: string;
	displayDate?: string;
	tags?: string[];
}

export type BlogPost = CollectionEntry<'blog'>;

export interface HomepageSeriesItem {
	type: 'series';
	series: SeriesMetadata;
	posts: BlogPost[];
	pubDate: Date;
}

export interface HomepagePostItem {
	type: 'post';
	post: BlogPost;
	pubDate: Date;
}

export type HomepageItem = HomepageSeriesItem | HomepagePostItem;

export const seriesMetadata = [
	{
		key: 'DDIA',
		slug: 'ddia',
		title: 'Designing Data-Intensive Applications',
		description:
			'Chapter notes on DDIA, covering reliable systems, data models, storage, replication, partitioning, transactions, and consensus.',
		displayDate: 'March 2026',
		tags: ['ddia', 'databases', 'distributed-systems'],
	},
] satisfies SeriesMetadata[];

export function getSeriesHref(series: SeriesMetadata) {
	return `/series/${series.slug}/`;
}

export function getSeriesByKey(seriesKey?: string) {
	if (!seriesKey) {
		return undefined;
	}

	return seriesMetadata.find((series) => series.key === seriesKey);
}

export function getSeriesBySlug(seriesSlug: string) {
	return seriesMetadata.find((series) => series.slug === seriesSlug);
}

export function sortPostsBySeriesOrder(posts: BlogPost[]) {
	return [...posts].sort((a, b) => {
		const orderA = a.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
		const orderB = b.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;

		if (orderA !== orderB) {
			return orderA - orderB;
		}

		return a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
	});
}

export function getLatestPostDate(posts: BlogPost[]) {
	return posts.reduce(
		(latest, post) => (post.data.pubDate > latest ? post.data.pubDate : latest),
		posts[0]?.data.pubDate ?? new Date(0),
	);
}

export function getHomepageItems(posts: BlogPost[]) {
	const seriesPosts = new Map<string, BlogPost[]>();
	const standalonePosts: BlogPost[] = [];

	for (const post of posts) {
		const series = getSeriesByKey(post.data.series);

		if (!series) {
			standalonePosts.push(post);
			continue;
		}

		const groupedPosts = seriesPosts.get(series.key) ?? [];
		groupedPosts.push(post);
		seriesPosts.set(series.key, groupedPosts);
	}

	const items: HomepageItem[] = standalonePosts.map((post) => ({
		type: 'post',
		post,
		pubDate: post.data.pubDate,
	}));

	for (const [seriesKey, postsInSeries] of seriesPosts) {
		const series = getSeriesByKey(seriesKey);

		if (!series) {
			continue;
		}

		items.push({
			type: 'series',
			series,
			posts: sortPostsBySeriesOrder(postsInSeries),
			pubDate: getLatestPostDate(postsInSeries),
		});
	}

	return items.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
}
