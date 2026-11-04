import { mockReset } from '../mocks/application-settings.mock';
import { ThemeService } from '../../app/services/theme.service';

describe('ThemeService', () => {
    let service: ThemeService;
    let setStyle: jest.Mock;

    beforeAll(() => {
        setStyle = jest.fn();
        (global as any).document = {
            documentElement: { style: { setProperty: setStyle } }
        };
    });

    beforeEach(() => {
        mockReset();
        service = new ThemeService();
    });

    it('vrátí výchozí nastavení', () => {
        const settings = service.getSettings();
        expect(settings.mode).toBe('system');
        expect(settings.primaryColor).toBe('#3b82f6');
        expect(settings.accentColor).toBe('#8b5cf6');
        expect(settings.useAnimations).toBe(true);
    });

    it('setMode přepne do tmavého režimu', () => {
        service.setMode('dark');
        expect(service.getMode()).toBe('dark');
        expect(service.isDarkMode()).toBe(true);
        expect(service.isLightMode()).toBe(false);
    });

    it('světlý režim vrací správné CSS třídy', () => {
        service.setMode('light');
        expect(service.getMode()).toBe('light');
        expect(service.isLightMode()).toBe(true);
        expect(service.getThemeClass()).toBe('light');
        expect(service.getBackgroundClass()).toBe('bg-gray-100');
        expect(service.getTextClass()).toBe('text-gray-800');
        expect(service.getCardClass()).toBe('bg-white');
        expect(service.getBorderClass()).toBe('border-gray-200');
    });

    it('tmavý režim vrací správné CSS třídy', () => {
        service.setMode('dark');
        expect(service.getThemeClass()).toBe('dark');
        expect(service.getBackgroundClass()).toBe('bg-gray-900');
        expect(service.getTextClass()).toBe('text-white');
        expect(service.getCardClass()).toBe('bg-gray-800');
        expect(service.getBorderClass()).toBe('border-gray-600');
    });

    it('toggleTheme přepne mezi světlým a tmavým režimem', () => {
        service.setMode('light');
        service.toggleTheme();
        expect(service.getMode()).toBe('dark');
        service.toggleTheme();
        expect(service.getMode()).toBe('light');
    });

    it('setPrimaryColor a setAccentColor uloží barvy', () => {
        service.setPrimaryColor('#ff0000');
        service.setAccentColor('#00ff00');
        expect(service.getPrimaryColor()).toBe('#ff0000');
        expect(service.getAccentColor()).toBe('#00ff00');
    });

    it('setAnimations vypne animace', () => {
        service.setAnimations(false);
        expect(service.areAnimationsEnabled()).toBe(false);
    });

    it('setHighContrast zapne vysoký kontrast', () => {
        service.setHighContrast(true);
        expect(service.isHighContrastEnabled()).toBe(true);
        expect(service.getThemeClasses()).toBe(service.getThemeClass() + ' high-contrast');
    });

    it('toggleHighContrast přepne vysoký kontrast', () => {
        expect(service.isHighContrastEnabled()).toBe(false);
        service.toggleHighContrast();
        expect(service.isHighContrastEnabled()).toBe(true);
        service.toggleHighContrast();
        expect(service.isHighContrastEnabled()).toBe(false);
    });

    it('applyTheme s highContrast použije čistě černobílé barvy', () => {
        service.setHighContrast(true);
        service.applyTheme('dark');
        expect(setStyle).toHaveBeenCalledWith('--bg-primary', '#000000');
        expect(setStyle).toHaveBeenCalledWith('--border-color', '#ffffff');
        expect(setStyle).toHaveBeenCalledWith('--shadow-color', 'none');
        service.applyTheme('light');
        expect(setStyle).toHaveBeenCalledWith('--border-color', '#000000');
    });

    it('getThemeClasses bez highContrast vrací pouze základní třídu', () => {
        service.setHighContrast(false);
        expect(service.getThemeClasses()).toBe(service.getThemeClass());
    });

    it('applyTheme aktualizuje CSS proměnné', () => {
        service.applyTheme('dark');
        expect(setStyle).toHaveBeenCalledWith('--bg-primary', '#1a1a1a');
        service.applyTheme('light');
        expect(setStyle).toHaveBeenCalledWith('--bg-primary', '#ffffff');
    });
});
