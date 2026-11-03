/**
 * Utility pro generování unikátních ID.
 * Nahrazuje duplikovanou metodu generateId() v jednotlivých službách.
 */
export class IdGenerator {
    /**
     * Vygeneruje unikátní ID na základě časového razítka a náhodné části.
     */
    public static generate(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
