import { Observable } from '@nativescript/core';
import { StatisticsService, Statistics, ActionUsage, DailyStats } from './services/statistics.service';

/**
 * View-model stránky statistik.
 *
 * Načítá statistiky ze StatisticsService a poskytuje formátovací
 * a barevné helpery pro zobrazení v UI.
 */
export class StatisticsViewModel extends Observable {
    private statisticsService: StatisticsService;

    private _statistics: Statistics | null = null;
    private _isLoading: boolean = true;

    constructor() {
        super();
        this.statisticsService = new StatisticsService();
        this.loadStatistics();
    }

    private loadStatistics() {
        this.isLoading = true;
        setTimeout(() => {
            this.statistics = this.statisticsService.getStatistics();
            this.isLoading = false;
        }, 100);
    }

    /** Znovu načte statistiky. */
    public refresh() {
        this.loadStatistics();
    }

    /** Naformátuje procento na jeden desetinný míst. */
    public formatPercentage(value: number): string {
        return value.toFixed(1) + '%';
    }

    /** Naformátuje číslo podle českého národního formátu. */
    public formatNumber(value: number): string {
        return value.toLocaleString('cs-CZ');
    }

    /** Vrátí CSS třídu barvy podle míry úspěšnosti. */
    public getStatusColor(rate: number): string {
        return this.statisticsService.getSuccessRateColor(rate);
    }

    /** Naformátuje datum (YYYY-MM-DD) pro zobrazení. */
    public formatDate(dateStr: string): string {
        return this.statisticsService.formatDateForDisplay(dateStr);
    }

    /** Vrátí CSS třídu barvy podle typu akce. */
    public getActionTypeColor(type: string): string {
        switch (type) {
            case 'webhook':
                return 'bg-blue-100';
            case 'tasker':
                return 'bg-purple-100';
            default:
                return 'bg-gray-100';
        }
    }

    /** Vrátí ikonu trendu (↑/↓/→) mezi dvěma hodnotami. */
    public getTrendIcon(previous: number, current: number): string {
        const trend = this.statisticsService.getTrend(previous, current);
        switch (trend) {
            case 'up':
                return '↑';
            case 'down':
                return '↓';
            default:
                return '→';
        }
    }

    // Getters and Setters

    get statistics(): Statistics | null {
        return this._statistics;
    }

    set statistics(value: Statistics | null) {
        this._statistics = value;
        this.notifyPropertyChange('statistics', value);
    }

    get isLoading(): boolean {
        return this._isLoading;
    }

    set isLoading(value: boolean) {
        this._isLoading = value;
        this.notifyPropertyChange('isLoading', value);
    }

    get overallStats() {
        return this.statistics?.overall || null;
    }

    get mostUsedActions(): ActionUsage[] {
        return this.statistics?.mostUsedActions || [];
    }

    get leastSuccessfulActions(): ActionUsage[] {
        return this.statistics?.leastSuccessfulActions || [];
    }

    get byDateStats(): DailyStats[] {
        return this.statistics?.byDate || [];
    }

    get allActionStats(): ActionUsage[] {
        return this.statistics?.byAction || [];
    }
}
