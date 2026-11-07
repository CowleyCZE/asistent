/**
 * BackupService - export a import (restore) všech uživatelských dat
 * aplikace (nastavení včetně akcí a historie příkazů).
 *
 * P4 "Umožnit backup/restore":
 * - export do JSON (string) nebo do souboru ve složce Dokumenty
 *   (cze-asistent-backup-<datum>.json),
 * - import z JSON stringu nebo ze souboru s validací obsahu,
 * - verzování formátu (BACKUP_VERSION) pro budoucí migrace.
 */
import { knownFolders, path as nsPath, File } from '@nativescript/core';
import { SettingsService, AppSettings } from './settings.service';
import { HistoryService, CommandHistory } from './history.service';
import { LoggerService } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';

/** Formát zálohy. */
export interface BackupData {
    version: number;
    exportedAt: string; // ISO datum
    settings: AppSettings;
    history: CommandHistory[];
}

/** Výsledek importu zálohy. */
export interface RestoreResult {
    success: boolean;
    errors: string[];
    restoredSettings: boolean;
    restoredHistory: boolean;
}

export interface BackupServiceDeps {
    settingsService?: SettingsService;
    historyService?: HistoryService;
    logger?: LoggerService;
}

/** Aktuální verze formátu zálohy. */
const BACKUP_VERSION = 1;

/** Maximální velikost zálohy, kterou je bezpečné parsovat (1 MB). */
const MAX_BACKUP_SIZE = 1024 * 1024;

export class BackupService {
    private settingsService: SettingsService;
    private historyService: HistoryService;
    private logger: LoggerService;

    constructor(deps: BackupServiceDeps = {}) {
        this.settingsService = deps.settingsService ?? new SettingsService();
        this.historyService = deps.historyService ?? new HistoryService();
        this.logger = deps.logger ?? new LoggerService();
    }

    /**
     * Vytvoří JSON zálohu (nastavení + historie) jako řetězec.
     * @throws při chybě serializace.
     */
    public exportBackup(): string {
        const backup: BackupData = {
            version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            settings: this.settingsService.getSettings(),
            history: this.historyService.getHistory()
        };
        return JSON.stringify(backup, null, 2);
    }

    /**
     * Zapíše zálohu do souboru ve složce Dokumenty.
     * @returns Cesta k vytvořenému souboru, nebo null při chybě.
     */
    public exportBackupToFile(): string | null {
        try {
            const documents = knownFolders.documents();
            if (!documents) {
                this.logger.error('BackupService: složka Dokumenty není dostupná.');
                return null;
            }
            const now = new Date();
            const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const fileName = `cze-asistent-backup-${stamp}.json`;
            const filePath = nsPath.join(documents.path, fileName);
            const file = File.fromPath(filePath);
            file.writeText(this.exportBackup());
            this.logger.success(`Záloha exportována do: ${filePath}`);
            return filePath;
        } catch (error) {
            ErrorHandler.handle('BackupService.exportBackupToFile', error);
            return null;
        }
    }

    /**
     * Obnoví data z JSON zálohy (nastavení + historie) s validací.
     * @returns Výsledek importu s případnými chybami.
     */
    public restoreFromJson(json: string): RestoreResult {
        const result: RestoreResult = {
            success: false,
            errors: [],
            restoredSettings: false,
            restoredHistory: false
        };

        if (typeof json !== 'string' || json.trim().length === 0) {
            result.errors.push('Záloha je prázdná.');
            return result;
        }
        if (json.length > MAX_BACKUP_SIZE) {
            result.errors.push('Záloha překračuje maximální povolenou velikost (1 MB).');
            return result;
        }

        let backup: any;
        try {
            backup = JSON.parse(json);
        } catch (e) {
            result.errors.push('Záloha není platný JSON.');
            return result;
        }

        if (!backup || typeof backup !== 'object' || backup.version !== BACKUP_VERSION) {
            result.errors.push(`Nepodporovaná verze zálohy (očekáváno ${BACKUP_VERSION}).`);
            return result;
        }

        // Nastavení
        if (backup.settings && typeof backup.settings === 'object') {
            if (this.settingsService.importSettings(backup.settings)) {
                result.restoredSettings = true;
            } else {
                result.errors.push('Nastavení ze zálohy se nepodařilo naimportovat.');
            }
        } else {
            result.errors.push('Záloha neobsahuje nastavení.');
        }

        // Historie
        if (Array.isArray(backup.history)) {
            const imported = this.historyService.importHistory(backup.history);
            if (imported) {
                result.restoredHistory = true;
            } else {
                result.errors.push('Historii ze zálohy se nepodařilo naimportovat.');
            }
        } else {
            result.errors.push('Záloha neobsahuje historii.');
        }

        result.success = result.restoredSettings && result.restoredHistory;
        if (result.success) {
            this.logger.success('Záloha byla úspěšně obnovena.');
        }
        return result;
    }

    /**
     * Obnoví data ze souboru se zálohou.
     * @param filePath Cesta k souboru zálohy (JSON).
     */
    public restoreFromFile(filePath: string): RestoreResult {
        const empty: RestoreResult = { success: false, errors: [], restoredSettings: false, restoredHistory: false };
        try {
            if (!File.exists(filePath)) {
                empty.errors.push('Soubor zálohy neexistuje.');
                return empty;
            }
            const file = File.fromPath(filePath);
            const json = file.readTextSync(); // readText() vrací Promise<string>, zde potřebujeme synchronní čtení
            return this.restoreFromJson(json);
        } catch (error) {
            ErrorHandler.handle('BackupService.restoreFromFile', error);
            empty.errors.push('Soubor zálohy se nepodařilo přečíst.');
            return empty;
        }
    }
}
