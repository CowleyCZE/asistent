import { ApplicationSettings } from '@nativescript/core';
import { StorageKeys, Colors } from '../utils/constants';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    timestamp: number;
    duration?: number; // in milliseconds
    action?: {
        label: string;
        callback: () => void;
    };
}

export interface NotificationSettings {
    enabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    successNotifications: boolean;
    errorNotifications: boolean;
    previewText: boolean;
}

export class NotificationService {
    private readonly NOTIFICATIONS_KEY = StorageKeys.Notifications;
    private readonly NOTIFICATION_SETTINGS_KEY = StorageKeys.NotificationSettings;
    private readonly DEFAULT_DURATION = 5000; // 5 seconds
    private readonly MAX_NOTIFICATIONS = 10;

    private activeNotifications: Notification[] = [];
    private notificationQueue: Notification[] = [];

    constructor() {
        this.loadSettings();
    }

    private loadSettings(): NotificationSettings {
        const saved = ApplicationSettings.getString(this.NOTIFICATION_SETTINGS_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error parsing notification settings:', e);
            }
        }
        return this.getDefaultSettings();
    }

    private getDefaultSettings(): NotificationSettings {
        return {
            enabled: true,
            soundEnabled: true,
            vibrationEnabled: true,
            successNotifications: true,
            errorNotifications: true,
            previewText: true
        };
    }

    private saveSettings(settings: Partial<NotificationSettings>) {
        const current = this.loadSettings();
        const newSettings = { ...current, ...settings };
        ApplicationSettings.setString(this.NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
    }

    public isEnabled(): boolean {
        return this.loadSettings().enabled;
    }

    public enableNotifications(enabled: boolean) {
        this.saveSettings({ enabled });
    }

    public enableSound(enabled: boolean) {
        this.saveSettings({ soundEnabled: enabled });
    }

    public enableVibration(enabled: boolean) {
        this.saveSettings({ vibrationEnabled: enabled });
    }

    public enableSuccessNotifications(enabled: boolean) {
        this.saveSettings({ successNotifications: enabled });
    }

    public enableErrorNotifications(enabled: boolean) {
        this.saveSettings({ errorNotifications: enabled });
    }

    public enablePreviewText(enabled: boolean) {
        this.saveSettings({ previewText: enabled });
    }

    public getSettings(): NotificationSettings {
        return this.loadSettings();
    }

    public show(notification: Omit<Notification, 'id' | 'timestamp'>): Notification | null {
        const settings = this.loadSettings();
        
        if (!settings.enabled) {
            return null;
        }

        const fullNotification: Notification = {
            ...notification,
            id: this.generateId(),
            timestamp: Date.now(),
            duration: notification.duration || this.DEFAULT_DURATION
        };

        // Check if we can show immediately
        if (this.activeNotifications.length < 2) {
            this.showNotification(fullNotification);
        } else {
            // Queue the notification
            this.notificationQueue.push(fullNotification);
        }

        this.activeNotifications.push(fullNotification);
        
        // Auto-dismiss after duration
        setTimeout(() => {
            this.dismiss(notification.id);
        }, fullNotification.duration);

        return fullNotification;
    }

    public showSuccess(title: string, message: string, duration?: number): Notification | null {
        const settings = this.loadSettings();
        if (!settings.successNotifications) {
            return null;
        }
        return this.show({ title, message, type: 'success', duration });
    }

    public showError(title: string, message: string, duration?: number): Notification | null {
        const settings = this.loadSettings();
        if (!settings.errorNotifications) {
            return null;
        }
        return this.show({ title, message, type: 'error', duration });
    }

    public showWarning(title: string, message: string, duration?: number): Notification | null {
        return this.show({ title, message, type: 'warning', duration });
    }

    public showInfo(title: string, message: string, duration?: number): Notification | null {
        return this.show({ title, message, type: 'info', duration });
    }

    public dismiss(id: string): boolean {
        const index = this.activeNotifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.activeNotifications.splice(index, 1);
            
            // Show next queued notification if available
            if (this.notificationQueue.length > 0 && this.activeNotifications.length < 2) {
                const next = this.notificationQueue.shift();
                if (next) {
                    this.showNotification(next);
                }
            }
            
            return true;
        }
        return false;
    }

    public dismissAll(): void {
        this.activeNotifications = [];
        this.notificationQueue = [];
    }

    public getActiveNotifications(): Notification[] {
        return [...this.activeNotifications];
    }

    public getQueuedNotifications(): Notification[] {
        return [...this.notificationQueue];
    }

    public hasNotifications(): boolean {
        return this.activeNotifications.length > 0 || this.notificationQueue.length > 0;
    }

    public getHistory(): Notification[] {
        const historyJson = ApplicationSettings.getString(this.NOTIFICATIONS_KEY);
        if (historyJson) {
            try {
                return JSON.parse(historyJson);
            } catch (e) {
                console.error('Error parsing notification history:', e);
                return [];
            }
        }
        return [];
    }

    public clearHistory(): void {
        ApplicationSettings.remove(this.NOTIFICATIONS_KEY);
    }

    private showNotification(notification: Notification) {
        const settings = this.loadSettings();
        
        // Play sound if enabled
        if (settings.soundEnabled) {
            this.playSound(notification.type);
        }

        // Vibrate if enabled
        if (settings.vibrationEnabled) {
            this.vibrate(notification.type);
        }

        // Save to history
        this.saveToHistory(notification);
    }

    private playSound(type: NotificationType) {
        try {
            // Android notification sound
            if (global.android) {
                const NotificationManager = android.app.NotificationManager;
                const RingtoneManager = android.media.RingtoneManager;
                const AudioManager = android.media.AudioManager;

                const notificationManager = global.android.context?.getSystemService(
                    global.android.context?.NOTIFICATION_SERVICE
                );

                if (notificationManager) {
                    const soundUri = this.getSoundUri(type);
                    if (soundUri) {
                        const ringtone = RingtoneManager.getRingtone(
                            global.android.context,
                            soundUri
                        );
                        if (ringtone) {
                            ringtone.play();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    private getSoundUri(type: NotificationType): any {
        try {
            const RingtoneManager = android.media.RingtoneManager;
            switch (type) {
                case 'success':
                    return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                case 'error':
                    return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                case 'warning':
                    return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                default:
                    return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
        } catch {
            return null;
        }
    }

    private vibrate(type: NotificationType) {
        try {
            if (global.android) {
                const Vibrator = android.os.Vibrator;
                const VibratorManager = android.os.VibratorManager;
                const context = global.android.context;

                if (context) {
                    const vibrator = context.getSystemService(context.VIBRATOR_SERVICE);
                    if (vibrator) {
                        const duration = this.getVibrationDuration(type);
                        if (VibratorManager.isVibratorManager) {
                            const vibratorManager = vibrator as any;
                            vibratorManager.vibrate(
                                android.os.VibrationEffect.createOneShot(
                                    duration,
                                    android.os.VibrationEffect.DEFAULT_AMPLITUDE
                                )
                            );
                        } else {
                            (vibrator as any).vibrate(duration);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error vibrating:', error);
        }
    }

    private getVibrationDuration(type: NotificationType): number {
        switch (type) {
            case 'success':
                return 200; // ms
            case 'error':
                return 500; // ms
            case 'warning':
                return 300; // ms
            default:
                return 100; // ms
        }
    }

    private saveToHistory(notification: Notification) {
        const history = this.getHistory();
        history.unshift(notification);
        
        if (history.length > this.MAX_NOTIFICATIONS) {
            history.pop();
        }
        
        ApplicationSettings.setString(this.NOTIFICATIONS_KEY, JSON.stringify(history));
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    public getNotificationColor(type: NotificationType): string {
        switch (type) {
            case 'success':
                return Colors.Success;
            case 'error':
                return Colors.Error;
            case 'warning':
                return Colors.Warning;
            default:
                return 'bg-blue-500';
        }
    }

    public getNotificationIcon(type: NotificationType): string {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✗';
            case 'warning':
                return '⚠';
            default:
                return 'ℹ';
        }
    }
}
