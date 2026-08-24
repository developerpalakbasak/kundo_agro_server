/**
 * Generate a URL-friendly slug from a title/name string (supports English & Bengali unicode characters)
 */
export const slugify = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
};

export default slugify;
