import { mockReset } from '../mocks/application-settings.mock';
import { ThemeService } from '../../app/services/theme.service';

describe('ThemeService – vlastní barvy (P3 custom téma)', () => {
    let service: ThemeService;

    beforeEach(() => {
        mockReset();
        service = new ThemeService();
    });

    it('darkenColor ztmaví barvu o zadaný podíl', () => {
        expect(service.darkenColor('#ff0000', 0.5)).toBe('#800000');
        expect(service.darkenColor('#ffffff', 1)).toBe('#000000');
        expect(service.darkenColor('#3b82f6', 0)).toBe('#3b82f6');
    });

    it('darkenColor vrací původní hodnotu při neplatném vstupu', () => {
        expect(service.darkenColor('modra', 0.5)).toBe('modra');
        expect(service.darkenColor('#12345', 0.5)).toBe('#12345');
        expect(service.darkenColor('#ff0000', -1)).toBe('#ff0000');
        expect(service.darkenColor('#ff0000', 2)).toBe('#ff0000');
    });

    it('getCustomColorsCss obsahuje aktuální primární a akcentovou barvu', () => {
        service.setPrimaryColor('#123456');
        service.setAccentColor('#654321');
        const css = service.getCustomColorsCss();
        expect(css).toContain('.btn-primary { background-color: #123456; }');
        expect(css).toContain('.accent-text { color: #654321; }');
    });

    it('getCustomColorsCss obsahuje ztmavenou variantu pro :active stav', () => {
        service.setPrimaryColor('#ffffff');
        expect(service.getCustomColorsCss()).toContain('.btn-primary:active { background-color: #d9d9d9; }');
    });

    it('applyToPage aplikuje dynamické CSS na stránku', () => {
        const added: string[] = [];
        const fakePage: any = { addCss: (css: string) => added.push(css) };
        service.setPrimaryColor('#00ff00');
        service.applyToPage(fakePage);
        expect(added.length).toBe(1);
        expect(added[0]).toContain('#00ff00');
    });

    it('applyToPage je bezpečná pro stránku bez addCss', () => {
        expect(() => service.applyToPage(undefined)).not.toThrow();
        expect(() => service.applyToPage({} as any)).not.toThrow();
    });

    it('COLOR_PALETTE obsahuje paletu pro UI výběr', () => {
        expect(ThemeService.COLOR_PALETTE.length).toBeGreaterThanOrEqual(6);
        expect(ThemeService.COLOR_PALETTE.every(c => /^#[0-9a-f]{6}$/i.test(c.hex))).toBe(true);
    });
});
