import { mockReset } from '../mocks/application-settings.mock';
import { OfflineService, OfflineCommand } from '../../app/services/offline.service';

describe('OfflineService', () => {
    let service: OfflineService;

    beforeEach(() => {
        mockReset();
        service = new OfflineService();
    });

    it('queueCommand přidá příkaz do fronty', () => {
        service.queueCommand('rozsvit svetlo', 'Světlo', 'webhook', 'https://example.com/hook');
        const queue = service.getQueue();
        expect(queue.length).toBe(1);
        expect(queue[0].command).toBe('rozsvit svetlo');
        expect(queue[0].actionName).toBe('Světlo');
        expect(queue[0].actionType).toBe('webhook');
        expect(queue[0].actionUrl).toBe('https://example.com/hook');
        expect(queue[0].attempts).toBe(0);
        expect(service.getQueueCount()).toBe(1);
        expect(service.isOfflineModeActive()).toBe(true);
    });

    it('prázdná fronta znamená neaktivní offline režim', () => {
        expect(service.isOfflineModeActive()).toBe(false);
        expect(service.getQueueCount()).toBe(0);
    });

    it('fronta je omezena na 100 položek', () => {
        for (let i = 0; i < 105; i++) {
            service.queueCommand('cmd' + i, 'A', 'webhook', 'https://example.com/hook');
        }
        expect(service.getQueueCount()).toBe(100);
    });

    it('processNextCommand úspěšně zpracuje webhook', async () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        const webhook = jest.fn().mockResolvedValue(true);
        const tasker = jest.fn();
        const ok = await service.processNextCommand(webhook as any, tasker as any);
        expect(ok).toBe(true);
        expect(webhook).toHaveBeenCalledWith('https://example.com/hook');
        expect(service.getQueueCount()).toBe(0);
        expect(service.getStats().totalProcessed).toBe(1);
    });

    it('processNextCommand zpracuje tasker příkaz', async () => {
        service.queueCommand('cmd', 'A', 'tasker', undefined, 'MujUkol');
        const webhook = jest.fn();
        const tasker = jest.fn().mockReturnValue(true);
        const ok = await service.processNextCommand(webhook as any, tasker as any);
        expect(ok).toBe(true);
        expect(tasker).toHaveBeenCalledWith('MujUkol');
    });

    it('neúspěšný příkaz zvyšuje počet pokusů', async () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        const webhook = jest.fn().mockResolvedValue(false);
        await service.processNextCommand(webhook as any, jest.fn() as any);
        const queue = service.getQueue();
        expect(queue.length).toBe(1);
        expect(queue[0].attempts).toBe(1);
        expect(service.getStats().totalFailed).toBe(1);
    });

    it('výjimka započítá jen jeden pokus (žádné dvojité navyšování)', async () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        const webhook = jest.fn().mockRejectedValue(new Error('boom'));
        await service.processNextCommand(webhook as any, jest.fn() as any);
        const queue = service.getQueue();
        expect(queue.length).toBe(1);
        expect(queue[0].attempts).toBe(1);
        // Příkaz zůstává ve frontě (neztrácí se) a lze ho zkusit znovu
        expect(service.getPendingCommands().length).toBe(1);
    });

    it('příkaz po 3 pokusech je považován za selhaný', async () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        const webhook = jest.fn().mockResolvedValue(false);
        const tasker = jest.fn();
        const result = await service.processAllCommands(webhook as any, tasker as any);
        expect(result.processed).toBe(0);
        expect(result.failed).toBe(3);
        expect(service.getFailedCommands().length).toBe(1);
        expect(service.getPendingCommands().length).toBe(0);
    });

    it('processAllCommands zpracuje frontu kombinovaně', async () => {
        service.queueCommand('ok cmd', 'A', 'webhook', 'https://example.com/ok');
        service.queueCommand('fail cmd', 'B', 'webhook', 'https://example.com/fail');
        const webhook = jest.fn((url: string) =>
            Promise.resolve(url === 'https://example.com/ok')
        );
        const result = await service.processAllCommands(webhook as any, jest.fn() as any);
        expect(result.processed).toBe(1);
        expect(result.failed).toBe(3);
        expect(service.getQueueCount()).toBe(1);
    });

    it('requeueAllFailed resetuje selhané příkazy', async () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        const webhook = jest.fn().mockResolvedValue(false);
        await service.processAllCommands(webhook as any, jest.fn() as any);
        expect(service.getFailedCommands().length).toBe(1);
        const requeued = service.requeueAllFailed();
        expect(requeued).toBe(1);
        expect(service.getPendingCommands().length).toBe(1);
        expect(service.getQueue()[0].attempts).toBe(0);
    });

    it('requeueCommand resetuje konkrétní příkaz', () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        const id = service.getQueue()[0].id;
        const queue: OfflineCommand[] = service.getQueue();
        queue[0].attempts = 3;
        expect(service.requeueCommand(id)).toBe(true);
        expect(service.getQueue()[0].attempts).toBe(0);
        expect(service.requeueCommand('neexistujici')).toBe(false);
    });

    it('removeCommand odstraní příkaz', () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        const id = service.getQueue()[0].id;
        expect(service.removeCommand(id)).toBe(true);
        expect(service.getQueueCount()).toBe(0);
        expect(service.removeCommand(id)).toBe(false);
    });

    it('clearQueue vyprázdní frontu', () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        service.clearQueue();
        expect(service.getQueueCount()).toBe(0);
    });

    it('getStats vrací výchozí statistiky', () => {
        expect(service.getStats()).toEqual({ totalQueued: 0, totalFailed: 0, totalProcessed: 0 });
    });

    it('queueCommand uloží prioritu příkazu', () => {
        service.queueCommand('nizka', 'A', 'webhook', 'https://example.com/low');
        service.queueCommand('vysoka', 'B', 'webhook', 'https://example.com/high', undefined, 10);
        expect(service.getQueue()[0].priority).toBe(0);
        expect(service.getQueue()[1].priority).toBe(10);
    });

    it('processNextCommand zpracuje nejdřív příkaz s vyšší prioritou', async () => {
        service.queueCommand('nizka', 'A', 'webhook', 'https://example.com/low');
        service.queueCommand('vysoka', 'B', 'webhook', 'https://example.com/high', undefined, 5);
        const webhook = jest.fn().mockResolvedValue(true);
        await service.processNextCommand(webhook as any, jest.fn() as any);
        expect(webhook).toHaveBeenCalledWith('https://example.com/high');
        expect(service.getQueueCount()).toBe(1);
        expect(service.getQueue()[0].command).toBe('nizka');
    });

    it('při shodě priorit platí FIFO', async () => {
        service.queueCommand('prvni', 'A', 'webhook', 'https://example.com/1');
        service.queueCommand('druhy', 'B', 'webhook', 'https://example.com/2');
        const webhook = jest.fn().mockResolvedValue(true);
        await service.processNextCommand(webhook as any, jest.fn() as any);
        expect(webhook).toHaveBeenCalledWith('https://example.com/1');
    });

    it('exportQueue zapíše frontu do souboru', async () => {
        service.queueCommand('cmd', 'A', 'webhook', 'https://example.com/hook');
        const path = await service.exportQueue();
        expect(path).toContain('offline_queue.json');
    });
});

