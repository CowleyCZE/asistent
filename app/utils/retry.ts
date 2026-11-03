/**
 * Retry utility s exponential backoff.
 */
export interface RetryOptions {
    /** Kolik opakování po prvním neúspěchu (0 = žádné opakování). */
    retries: number;
    /** Zpoždění prvního pokusu v ms (každé další se zdvojnásobuje). */
    baseDelayMs: number;
    /** Maximální zpoždění mezi pokusy v ms. */
    maxDelayMs?: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    retries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 8000
};

/**
 * Opakuje asynchronní operaci s exponential backoff.
 * @throws Poslední chybu, pokud všechny pokusy selžou.
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;

    for (let attempt = 0; attempt <= opts.retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < opts.retries) {
                const delay = Math.min(
                    opts.baseDelayMs * Math.pow(2, attempt),
                    opts.maxDelayMs ?? 8000
                );
                console.log(`Retry: pokus ${attempt + 1} selhal, opakuji za ${delay} ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
