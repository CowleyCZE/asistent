/**
 * CommandProcessor - zpracovává konkrétní typy akcí (webhook, tasker).
 * Vyčleněno z AssistantService pro menší a testovatelnější třídy.
 */
import { Action, WebhookAuth, SettingsService } from './settings.service';
import { CommandStatus, HistoryService } from './history.service';
import { TaskerService } from './tasker.service';
import { CacheService } from './cache.service';
import { NotificationService } from './notification.service';
import { TextToSpeechService } from './text-to-speech.service';
import { LoggerService } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import { Validators } from '../utils/validation';
import { fetchWithTimeout } from '../utils/network';
import { retryWithBackoff } from '../utils/retry';
import {
    ISettingsService,
    ITaskerService,
    IHistoryService,
    ICacheService,
    INotificationService,
    ITextToSpeechService,
    ILoggerService,
    ICommandProcessor
} from './service-interfaces';

export interface CommandProcessorDeps {
    settingsService?: ISettingsService;
    taskerService?: ITaskerService;
    historyService?: IHistoryService;
    cacheService?: ICacheService;
    notificationService?: INotificationService;
    ttsService?: ITextToSpeechService;
    logger?: ILoggerService;
}

export class CommandProcessor implements ICommandProcessor {
    /** Timeout pro jeden HTTP požadavek (ms). */
    private readonly REQUEST_TIMEOUT_MS = 15000;
    /** Počet opakování při selhání webhooku. */
    private readonly WEBHOOK_RETRIES = 2;

    private settingsService: ISettingsService;
    private taskerService: ITaskerService;
    private historyService: IHistoryService;
    private cacheService: ICacheService;
    private notificationService: INotificationService;
    private ttsService: ITextToSpeechService;
    private logger: ILoggerService;

    constructor(deps: CommandProcessorDeps = {}) {
        this.settingsService = deps.settingsService ?? new SettingsService();
        this.taskerService = deps.taskerService ?? new TaskerService();
        this.historyService = deps.historyService ?? new HistoryService();
        this.cacheService = deps.cacheService ?? new CacheService();
        this.notificationService = deps.notificationService ?? new NotificationService();
        this.ttsService = deps.ttsService ?? new TextToSpeechService();
        this.logger = deps.logger ?? new LoggerService();
    }

    /** Spustí Tasker úlohu definovanou akcí (včetně historie, notifikací a logu). */
    public executeTaskerAction(action: Action): boolean {
        console.log(`Příkaz nalezen: "${action?.name}". Spouštím úlohu v Taskeru: ${action?.taskName}`);
        // Null check: akce bez názvu úlohy nemůže být provedena
        if (!action?.taskName) {
            console.error(`Tasker akce "${action?.name ?? 'neznámá'}" nemá nastavený název úlohy.`);
            this.historyService.addCommand(
                action?.phrase ?? '',
                action?.name ?? 'neznámá akce',
                'tasker',
                'error',
                'Chybí název Tasker úlohy'
            );
            return false;
        }
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
            this.logger.success(`Spuštěna úloha v Taskeru: ${action.name} - ${action.taskName}`);
            if (this.notificationService.isEnabled()) {
                this.notificationService.showSuccess(
                    'Úspěch',
                    `Akce ${action.name} byla úspěšně provedena.`
                );
            }
        } else {
            this.logger.error(`Nepodařilo se spustit úlohu v Taskeru: ${action.name} - ${action.taskName}`);
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

    /** Spustí webhook definovaný akcí (cache, historie, notifikace, log). */
    public async executeWebhookAction(action: Action): Promise<boolean> {
        // Null check URL před jakýmkoli dalším zpracováním (kvůli strictNullChecks)
        const actionUrl = action?.url;
        if (!actionUrl) {
            console.error(`Webhook akce "${action?.name ?? 'neznámá'}" nemá nastavenou URL.`);
            this.historyService.addCommand(
                action?.phrase ?? '',
                action?.name ?? 'neznámá akce',
                'webhook',
                'error',
                'Chybí URL webhooku'
            );
            return false;
        }

        console.log(`Příkaz nalezen: "${action.name}". Volám webhook: ${actionUrl}`);

        const webhookAuth: WebhookAuth = this.settingsService.getWebhookAuth();

        // Check cache first
        const cachedResponse = this.cacheService.getWebhookCache(actionUrl);

        if (cachedResponse) {
            console.log(`Using cached response for ${actionUrl}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'webhook',
                'success'
            );
            return true;
        }

        if (!Validators.isValidWebhookUrl(actionUrl)) {
            console.error(`Neplatná webhook URL akce "${action.name}": ${actionUrl}`);
            this.logger.error(`Neplatná URL webhooku: ${action.name} - ${actionUrl}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'webhook',
                'error',
                'Neplatná URL webhooku'
            );
            return false;
        }

        try {
            // fetch s timeoutem a retry s exponential backoff
            const response = await retryWithBackoff(
                () => fetchWithTimeout(actionUrl, this.buildFetchOptions(actionUrl, webhookAuth), this.REQUEST_TIMEOUT_MS),
                { retries: this.WEBHOOK_RETRIES, baseDelayMs: 1000 }
            );

            if (response.ok) {
                console.log(`Webhook ${action.name} úspěšně zavolán.`);
                this.logger.success(`${action.name} - ${actionUrl}`);
                this.historyService.addCommand(
                    action.phrase,
                    action.name,
                    'webhook',
                    'success'
                );

                // Cache successful response (5 minut)
                this.cacheService.setWebhookCache(actionUrl, {
                    status: response.status,
                    statusText: response.statusText
                }, 300000);

                if (this.notificationService.isEnabled()) {
                    this.notificationService.showSuccess(
                        'Úspěch',
                        `Webhook ${action.name} byl úspěšně zavolán.`
                    );
                }

                return true;
            } else {
                const statusText = response.statusText ?? 'neznámá chyba';
                console.error(`Chyba při volání webhooku ${action.name}: ${statusText}`);
                this.logger.error(`${action.name} - ${statusText}`);
                this.historyService.addCommand(
                    action.phrase,
                    action.name,
                    'webhook',
                    'error',
                    response.statusText ?? 'neznámá chyba'
                );

                if (this.notificationService.isEnabled()) {
                    this.notificationService.showError(
                        'Chyba webhooku',
                        `Nepodařilo se zavolat webhook ${action.name}: ${response.statusText ?? 'neznámá chyba'}`
                    );
                }

                return false;
            }
        } catch (error) {
            const message = ErrorHandler.handle(`Webhook ${action.name}`, error);
            this.logger.networkError(`${action.name} - ${message}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'webhook',
                'network_error',
                message
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

    /** Zavolá webhook URL s autentizací (používá se pro offline frontu). */
    public async executeWebhookUrl(url: string): Promise<boolean> {
        if (!Validators.isValidWebhookUrl(url)) {
            console.error('Neplatná URL webhooku (offline fronta):', url);
            return false;
        }
        try {
            const webhookAuth: WebhookAuth = this.settingsService?.getWebhookAuth() ?? {};
            const response = await fetchWithTimeout(url, this.buildFetchOptions(url, webhookAuth), this.REQUEST_TIMEOUT_MS);
            return response?.ok ?? false;
        } catch (error) {
            ErrorHandler.handle('CommandProcessor.executeWebhookUrl', error);
            return false;
        }
    }

    /** Spustí Tasker úlohu podle názvu (používá se pro offline frontu). */
    public executeTaskerTaskName(taskName: string): boolean {
        return this.taskerService.executeTask(taskName);
    }

    /** Sestaví fetch options včetně API klíče a HMAC podpisu. */
    private buildFetchOptions(url: string, webhookAuth: WebhookAuth): RequestInit {
        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {}
        };

        if (webhookAuth.apiKey) {
            fetchOptions.headers = {
                ...fetchOptions.headers,
                'X-API-Key': webhookAuth.apiKey
            };
        }

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

        return fetchOptions;
    }

    private generateHmacSignature(message: string, secret: string): string {
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(message);
        return hmac.digest('hex');
    }
}
