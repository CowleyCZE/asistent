import { StatisticsService } from '../../app/services/statistics.service';
import { HistoryService, CommandHistory } from '../../app/services/history.service';
import { SettingsService } from '../../app/services/settings.service';
import { mockReset } from '../mocks/application-settings.mock';

// Mock HistoryService
class MockHistoryService {
    private history: CommandHistory[] = [];

    addCommand(command: string, actionName: string, actionType: any, status: any, errorMessage?: string) {
        this.history.push({
            id: Date.now().toString(),
            command,
            actionName,
            actionType,
            status,
            timestamp: new Date(),
            errorMessage
        });
    }

    getHistory(): CommandHistory[] {
        return [...this.history];
    }

    getFilteredHistory(filter: any): CommandHistory[] {
        return this.history.filter(h => {
            if (filter.status && h.status !== filter.status) return false;
            if (filter.actionType && h.actionType !== filter.actionType) return false;
            return true;
        });
    }

    clearHistory() {
        this.history = [];
    }

    deleteEntry(id: string): boolean {
        const index = this.history.findIndex(h => h.id === id);
        if (index !== -1) {
            this.history.splice(index, 1);
            return true;
        }
        return false;
    }

    exportHistory(): string {
        return 'csv data';
    }

    exportHistoryJSON(): string {
        return JSON.stringify(this.history);
    }
}

describe('StatisticsService', () => {
    let statisticsService: StatisticsService;

    beforeEach(() => {
        mockReset();
        // Replace the history service with our mock
        statisticsService = new StatisticsService();
        // We'll test with direct data manipulation
    });

    describe('getStatistics', () => {
        beforeEach(() => {
            mockReset();
            statisticsService = new StatisticsService();
        });

        it('should return empty statistics for no history', () => {
            const stats = statisticsService.getStatistics();
            expect(stats.overall.totalCommands).toBe(0);
            expect(stats.overall.successRate).toBe(0);
            expect(stats.mostUsedActions).toEqual([]);
            expect(stats.leastSuccessfulActions).toEqual([]);
        });

        it('should calculate overall statistics correctly', () => {
            // Add some test data by directly calling the private methods
            // Since we can't easily mock HistoryService, we'll test the logic indirectly
            const testHistory: CommandHistory[] = [
                { id: '1', command: 'cmd1', actionName: 'action1', actionType: 'webhook', status: 'success', timestamp: new Date() },
                { id: '2', command: 'cmd2', actionName: 'action1', actionType: 'webhook', status: 'success', timestamp: new Date() },
                { id: '3', command: 'cmd3', actionName: 'action2', actionType: 'tasker', status: 'error', timestamp: new Date() },
                { id: '4', command: 'cmd4', actionName: 'action1', actionType: 'webhook', status: 'network_error', timestamp: new Date() }
            ];

            // Test the calculateOverallStats method indirectly
            const overall = (statisticsService as any).calculateOverallStats(testHistory);
            expect(overall.totalCommands).toBe(4);
            expect(overall.successfulCommands).toBe(2);
            expect(overall.failedCommands).toBe(1);
            expect(overall.networkErrorCommands).toBe(1);
            expect(overall.successRate).toBe(50);
        });

        it('should calculate action usage statistics correctly', () => {
            const testHistory: CommandHistory[] = [
                { id: '1', command: 'cmd1', actionName: 'action1', actionType: 'webhook', status: 'success', timestamp: new Date() },
                { id: '2', command: 'cmd2', actionName: 'action1', actionType: 'webhook', status: 'success', timestamp: new Date() },
                { id: '3', command: 'cmd3', actionName: 'action2', actionType: 'tasker', status: 'error', timestamp: new Date() },
                { id: '4', command: 'cmd4', actionName: 'action1', actionType: 'webhook', status: 'network_error', timestamp: new Date() }
            ];

            const allActions = [
                { name: 'action1', phrase: 'phrase1', type: 'webhook', url: 'url1' },
                { name: 'action2', phrase: 'phrase2', type: 'tasker', taskName: 'task1' }
            ];

            const byAction = (statisticsService as any).calculateByActionStats(testHistory, allActions);
            expect(byAction.length).toBe(2);

            const action1 = byAction.find(a => a.actionName === 'action1');
            expect(action1).toBeDefined();
            expect(action1!.count).toBe(3);
            expect(action1!.successCount).toBe(2);
            expect(action1!.failureCount).toBe(1);
            expect(action1!.successRate).toBeCloseTo(66.67, 1);
        });

        it('should identify most used actions', () => {
            const actionStats = [
                { actionName: 'action1', actionType: 'webhook' as any, count: 5, successCount: 4, failureCount: 1, successRate: 80 },
                { actionName: 'action2', actionType: 'tasker' as any, count: 3, successCount: 2, failureCount: 1, successRate: 66.67 },
                { actionName: 'action3', actionType: 'webhook' as any, count: 10, successCount: 8, failureCount: 2, successRate: 80 }
            ];

            const mostUsed = (statisticsService as any).getMostUsedActions(actionStats, 2);
            expect(mostUsed.length).toBe(2);
            expect(mostUsed[0].actionName).toBe('action3');
            expect(mostUsed[1].actionName).toBe('action1');
        });

        it('should identify least successful actions', () => {
            const actionStats = [
                { actionName: 'action1', actionType: 'webhook' as any, count: 5, successCount: 4, failureCount: 1, successRate: 80 },
                { actionName: 'action2', actionType: 'tasker' as any, count: 3, successCount: 0, failureCount: 3, successRate: 0 },
                { actionName: 'action3', actionType: 'webhook' as any, count: 10, successCount: 8, failureCount: 2, successRate: 80 }
            ];

            const leastSuccessful = (statisticsService as any).getLeastSuccessfulActions(actionStats, 2);
            expect(leastSuccessful.length).toBe(2);
            expect(leastSuccessful[0].actionName).toBe('action2');
            expect(leastSuccessful[1].actionName).toBe('action1');
        });
    });

    describe('formatDateForDisplay', () => {
        it('should format date for display', () => {
            const formatted = statisticsService.formatDateForDisplay('2025-01-01');
            expect(formatted).toContain('01');
            expect(formatted).toContain('01');
            expect(formatted).toContain('2025');
        });
    });

    describe('getSuccessRateColor', () => {
        it('should return green for high success rate', () => {
            const color = statisticsService.getSuccessRateColor(95);
            expect(color).toBe('bg-green-500');
        });

        it('should return red for low success rate', () => {
            const color = statisticsService.getSuccessRateColor(20);
            expect(color).toBe('bg-red-500');
        });

        it('should return yellow for medium success rate', () => {
            const color = statisticsService.getSuccessRateColor(60);
            expect(color).toBe('bg-yellow-500');
        });
    });

    describe('getTrend', () => {
        it('should return up for increasing values', () => {
            const trend = statisticsService.getTrend(5, 10);
            expect(trend).toBe('up');
        });

        it('should return down for decreasing values', () => {
            const trend = statisticsService.getTrend(10, 5);
            expect(trend).toBe('down');
        });

        it('should return same for equal values', () => {
            const trend = statisticsService.getTrend(10, 10);
            expect(trend).toBe('same');
        });
    });
});
