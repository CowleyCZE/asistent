import { Application } from '@nativescript/core';
import { TaskerService } from '../../app/services/tasker.service';

describe('TaskerService', () => {
    let service: TaskerService;

    beforeEach(() => {
        service = new TaskerService();
    });

    afterEach(() => {
        (Application as any).android = undefined;
        (global as any).android = undefined;
    });

    it('bez Androidu hlásí, že Tasker není nainstalován', () => {
        expect(service.isTaskerInstalled()).toBe(false);
        expect(service.executeTask('Ukol')).toBe(false);
    });

    it('hlásí false, když Tasker není nainstalován', () => {
        (Application as any).android = {
            context: {
                getPackageManager: () => ({
                    getPackageInfo: (pkg: string) => { throw new Error('not installed'); }
                })
            }
        };
        expect(service.isTaskerInstalled()).toBe(false);
    });

    it('detekuje nainstalovaný Tasker', () => {
        (Application as any).android = {
            context: {
                getPackageManager: () => ({
                    getPackageInfo: (pkg: string) => ({})
                })
            }
        };
        expect(service.isTaskerInstalled()).toBe(true);
    });

    it('executeTask odešle intent do Taskeru', () => {
        let lastIntent: any = null;
        (Application as any).android = {
            context: {
                getPackageManager: () => ({
                    getPackageInfo: (pkg: string) => ({})
                }),
                startActivity: (intent: any) => { lastIntent = intent; }
            }
        };
        const IntentCls: any = class {
            putExtra = jest.fn().mockReturnThis();
            addFlags = jest.fn().mockReturnThis();
        };
        IntentCls.FLAG_ACTIVITY_NEW_TASK = 1;
        (global as any).android = { content: { Intent: IntentCls } };

        expect(service.executeTask('MujUkol')).toBe(true);
        expect(lastIntent).not.toBeNull();
        expect(lastIntent.putExtra).toHaveBeenCalledWith('task_name', 'MujUkol');
        expect(lastIntent.addFlags).toHaveBeenCalled();
    });

    it('executeTask vrací false při chybě startActivity', () => {
        (Application as any).android = {
            context: {
                getPackageManager: () => ({
                    getPackageInfo: (pkg: string) => ({})
                }),
                startActivity: () => { throw new Error('boom'); }
            }
        };
        const IntentCls: any = class {
            putExtra = jest.fn().mockReturnThis();
            addFlags = jest.fn().mockReturnThis();
        };
        IntentCls.FLAG_ACTIVITY_NEW_TASK = 1;
        (global as any).android = { content: { Intent: IntentCls } };

        expect(service.executeTask('MujUkol')).toBe(false);
    });
});
