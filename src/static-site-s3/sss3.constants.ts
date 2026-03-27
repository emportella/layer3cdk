/**
 * Determines how CloudFront handles 403/404 errors from S3.
 * - `'spa'`: Redirects 403 and 404 to `/index.html` with HTTP 200 (single-page applications).
 * - `'static'`: Uses default CloudFront error handling (traditional static sites).
 */
export type SiteType = 'spa' | 'static';
