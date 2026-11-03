import { ApplicationSettings } from '@nativescript/core';
import { mockReset } from '../mocks/application-settings.mock';
import { CacheService } from '../../app/services/cache.service';

describe('CacheService', () => {
    let service: CacheService;

    beforeEach(() => {
        mockReset();
        service = new CacheService();
    });

    it('uloží a vrátí hodnotu', () => {
        service.set('klic', { a: 1 });
        expect(service.get('klic')).toEqual({ a: 1 });
        expect(service.has('klic')).toBe(true);
    });

    it('vrátí null pro neexistující klíč', () => {
        expect(service.get('neexistuje')).toBeNull();
        expect(service.has('neexistuje')).toBe(false);
    });

    it('expiruje záznam po uplynutí TTL', () => {
        const nowSpy = jest.spyOn(Date, 'now');
        const t0 = Date.now();
        service.set('kratke', 'data', 1000);
        nowSpy.mockReturnValue(t0 + 5000);
        expect(service.get('kratke')).toBeNull();
        expect(service.has('kratke')).toBe(false);
        nowSpy.mockRestore();
    });

    it('odstraní klíč pomocí remove', () => {
        service.set('x', 1);
        service.remove('x');
        expect(service.has('x')).toBe(false);
    });

    it('clearAll smaže jen cache klíče', () => {
        service.set('x', 1);
        ApplicationSettings.setString('jiny_klic', 'zustava');
        service.clearAll();
        expect(service.has('x')).toBe(false);
        expect(ApplicationSettings.getString('jiny_klic')).toBe('zustava');
    });

    it('getStats vrací velikost a klíče cache', () => {
        service.set('a', 1);
        service.set('b', 2);
        const stats = service.getStats();
        expect(stats.size).toBe(2);
        expect(stats.keys).toContain('a');
        expect(stats.keys).toContain('b');
    });

    it('respektuje maximální velikost cache', () => {
        for (let i = 0; i < 60; i++) {
            service.set('k' + i, i);
        }
        expect(service.getStats().size).toBeLessThanOrEqual(50);
    });

    it('ukládá a čte webhook cache', () => {
        service.setWebhookCache('https://example.com/hook', { ok: true });
        const cached = service.getWebhookCache('https://example.com/hook');
        expect(cached).not.toBeNull();
        expect(cached!.url).toBe('https://example.com/hook');
        expect(cached!.response).toEqual({ ok: true });
        service.clearWebhookCache('https://example.com/hook');
        expect(service.getWebhookCache('https://example.com/hook')).toBeNull();
    });

    it('clearWebhookCache bez URL smaže všechny webhook cache', () => {
        service.setWebhookCache('https://a.example.com', 1);
        service.setWebhookCache('https://b.example.com', 2);
        service.clearWebhookCache();
        expect(service.getWebhookCache('https://a.example.com')).toBeNull();
        expect(service.getWebhookCache('https://b.example.com')).toBeNull();
    });

    it('withCache použije fetcher jen při prvním volání', async () => {
        const fetcher = jest.fn().mockResolvedValue('data');
        const first = await service.withCache('wc', fetcher as any);
        const second = await service.withCache('wc', fetcher as any);
        expect(first).toBe('data');
        expect(second).toBe('data');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('withCache propaguje chybu a neukládá do cache', async () => {
        const fetcher = jest.fn().mockRejectedValue(new Error('fail'));
        await expect(service.withCache('err', fetcher as any)).rejects.toThrow('fail');
        expect(service.get('err')).toBeNull();
    });

    it('prefetch uloží data do cache', async () => {
        const fetcher = jest.fn().mockResolvedValue('prefetch-data');
        await service.prefetch('pf', fetcher as any);
        expect(service.get('pf')).toBe('prefetch-data');
    });
});
