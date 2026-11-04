import { knownFolders, path, File } from '@nativescript/core';

declare var android: any;
declare var java: any;
import { serviceRegistry } from './service-registry';

/** Zvuková zpětná vazba (Android MediaPlayer) pro start/stop/error. */
export class FeedbackService {
    private player: any;
    private readonly soundsPath: string;

    constructor() {
        // MediaPlayer vytváříme v try/catch – přímé volání v konstruktoru
        // mimo Android by shodilo celou aplikaci.
        try {
            const g: any = global;
            if (g.android) {
                this.player = new android.media.MediaPlayer();
            }
        } catch (error) {
            console.error('Chyba při vytváření MediaPlayer:', error);
        }
        this.soundsPath = path.join(knownFolders.currentApp().path, 'assets', 'sounds');
        
        // Register for cleanup on app exit
        serviceRegistry.register(this);
    }

    /** Přehraje zvuk začátku poslechu (start.mp3). */
    public async playStartSound() {
        await this.playSound('start.mp3');
    }

    /** Přehraje zvuk ukončení poslechu (stop.mp3). */
    public async playStopSound() {
        await this.playSound('stop.mp3');
    }

    /** Přehraje chybový zvuk (error.mp3). */
    public async playErrorSound() {
        await this.playSound('error.mp3');
    }

    private async playSound(filename: string) {
        try {
            // Lazy vytvoření přehrávače, pokud v konstruktoru selhalo
            if (!this.player) {
                const g: any = global;
                if (g.android) {
                    this.player = new android.media.MediaPlayer();
                }
            }
            if (!this.player) {
                console.warn('Přehrávač zvuků není dostupný (mimo Android).');
                return;
            }

            const soundPath = path.join(this.soundsPath, filename);
            
            // Zastavíme a uvolníme předchozí přehrávač
            if (this.player.isPlaying()) {
                this.player.stop();
            }
            this.player.reset();
            
            // Načteme zvukový soubor
            const file = File.fromPath(soundPath);
            const fd = new java.io.FileInputStream(file.path);
            this.player.setDataSource(fd.getFD());
            
            // Připravíme přehrávač
            await new Promise<void>((resolve, reject) => {
                this.player.setOnPreparedListener(new android.media.MediaPlayer.OnPreparedListener({
                    onPrepared: (mp: any) => {
                        resolve();
                    }
                }));
                
                this.player.setOnErrorListener(new android.media.MediaPlayer.OnErrorListener({
                    onError: (mp: any, what: any, extra: any) => {
                        console.error('Chyba při přehrávání zvuku:', filename, what, extra);
                        reject(new Error(`Chyba přehrávání: ${what}`));
                        return true;
                    }
                }));
                
                this.player.prepareAsync();
            });
            
            // Přehrajeme zvuk
            this.player.start();
            
            // Počkáme na dokončení
            await new Promise<void>((resolve) => {
                this.player.setOnCompletionListener(new android.media.MediaPlayer.OnCompletionListener({
                    onCompletion: (mp: any) => {
                        console.log('Zvuk dokončen:', filename);
                        resolve();
                    }
                }));
            });
            
        } catch (error) {
            console.error('Chyba při přehrávání zvuku:', filename, error);
        }
    }

    /** Uvolní prostředky přehrávače (voláno při ukončení aplikace). */
    public dispose() {
        if (this.player) {
            this.player.release();
        }
    }
}