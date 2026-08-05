import type { Metadata } from 'next';

/**
 * Shared Open Graph / Twitter defaults.
 *
 * Next.js does NOT deep-merge `metadata.openGraph` or `metadata.twitter`: a
 * page that declares either key replaces the root layout's object outright.
 * Every page here declares both, so without these constants each page silently
 * loses og:type, og:site_name, og:locale, the og:image dimensions, and
 * twitter:creator, and a page whose twitter block omits `images` gets
 * downgraded from a large summary card to a small one.
 *
 * Spread OG_BASE / TWITTER_BASE first, then override title, description and url.
 */

export const SITE_URL = 'https://prompt-info.helloworldfirm.com';

/** Dimensions must match the file on disk (verified 1200x450). */
export const SHARE_IMAGE = {
  url: '/prompt_info_assets/prompt-info-logo-normal-1200w.png',
  width: 1200,
  height: 450,
  alt: 'Prompt Info - LLM token counter and cost calculator',
} as const;

export const OG_BASE = {
  type: 'website',
  locale: 'en_US',
  siteName: 'Prompt Info',
  images: [SHARE_IMAGE],
} satisfies Metadata['openGraph'];

export const TWITTER_BASE = {
  card: 'summary_large_image',
  creator: '@JonathanRReed',
  images: [SHARE_IMAGE.url],
} satisfies Metadata['twitter'];
