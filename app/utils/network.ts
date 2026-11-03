/**
 * Síťové utility - timeout pro HTTP požadavky.
 */
export class NetworkTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Request timed out after ${timeoutMs} ms`);
        this.name = 'NetworkTimeoutError';
    }
}

/**
 * fetch s timeoutem - pokud požadavek trvá déle než timeoutMs,
 * rejectne s NetworkTimeoutError.
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 15000
): Promise<Response> {
    let timeoutId: any;
    const timeout = new Promise<Response>((_, reject) => {
        timeoutId = setTimeout(
            () => reject(new NetworkTimeoutError(timeoutMs)),
            timeoutMs
        );
    });
    try {
        return await Promise.race([fetch(url, options), timeout]);
    } finally {
        clearTimeout(timeoutId);
    }
}
