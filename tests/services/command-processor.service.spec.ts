import { CommandProcessor } from '../../app/services/command-processor';
import { Action } from '../../app/services/settings.service';

/**
 * Testy CommandProcessoru (constructor injection – všechny závislosti mockované).
 * Webhooky se testují přes global.fetch (mock ze setup.ts), retry s backoff
 * se projevuje reálným zpožděním u selhávajících síťových testů.
 */
describe('CommandProcessor', () => {
    let processor: CommandProcessor;
    let mockSettingsService: any;
    let mockTaskerService: any;
    let mockHistoryService: any;
    let mockCacheService: any;
    let mockNotificationService: any;
    let mockTtsService: any;
    let mockLogger: any;

    const webhookAction: Action = {
        name: 'Light On',
        phrase: 'rozsviť světlo',
        type: 'webhook',
        url: 'https://example.com/light-on'
    };

    const taskerAction: Action = {
        name: 'Music',
        phrase: 'pusť hudbu',
        type: 'tasker',
        taskName: 'PlayMusic'
    };

    const createProcessor = () => new CommandProcessor({
        settingsService: mockSettingsService,
        taskerService: mockTaskerService,
        historyService: mockHistoryService,
        cacheService: mockCacheService,
        notificationService: mockNotificationService,
        ttsService: mockTtsService,
        logger: mockLogger
    });

    beforeEach(() => {
        mockSettingsService = {
            getWebhookAuth: jest.fn(() => ({}))
        };
        mockTaskerService = {
            executeTask: jest.fn(() => true)
        };
        mockHistoryService = {
            addCommand: jest.fn()
        };
        mockCacheService = {
            getWebhookCache: jest.fn(() => null),
            setWebhookCache: jest.fn()
        };
        mockNotificationService = {
            isEnabled: jest.fn(() => false),
            showSuccess: jest.fn(),
            showError: jest.fn()
        };
        mockTtsService = {
            isEnabled: jest.fn(() => false),
            speak: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            success: jest.fn(),
            error: jest.fn(),
            networkError: jest.fn()
        };
        (global.fetch as jest.Mock).mockReset();
        processor = createProcessor();
    });

    describe('executeTaskerAction', () => {
        it('spustí Tasker úlohu a zaznamená úspěch do historie', () => {
            const result = processor.executeTaskerAction(taskerAction);
            expect(result).toBe(true);
            expect(mockTaskerService.executeTask).toHaveBeenCalledWith('PlayMusic');
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'pusť hudbu', 'Music', 'tasker', 'success', undefined
            );
            expect(mockLogger.success).toHaveBeenCalled();
        });

        it('vrátí false, když akce nemá název úlohy', () => {
            const result = processor.executeTaskerAction({ ...taskerAction, taskName: undefined });
            expect(result).toBe(false);
            expect(mockTaskerService.executeTask).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'pusť hudbu', 'Music', 'tasker', 'error', 'Chybí název Tasker úlohy'
            );
        });

        it('zaznamená selhání Tasker úlohy do historie a ozpví TTS', () => {
            mockTaskerService.executeTask = jest.fn(() => false);
            mockTtsService.isEnabled = jest.fn(() => true);
            const result = processor.executeTaskerAction(taskerAction);
            expect(result).toBe(false);
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'pusť hudbu', 'Music', 'tasker', 'error',
                'Nepodařilo se spustit úlohu: PlayMusic'
            );
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockTtsService.speak).toHaveBeenCalled();
        });
    });

    describe('executeWebhookAction', () => {
        it('vrátí false, když akce nemá URL', async () => {
            const result = await processor.executeWebhookAction({ ...webhookAction, url: undefined });
            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo', 'Light On', 'webhook', 'error', 'Chybí URL webhooku'
            );
        });

        it('použije cache, pokud je odpověď webhooku cached', async () => {
            mockCacheService.getWebhookCache = jest.fn(() => ({ url: 'https://example.com/light-on', response: {}, timestamp: Date.now(), ttl: 300000 }));
            const result = await processor.executeWebhookAction(webhookAction);
            expect(result).toBe(true);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo', 'Light On', 'webhook', 'success'
            );
        });

        it('odmítne neplatnou URL (ne HTTPS)', async () => {
            const result = await processor.executeWebhookAction({ ...webhookAction, url: 'http://example.com/light-on' });
            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo', 'Light On', 'webhook', 'error', 'Neplatná URL webhooku'
            );
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('úspěšně zavolá webhook a uloží odpověď do cache', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
            const result = await processor.executeWebhookAction(webhookAction);
            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                'https://example.com/light-on',
                expect.objectContaining({ method: 'POST' })
            );
            expect(mockCacheService.setWebhookCache).toHaveBeenCalledWith(
                'https://example.com/light-on',
                expect.objectContaining({ status: 200, statusText: 'OK' }),
                300000
            );
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo', 'Light On', 'webhook', 'success'
            );
            expect(mockLogger.success).toHaveBeenCalled();
        });

        it('přidá API klíč a HMAC hlavičky, když je autentizace nastavena', async () => {
            mockSettingsService.getWebhookAuth = jest.fn(() => ({ apiKey: 'key123', hmacSecret: 'secret', useHmac: true }));
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
            const result = await processor.executeWebhookAction(webhookAction);
            expect(result).toBe(true);
            const [, options] = (global.fetch as jest.Mock).mock.calls[0];
            expect(options.headers['X-API-Key']).toBe('key123');
            expect(options.headers['X-HMAC-Signature']).toBeDefined();
            expect(options.headers['X-HMAC-Timestamp']).toBeDefined();
        });

        it('zaznamená HTTP chybu webhooku', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });
            const result = await processor.executeWebhookAction(webhookAction);
            expect(result).toBe(false);
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo', 'Light On', 'webhook', 'error', 'Server Error'
            );
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('zaznamená síťovou chybu jako network_error (retry s backoff)', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
            const result = await processor.executeWebhookAction(webhookAction);
            expect(result).toBe(false);
            // retry: 1. pokus + 2 opakování
            expect(global.fetch).toHaveBeenCalledTimes(3);
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo', 'Light On', 'webhook', 'network_error',
                'network down'
            );
            expect(mockLogger.networkError).toHaveBeenCalled();
        }, 15000);
    });

    describe('executeWebhookUrl (offline fronta)', () => {
        it('odmítne neplatnou URL', async () => {
            const result = await processor.executeWebhookUrl('ftp://example.com');
            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('vrátí true při úspěšném volání', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
            const result = await processor.executeWebhookUrl('https://example.com/hook');
            expect(result).toBe(true);
        });

        it('vrátí false při selhání sítě', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('timeout'));
            const result = await processor.executeWebhookUrl('https://example.com/hook');
            expect(result).toBe(false);
        });
    });

    describe('executeTaskerTaskName (offline fronta)', () => {
        it('deleguje na TaskerService', () => {
            const result = processor.executeTaskerTaskName('PlayMusic');
            expect(result).toBe(true);
            expect(mockTaskerService.executeTask).toHaveBeenCalledWith('PlayMusic');
        });
    });
});
