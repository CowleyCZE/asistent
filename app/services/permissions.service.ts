declare var android: any;
import { Application, AndroidApplication } from '@nativescript/core';

/** Správa oprávnění Android (mikrofon). */
export class PermissionsService {
    private static RECORD_AUDIO_PERMISSION = android.Manifest.permission.RECORD_AUDIO;

    /** Zjistí, zda je uděleno oprávnění k mikrofonu. */
    public async checkMicrophonePermission(): Promise<boolean> {
        if (Application.android) {
            const hasPermission = await this.checkPermission(PermissionsService.RECORD_AUDIO_PERMISSION);
            return hasPermission;
        }
        return false;
    }

    /** Vyžádá oprávnění k mikrofonu (systémový dialog).
     * @returns true, pokud bylo oprávnění uděleno. */
    public async requestMicrophonePermission(): Promise<boolean> {
        if (Application.android) {
            const granted = await this.requestPermission(PermissionsService.RECORD_AUDIO_PERMISSION);
            return granted;
        }
        return false;
    }

    private async checkPermission(permission: string): Promise<boolean> {
        const context = Application.android.context;
        const hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED ===
            android.support.v4.content.ContextCompat.checkSelfPermission(context, permission);
        return hasPermission;
    }

    private async requestPermission(permission: string): Promise<boolean> {
        return new Promise((resolve) => {
            const activity = Application.android.foregroundActivity;
            const REQUEST_CODE = 1234;

            const callback = (args: any) => {
                const requestCode = args.requestCode;
                const permissions = args.permissions;
                const grantResults = args.grantResults;

                if (requestCode === REQUEST_CODE) {
                    Application.android.off(AndroidApplication.activityRequestPermissionsEvent, callback);
                    if (grantResults.length > 0 && grantResults[0] === android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            };

            Application.android.on(AndroidApplication.activityRequestPermissionsEvent, callback);
            android.support.v4.app.ActivityCompat.requestPermissions(activity, [permission], REQUEST_CODE);
        });
    }
}