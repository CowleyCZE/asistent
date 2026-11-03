import { ApplicationSettings } from '@nativescript/core';
import { StorageKeys } from '../utils/constants';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSettings {
    mode: ThemeMode;
    primaryColor: string;
    accentColor: string;
    useAnimations: boolean;
}

export class ThemeService {
    private readonly THEME_KEY = StorageKeys.ThemeSettings;
    
    private readonly DEFAULT_SETTINGS: ThemeSettings = {
        mode: 'system',
        primaryColor: '#3b82f6', // blue-500
        accentColor: '#8b5cf6',  // purple-500
        useAnimations: true
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

    public saveSettings(settings: Partial<ThemeSettings>) {
        const current = this.getSettings();
        const newSettings = { ...current, ...settings };
        ApplicationSettings.setString(this.THEME_KEY, JSON.stringify(newSettings));
        this.applyTheme(newSettings.mode);
    }

    public setMode(mode: ThemeMode) {
        this.saveSettings({ mode });
    }

    public setPrimaryColor(color: string) {
        this.saveSettings({ primaryColor: color });
    }

    public setAccentColor(color: string) {
        this.saveSettings({ accentColor: color });
    }

    public setAnimations(enabled: boolean) {
        this.saveSettings({ useAnimations: enabled });
    }

    public getMode(): ThemeMode {
        return this.getSettings().mode;
    }

    public isDarkMode(): boolean {
        const settings = this.getSettings();
        if (settings.mode === 'dark') return true;
        if (settings.mode === 'light') return false;
        // System mode - check device preference
        return this.isSystemDarkMode();
    }

    public isLightMode(): boolean {
        return !this.isDarkMode();
    }

    public areAnimationsEnabled(): boolean {
        return this.getSettings().useAnimations;
    }

    public getPrimaryColor(): string {
        return this.getSettings().primaryColor;
    }

    public getAccentColor(): string {
        return this.getSettings().accentColor;
    }

    public toggleTheme() {
        const currentMode = this.getMode();
        const newMode = currentMode === 'light' ? 'dark' : 'light';
        this.setMode(newMode);
    }

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
        const root = document.documentElement || document.body;
        
        if (root) {
            root.style.setProperty('--primary-color', settings.primaryColor);
            root.style.setProperty('--accent-color', settings.accentColor);
            root.style.setProperty('--bg-primary', isDark ? '#1a1a1a' : '#ffffff');
            root.style.setProperty('--bg-secondary', isDark ? '#2d2d2d' : '#f5f5f5');
            root.style.setProperty('--text-primary', isDark ? '#ffffff' : '#000000');
            root.style.setProperty('--text-secondary', isDark ? '#cccccc' : '#666666');
            root.style.setProperty('--border-color', isDark ? '#444444' : '#e0e0e0');
            root.style.setProperty('--shadow-color', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)');
        }
    }

    private isSystemDarkMode(): boolean {
        try {
            // Android dark mode detection
            if (global.android) {
                const uiMode = global.android.context?.getResources()?.getConfiguration()?.uiMode;
                const nightMask = global.android.content.res.Configuration?.UI_MODE_NIGHT_MASK;
                if (uiMode !== undefined && nightMask !== undefined) {
                    return (uiMode & nightMask) === global.android.content.res.Configuration?.UI_MODE_NIGHT_YES;
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

    public getThemeClass(): string {
        return this.isDarkMode() ? 'dark' : 'light';
    }

    public getBackgroundClass(): string {
        return this.isDarkMode() ? 'bg-gray-900' : 'bg-gray-100';
    }

    public getTextClass(): string {
        return this.isDarkMode() ? 'text-white' : 'text-gray-800';
    }

    public getCardClass(): string {
        return this.isDarkMode() ? 'bg-gray-800' : 'bg-white';
    }

    public getBorderClass(): string {
        return this.isDarkMode() ? 'border-gray-600' : 'border-gray-200';
    }
}
