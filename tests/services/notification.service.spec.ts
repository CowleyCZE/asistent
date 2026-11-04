import { mockReset } from '../mocks/application-settings.mock';
import { NotificationService } from '../../app/services/notification.service';

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(() => {
        mockReset();
        service = new NotificationService();
    });

    it('vrátí výchozí nastavení', () => {
        const settings = service.getSettings();
        expect(settings.enabled).toBe(true);
        expect(settings.soundEnabled).toBe(true);
        expect(settings.vibrationEnabled).toBe(true);
        expect(settings.successNotifications).toBe(true);
        expect(settings.errorNotifications).toBe(true);
        expect(settings.previewText).toBe(true);
    });

    it('povolí a zakáže notifikace', () => {
        service.enableNotifications(false);
        expect(service.isEnabled()).toBe(false);
        service.enableNotifications(true);
        expect(service.isEnabled()).toBe(true);
    });

    it('show zobrazí notifikaci a uloží do historie', () => {
        const n = service.show({ title: 'Test', message: 'Zprava', type: 'info' } as any);
        expect(n).not.toBeNull();
        expect(n!.id).toBeDefined();
        expect(n!.timestamp).toBeDefined();
        expect(service.getActiveNotifications().length).toBe(1);
        expect(service.getHistory().length).toBe(1);
    });

    it('show vrací null při zakázaných notifikacích', () => {
        service.enableNotifications(false);
        const n = service.show({ title: 'Test', message: 'Zprava', type: 'info' } as any);
        expect(n).toBeNull();
    });

    it('třetí notifikace se zařadí do fronty', () => {
        service.show({ title: 'A', message: 'a', type: 'info' } as any);
        service.show({ title: 'B', message: 'b', type: 'info' } as any);
        service.show({ title: 'C', message: 'c', type: 'info' } as any);
        expect(service.getQueuedNotifications().length).toBe(1);
        expect(service.getQueuedNotifications()[0].title).toBe('C');
        expect(service.hasNotifications()).toBe(true);
    });

    it('dismiss odstraní aktivní notifikaci', () => {
        const n = service.show({ title: 'A', message: 'a', type: 'info' } as any);
        expect(service.dismiss(n!.id)).toBe(true);
        expect(service.getActiveNotifications().length).toBe(0);
        expect(service.dismiss('neexistujici')).toBe(false);
    });

    it('dismissAll vyčistí aktivní i frontu', () => {
        service.show({ title: 'A', message: 'a', type: 'info' } as any);
        service.show({ title: 'B', message: 'b', type: 'info' } as any);
        service.show({ title: 'C', message: 'c', type: 'info' } as any);
        service.dismissAll();
        expect(service.hasNotifications()).toBe(false);
        expect(service.getQueuedNotifications().length).toBe(0);
    });

    it('helpery showSuccess/showError/showWarning/showInfo fungují', () => {
        expect(service.showSuccess('OK', 'Hotovo')!.type).toBe('success');
        expect(service.showError('Chyba', 'Něco se nepovedlo')!.type).toBe('error');
        expect(service.showWarning('Pozor', 'Kontrola')!.type).toBe('warning');
        expect(service.showInfo('Info', 'Informace')!.type).toBe('info');
    });

    it('clearHistory smaže historii', () => {
        service.showSuccess('Ahoj', 'Zprava');
        expect(service.getHistory().length).toBe(1);
        service.clearHistory();
        expect(service.getHistory().length).toBe(0);
    });

    it('getNotificationColor vrací barvy podle typu', () => {
        expect(service.getNotificationColor('success')).toBe('bg-green-500');
        expect(service.getNotificationColor('error')).toBe('bg-red-500');
        expect(service.getNotificationColor('warning')).toBe('bg-orange-500');
    });

    it('getNotificationIcon vrací řetězec', () => {
        expect(typeof service.getNotificationIcon('info')).toBe('string');
    });

    describe('Notifikační kanály (P3)', () => {
        it('vrátí jedinečné channel ID pro každý typ notifikace', () => {
            const ids = ['success', 'error', 'warning', 'info'].map(
                t => service.getChannelIdForType(t as any)
            );
            expect(new Set(ids).size).toBe(4);
            expect(ids[0]).toBe('asistent_success');
            expect(ids[1]).toBe('asistent_errors');
        });

        it('ensureNotificationChannels je bezpečným no-op mimo Android', () => {
            expect(() => service.ensureNotificationChannels()).not.toThrow();
        });
    });
});
