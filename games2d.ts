//// copyright: AGPLv3 or later

export namespace Games2d {
    // Detect if our PWA is installed on user's device
    export function isInstalled() {
        return (window.navigator as any).standalone == true ||
            window.matchMedia('(display-mode: standalone)').matches ||
            document.referrer.includes('android-app://')
    }
    export function vibrate(pattern: number | number[]) {
        if (isInstalled()) {
            window.navigator.vibrate(pattern)
        }
    }

    export function preload(scene: Phaser.Scene) {
        // icons from https://opengameart.org/content/game-icons
        scene.load.spritesheet('games2d-white-icons', '../assets/white_icons.png', {
            frameWidth: 100,
            frameHeight: 100
        })
    }

    type Games2dMenuConfig = {
        scene: Phaser.Scene
    }
    export class Menu extends Phaser.GameObjects.GameObject {
        private config: Games2dMenuConfig;
        private icons: { [key: string]: Phaser.GameObjects.Sprite };
        private mute: boolean;
        private volume: number;
        private paused: boolean;
        private fullscreen: boolean;
        private readonly storageKey = 'games2d-menu';
        volumeText: Phaser.GameObjects.Text;
        lowerVolumeEvent: Phaser.Time.TimerEvent;
        raiseVolumeEvent: Phaser.Time.TimerEvent;
        constructor(config: Games2dMenuConfig) {
            super(config.scene, "games2d menu")
            config.scene.add.existing(this)

            this.config = config

            this.create()
        }


        public isMute(): boolean {
            return this.mute
        }
        public playSound(sound: Phaser.Sound.BaseSound) {
            if (this.isMute()) {
                return
            }
            if (this.volume <= 0.0001) {
                return
            }
            sound.play('', { volume: this.volume })
        }
        public isPaused(): boolean {
            return this.paused
        }
        public isFullscreen(): boolean {
            return this.fullscreen
        }

        private saveData() {
            let obj = {
                paused: this.paused,
                fullscreen: this.fullscreen,
                mute: this.mute,
                volume: this.volume
            }
            localStorage.setItem(this.storageKey, JSON.stringify(obj))
        }

        private loadData() {
            let obj;
            try {
                obj = JSON.parse(localStorage.getItem(this.storageKey) || '')
            } catch {
            }
            if (obj) {
                this.fullscreen = obj.fullscreen
                if (typeof (obj.volume) !== 'undefined') {
                    this.volume = obj.volume
                } else {
                    this.volume = 0.3
                }
                this.mute = obj.mute
            } else {
                this.paused = false
                this.fullscreen = false
                this.mute = false
                this.config.scene.sound.mute = false
                this.volume = 0.3
            }
        }

        private updateVolumeText() {
            if (this.mute) {
                this.volumeText.text = "mute"
            } else {
                let n = this.volume * 100
                n = Math.round(n)
                this.volumeText.text = n.toString() + "%"
            }
        }

        private modifyVolumeBy(d: number) {
            this.volume = Phaser.Math.Clamp(this.volume + d, 0, 1)
            this.updateVolumeText()
            this.saveData()
        }

        private toggleMute() {
            this.mute = !this.mute
            this.config.scene.sound.mute = this.mute
            if (this.mute) {
                this.icons['mute'].setVisible(false)
                this.icons['mute'].disableInteractive()
                this.icons['unmute'].setInteractive()
                this.icons['unmute'].setVisible(true)
            } else {
                this.icons['mute'].setVisible(true)
                this.icons['mute'].setInteractive()
                this.icons['unmute'].disableInteractive()
                this.icons['unmute'].setVisible(false)
            }
            this.updateVolumeText()
            this.saveData()
        }

        private togglePause() {
            this.paused = !this.paused
            if (this.paused) {
                this.icons['pause'].setVisible(false)
                this.icons['pause'].disableInteractive()
                this.icons['play'].setInteractive()
                this.icons['play'].setVisible(true)
            } else {
                this.icons['pause'].setVisible(true)
                this.icons['pause'].setInteractive()
                this.icons['play'].disableInteractive()
                this.icons['play'].setVisible(false)
            }
            this.saveData()
        }

        private toggleFullscreen() {
            if (this.fullscreen) {
                this.icons['fullscreen_on'].setVisible(true)
                this.icons['fullscreen_on'].setInteractive()
                this.icons['fullscreen_off'].setVisible(false)
                this.icons['fullscreen_off'].disableInteractive()
                this.config.scene.scale.stopFullscreen()
                this.fullscreen = false
            } else {
                this.icons['fullscreen_on'].setVisible(false)
                this.icons['fullscreen_on'].disableInteractive()
                this.icons['fullscreen_off'].setVisible(true)
                this.icons['fullscreen_off'].setInteractive()
                this.config.scene.scale.startFullscreen()
                this.fullscreen = true
            }
            this.saveData()
        }

        private restart() {
            this.paused = false
            this.saveData()
            this.config.scene.scene.restart()
        }

        private create() {
            this.loadData()

            if (this.fullscreen) {
                // xojoc(#3): fixme: user was in fullscreen
                //        last time. If our PWA is installed
                //        we should find a way to go fullscreen.
                //        For now just reset the property to false.

                this.fullscreen = false
                this.saveData()
            }


            let x = 0

            this.icons = {}

            let sprite = (x: number, idx: number): Phaser.GameObjects.Sprite => {
                let icon = this.config.scene.add.sprite(x, 0, 'games2d-white-icons', idx)
                icon.setInteractive()
                icon.setAlpha(0.5)
                icon.setOrigin(0, 0)
                icon.setVisible(true)
                icon.input.hitArea = new Phaser.Geom.Rectangle(10, 10, 80, 80)
                icon.setScale(0.9)
                icon.setScrollFactor(0, 0)
                return icon
            }

            this.icons['minus'] = sprite(x, 19 * 6 + 2)
            this.icons['minus'].on('pointerdown', () => {
                this.modifyVolumeBy(-0.1)
                this.lowerVolumeEvent = this.config.scene.time.addEvent({
                    delay: 200,
                    callback: () => { this.modifyVolumeBy(-0.1) }, callbackScope: this, loop: true
                });
            })
            this.icons['minus'].on('pointerup', () => {
                this.lowerVolumeEvent.destroy()
            })


            x += 85


            this.volumeText = this.config.scene.add.text(x + 75, 30, '')
                .setFontSize(30)
                .setAlpha(0.5)
                .setFontStyle('bold')
                .setOrigin(1, 0)
                .setScrollFactor(0, 0)

            this.updateVolumeText()


            x += 70


            this.icons['plus'] = sprite(x, 9 * 6 + 2)
            this.icons['plus'].on('pointerdown', () => {
                this.modifyVolumeBy(0.1)
                this.raiseVolumeEvent = this.config.scene.time.addEvent({
                    delay: 200,
                    callback: () => { this.modifyVolumeBy(0.1) }, callbackScope: this, loop: true
                });
            })
            this.icons['plus'].on('pointerup', () => {
                this.raiseVolumeEvent.destroy()
            })

            x += 80

            this.icons['fullscreen_on'] = sprite(x, 9 * 6 + 3)
            this.icons['fullscreen_on'].on('pointerup', () => {
                this.toggleFullscreen()
            })


            this.icons['fullscreen_off'] = sprite(x, 11 * 6 + 1)
            this.icons['fullscreen_off'].on('pointerup', () => {
                this.toggleFullscreen()
            })


            x += 95

            this.icons['home'] = sprite(x, 16 * 6 + 3)
            this.icons['home'].on('pointerup', () => {
                window.location.href = '../'
            })


            this.icons['fullscreen_on'].setVisible(!this.fullscreen)
            this.icons['fullscreen_off'].setVisible(this.fullscreen)

            this.config.scene.input.keyboard.on('keydown', (event: any) => {
                switch (event.key) {
                    case "r":
                    case "n":
                        this.restart()
                        break
                    case "m":
                        this.toggleMute()
                        break
                    case "p":
                        this.togglePause()
                        break
                    case "f":
                        this.toggleFullscreen()
                        break
                }
            })
        }
    }
}
