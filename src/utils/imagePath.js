export function getProductImagePath(path) {
    if (!path) return '';

    // If it's already a full URL or blob, return as is
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    // If we are in development mode and the path is a local product path, 
    // fallback to the production URL since GitHub-uploaded images won't exist locally until pulse/fetch.
    if (path.startsWith('/products/')) {
        const isDev = import.meta.env.DEV;
        if (isDev) {
            return `https://haku-yakyuu.github.io${path}`;
        }
    }

    return path;
}
