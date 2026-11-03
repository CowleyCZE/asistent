/**
 * Centralizované konstanty aplikace.
 *
 * Nahrazuje "magic strings" rozeseté po jednotlivých službách –
 * všechny klíče úložiště a UI barvy mají jediné místo definice.
 */
export const StorageKeys = {
    // Hlavní nastavení aplikace
    Settings: 'voice_assistant_settings_v2',
    LegacySettings: 'voice_assistant_settings', // starý formát před migrací na actions
    // Historie příkazů
    CommandHistory: 'command_history_v1',
    // Cache
    CachePrefix: 'cache_',
    // Offline fronta
    OfflineQueue: 'offline_queue_v1',
    OfflineStats: 'offline_stats_v1',
    // Notifikace
    Notifications: 'notifications_v1',
    NotificationSettings: 'notification_settings_v1',
    // Motiv
    ThemeSettings: 'theme_settings_v1'
} as const;

/** Tailwind CSS třídy barev použité v UI (notifikační a statistické barevné kódy). */
export const Colors = {
    Success: 'bg-green-500',
    SuccessHigh: 'bg-green-400',
    SuccessMedium: 'bg-yellow-500',
    Warning: 'bg-orange-500',
    Error: 'bg-red-500',
    Info: 'bg-blue-500'
} as const;

/** Běžné limity aplikace. */
export const Limits = {
    MaxHistoryItems: 100,
    MaxCacheSize: 50,
    MaxOfflineQueue: 100,
    MaxOfflineAttempts: 3,
    DefaultCacheTtlMs: 300000 // 5 minut
} as const;
