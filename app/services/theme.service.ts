import { Application, ApplicationSettings } from '@nativescript/core';
import { StorageKeys } from '../utils/constants';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSettings {
    mode: ThemeMode;
    primaryColor: string;
    accentColor: string;
    useAnimations: boolean;
    /** Vysoký kontrast pro lepší čitelnost (accessibility). */
    highContrast: boolean;
}

/** Správa motivu aplikace (světlý/tmavý/systém) a CSS proměnných. */
export class ThemeService {
    private readonly THEME_KEY = StorageKeys.ThemeSettings;
    
    private readonly DEFAULT_SETTINGS: ThemeSettings = {
        mode: 'system',
        primaryColor: '#3b82f6', // blue-500
        accentColor: '#8b5cf6',  // purple-500
        useAnimations: true,
        highContrast: false
    };

    constructor() {
        this.initialize();
    }

    private initialize() {
        // Check system preference if mode is 'system'
        const settings = this.getSettings();
        if (settings.mode === 'system') {
            this.applySystemTheme();
        } else {
            this.applyTheme(settings.mode);
        }
    }

    /** Vrací nastavení motivu (sloučené s výchozími hodnotami). */
    public getSettings(): ThemeSettings {
        const saved = ApplicationSettings.getString(this.THEME_KEY);
        if (saved) {
            try {
                return { ...this.DEFAULT_SETTINGS, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Error parsing theme settings:', e);
                return this.DEFAULT_SETTINGS;
            }
        }
        return this.DEFAULT_SETTINGS;
    }

    /** Uloží část nastavení motivu a ihned aplikuje motiv. */
    public saveSettings(settings: Partial<ThemeSettings>) {
        const current = this.getSettings();
        const newSettings = { ...current, ...settings };
        ApplicationSettings.setString(this.THEME_KEY, JSON.stringify(newSettings));
        this.applyTheme(newSettings.mode);
    }

    /** Nastaví režim motivu ('light' | 'dark' | 'system'). */
    public setMode(mode: ThemeMode) {
        this.saveSettings({ mode });
    }

    /** Nastaví primární barvu motivu. */
    public setPrimaryColor(color: string) {
        this.saveSettings({ primaryColor: color });
    }

    /** Nastaví akcentovou barvu motivu. */
    public setAccentColor(color: string) {
        this.saveSettings({ accentColor: color });
    }

    /** Zapne nebo vypne animace motivu. */
    public setAnimations(enabled: boolean) {
        this.saveSettings({ useAnimations: enabled });
    }

    /** Zapne nebo vypne vysoký kontrast. */
    public setHighContrast(enabled: boolean) {
        this.saveSettings({ highContrast: enabled });
    }

    /** Zjistí, zda je vysoký kontrast povolen. */
    public isHighContrastEnabled(): boolean {
        return this.getSettings().highContrast;
    }

    /** Přepne vysoký kontrast. */
    public toggleHighContrast() {
        this.setHighContrast(!this.isHighContrastEnabled());
    }

    /** Vrací aktuální režim motivu. */
    public getMode(): ThemeMode {
        return this.getSettings().mode;
    }

    /** Zjistí, zda je aktivní tmavý režim (včetně systémové preference). */
    public isDarkMode(): boolean {
        const settings = this.getSettings();
        if (settings.mode === 'dark') return true;
        if (settings.mode === 'light') return false;
        // System mode - check device preference
        return this.isSystemDarkMode();
    }

    /** Zjistí, zda je aktivní světlý režim. */
    public isLightMode(): boolean {
        return !this.isDarkMode();
    }

    /** Zjistí, zda jsou animace motivu povoleny. */
    public areAnimationsEnabled(): boolean {
        return this.getSettings().useAnimations;
    }

    /** Vrací primární barvu motivu. */
    public getPrimaryColor(): string {
        return this.getSettings().primaryColor;
    }

    /** Vrací akcentovou barvu motivu. */
    public getAccentColor(): string {
        return this.getSettings().accentColor;
    }

    /** Přepne mezi světlým a tmavým režimem. */
    public toggleTheme() {
        const currentMode = this.getMode();
        const newMode = currentMode === 'light' ? 'dark' : 'light';
        this.setMode(newMode);
    }

    /** Aplikuje motiv na CSS proměnné dokumentu. */
    public applyTheme(mode?: ThemeMode) {
        const effectiveMode = mode || this.getMode();
        const isDark = effectiveMode === 'dark' || (effectiveMode === 'system' && this.isSystemDarkMode());
        
        // Update CSS variables
        this.updateCssVariables(isDark);
    }

    private applySystemTheme() {
        const isDark = this.isSystemDarkMode();
        this.updateCssVariables(isDark);
    }

    private updateCssVariables(isDark: boolean) {
        const settings = this.getSettings();
        const highContrast = settings.highContrast;

        // DOM cesta (webové prostředí / testy) – v NativeScript runtime DOM NEEXISTUJE!
        if (typeof document !== 'undefined') {
            const root = document.documentElement || document.body;
            if (root) {
                root.style.setProperty('--primary-color', settings.primaryColor);
                root.style.setProperty('--accent-color', settings.accentColor);
                root.style.setProperty('--bg-primary', isDark ? (highContrast ? '#000000' : '#1a1a1a') : '#ffffff');
                root.style.setProperty('--bg-secondary', isDark ? (highContrast ? '#0d0d0d' : '#2d2d2d') : (highContrast ? '#f2f2f2' : '#f5f5f5'));
                root.style.setProperty('--text-primary', isDark ? '#ffffff' : '#000000');
                root.style.setProperty('--text-secondary', highContrast ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#cccccc' : '#666666'));
                root.style.setProperty('--border-color', highContrast ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#444444' : '#e0e0e0'));
                root.style.setProperty('--shadow-color', highContrast ? 'none' : (isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'));
            }
            return;
        }

        // NativeScript runtime – motiv aplikujeme přes CSS třídy na kořenový view;
        // CSS proměnné (.dark/.light/.high-contrast) jsou definované v app.css.
        this.applyThemeToRootView();
    }

    /**
     * Aplikuje CSS třídy motivu na kořenový view aplikace.
     * Volá se při startu aplikace i po každé změně motivu.
     */
    public applyThemeToRootView(): void {
        try {
            const root = (Application as any).getRootView?.();
            if (root) {
                root.className = this.getThemeClasses();
            }
        } catch (error) {
            // Kořenový view ještě nemusí existovat (start aplikace) – ignorujeme.
        }
    }

    /** Zjistí tmavý režim systému (Android, fallback podle denní doby). */
    public isSystemDarkMode(): boolean {
        try {
            // Android dark mode detection
            const g: any = global;
            // Context získáváme z NativeScript Application (android.context neexistuje)
            const androidContext = (Application as any).android?.context ?? g.android?.context;
            if (androidContext) {
                const uiMode = androidContext.getResources()?.getConfiguration()?.uiMode;
                const nightMask = g.android?.content?.res?.Configuration?.UI_MODE_NIGHT_MASK ?? 0x30; // UI_MODE_NIGHT_MASK
                const nightYes = g.android?.content?.res?.Configuration?.UI_MODE_NIGHT_YES ?? 0x20;   // UI_MODE_NIGHT_YES
                if (uiMode !== undefined) {
                    return (uiMode & nightMask) === nightYes;
                }
            }
            
            // Fallback - check time of day (6 PM to 6 AM)
            const hour = new Date().getHours();
            return hour >= 18 || hour < 6;
        } catch (error) {
            console.error('Error detecting system dark mode:', error);
            return false;
        }
    }

    /** Vrací kompletní sadu CSS tříd motivu ('dark'/'light' + případně 'high-contrast'). */
    public getThemeClasses(): string {
        const base = this.getThemeClass();
        return this.isHighContrastEnabled() ? base + ' high-contrast' : base;
    }

    /** Vrací CSS třídu aktuálního motivu ('dark'/'light'). */
    public getThemeClass(): string {
        return this.isDarkMode() ? 'dark' : 'light';
    }

    /** Vrací CSS třídu pozadí podle motivu. */
    public getBackgroundClass(): string {
        return this.isDarkMode() ? 'bg-gray-900' : 'bg-gray-100';
    }

    /** Vrací CSS třídu textu podle motivu. */
    public getTextClass(): string {
        return this.isDarkMode() ? 'text-white' : 'text-gray-800';
    }

    /** Vrací CSS třídu karty podle motivu. */
    public getCardClass(): string {
        return this.isDarkMode() ? 'bg-gray-800' : 'bg-white';
    }

    /** Vrací CSS třídu okraje podle motivu. */
    public getBorderClass(): string {
        return this.isDarkMode() ? 'border-gray-600' : 'border-gray-200';
    }

    /* --- Vlastní barvy motivu (P3: Implementovat custom téma) --- */

    /** Paleta výchozích barev pro výběr v Nastavení > Vzhled. */
    public static readonly COLOR_PALETTE: { label: string; hex: string }[] = [
        { label: 'Indigo', hex: '#3b82f6' },
        { label: 'Fialová', hex: '#8b5cf6' },
        { label: 'Zelená', hex: '#16a34a' },
        { label: 'Teal', hex: '#0d9488' },
        { label: 'Oranžová', hex: '#ea580c' },
        { label: 'Růžová', hex: '#db2777' },
        { label: 'Červená', hex: '#dc2626' },
        { label: 'Modrošedá', hex: '#475569' }
    ];

    /**
     * Ztmaví hex barvu o zadaný podíl (0–1).
     * Při neplatném vstupu vrací původní řetězec (bezpečné fallbacky).
     */
    public darkenColor(hex: string, amount: number): string {
        const match = /^#([0-9a-f]{6})$/i.exec((hex ?? '').trim());
        if (!match || amount < 0 || amount > 1) {
            return hex;
        }
        const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
        const r = clamp(parseInt(match[1].slice(0, 2), 16) * (1 - amount));
        const g = clamp(parseInt(match[1].slice(2, 4), 16) * (1 - amount));
        const b = clamp(parseInt(match[1].slice(4, 6), 16) * (1 - amount));
        const toHex = (v: number) => v.toString(16).padStart(2, '0');
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    /**
     * Vygeneruje CSS s konkrétními hodnotami vlastních barev.
     * NativeScript runtime nepodporuje runtime předefinování CSS proměnných,
     * proto generujeme explicitní pravidla s konkrétními barvami
     * (aplikují se přes Page.addCss – pozdější pravidla přebíjejí app.css).
     */
    public getCustomColorsCss(): string {
        const settings = this.getSettings();
        const primary = settings.primaryColor;
        const primaryDark = this.darkenColor(primary, 0.15);
        const accent = settings.accentColor;
        return [
            '.btn-primary { background-color: ' + primary + '; }',
            '.chip-primary { background-color: ' + primary + '; }',
            '.fab { background-color: ' + primary + '; }',
            '.btn-primary:active { background-color: ' + primaryDark + '; }',
            '.btn-ghost { color: ' + primary + '; }',
            '.accent-text { color: ' + accent + '; }',
            '.accent-bg { background-color: ' + accent + '; }',
            ''
        ].join('\n');
    }

    /**
     * Aplikuje kompletní motiv na stránku: CSS třídy motivu na kořenový view
     * aplikace plus dynamické CSS s vlastními barvami přes Page.addCss.
     * Volá se v navigatingTo každé stránky.
     */
    public applyToPage(page: any): void {
        this.applyThemeToRootView();
        try {
            if (page && typeof page.addCss === 'function') {
                page.addCss(this.getCustomColorsCss());
            }
        } catch (error) {
            console.error('Chyba při aplikování vlastních barev na stránku:', error);
        }
    }
}
