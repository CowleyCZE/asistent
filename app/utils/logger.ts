/**
 * LoggerService - centralizované logování do konzole a souboru.
 * Nahrazuje duplikovanou metodu logToFile() v AssistantService.
 */
import { knownFolders } from '@nativescript/core';

export type LogLevel = 'INFO' | 'SUCCESS' | 'ERROR' | 'NETWORK ERROR';

export class LoggerService {
    private readonly LOG_FILE: string = 'webhook_log.txt';

    /** Zapíše informační zprávu do logu. */
    public info(message: string): void {
        this.write('INFO', message);
    }

    /** Zapíše zprávu o úspěšné operaci do logu. */
    public success(message: string): void {
        this.write('SUCCESS', message);
    }

    /** Zapíše chybovou zprávu (na stderr i do souboru). */
    public error(message: string): void {
        this.write('ERROR', message, true);
    }

    /** Zapíše síťovou chybu (na stderr i do souboru). */
    public networkError(message: string): void {
        this.write('NETWORK ERROR', message, true);
    }

    /**
     * Zapíše záznam do konzole a přidá ho do logovacího souboru.
     */
    private write(level: LogLevel, message: string, isError: boolean = false): void {
        const entry = `[${level}] ${new Date().toISOString()}: ${message}`;
        if (isError) {
            console.error(entry);
        } else {
            console.log(entry);
        }
        this.appendToFile(entry);
    }

    /**
     * Přidá řádek na konec logovacího souboru (best-effort).
     */
    private appendToFile(entry: string): void {
        try {
            const documents = knownFolders.documents();
            const file = documents.getFile(this.LOG_FILE);
            file.readText().then((content: string) => {
                file.writeText(content + entry + "\n");
            });
        } catch (error) {
            console.error('LoggerService: nelze zapsat do logovacího souboru:', error);
        }
    }
}
