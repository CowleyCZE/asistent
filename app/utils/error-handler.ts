/**
 * ErrorHandler - centralizovaný error handler.
 * Jednotné místo pro převod, logování a klasifikaci chyb.
 */
import { NetworkTimeoutError } from './network';

export class ErrorHandler {
    /**
     * Převede libovolný objekt chyby na uživatelsky čitelnou zprávu.
     */
    public static toMessage(error: unknown): string {
        if (error instanceof NetworkTimeoutError) {
            return 'Vypršel časový limit požadavku.';
        }
        return error instanceof Error ? error.message : String(error);
    }

    /**
     * Zapíše chybu do konzole s kontextem a vrátí její zprávu.
     */
    public static log(context: string, error: unknown): string {
        console.error(`${context}:`, error);
        return ErrorHandler.toMessage(error);
    }

    /**
     * Centralizované zpracování chyby: zaloguje s kontextem
     * a vrátí bezpečnou zprávu pro uživatele/log.
     */
    public static handle(context: string, error: unknown): string {
        const message = ErrorHandler.toMessage(error);
        console.error(`[${context}] ${message}`, error);
        return message;
    }

    /**
     * Zjistí, zda je chyba přechodná (vhodná pro retry).
     */
    public static isRetryable(error: unknown): boolean {
        return error instanceof NetworkTimeoutError;
    }
}
