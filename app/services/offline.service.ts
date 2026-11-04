import { ApplicationSettings, knownFolders } from '@nativescript/core';
import { StorageKeys } from '../utils/constants';
import { IdGenerator } from '../utils/id-generator';

export interface OfflineCommand {
    id: string;
    command: string;
    actionName: string;
    actionType: string;
    actionUrl?: string;
    actionTaskName?: string;
    timestamp: number;
    attempts: number;
    priority?: number;
    lastAttempt?: number;
}

export interface OfflineStats {
    totalQueued: number;
    totalFailed: number;
    totalProcessed: number;
}

export class OfflineService {
    private readonly OFFLINE_QUEUE_KEY = StorageKeys.OfflineQueue;
    private readonly OFFLINE_STATS_KEY = StorageKeys.OfflineStats;
    private readonly MAX_QUEUE_SIZE = 100;
    private readonly MAX_ATTEMPTS = 3;

    /**
     * Add command to offline queue.
     * @param priority Priorita příkazu (vyšší = dřív zpracováno, výchozí 0)
     */
    public queueCommand(
        command: string,
        actionName: string,
        actionType: string,
        actionUrl?: string,
        actionTaskName?: string,
        priority: number = 0
    ): void {
        const queue = this.getQueue();
        
        const newEntry: OfflineCommand = {
            id: IdGenerator.generate(),
            command,
            actionName,
            actionType,
            actionUrl,
            actionTaskName,
            timestamp: Date.now(),
            attempts: 0,
            priority
        };

        queue.push(newEntry);

        // Limit queue size
        if (queue.length > this.MAX_QUEUE_SIZE) {
            queue.shift();
        }

        this.saveQueue(queue);
        this.updateStats();
    }

    /**
     * Get all queued commands
     */
    public getQueue(): OfflineCommand[] {
        const queueJson = ApplicationSettings.getString(this.OFFLINE_QUEUE_KEY);
        if (queueJson) {
            try {
                return JSON.parse(queueJson);
            } catch (e) {
                console.error('Error parsing offline queue:', e);
                return [];
            }
        }
        return [];
    }

    /**
     * Get pending commands (not yet processed)
     */
    public getPendingCommands(): OfflineCommand[] {
        return this.getQueue().filter(cmd => cmd.attempts < this.MAX_ATTEMPTS);
    }

    /**
     * Get failed commands (max attempts reached)
     */
    public getFailedCommands(): OfflineCommand[] {
        return this.getQueue().filter(cmd => cmd.attempts >= this.MAX_ATTEMPTS);
    }

    /**
     * Process next command in queue.
     * Priority queue – nejdřív se zpracují příkazy s nejvyšší prioritou,
     * při shodě priorit platí FIFO (podle času zařazení).
     */
    public async processNextCommand(
        executeWebhook: (url: string) => Promise<boolean>,
        executeTasker: (taskName: string) => boolean
    ): Promise<boolean> {
        const queue = this.getQueue();
        const pending = queue
            .filter(cmd => cmd.attempts < this.MAX_ATTEMPTS)
            .sort((a, b) => ((b.priority ?? 0) - (a.priority ?? 0)) || (a.timestamp - b.timestamp));
        if (pending.length === 0) {
            return false;
        }

        const command = pending[0];
        command.attempts++;
        command.lastAttempt = Date.now();

        try {
            let success = false;

            if (command.actionType === 'webhook' && command.actionUrl) {
                success = await executeWebhook(command.actionUrl);
            } else if (command.actionType === 'tasker' && command.actionTaskName) {
                success = executeTasker(command.actionTaskName);
            }

            if (success) {
                // Remove from queue on success
                this.removeCommand(command.id);
                this.updateStats('processed');
            } else {
                // Update queue with incremented attempts
                this.saveQueue(pending);
                this.updateStats('failed');
            }

            return success;
        } catch (error) {
            console.error('Error processing offline command:', error);
            command.attempts++;
            this.saveQueue(pending);
            this.updateStats('failed');
            return false;
        }
    }

    /**
     * Process all pending commands
     */
    public async processAllCommands(
        executeWebhook: (url: string) => Promise<boolean>,
        executeTasker: (taskName: string) => boolean
    ): Promise<{ processed: number; failed: number }> {
        let processed = 0;
        let failed = 0;

        while (this.getPendingCommands().length > 0) {
            const success = await this.processNextCommand(executeWebhook, executeTasker);
            if (success) {
                processed++;
            } else {
                failed++;
            }
        }

        return { processed, failed };
    }

    /**
     * Remove command from queue
     */
    public removeCommand(id: string): boolean {
        const queue = this.getQueue();
        const index = queue.findIndex(cmd => cmd.id === id);

        if (index !== -1) {
            queue.splice(index, 1);
            this.saveQueue(queue);
            return true;
        }
        return false;
    }

    /**
     * Clear all queued commands
     */
    public clearQueue(): void {
        ApplicationSettings.remove(this.OFFLINE_QUEUE_KEY);
    }

    /**
     * Get offline statistics
     */
    public getStats(): OfflineStats {
        const statsJson = ApplicationSettings.getString(this.OFFLINE_STATS_KEY);
        if (statsJson) {
            try {
                return JSON.parse(statsJson);
            } catch (e) {
                console.error('Error parsing offline stats:', e);
                return this.getDefaultStats();
            }
        }
        return this.getDefaultStats();
    }

    /**
     * Check if offline mode is active (has queued commands)
     */
    public isOfflineModeActive(): boolean {
        return this.getQueue().length > 0;
    }

    /**
     * Get count of queued commands
     */
    public getQueueCount(): number {
        return this.getQueue().length;
    }

    /**
     * Export queue to file for debugging
     */
    public async exportQueue(): Promise<string> {
        const queue = this.getQueue();
        const documents = knownFolders.documents();
        const file = documents.getFile('offline_queue.json');
        await file.writeText(JSON.stringify(queue, null, 2));
        return file.path;
    }

    /**
     * Requeue failed command
     */
    public requeueCommand(id: string): boolean {
        const queue = this.getQueue();
        const index = queue.findIndex(cmd => cmd.id === id);

        if (index !== -1) {
            queue[index].attempts = 0;
            queue[index].lastAttempt = undefined;
            this.saveQueue(queue);
            return true;
        }
        return false;
    }

    /**
     * Requeue all failed commands
     */
    public requeueAllFailed(): number {
        const queue = this.getQueue();
        let requeued = 0;

        for (const cmd of queue) {
            if (cmd.attempts >= this.MAX_ATTEMPTS) {
                cmd.attempts = 0;
                cmd.lastAttempt = undefined;
                requeued++;
            }
        }

        this.saveQueue(queue);
        return requeued;
    }

    private saveQueue(queue: OfflineCommand[]): void {
        ApplicationSettings.setString(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }

    private updateStats(type?: 'processed' | 'failed'): void {
        const stats = this.getStats();
        if (type === 'processed') {
            stats.totalProcessed++;
        } else if (type === 'failed') {
            stats.totalFailed++;
        } else {
            // Initial count
            stats.totalQueued = this.getQueue().length;
        }
        ApplicationSettings.setString(this.OFFLINE_STATS_KEY, JSON.stringify(stats));
    }

    private getDefaultStats(): OfflineStats {
        return {
            totalQueued: 0,
            totalFailed: 0,
            totalProcessed: 0
        };
    }
}
