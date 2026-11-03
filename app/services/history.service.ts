import { ApplicationSettings } from '@nativescript/core';
import { StorageKeys } from '../utils/constants';
import { IdGenerator } from '../utils/id-generator';

export type CommandStatus = 'success' | 'error' | 'network_error';
export type ActionType = 'webhook' | 'tasker' | 'unknown';

export interface CommandHistory {
    id: string;
    command: string;
    actionName: string;
    actionType: ActionType;
    status: CommandStatus;
    timestamp: Date;
    errorMessage?: string;
}

export interface HistoryFilter {
    status?: CommandStatus;
    actionType?: ActionType;
    startDate?: Date;
    endDate?: Date;
    searchText?: string;
}

export class HistoryService {
    private readonly HISTORY_KEY = StorageKeys.CommandHistory;
    private readonly MAX_HISTORY_ITEMS = 100;

    public addCommand(
        command: string,
        actionName: string,
        actionType: ActionType,
        status: CommandStatus,
        errorMessage?: string
    ): void {
        const history = this.getHistory();
        const newEntry: CommandHistory = {
            id: IdGenerator.generate(),
            command,
            actionName,
            actionType,
            status,
            timestamp: new Date(),
            errorMessage
        };

        history.unshift(newEntry);

        if (history.length > this.MAX_HISTORY_ITEMS) {
            history.pop();
        }

        this.saveHistory(history);
    }

    public getHistory(): CommandHistory[] {
        const historyJson = ApplicationSettings.getString(this.HISTORY_KEY);
        if (historyJson) {
            try {
                const parsed = JSON.parse(historyJson);
                return parsed.map((item: any) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
            } catch (e) {
                console.error('Chyba při parsování historie:', e);
                return [];
            }
        }
        return [];
    }

    public getFilteredHistory(filter: HistoryFilter): CommandHistory[] {
        const history = this.getHistory();

        return history.filter(entry => {
            if (filter.status && entry.status !== filter.status) {
                return false;
            }
            if (filter.actionType && entry.actionType !== filter.actionType) {
                return false;
            }
            if (filter.startDate && entry.timestamp < filter.startDate) {
                return false;
            }
            if (filter.endDate && entry.timestamp > filter.endDate) {
                return false;
            }
            if (filter.searchText) {
                const searchLower = filter.searchText.toLowerCase();
                const commandLower = entry.command.toLowerCase();
                const actionNameLower = entry.actionName.toLowerCase();
                if (!commandLower.includes(searchLower) && !actionNameLower.includes(searchLower)) {
                    return false;
                }
            }
            return true;
        });
    }

    public deleteEntry(id: string): boolean {
        const history = this.getHistory();
        const index = history.findIndex(entry => entry.id === id);
        if (index !== -1) {
            history.splice(index, 1);
            this.saveHistory(history);
            return true;
        }
        return false;
    }

    public clearHistory(): void {
        ApplicationSettings.remove(this.HISTORY_KEY);
    }

    public exportHistory(): string {
        const history = this.getHistory();
        const csvHeader = 'ID,Čas,Příkaz,Název akce,Typ akce,Stav,Chyba';
        const csvRows = history.map(entry => {
            const error = entry.errorMessage ? `"${entry.errorMessage.replace(/"/g, '""')}"` : '';
            return [
                entry.id,
                entry.timestamp.toISOString(),
                `"${entry.command.replace(/"/g, '""')}"`,
                `"${entry.actionName.replace(/"/g, '""')}"`,
                entry.actionType,
                entry.status,
                error
            ].join(',');
        });
        return [csvHeader, ...csvRows].join('\n');
    }

    public exportHistoryJSON(): string {
        const history = this.getHistory();
        return JSON.stringify(history, null, 2);
    }

    private saveHistory(history: CommandHistory[]): void {
        const historyToSave = history.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString()
        }));
        ApplicationSettings.setString(this.HISTORY_KEY, JSON.stringify(historyToSave));
    }
}
