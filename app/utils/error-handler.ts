/**
 * ErrorHandler - utility pro jednotné zpracování chyb.
 */
export class ErrorHandler {
    /**
     * Převede libovolný objekt chyby na uživatelsky čitelnou zprávu.
     */
    public static toMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    /**
     * Zapíše chybu do konzole s kontextem a vrátí její zprávu.
     */
    public static log(context: string, error: unknown): string {
        console.error(`${context}:`, error);
        return ErrorHandler.toMessage(error);
    }
}
