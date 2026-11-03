import { SettingsService, Action, WebhookAuth } from './settings.service';
import { TaskerService } from './tasker.service';
import { HistoryService, CommandStatus } from './history.service';
import { TextToSpeechService } from './text-to-speech.service';
import { CacheService } from './cache.service';
import { OfflineService } from './offline.service';
import { NotificationService } from './notification.service';
import { knownFolders } from '@nativescript/core';
import {
    ISettingsService,
    ITaskerService,
    IHistoryService,
    ITextToSpeechService,
    ICacheService,
    IOfflineService,
    INotificationService,
    IAssistantService
} from './service-interfaces';

/**
 * Závislosti AssistantService pro constructor injection.
 * Všechny závislosti jsou volitelné - pokud nejsou předány,
 * použijí se výchozí konkrétní implementace.
 */
export interface AssistantServiceDeps {
    settingsService?: ISettingsService;
    taskerService?: ITaskerService;
    historyService?: IHistoryService;
    ttsService?: ITextToSpeechService;
    cacheService?: ICacheService;
    offlineService?: IOfflineService;
    notificationService?: INotificationService;
}

export class AssistantService implements IAssistantService {
    private settingsService: ISettingsService;
    private taskerService: ITaskerService;
    private historyService: IHistoryService;
    private ttsService: ITextToSpeechService;
    private cacheService: ICacheService;
    private offlineService: IOfflineService;
    private notificationService: INotificationService;

    constructor(deps: AssistantServiceDeps = {}) {
        // Constructor injection - umožňuje předat mock implementace v testech
        this.settingsService = deps.settingsService ?? new SettingsService();
        this.taskerService = deps.taskerService ?? new TaskerService();
        this.historyService = deps.historyService ?? new HistoryService();
        this.ttsService = deps.ttsService ?? new TextToSpeechService();
        this.cacheService = deps.cacheService ?? new CacheService();
        this.offlineService = deps.offlineService ?? new OfflineService();
        this.notificationService = deps.notificationService ?? new NotificationService();
    }

    public async processCommand(command: string): Promise<boolean> {
        const lowerCaseCommand = command.toLowerCase();
        const actions = this.settingsService.getActions();

        const matchedAction = actions.find(action =>
            lowerCaseCommand.includes(action.phrase.toLowerCase())
        );

        if (matchedAction) {
            // Check if we're offline
            if (!this.isOnline()) {
                this.offlineService.queueCommand(
                    command,
                    matchedAction.name,
                    matchedAction.type,
                    matchedAction.url,
                    matchedAction.taskName
                );
                
                if (this.notificationService.isEnabled()) {
                    this.notificationService.showWarning(
                        'Offline režim',
                        `Příkaz "${command}" byl uložen do fronty pro pozdější zpracování.`
                    );
                }
                
                if (this.ttsService.isEnabled()) {
                    await this.ttsService.speak("Jsem offline. Příkaz byl uložen do fronty.");
                }
                
                return false;
            }

            if (matchedAction.type === 'webhook') {
                const success = await this.executeWebhook(matchedAction);
                if (success && this.ttsService.isEnabled()) {
                    await this.ttsService.speak(`Akce ${matchedAction.name} byla úspěšně provedena.`);
                }
                return success;
            } else if (matchedAction.type === 'tasker') {
                const success = this.executeTaskerTask(matchedAction);
                if (success && this.ttsService.isEnabled()) {
                    await this.ttsService.speak(`Akce ${matchedAction.name} byla úspěšně provedena.`);
                }
                return success;
            }
        }

        console.log(`Pro příkaz "${command}" nebyla nalezena žádná akce.`);
        if (this.ttsService.isEnabled()) {
            await this.ttsService.speak("Bohužel jsem nenašel odpovídající akci.");
        }
        return false;
    }

    private isOnline(): boolean {
        try {
            if (global.android) {
                const connectivityManager = global.android.context?.getSystemService(
                    global.android.context?.CONNECTIVITY_SERVICE
                );
                if (connectivityManager) {
                    const networkInfo = connectivityManager.getActiveNetworkInfo();
                    return networkInfo != null && networkInfo.isConnected();
                }
            }
            // Fallback - assume online if we can't check
            return true;
        } catch (error) {
            console.error('Error checking connectivity:', error);
            return true; // Assume online on error
        }
    }

    private executeTaskerTask(action: Action): boolean {
        console.log(`Příkaz nalezen: "${action.name}". Spouštím úlohu v Taskeru: ${action.taskName}`);
        const success = this.taskerService.executeTask(action.taskName);
        const status: CommandStatus = success ? 'success' : 'error';
        this.historyService.addCommand(
            action.phrase,
            action.name,
            'tasker',
            status,
            success ? undefined : `Nepodařilo se spustit úlohu: ${action.taskName}`
        );
        
        if (success) {
            this.logToFile(`[SUCCESS] ${new Date().toISOString()}: Spuštěna úloha v Taskeru: ${action.name} - ${action.taskName}`);
            if (this.notificationService.isEnabled()) {
                this.notificationService.showSuccess(
                    'Úspěch',
                    `Akce ${action.name} byla úspěšně provedena.`
                );
            }
        } else {
            this.logToFile(`[ERROR] ${new Date().toISOString()}: Nepodařilo se spustit úlohu v Taskeru: ${action.name} - ${action.taskName}`);
            if (this.notificationService.isEnabled()) {
                this.notificationService.showError(
                    'Chyba',
                    `Nepodařilo se spustit úlohu ${action.name} v Taskeru.`
                );
            }
            if (this.ttsService.isEnabled()) {
                this.ttsService.speak(`Nepodařilo se spustit úlohu ${action.name} v Taskeru.`);
            }
        }
        return success;
    }

    private async executeWebhook(action: Action): Promise<boolean> {
        console.log(`Příkaz nalezen: "${action.name}". Volám webhook: ${action.url}`);
        
        // Get webhook auth settings
        const webhookAuth: WebhookAuth = this.settingsService.getWebhookAuth();
        
        // Check cache first
        const cacheKey = `webhook_${action.url}`;
        const cachedResponse = this.cacheService.getWebhookCache(action.url);
        
        if (cachedResponse) {
            console.log(`Using cached response for ${action.url}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'webhook',
                'success'
            );
            return true;
        }
        
        try {
            // Build fetch options with authentication
            const fetchOptions: RequestInit = {
                method: 'POST',
                headers: {}
            };
            
            // Add API key authentication if configured
            if (webhookAuth.apiKey) {
                fetchOptions.headers = {
                    ...fetchOptions.headers,
                    'X-API-Key': webhookAuth.apiKey
                };
                console.log(`Přidán API klíč pro webhook: ${action.name}`);
            }
            
            // Add HMAC signature if enabled
            if (webhookAuth.useHmac && webhookAuth.hmacSecret) {
                const timestamp = Date.now().toString();
                const message = `${action.url}:${timestamp}`;
                const signature = this.generateHmacSignature(message, webhookAuth.hmacSecret);
                fetchOptions.headers = {
                    ...fetchOptions.headers,
                    'X-HMAC-Signature': signature,
                    'X-HMAC-Timestamp': timestamp
                };
                console.log(`Přidán HMAC podpis pro webhook: ${action.name}`);
            }
            
            const response = await fetch(action.url, fetchOptions);

            if (response.ok) {
                console.log(`Webhook ${action.name} úspěšně zavolán.`);
                this.logToFile(`[SUCCESS] ${new Date().toISOString()}: ${action.name} - ${action.url}`);
                this.historyService.addCommand(
                    action.phrase,
                    action.name,
                    'webhook',
                    'success'
                );
                
                // Cache successful response
                this.cacheService.setWebhookCache(action.url, {
                    status: response.status,
                    statusText: response.statusText
                }, 300000); // Cache for 5 minutes
                
                if (this.notificationService.isEnabled()) {
                    this.notificationService.showSuccess(
                        'Úspěch',
                        `Webhook ${action.name} byl úspěšně zavolán.`
                    );
                }
                
                return true;
            } else {
                console.error(`Chyba při volání webhooku ${action.name}: ${response.statusText}`);
                this.logToFile(`[ERROR] ${new Date().toISOString()}: ${action.name} - ${response.statusText}`);
                this.historyService.addCommand(
                    action.phrase,
                    action.name,
                    'webhook',
                    'error',
                    response.statusText
                );
                
                if (this.notificationService.isEnabled()) {
                    this.notificationService.showError(
                        'Chyba webhooku',
                        `Nepodařilo se zavolat webhook ${action.name}: ${response.statusText}`
                    );
                }
                
                return false;
            }
        } catch (error) {
            console.error(`Chyba sítě při volání webhooku ${action.name}:`, error);
            this.logToFile(`[NETWORK ERROR] ${new Date().toISOString()}: ${action.name} - ${error}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'webhook',
                'network_error',
                error instanceof Error ? error.message : String(error)
            );
            
            if (this.notificationService.isEnabled()) {
                this.notificationService.showError(
                    'Síťová chyba',
                    `Chyba sítě při volání webhooku ${action.name}`
                );
            }
            
            return false;
        }
    }

    public async processOfflineQueue(): Promise<{ processed: number; failed: number }> {
        if (this.isOnline()) {
            const webhookAuth: WebhookAuth = this.settingsService.getWebhookAuth();
            return this.offlineService.processAllCommands(
                async (url: string) => {
                    try {
                        // Build fetch options with authentication
                        const fetchOptions: RequestInit = {
                            method: 'POST',
                            headers: {}
                        };
                        
                        // Add API key authentication if configured
                        if (webhookAuth.apiKey) {
                            fetchOptions.headers = {
                                ...fetchOptions.headers,
                                'X-API-Key': webhookAuth.apiKey
                            };
                        }
                        
                        // Add HMAC signature if enabled
                        if (webhookAuth.useHmac && webhookAuth.hmacSecret) {
                            const timestamp = Date.now().toString();
                            const message = `${url}:${timestamp}`;
                            const signature = this.generateHmacSignature(message, webhookAuth.hmacSecret);
                            fetchOptions.headers = {
                                ...fetchOptions.headers,
                                'X-HMAC-Signature': signature,
                                'X-HMAC-Timestamp': timestamp
                            };
                        }
                        
                        const response = await fetch(url, fetchOptions);
                        return response.ok;
                    } catch {
                        return false;
                    }
                },
                (taskName: string) => this.taskerService.executeTask(taskName)
            );
        }
        return { processed: 0, failed: 0 };
    }

    public getOfflineQueueCount(): number {
        return this.offlineService.getQueueCount();
    }

    public isOfflineModeActive(): boolean {
        return this.offlineService.isOfflineModeActive();
    }

    private generateHmacSignature(message: string, secret: string): string {
        // Simple HMAC simulation using SHA-256
        // In a real implementation, use crypto.createHmac
        // For NativeScript, we'll use a simple hash approach
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(message);
        return hmac.digest('hex');
    }

    private logToFile(message: string) {
        const documents = knownFolders.documents();
        const file = documents.getFile("webhook_log.txt");
        file.readText().then((content) => {
            file.writeText(content + message + "\n");
        });
    }
}
