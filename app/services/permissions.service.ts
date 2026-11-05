declare var android: any;
import { Application, AndroidApplication } from '@nativescript/core';

/** Správa oprávnění Android (mikrofon). */
export class PermissionsService {
    /** Timeout pro čekání na výsledek systémového dialogu (ms). */
    private readonly PERMISSION_TIMEOUT_MS = 30000;

    /**
     * Oprávnění k mikrofonu se řeší lazy – globální proměnná android
     * nemusí být dostupná v okamžiku importu modulu (statický
     * inicializátor by shodil celou aplikaci).
     */
    private getRecordAudioPermission(): string {
        return android.Manifest.permission.RECORD_AUDIO;
    }

    /** Zjistí, zda je uděleno oprávnění k mikrofonu. */
    public async checkMicrophonePermission(): Promise<boolean> {
        if (Application.android) {
            return await this.checkPermission(this.getRecordAudioPermission());
        }
        return false;
    }

    /**
     * Vyžádá oprávnění k mikrofonu (systémový dialog).
     * @returns true, pokud bylo oprávnění uděleno.
     */
    public async requestMicrophonePermission(): Promise<boolean> {
        if (Application.android) {
            return await this.requestPermission(this.getRecordAudioPermission());
        }
        return false;
    }

    private async checkPermission(permission: string): Promise<boolean> {
        const context = Application.android?.context;
        const g: any = global;
        if (!context) {
            return false;
        }

        const PERMISSION_GRANTED = 0;
        try {
            // Preferujeme Context.checkSelfPermission (API 23+), fallback na androidx
            // a nakonec na starší support knihovnu.
            if (typeof context.checkSelfPermission === 'function') {
                return context.checkSelfPermission(permission) === PERMISSION_GRANTED;
            }
            const contextCompat = g.androidx?.core?.content?.ContextCompat
                ?? g.android?.support?.v4?.content?.ContextCompat;
            if (contextCompat) {
                return contextCompat.checkSelfPermission(context, permission) === PERMISSION_GRANTED;
            }
        } catch (error) {
            console.error('Chyba při kontrole oprávnění:', error);
        }
        return false;
    }

    private async requestPermission(permission: string): Promise<boolean> {
        const g: any = global;
        const activity = Application.android?.foregroundActivity ?? Application.android?.context;
        if (!activity) {
            return false;
        }

        const REQUEST_CODE = 1234;

        return new Promise((resolve) => {
            let settled = false;
            let timer: any;

            // Jednotné ukončení: vždy odregistruje listener a zruší timer,
            // aby neprotékaly (Promise bez timeoutu dřív visel navždy
            // při „Don't ask again" nebo přerušeném dialogu).
            const finish = (granted: boolean) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timer !== undefined) {
                    clearTimeout(timer);
                    timer = undefined;
                }
                Application.android.off(AndroidApplication.activityRequestPermissionsEvent, callback);
                resolve(granted);
            };

            const callback = (args: any) => {
                const requestCode = args.requestCode;
                const grantResults = args.grantResults;

                if (requestCode === REQUEST_CODE) {
                    if (grantResults.length > 0 && grantResults[0] === 0 /* PERMISSION_GRANTED */) {
                        finish(true);
                    } else {
                        finish(false);
                    }
                }
            };

            Application.android.on(AndroidApplication.activityRequestPermissionsEvent, callback);

            // Timeout – systémový dialog nemusí nikdy vrátit výsledek
            // („Don't ask again", dialog přerušen jinou aktivitou).
            timer = setTimeout(() => {
                console.warn('Vyžádání oprávnění vypršelo (timeout) – dialog nevrátil výsledek.');
                finish(false);
            }, this.PERMISSION_TIMEOUT_MS);

            try {
                // androidx ActivityCompat, fallback na starší support knihovnu
                // a nakonec na requestPermissions přímo na aktivitě (API 23+).
                const compat = g.androidx?.core?.app?.ActivityCompat
                    ?? g.android?.support?.v4?.app?.ActivityCompat;
                if (compat) {
                    compat.requestPermissions(activity, [permission], REQUEST_CODE);
                } else if (typeof activity.requestPermissions === 'function') {
                    activity.requestPermissions([permission], REQUEST_CODE);
                } else {
                    finish(false);
                }
            } catch (error) {
                console.error('Chyba při vyžádání oprávnění:', error);
                finish(false);
            }
        });
    }
}

