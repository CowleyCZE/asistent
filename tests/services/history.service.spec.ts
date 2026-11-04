import { HistoryService, CommandHistory, CommandStatus, ActionType, HistoryFilter } from '../../app/services/history.service';
import { ApplicationSettings } from '@nativescript/core';
import { mockReset } from '../mocks/application-settings.mock';

describe('HistoryService', () => {
    let historyService: HistoryService;

    beforeEach(() => {
        mockReset();
        historyService = new HistoryService();
    });

    describe('addCommand', () => {
        it('should add a new command to history', () => {
            historyService.addCommand(
                'test command',
                'Test Action',
                'webhook',
                'success'
            );

            const history = historyService.getHistory();
            expect(history.length).toBe(1);
            expect(history[0].command).toBe('test command');
            expect(history[0].actionName).toBe('Test Action');
            expect(history[0].actionType).toBe('webhook');
            expect(history[0].status).toBe('success');
        });

        it('should add command with error message', () => {
            historyService.addCommand(
                'failed command',
                'Failed Action',
                'tasker',
                'error',
                'Something went wrong'
            );

            const history = historyService.getHistory();
            expect(history.length).toBe(1);
            expect(history[0].errorMessage).toBe('Something went wrong');
        });

        it('should limit history to MAX_HISTORY_ITEMS', () => {
            for (let i = 0; i < 150; i++) {
                historyService.addCommand(
                    `command ${i}`,
                    `action ${i}`,
                    'webhook',
                    'success'
                );
            }

            const history = historyService.getHistory();
            expect(history.length).toBeLessThanOrEqual(100);
        });
    });

    describe('getHistory', () => {
        it('should return empty array when no history exists', () => {
            const history = historyService.getHistory();
            expect(history).toEqual([]);
        });

        it('should return all history entries', () => {
            historyService.addCommand('cmd1', 'action1', 'webhook', 'success');
            historyService.addCommand('cmd2', 'action2', 'tasker', 'error');

            const history = historyService.getHistory();
            expect(history.length).toBe(2);
        });

        it('should parse timestamps correctly', () => {
            // Pozn.: historie se serializuje do JSON (timestamp jako ISO string)
            // a při čtení deserializuje zpět na Date. Mockování global Date
            // se vyhýbáme – nahradí celý Date konstruktor a rozbije Date.now()
            // používané v IdGenerator.generate().
            historyService.addCommand('cmd', 'action', 'webhook', 'success');

            const history = historyService.getHistory();
            expect(history[0].timestamp).toBeInstanceOf(Date);
            expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(Date.now());
        });
    });

    describe('getFilteredHistory', () => {
        beforeEach(() => {
            historyService.addCommand('cmd1', 'action1', 'webhook', 'success');
            historyService.addCommand('cmd2', 'action2', 'tasker', 'error');
            historyService.addCommand('cmd3', 'action3', 'webhook', 'network_error');
        });

        it('should filter by status', () => {
            const filter: HistoryFilter = { status: 'success' };
            const filtered = historyService.getFilteredHistory(filter);
            expect(filtered.length).toBe(1);
            expect(filtered[0].status).toBe('success');
        });

        it('should filter by action type', () => {
            const filter: HistoryFilter = { actionType: 'webhook' };
            const filtered = historyService.getFilteredHistory(filter);
            expect(filtered.length).toBe(2);
            expect(filtered.every(h => h.actionType === 'webhook')).toBe(true);
        });

        it('should filter by search text', () => {
            const filter: HistoryFilter = { searchText: 'action1' };
            const filtered = historyService.getFilteredHistory(filter);
            expect(filtered.length).toBe(1);
            expect(filtered[0].actionName).toBe('action1');
        });

        it('should filter by date range', () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const filter: HistoryFilter = {
                startDate: yesterday,
                endDate: tomorrow
            };
            const filtered = historyService.getFilteredHistory(filter);
            expect(filtered.length).toBe(3);
        });

        it('should combine multiple filters', () => {
            const filter: HistoryFilter = {
                status: 'success',
                actionType: 'webhook',
                searchText: 'action1'
            };
            const filtered = historyService.getFilteredHistory(filter);
            expect(filtered.length).toBe(1);
            expect(filtered[0].status).toBe('success');
            expect(filtered[0].actionType).toBe('webhook');
            expect(filtered[0].actionName).toBe('action1');
        });
    });

    describe('deleteEntry', () => {
        it('should delete entry by id', () => {
            historyService.addCommand('cmd1', 'action1', 'webhook', 'success');
            const history = historyService.getHistory();
            const id = history[0].id;

            const result = historyService.deleteEntry(id);
            expect(result).toBe(true);
            expect(historyService.getHistory().length).toBe(0);
        });

        it('should return false for non-existent id', () => {
            const result = historyService.deleteEntry('non-existent-id');
            expect(result).toBe(false);
        });
    });

    describe('clearHistory', () => {
        it('should clear all history', () => {
            historyService.addCommand('cmd1', 'action1', 'webhook', 'success');
            historyService.addCommand('cmd2', 'action2', 'tasker', 'error');

            historyService.clearHistory();
            expect(historyService.getHistory().length).toBe(0);
        });
    });

    describe('exportHistory', () => {
        it('should export history as CSV', () => {
            historyService.addCommand('cmd1', 'action1', 'webhook', 'success');
            historyService.addCommand('cmd2', 'action2', 'tasker', 'error', 'error msg');

            const csv = historyService.exportHistory();
            expect(csv).toContain('ID,Čas,Příkaz,Název akce,Typ akce,Stav,Chyba');
            expect(csv).toContain('cmd1');
            expect(csv).toContain('action1');
            expect(csv).toContain('webhook');
            expect(csv).toContain('success');
        });
    });

    describe('exportHistoryJSON', () => {
        it('should export history as JSON', () => {
            historyService.addCommand('cmd1', 'action1', 'webhook', 'success');

            const json = historyService.exportHistoryJSON();
            const parsed = JSON.parse(json);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(1);
            expect(parsed[0].command).toBe('cmd1');
        });
    });
});
