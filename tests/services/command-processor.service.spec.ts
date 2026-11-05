import { CommandProcessor } from '../../app/services/command-processor';
import { Action } from '../../app/services/settings.service';

/**
 * Testy CommandProcessoru (constructor injection – všechny závislosti mockované).
 * Webhooky a IFTTT se testují přes global.fetch (mock ze setup.ts), retry
 * s backoff se projevuje reálným zpožděním u selhávajících síťových testů.
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

    const iftttAction: Action = {
        name: 'Kamera',
        phrase: 'zapni kameru',
        type: 'ifttt',
        iftttEvent: 'camera_on',
        iftttKey: 'abc123XYZ_-key'
    };

    const homeAssistantAction: Action = {
        name: 'Světlo HA',
        phrase: 'rozsviť světlo přes home assistant',
        type: 'homeassistant',
        url: 'https://ha.example.com',
        haToken: 'longlivedtoken123',
        haService: 'light.turn_on',
        haEntity: 'light.obyvak'
    };

    const customAction: Action = {
        name: 'Můj příkaz',
        phrase: 'jak se máš',
        type: 'custom',
        customResponse: 'Mám se skvěle, díky za optání!'
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

    describe('executeIftttAction', () => {
        it('vrátí false, když akce nemá událost nebo klíč', async () => {
            const result = await processor.executeIftttAction({ ...iftttAction, iftttEvent: undefined });
            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'zapni kameru', 'Kamera', 'ifttt', 'error', 'Chybí název IFTTT události nebo klíč'
            );
        });

        it('odmítne neplatný název události (speciální znaky)', async () => {
            const result = await processor.executeIftttAction({ ...iftttAction, iftttEvent: 'bad event!' });
            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'zapni kameru', 'Kamera', 'ifttt', 'error', 'Neplatný název IFTTT události nebo klíč'
            );
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('použije cache, pokud je IFTTT odpověď cached', async () => {
            mockCacheService.getWebhookCache = jest.fn(() => ({ status: 200, timestamp: Date.now(), ttl: 300000 }));
            const result = await processor.executeIftttAction(iftttAction);
            expect(result).toBe(true);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'zapni kameru', 'Kamera', 'ifttt', 'success'
            );
        });

        it('úspěšně spustí IFTTT událost přes Maker Webhooks a uloží odpověď do cache', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
            const result = await processor.executeIftttAction(iftttAction);
            expect(result).toBe(true);
            const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
            expect(url).toBe('https://maker.ifttt.com/trigger/camera_on/with/key/abc123XYZ_-key');
            expect(options.method).toBe('POST');
            expect(options.headers['Content-Type']).toBe('application/json');
            const body = JSON.parse(options.body);
            expect(body.value1).toBe('zapni kameru');
            expect(body.value2).toBe('Kamera');
            expect(mockCacheService.setWebhookCache).toHaveBeenCalledWith(
                'https://maker.ifttt.com/trigger/camera_on/with/key/abc123XYZ_-key',
                expect.objectContaining({ status: 200, statusText: 'OK' }),
                300000
            );
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'zapni kameru', 'Kamera', 'ifttt', 'success'
            );
            expect(mockLogger.success).toHaveBeenCalled();
        });

        it('zaznamená HTTP chybu IFTTT události', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });
            const result = await processor.executeIftttAction(iftttAction);
            expect(result).toBe(false);
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'zapni kameru', 'Kamera', 'ifttt', 'error', 'Forbidden'
            );
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('zaznamená síťovou chybu jako network_error (retry s backoff)', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
            const result = await processor.executeIftttAction(iftttAction);
            expect(result).toBe(false);
            // retry: 1. pokus + 2 opakování
            expect(global.fetch).toHaveBeenCalledTimes(3);
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'zapni kameru', 'Kamera', 'ifttt', 'network_error',
                'network down'
            );
            expect(mockLogger.networkError).toHaveBeenCalled();
        }, 15000);
    });

    describe('executeHomeAssistantAction', () => {
        it('vrátí false, když akci chybí URL, token nebo služba', async () => {
            const result = await processor.executeHomeAssistantAction({ ...homeAssistantAction, haToken: undefined });
            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo přes home assistant', 'Světlo HA', 'homeassistant', 'error',
                'Chybí URL instance, token nebo služba Home Assistant'
            );
        });

        it('odmítne neplatnou službu (formát doména.sluzba)', async () => {
            const result = await processor.executeHomeAssistantAction({ ...homeAssistantAction, haService: 'turn_on' });
            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo přes home assistant', 'Světlo HA', 'homeassistant', 'error',
                'Neplatná URL nebo služba Home Assistant'
            );
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('použije cache, pokud je odpověď služby cached', async () => {
            mockCacheService.getWebhookCache = jest.fn(() => ({ status: 200, timestamp: Date.now(), ttl: 300000 }));
            const result = await processor.executeHomeAssistantAction(homeAssistantAction);
            expect(result).toBe(true);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo přes home assistant', 'Světlo HA', 'homeassistant', 'success'
            );
        });

        it('úspěšně zavolá HA REST API s Bearer tokenem a entity_id', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
            const result = await processor.executeHomeAssistantAction(homeAssistantAction);
            expect(result).toBe(true);
            const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
            expect(url).toBe('https://ha.example.com/api/services/light/turn_on');
            expect(options.method).toBe('POST');
            expect(options.headers['Authorization']).toBe('Bearer longlivedtoken123');
            expect(JSON.parse(options.body).entity_id).toBe('light.obyvak');
            expect(mockCacheService.setWebhookCache).toHaveBeenCalledWith(
                'https://ha.example.com/api/services/light/turn_on:light.obyvak',
                expect.objectContaining({ status: 200, statusText: 'OK' }),
                300000
            );
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo přes home assistant', 'Světlo HA', 'homeassistant', 'success'
            );
            expect(mockLogger.success).toHaveBeenCalled();
        });

        it('zvládne URL instance s koncovým lomítkem', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
            const result = await processor.executeHomeAssistantAction({ ...homeAssistantAction, url: 'https://ha.example.com/' });
            expect(result).toBe(true);
            expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://ha.example.com/api/services/light/turn_on');
        });

        it('zaznamená HTTP chybu HA služby', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
            const result = await processor.executeHomeAssistantAction(homeAssistantAction);
            expect(result).toBe(false);
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo přes home assistant', 'Světlo HA', 'homeassistant', 'error', 'Unauthorized'
            );
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('zaznamená síťovou chybu jako network_error (retry s backoff)', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
            const result = await processor.executeHomeAssistantAction(homeAssistantAction);
            expect(result).toBe(false);
            expect(global.fetch).toHaveBeenCalledTimes(3);
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'rozsviť světlo přes home assistant', 'Světlo HA', 'homeassistant', 'network_error',
                'network down'
            );
            expect(mockLogger.networkError).toHaveBeenCalled();
        }, 15000);
    });

    describe('executeCustomAction', () => {
        it('přečte vlastní odpověď přes TTS a zaznamená úspěch', () => {
            mockTtsService.isEnabled = jest.fn(() => true);
            const result = processor.executeCustomAction(customAction);
            expect(result).toBe(true);
            expect(mockTtsService.speak).toHaveBeenCalledWith('Mám se skvěle, díky za optání!');
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'jak se máš', 'Můj příkaz', 'custom', 'success'
            );
            expect(mockLogger.success).toHaveBeenCalled();
        });

        it('vrátí false, když akce nemá vlastní odpověď', () => {
            const result = processor.executeCustomAction({ ...customAction, customResponse: undefined });
            expect(result).toBe(false);
            expect(mockTtsService.speak).not.toHaveBeenCalled();
            expect(mockHistoryService.addCommand).toHaveBeenCalledWith(
                'jak se máš', 'Můj příkaz', 'custom', 'error', 'Chybí vlastní odpověď'
            );
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
