import { Observable } from '@nativescript/core';

/**
 * Monitor připojení k internetu.
 *
 * Pravidelně kontroluje dostupnost sítě a při obnově připojení
 * vyvolá událost 'connectionRestored' – na tu se naváže automatické
 * zpracování offline fronty příkazů.
 */
export class ConnectivityService extends Observable {
    public static readonly CHECK_URL = 'https://www.gstatic.com/generate_204';
    public static readonly DEFAULT_INTERVAL_MS = 30000; // 30 sekund

    private timer: any = null;
    private _isOnline: boolean = true;
    private checkFn: () => Promise<boolean>;
    private intervalMs: number;

    /**
     * @param checkOnline Volitelná vlastní kontrola připojení (testy / mock).
     * @param intervalMs Interval pravidelné kontrorole v ms.
     */
    constructor(checkOnline?: () => Promise<boolean>, intervalMs: number = ConnectivityService.DEFAULT_INTERVAL_MS) {
        super();
        this.checkFn = checkOnline ?? (() => this.probeNetwork());
        this.intervalMs = intervalMs;
    }

    /** Aktuální stav připojení podle poslední kontroly. */
    public isOnline(): boolean {
        return this._isOnline;
    }

    /**
     * Provede kontrolu připojení. Při přechodu offline -> online
     * vyvolá událost 'connectionRestored'.
     */
    public async checkNow(): Promise<boolean> {
        let online = false;
        try {
            online = await this.checkFn();
        } catch (error) {
            console.error('Connectivity check failed:', error);
            online = false;
        }

        const wasOnline = this._isOnline;
        this._isOnline = online;

        if (!wasOnline && online) {
            this.notify({ eventName: 'connectionRestored', object: this });
        }
        this.notifyPropertyChange('isOnline', online);

        return online;
    }

    /** Spustí pravidelné monitorování připojení. */
    public startMonitoring(): void {
        if (this.timer) {
            return;
        }
        void this.checkNow();
        this.timer = setInterval(() => {
            void this.checkNow();
        }, this.intervalMs);
    }

    /** Zastaví pravidelné monitorování. */
    public stopMonitoring(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /** Zastaví monitorování a uvolní prostředky (IDisposable). */
    public dispose(): void {
        this.stopMonitoring();
    }

    /**
     * Výchozí kontrola sítě – lehký HEAD požadavek.
     * Jakákoli úspěšná odpověď se považuje za online.
     */
    private async probeNetwork(): Promise<boolean> {
        try {
            const response = await fetch(ConnectivityService.CHECK_URL, { method: 'HEAD' });
            return !!response;
        } catch {
            return false;
        }
    }
}
