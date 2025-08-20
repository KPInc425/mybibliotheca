export function resolveMediaUrl(input?: string): string | undefined {
	if (!input) return undefined;
	const url = input.trim();

	// Already a proper backend-served static path
	if (url.startsWith('/static/')) return url;
	if (url.startsWith('static/')) return `/${url}`;

	// If a full URL contains /static/, strip the origin and keep the path
	const staticIdx = url.indexOf('/static/');
	if (staticIdx !== -1) {
		return url.substring(staticIdx);
	}

	// Fallback: return as-is
	return url;
}

export function debugResolvedMedia(label: string, original?: string, resolved?: string): void {
	// Only log in dev
	/* eslint-disable no-console */
	if (import.meta.env && (import.meta.env as any).DEV) {
		console.debug(`[media] ${label}`, { original, resolved });
	}
	/* eslint-enable no-console */
}


