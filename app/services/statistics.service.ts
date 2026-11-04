import { HistoryService, CommandHistory, CommandStatus, ActionType } from './history.service';
import { Colors } from '../utils/constants';
import { SettingsService, Action } from './settings.service';

export interface CommandStats {
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
    networkErrorCommands: number;
    successRate: number;
}

export interface ActionUsage {
    actionName: string;
    actionType: ActionType;
    count: number;
    successCount: number;
    failureCount: number;
    successRate: number;
}

export interface DailyStats {
    date: string;
    total: number;
    success: number;
    failure: number;
}

export interface Statistics {
    overall: CommandStats;
    byAction: ActionUsage[];
    byDate: DailyStats[];
    mostUsedActions: ActionUsage[];
    leastSuccessfulActions: ActionUsage[];
}

/** Agregace statistik příkazů z historie (úspěšnost, trendy, použití akcí). */
export class StatisticsService {
    private historyService: HistoryService;
    private settingsService: SettingsService;

    constructor() {
        this.historyService = new HistoryService();
        this.settingsService = new SettingsService();
    }

    /** Vypočítá kompletní statistiky z historie příkazů. */
    public getStatistics(): Statistics {
        const history = this.historyService.getHistory();
        const allActions = this.settingsService.getActions();

        const overall = this.calculateOverallStats(history);
        const byAction = this.calculateByActionStats(history, allActions);
        const byDate = this.calculateByDateStats(history);
        const mostUsedActions = this.getMostUsedActions(byAction, 5);
        const leastSuccessfulActions = this.getLeastSuccessfulActions(byAction, 5);

        return {
            overall,
            byAction,
            byDate,
            mostUsedActions,
            leastSuccessfulActions
        };
    }

    private calculateOverallStats(history: CommandHistory[]): CommandStats {
        const total = history.length;
        const successful = history.filter(h => h.status === 'success').length;
        const failed = history.filter(h => h.status === 'error').length;
        const networkErrors = history.filter(h => h.status === 'network_error').length;

        return {
            totalCommands: total,
            successfulCommands: successful,
            failedCommands: failed,
            networkErrorCommands: networkErrors,
            successRate: total > 0 ? (successful / total) * 100 : 0
        };
    }

    private calculateByActionStats(history: CommandHistory[], allActions: Action[]): ActionUsage[] {
        const actionMap = new Map<string, ActionUsage>();

        // Initialize all actions
        allActions.forEach(action => {
            actionMap.set(action.name, {
                actionName: action.name,
                actionType: action.type,
                count: 0,
                successCount: 0,
                failureCount: 0,
                successRate: 0
            });
        });

        // Process history
        history.forEach(entry => {
            const actionName = entry.actionName;
            if (!actionMap.has(actionName)) {
                actionMap.set(actionName, {
                    actionName,
                    actionType: entry.actionType,
                    count: 0,
                    successCount: 0,
                    failureCount: 0,
                    successRate: 0
                });
            }

            const stats = actionMap.get(actionName)!;
            stats.count++;

            if (entry.status === 'success') {
                stats.successCount++;
            } else {
                stats.failureCount++;
            }

            stats.successRate = stats.count > 0 ? (stats.successCount / stats.count) * 100 : 0;
        });

        return Array.from(actionMap.values());
    }

    private calculateByDateStats(history: CommandHistory[]): DailyStats[] {
        const dateMap = new Map<string, DailyStats>();

        history.forEach(entry => {
            const dateStr = this.formatDate(entry.timestamp);

            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    date: dateStr,
                    total: 0,
                    success: 0,
                    failure: 0
                });
            }

            const stats = dateMap.get(dateStr)!;
            stats.total++;

            if (entry.status === 'success') {
                stats.success++;
            } else {
                stats.failure++;
            }
        });

        return Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    }

    private getMostUsedActions(actionStats: ActionUsage[], limit: number): ActionUsage[] {
        return [...actionStats]
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    private getLeastSuccessfulActions(actionStats: ActionUsage[], limit: number): ActionUsage[] {
        return [...actionStats]
            .filter(a => a.count > 0)
            .sort((a, b) => a.successRate - b.successRate)
            .slice(0, limit);
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /** Naformátuje ISO datum pro zobrazení (cs-CZ). */
    public formatDateForDisplay(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /** Vrací Tailwind CSS třídu barvy podle úspěšnosti. */
    public getSuccessRateColor(rate: number): string {
        if (rate >= 90) return Colors.Success;
        if (rate >= 70) return Colors.SuccessHigh;
        if (rate >= 50) return Colors.SuccessMedium;
        if (rate >= 30) return Colors.Warning;
        return Colors.Error;
    }

    /** Určí trend mezi dvěma hodnotami ('up' | 'down' | 'same'). */
    public getTrend(previous: number, current: number): 'up' | 'down' | 'same' {
        if (current > previous) return 'up';
        if (current < previous) return 'down';
        return 'same';
    }
}
