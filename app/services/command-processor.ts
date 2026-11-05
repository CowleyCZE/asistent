/**
 * CommandProcessor - zpracovává konkrétní typy akcí (webhook, tasker, ifttt).
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
    /** Základní URL IFTTT Maker Webhooks služby. */
    private readonly IFTTT_MAKER_BASE = 'https://maker.ifttt.com/trigger';
    /** TTL cache úspěšné IFTTT odpovědi (ms). */
    private readonly IFTTT_CACHE_TTL_MS = 300000;

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

    /**
     * Spustí IFTTT událost přes Maker Webhooks
     * (https://maker.ifttt.com/trigger/{event}/with/key/{key}).
     * Zahrnuje cache, historii, notifikace a TTS odezvu.
     */
    public async executeIftttAction(action: Action): Promise<boolean> {
        const event = action?.iftttEvent;
        const key = action?.iftttKey;

        // Null check: bez události ani klíče nelze IFTTT zavolat
        if (!event || !key) {
            console.error(`IFTTT akce "${action?.name ?? 'neznámá'}" nemá nastavenou událost nebo klíč.`);
            this.historyService.addCommand(
                action?.phrase ?? '',
                action?.name ?? 'neznámá akce',
                'ifttt',
                'error',
                'Chybí název IFTTT události nebo klíč'
            );
            return false;
        }

        if (!Validators.IFTTT_TOKEN_PATTERN.test(event) || !Validators.IFTTT_TOKEN_PATTERN.test(key)) {
            console.error(`Neplatný název události nebo klíč IFTTT akce "${action.name}".`);
            this.logger.error(`Neplatný název události/klíč IFTTT: ${action.name}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'ifttt',
                'error',
                'Neplatný název IFTTT události nebo klíč'
            );
            return false;
        }

        const url = `${this.IFTTT_MAKER_BASE}/${encodeURIComponent(event)}/with/key/${encodeURIComponent(key)}`;
        console.log(`Příkaz nalezen: "${action.name}". Spouštím IFTTT událost: ${event}`);

        // Check cache first (stejné chování jako webhooky)
        const cachedResponse = this.cacheService.getWebhookCache(url);
        if (cachedResponse) {
            console.log(`Using cached response for IFTTT event ${event}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'ifttt',
                'success'
            );
            return true;
        }

        try {
            const fetchOptions: RequestInit = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    value1: action.phrase,
                    value2: action.name,
                    value3: new Date().toISOString()
                })
            };

            // fetch s timeoutem a retry s exponential backoff
            const response = await retryWithBackoff(
                () => fetchWithTimeout(url, fetchOptions, this.REQUEST_TIMEOUT_MS),
                { retries: this.WEBHOOK_RETRIES, baseDelayMs: 1000 }
            );

            if (response.ok) {
                console.log(`IFTTT událost ${event} akce ${action.name} úspěšně spuštěna.`);
                this.logger.success(`IFTTT ${action.name} - ${event}`);
                this.historyService.addCommand(
                    action.phrase,
                    action.name,
                    'ifttt',
                    'success'
                );

                // Cache successful response (5 minut)
                this.cacheService.setWebhookCache(url, {
                    status: response.status,
                    statusText: response.statusText
                }, this.IFTTT_CACHE_TTL_MS);

                if (this.notificationService.isEnabled()) {
                    this.notificationService.showSuccess(
                        'Úspěch',
                        `IFTTT událost ${action.name} byla úspěšně spuštěna.`
                    );
                }

                return true;
            }

            const statusText = response.statusText ?? 'neznámá chyba';
            console.error(`Chyba při spouštění IFTTT události ${event}: ${statusText}`);
            this.logger.error(`IFTTT ${action.name} - ${statusText}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'ifttt',
                'error',
                statusText
            );

            if (this.notificationService.isEnabled()) {
                this.notificationService.showError(
                    'Chyba IFTTT',
                    `Nepodařilo se spustit IFTTT událost ${action.name}: ${statusText}`
                );
            }

            return false;
        } catch (error) {
            const message = ErrorHandler.handle(`IFTTT ${action.name}`, error);
            this.logger.networkError(`IFTTT ${action.name} - ${message}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'ifttt',
                'network_error',
                message
            );

            if (this.notificationService.isEnabled()) {
                this.notificationService.showError(
                    'Síťová chyba',
                    `Chyba sítě při spouštění IFTTT události ${action.name}`
                );
            }

            return false;
        }
    }

    /**
     * Zavolá službu Home Assistant přes REST API
     * (POST {url}/api/services/{domain}/{service}, Bearer token).
     * Zahrnuje cache, historii, notifikace a TTS odezvu.
     */
    public async executeHomeAssistantAction(action: Action): Promise<boolean> {
        const instanceUrl = (action?.url ?? '').trim().replace(/\/+$/, '');
        const token = action?.haToken;
        const service = action?.haService;
        const entity = action?.haEntity;

        // Null check: bez URL, tokenu ani služby nelze Home Assistant zavolat
        if (!instanceUrl || !token || !service) {
            console.error(`Home Assistant akce "${action?.name ?? 'neznámá'}" nemá URL, token ani službu.`);
            this.historyService.addCommand(
                action?.phrase ?? '',
                action?.name ?? 'neznámá akce',
                'homeassistant',
                'error',
                'Chybí URL instance, token nebo služba Home Assistant'
            );
            return false;
        }

        if (!Validators.isValidWebhookUrl(instanceUrl) || !Validators.HA_SERVICE_PATTERN.test(service)) {
            console.error(`Neplatná URL nebo služba Home Assistant akce "${action.name}".`);
            this.logger.error(`Neplatná URL/služba Home Assistant: ${action.name}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'homeassistant',
                'error',
                'Neplatná URL nebo služba Home Assistant'
            );
            return false;
        }

        const [domain, serviceName] = service.split('.');
        const apiUrl = `${instanceUrl}/api/services/${domain}/${serviceName}`;
        console.log(`Příkaz nalezen: "${action.name}". Volám Home Assistant službu: ${service}`);

        // Check cache first (stejné chování jako webhooky)
        const cacheKey = `${apiUrl}:${entity ?? ''}`;
        const cachedResponse = this.cacheService.getWebhookCache(cacheKey);
        if (cachedResponse) {
            console.log(`Using cached response for Home Assistant service ${service}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'homeassistant',
                'success'
            );
            return true;
        }

        try {
            const fetchOptions: RequestInit = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(entity ? { entity_id: entity } : {})
            };

            // fetch s timeoutem a retry s exponential backoff
            const response = await retryWithBackoff(
                () => fetchWithTimeout(apiUrl, fetchOptions, this.REQUEST_TIMEOUT_MS),
                { retries: this.WEBHOOK_RETRIES, baseDelayMs: 1000 }
            );

            if (response.ok) {
                console.log(`Home Assistant služba ${service} akce ${action.name} úspěšně zavolána.`);
                this.logger.success(`HomeAssistant ${action.name} - ${service}`);
                this.historyService.addCommand(
                    action.phrase,
                    action.name,
                    'homeassistant',
                    'success'
                );

                // Cache successful response (5 minut)
                this.cacheService.setWebhookCache(cacheKey, {
                    status: response.status,
                    statusText: response.statusText
                }, this.IFTTT_CACHE_TTL_MS);

                if (this.notificationService.isEnabled()) {
                    this.notificationService.showSuccess(
                        'Úspěch',
                        `Home Assistant služba ${action.name} byla úspěšně zavolána.`
                    );
                }

                return true;
            }

            const statusText = response.statusText ?? 'neznámá chyba';
            console.error(`Chyba při volání Home Assistant služby ${service}: ${statusText}`);
            this.logger.error(`HomeAssistant ${action.name} - ${statusText}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'homeassistant',
                'error',
                statusText
            );

            if (this.notificationService.isEnabled()) {
                this.notificationService.showError(
                    'Chyba Home Assistant',
                    `Nepodařilo se zavolat službu ${action.name}: ${statusText}`
                );
            }

            return false;
        } catch (error) {
            const message = ErrorHandler.handle(`HomeAssistant ${action.name}`, error);
            this.logger.networkError(`HomeAssistant ${action.name} - ${message}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'homeassistant',
                'network_error',
                message
            );

            if (this.notificationService.isEnabled()) {
                this.notificationService.showError(
                    'Síťová chyba',
                    `Chyba sítě při volání Home Assistant ${action.name}`
                );
            }

            return false;
        }
    }

    /**
     * Vykoná vlastní příkaz: přečte uloženou odpověď přes TTS
     * (žádné externí volání). Zahrnuje historii a notifikace.
     */
    public executeCustomAction(action: Action): boolean {
        const response = action?.customResponse;
        if (!response) {
            console.error(`Vlastní akce "${action?.name ?? 'neznámá'}" nemá nastavenou odpověď.`);
            this.historyService.addCommand(
                action?.phrase ?? '',
                action?.name ?? 'neznámá akce',
                'custom',
                'error',
                'Chybí vlastní odpověď'
            );
            return false;
        }

        console.log(`Vlastní příkaz "${action.name}" – čtu odpověď přes TTS.`);
        this.historyService.addCommand(
            action.phrase,
            action.name,
            'custom',
            'success'
        );
        this.logger.success(`Vlastní příkaz ${action.name}`);

        if (this.notificationService.isEnabled()) {
            this.notificationService.showSuccess(
                'Vlastní příkaz',
                `Akce ${action.name} byla úspěšně provedena.`
            );
        }

        if (this.ttsService.isEnabled()) {
            this.ttsService.speak(response);
        }

        return true;
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

    /**
     * Vypočítá HMAC-SHA256 podpis hexadecimálně.
     *
     * POZOR: Node.js modul `crypto` v NativeScript Android runtime
     * neexistuje (`require('crypto')` shodí aplikaci) – používáme
     * tedy Android/Java API `javax.crypto.Mac` (HmacSHA256).
     * Na runtime bez Java API (testy) vrací prázdný řetězec a zaloguje varování.
     */
    private generateHmacSignature(message: string, secret: string): string {
        const g: any = global;
        const Mac = g?.javax?.crypto?.Mac;
        const SecretKeySpec = g?.javax?.crypto?.spec?.SecretKeySpec;
        const JString = g?.java?.lang?.String;

        if (!Mac || !SecretKeySpec || !JString) {
            console.warn('HMAC podpis není dostupný – chybí javax.crypto API v tomto runtime.');
            return '';
        }

        try {
            const mac = Mac.getInstance('HmacSHA256');
            mac.init(new SecretKeySpec(new JString(secret).getBytes('UTF-8'), 'HmacSHA256'));
            const result = mac.doFinal(new JString(message).getBytes('UTF-8'));

            // Bajty -> hex řetězec
            let hex = '';
            for (let i = 0; i < result.length; i++) {
                const b = result[i] & 0xff;
                hex += (b < 16 ? '0' : '') + b.toString(16);
            }
            return hex;
        } catch (error) {
            console.error('Chyba při výpočtu HMAC podpisu:', error);
            return '';
        }
    }
}
