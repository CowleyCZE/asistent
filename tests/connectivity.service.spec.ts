import { ConnectivityService } from '../app/services/connectivity.service';

describe('ConnectivityService', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('checkNow hlásí offline a po obnově vyvolá connectionRestored', async () => {
        const svc = new ConnectivityService(() => Promise.resolve(false), 1000);
        expect(await svc.checkNow()).toBe(false);
        expect(svc.isOnline()).toBe(false);

        const restored = jest.fn();
        svc.on('connectionRestored', restored);

        (svc as any).checkFn = () => Promise.resolve(true);
        expect(await svc.checkNow()).toBe(true);
        expect(svc.isOnline()).toBe(true);
        expect(restored).toHaveBeenCalledTimes(1);
    });

    it('nevyvolá connectionRestored při první úspěšné kontrole', async () => {
        const svc = new ConnectivityService(() => Promise.resolve(true));
        const restored = jest.fn();
        svc.on('connectionRestored', restored);
        await svc.checkNow();
        expect(restored).not.toHaveBeenCalled();
    });

    it('opakovaná ztráta a obnova připojení vyvolá událost víckrát', async () => {
        const svc = new ConnectivityService(() => Promise.resolve(false), 1000);
        await svc.checkNow(); // offline
        const restored = jest.fn();
        svc.on('connectionRestored', restored);

        (svc as any).checkFn = () => Promise.resolve(true);
        await svc.checkNow();
        (svc as any).checkFn = () => Promise.resolve(false);
        await svc.checkNow();
        (svc as any).checkFn = () => Promise.resolve(true);
        await svc.checkNow();

        expect(restored).toHaveBeenCalledTimes(2);
    });

    it('startMonitoring periodicky kontroluje připojení', () => {
        jest.useFakeTimers();
        const checkFn = jest.fn(() => Promise.resolve(true));
        const svc = new ConnectivityService(checkFn, 1000);
        svc.startMonitoring();
        expect(checkFn).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(3000);
        expect(checkFn).toHaveBeenCalledTimes(4);

        svc.stopMonitoring();
        jest.advanceTimersByTime(3000);
        expect(checkFn).toHaveBeenCalledTimes(4);
    });

    it('dispose zastaví monitorování', () => {
        jest.useFakeTimers();
        const checkFn = jest.fn(() => Promise.resolve(true));
        const svc = new ConnectivityService(checkFn, 1000);
        svc.startMonitoring();
        svc.dispose();
        jest.advanceTimersByTime(5000);
        expect(checkFn).toHaveBeenCalledTimes(1);
    });

    it('výchozí kontrola použije fetch', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        const svc = new ConnectivityService();
        expect(await svc.checkNow()).toBe(true);

        (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
        expect(await svc.checkNow()).toBe(false);
        expect(svc.isOnline()).toBe(false);
    });
});
