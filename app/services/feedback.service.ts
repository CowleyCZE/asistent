import { knownFolders, path, File } from '@nativescript/core';

declare var android: any;
declare var java: any;
import { serviceRegistry } from './service-registry';

export class FeedbackService {
    private player: any;
    private readonly soundsPath: string;

    constructor() {
        this.player = new android.media.MediaPlayer();
        this.soundsPath = path.join(knownFolders.currentApp().path, 'assets', 'sounds');
        
        // Register for cleanup on app exit
        serviceRegistry.register(this);
    }

    public async playStartSound() {
        await this.playSound('start.mp3');
    }

    public async playStopSound() {
        await this.playSound('stop.mp3');
    }

    public async playErrorSound() {
        await this.playSound('error.mp3');
    }

    private async playSound(filename: string) {
        try {
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

    public dispose() {
        if (this.player) {
            this.player.release();
        }
    }
}