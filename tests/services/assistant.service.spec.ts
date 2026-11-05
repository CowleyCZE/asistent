import { AssistantService } from '../../app/services/assistant.service';
import { Action } from '../../app/services/settings.service';
import { mockReset } from '../mocks/application-settings.mock';

/**
 * Testy AssistantService po refaktoringu na CommandProcessor:
 * AssistantService se testuje přes constructor injection (mock závislostí),
 * vykonávání akcí se ověřuje na mocku ICommandProcessor.
 */
describe('AssistantService', () => {
    let assistantService: AssistantService;
    let mockSettingsService: any;
    let mockCommandProcessor: any;
    let mockTtsService: any;
    let mockOfflineService: any;
    let mockNotificationService: any;

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

    const homeAssistantAction: Action = {
        name: 'Světlo HA',
        phrase: 'rozsviť světlo přes home assistant',
        type: 'homeassistant',
        url: 'https://ha.example.com',
        haToken: 'token123',
        haService: 'light.turn_on'
    };

    const customAction: Action = {
        name: 'Můj příkaz',
        phrase: 'jak se máš',
        type: 'custom',
        customResponse: 'Mám se skvěle!'
    };

    beforeEach(() => {
        mockReset();

        mockSettingsService = {
            getActions: () => [webhookAction, taskerAction],
            getWebhookAuth: () => ({}),
            getSettings: () => ({})
        };

        mockCommandProcessor = {
            executeWebhookAction: jest.fn().mockResolvedValue(true),
            executeTaskerAction: jest.fn().mockReturnValue(true),
            executeIftttAction: jest.fn().mockResolvedValue(true),
            executeHomeAssistantAction: jest.fn().mockResolvedValue(true),
            executeCustomAction: jest.fn().mockReturnValue(true),
            executeWebhookUrl: jest.fn().mockResolvedValue(true),
            executeTaskerTaskName: jest.fn().mockReturnValue(true)
        };

        mockTtsService = {
            isEnabled: jest.fn(() => false),
            speak: jest.fn().mockResolvedValue(true),
            setEnabled: jest.fn(),
            setLanguage: jest.fn(),
            setPitch: jest.fn(),
            setRate: jest.fn()
        };

        mockOfflineService = {
            queueCommand: jest.fn(),
            processAllCommands: jest.fn().mockResolvedValue({ processed: 0, failed: 0 }),
            getQueueCount: jest.fn(() => 0),
            isOfflineModeActive: jest.fn(() => false)
        };

        mockNotificationService = {
            isEnabled: () => false,
            showSuccess: jest.fn(),
            showError: jest.fn(),
            showWarning: jest.fn()
        };

        assistantService = new AssistantService({
            settingsService: mockSettingsService,
            ttsService: mockTtsService,
            offlineService: mockOfflineService,
            notificationService: mockNotificationService,
            commandProcessor: mockCommandProcessor
        });
    });

    describe('processCommand - matchování', () => {
        it('vrátí false pro neznámý příkaz', async () => {
            const result = await assistantService.processCommand('unknown command');
            expect(result).toBe(false);
            expect(mockCommandProcessor.executeWebhookAction).not.toHaveBeenCalled();
            expect(mockCommandProcessor.executeTaskerAction).not.toHaveBeenCalled();
        });

        it('spustí webhook akci přes CommandProcessor', async () => {
            const result = await assistantService.processCommand('rozsviť světlo');
            expect(result).toBe(true);
            expect(mockCommandProcessor.executeWebhookAction).toHaveBeenCalledWith(webhookAction);
        });

        it('spustí Tasker akci přes CommandProcessor', async () => {
            const result = await assistantService.processCommand('pusť hudbu');
            expect(result).toBe(true);
            expect(mockCommandProcessor.executeTaskerAction).toHaveBeenCalledWith(taskerAction);
        });

        it('propaguje neúspěch webhooku', async () => {
            mockCommandProcessor.executeWebhookAction.mockResolvedValueOnce(false);
            const result = await assistantService.processCommand('rozsviť světlo');
            expect(result).toBe(false);
        });

        it('propaguje neúspěch Tasker akce', async () => {
            mockCommandProcessor.executeTaskerAction.mockReturnValueOnce(false);
            const result = await assistantService.processCommand('pusť hudbu');
            expect(result).toBe(false);
        });

        it('ignoruje velká/malá písmena', async () => {
            const result = await assistantService.processCommand('ROZSVIŤ SVĚTLO');
            expect(result).toBe(true);
            expect(mockCommandProcessor.executeWebhookAction).toHaveBeenCalledWith(webhookAction);
        });

        it('matchuje částečné fráze', async () => {
            const result = await assistantService.processCommand('rozsviť světlo v obýváku');
            expect(result).toBe(true);
            expect(mockCommandProcessor.executeWebhookAction).toHaveBeenCalledWith(webhookAction);
        });

        it('vrátí false pro prázdný příkaz', async () => {
            const result = await assistantService.processCommand('   ');
            expect(result).toBe(false);
        });

        it('vrátí false při výjimce v settings', async () => {
            mockSettingsService.getActions = () => { throw new Error('boom'); };
            const result = await assistantService.processCommand('rozsviť světlo');
            expect(result).toBe(false);
        });
    });

    describe('processCommand - nové typy akcí a záměry', () => {
        beforeEach(() => {
            mockSettingsService.getActions = () => [homeAssistantAction, customAction];
        });

        it('spustí Home Assistant akci přes CommandProcessor', async () => {
            const result = await assistantService.processCommand('rozsviť světlo přes home assistant');
            expect(result).toBe(true);
            expect(mockCommandProcessor.executeHomeAssistantAction).toHaveBeenCalledWith(homeAssistantAction);
        });

        it('spustí vlastní příkaz přes CommandProcessor', async () => {
            const result = await assistantService.processCommand('jak se máš');
            expect(result).toBe(true);
            expect(mockCommandProcessor.executeCustomAction).toHaveBeenCalledWith(customAction);
        });
    });

    describe('processCommand - intent recognition fallback', () => {
        beforeEach(() => {
            mockTtsService.isEnabled = jest.fn(() => true);
        });

        it('odpoví na otázku na čas, když žádná akce neodpovídá', async () => {
            const result = await assistantService.processCommand('kolik je hodin');
            expect(result).toBe(true);
            expect(mockTtsService.speak).toHaveBeenCalledWith(
                expect.stringMatching(/Je \d{1,2} hodin a \d{1,2} minut/)
            );
        });

        it('nepoužije záměr, když existuje shodná akce', async () => {
            mockSettingsService.getActions = () => [webhookAction];
            await assistantService.processCommand('rozsviť světlo');
            expect(mockTtsService.speak).not.toHaveBeenCalledWith(expect.stringMatching(/Je \d{1,2} hodin/));
            expect(mockCommandProcessor.executeWebhookAction).toHaveBeenCalled();
        });

        it('odpoví standardní zprávou pro úplně neznámý příkaz', async () => {
            const result = await assistantService.processCommand('bláznivý nesmyslný text');
            expect(result).toBe(false);
            expect(mockTtsService.speak).toHaveBeenCalledWith('Bohužel jsem nenašel odpovídající akci.');
        });
    });

    describe('processCommand - offline fronta', () => {
        afterEach(() => {
            (global as any).android = undefined;
        });

        it('zařadí příkaz do fronty při nedostupné síti', async () => {
            // Simulace Android kontextu: getActiveNetworkInfo vrací null -> offline
            (global as any).android = {
                context: {
                    CONNECTIVITY_SERVICE: 'connectivity',
                    getSystemService: () => ({ getActiveNetworkInfo: () => null })
                }
            };

            const result = await assistantService.processCommand('rozsviť světlo');
            expect(result).toBe(false);
            expect(mockOfflineService.queueCommand).toHaveBeenCalledWith(
                'rozsviť světlo',
                'Light On',
                'webhook',
                'https://example.com/light-on',
                undefined
            );
            expect(mockCommandProcessor.executeWebhookAction).not.toHaveBeenCalled();
        });
    });

    describe('processCommand - TTS integrace', () => {
        beforeEach(() => {
            mockTtsService.isEnabled = jest.fn(() => true);
        });

        it('promluví při úspěšném příkazu', async () => {
            await assistantService.processCommand('rozsviť světlo');
            expect(mockTtsService.speak).toHaveBeenCalled();
        });

        it('promluví při neúspěšném příkazu', async () => {
            mockCommandProcessor.executeWebhookAction.mockResolvedValueOnce(false);
            await assistantService.processCommand('rozsviť světlo');
            expect(mockTtsService.speak).not.toHaveBeenCalled();
        });

        it('promluví i pro neznámý příkaz', async () => {
            await assistantService.processCommand('unknown command');
            expect(mockTtsService.speak).toHaveBeenCalled();
        });

        it('nehlásí TTS chybu, když je speak odmítnuto', async () => {
            mockTtsService.speak.mockRejectedValueOnce(new Error('tts fail'));
            const result = await assistantService.processCommand('rozsviť světlo');
            expect(result).toBe(true);
        });
    });

    describe('processOfflineQueue', () => {
        it('online zpracuje frontu přes CommandProcessor executory', async () => {
            mockOfflineService.processAllCommands.mockResolvedValue({ processed: 2, failed: 1 });
            const result = await assistantService.processOfflineQueue();
            expect(result).toEqual({ processed: 2, failed: 1 });
            expect(mockOfflineService.processAllCommands).toHaveBeenCalledWith(
                expect.any(Function),
                expect.any(Function)
            );
            // Funkce delegují na CommandProcessor
            const [webhookExecutor, taskerExecutor] = mockOfflineService.processAllCommands.mock.calls[0];
            await webhookExecutor('https://example.com/hook');
            expect(mockCommandProcessor.executeWebhookUrl).toHaveBeenCalledWith('https://example.com/hook');
            taskerExecutor('PlayMusic');
            expect(mockCommandProcessor.executeTaskerTaskName).toHaveBeenCalledWith('PlayMusic');
        });

        it('vrátí nuly při výjimce', async () => {
            mockOfflineService.processAllCommands.mockRejectedValueOnce(new Error('boom'));
            const result = await assistantService.processOfflineQueue();
            expect(result).toEqual({ processed: 0, failed: 0 });
        });
    });

    describe('getOfflineQueueCount / isOfflineModeActive', () => {
        it('deleguje na OfflineService', () => {
            expect(assistantService.getOfflineQueueCount()).toBe(0);
            expect(assistantService.isOfflineModeActive()).toBe(false);
        });
    });
});
