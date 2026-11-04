import { Observable } from '@nativescript/core';
import { HistoryService, CommandHistory, CommandStatus, ActionType, HistoryFilter } from './services/history.service';
import { knownFolders } from '@nativescript/core';
import * as fileSystem from '@nativescript/core/file-system';

export class HistoryViewModel extends Observable {
    private historyService: HistoryService;

    private _history: CommandHistory[] = [];
    private _filteredHistory: CommandHistory[] = [];

    // Filter properties
    private _selectedStatus: CommandStatus | 'all' = 'all';
    private _selectedActionType: ActionType | 'all' = 'all';
    private _searchText: string = '';
    private _startDate: Date | null = null;
    private _endDate: Date | null = null;

    // Status options
    private _statusOptions: { label: string; value: CommandStatus | 'all' }[] = [
        { label: 'Všechny', value: 'all' },
        { label: 'Úspěšné', value: 'success' },
        { label: 'Chyba', value: 'error' },
        { label: 'Síťová chyba', value: 'network_error' }
    ];

    // Action type options
    private _actionTypeOptions: { label: string; value: ActionType | 'all' }[] = [
        { label: 'Všechny', value: 'all' },
        { label: 'Webhook', value: 'webhook' },
        { label: 'Tasker', value: 'tasker' }
    ];

    constructor() {
        super();
        this.historyService = new HistoryService();
        this.loadHistory();
    }

    private loadHistory() {
        this.history = this.historyService.getHistory();
        this.filteredHistory = [...this.history];
    }

    public applyFilters() {
        const filter: HistoryFilter = {
            status: this.selectedStatus !== 'all' ? this.selectedStatus : undefined,
            actionType: this.selectedActionType !== 'all' ? this.selectedActionType : undefined,
            searchText: this.searchText || undefined,
            startDate: this.startDate ?? undefined,
            endDate: this.endDate ?? undefined
        };

        this.filteredHistory = this.historyService.getFilteredHistory(filter);
        this.notifyPropertyChange('filteredHistory', this.filteredHistory);
    }

    public clearFilters() {
        this.selectedStatus = 'all';
        this.selectedActionType = 'all';
        this.searchText = '';
        this.startDate = null;
        this.endDate = null;
        this.filteredHistory = [...this.history];
    }

    public deleteEntry(id: string) {
        this.historyService.deleteEntry(id);
        this.loadHistory();
        this.applyFilters();
    }

    public clearAllHistory() {
        this.historyService.clearHistory();
        this.loadHistory();
    }

    public async exportHistory() {
        const csvData = this.historyService.exportHistory();
        const documents = knownFolders.documents();
        const filePath = documents.path + '/command_history.csv';
        const file = documents.getFile('command_history.csv');

        await file.writeText(csvData);
        return filePath;
    }

    public async exportHistoryJSON() {
        const jsonData = this.historyService.exportHistoryJSON();
        const documents = knownFolders.documents();
        const filePath = documents.path + '/command_history.json';
        const file = documents.getFile('command_history.json');

        await file.writeText(jsonData);
        return filePath;
    }

    public formatDate(date: Date): string {
        return date.toLocaleString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    public getStatusColor(status: CommandStatus): string {
        switch (status) {
            case 'success':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            case 'network_error':
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
        }
    }

    public getStatusText(status: CommandStatus): string {
        switch (status) {
            case 'success':
                return 'Úspěch';
            case 'error':
                return 'Chyba';
            case 'network_error':
                return 'Síťová chyba';
            default:
                return 'Neznámý';
        }
    }

    public getActionTypeText(type: ActionType): string {
        switch (type) {
            case 'webhook':
                return 'Webhook';
            case 'tasker':
                return 'Tasker';
            default:
                return 'Neznámý';
        }
    }

    // Getters and Setters

    get history(): CommandHistory[] {
        return this._history;
    }

    set history(value: CommandHistory[]) {
        this._history = value;
        this.notifyPropertyChange('history', value);
    }

    get filteredHistory(): CommandHistory[] {
        return this._filteredHistory;
    }

    set filteredHistory(value: CommandHistory[]) {
        this._filteredHistory = value;
        this.notifyPropertyChange('filteredHistory', value);
    }

    get selectedStatus(): CommandStatus | 'all' {
        return this._selectedStatus;
    }

    set selectedStatus(value: CommandStatus | 'all') {
        this._selectedStatus = value;
        this.notifyPropertyChange('selectedStatus', value);
    }

    get selectedActionType(): ActionType | 'all' {
        return this._selectedActionType;
    }

    set selectedActionType(value: ActionType | 'all') {
        this._selectedActionType = value;
        this.notifyPropertyChange('selectedActionType', value);
    }

    get searchText(): string {
        return this._searchText;
    }

    set searchText(value: string) {
        this._searchText = value;
        this.notifyPropertyChange('searchText', value);
    }

    get startDate(): Date | null {
        return this._startDate;
    }

    set startDate(value: Date | null) {
        this._startDate = value;
        this.notifyPropertyChange('startDate', value);
    }

    get endDate(): Date | null {
        return this._endDate;
    }

    set endDate(value: Date | null) {
        this._endDate = value;
        this.notifyPropertyChange('endDate', value);
    }

    get statusOptions(): { label: string; value: CommandStatus | 'all' }[] {
        return this._statusOptions;
    }

    get actionTypeOptions(): { label: string; value: ActionType | 'all' }[] {
        return this._actionTypeOptions;
    }
}
