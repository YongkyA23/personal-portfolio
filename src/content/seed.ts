import raw from '../../content/content.json';
import type { Content } from './types';

/** Content bundled at build time. Shown instantly and used whenever the API is unreachable. */
export const seed = raw as unknown as Content;
