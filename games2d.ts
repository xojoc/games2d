//// copyright: AGPLv3 or later


export namespace Games2d {
    // Detect if our PWA is installed on user's device
    export function isInstalled() {
        return window.navigator.standalone == true ||
            window.matchMedia('(display-mode: standalone)').matches
    }
    export function vibrate(pattern: number | number[]) {
        if (isInstalled()) {
            window.navigator.vibrate(pattern)
        }
    }

    export function preload(scene: Phaser.Scene) {
        // icons from https://opengameart.org/content/game-icons
        scene.load.image('games2d-restart', '../assets/return.png')
        scene.load.image('games2d-pause', '../assets/pause.png')
        scene.load.image('games2d-play', '../assets/right.png')
        scene.load.image('games2d-mute', '../assets/musicOn.png')
        scene.load.image('games2d-unmute', '../assets/musicOff.png')
        scene.load.image('games2d-larger', '../assets/larger.png')
        scene.load.image('games2d-smaller', '../assets/smaller.png')
    }

    type Games2dMenuConfig = {
        scene: Phaser.Scene
    }
    export class Menu extends Phaser.GameObjects.GameObject {
        private config: Games2dMenuConfig;
        private icons: { [key: string]: Phaser.GameObjects.Sprite };
        private mute: boolean;
        private paused: boolean;
        private fullscreen: boolean;
        private readonly storageKey = 'games2d-menu';
        constructor(config: Games2dMenuConfig) {
            super(config.scene, "games2d menu")
            config.scene.add.existing(this)

            this.config = config

            this.create()
        }

        public isMute(): boolean {
            return this.mute
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
                this.paused = obj.paused
                this.fullscreen = obj.fullscreen
                this.mute = obj.mute
                this.config.scene.sound.mute = obj.mute
            } else {
                this.paused = false
                this.fullscreen = false
                this.mute = false
                this.config.scene.sound.mute = false
            }
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
                // xojoc: fixme: user was in fullscreen
                //        last time. If our PWA is installed
                //        we should find a way to go fullscreen.
                //        For now just reset the property to false.

                this.fullscreen = false
                this.saveData()
            }

            this.icons = {}

            this.icons['mute'] = this.config.scene.add.sprite(52, 12, 'games2d-mute')
            this.icons['mute'].on('pointerup', () => {
                this.toggleMute()
            })

            this.icons['unmute'] = this.config.scene.add.sprite(52, 12, 'games2d-unmute')
            this.icons['unmute'].on('pointerup', () => {
                this.toggleMute()
            })

            this.icons['pause'] = this.config.scene.add.sprite(130, 12, 'games2d-pause')
            this.icons['pause'].on('pointerup', () => {
                this.togglePause()
            })

            this.icons['play'] = this.config.scene.add.sprite(130, 12, 'games2d-play')
            this.icons['play'].on('pointerup', () => {
                this.togglePause()
            })

            this.icons['restart'] = this.config.scene.add.sprite(210, 12, 'games2d-restart')
            this.icons['restart'].on('pointerup', () => {
                this.restart()
            })

            this.icons['fullscreen_on'] = this.config.scene.add.sprite(290, 12, 'games2d-larger')
            this.icons['fullscreen_on'].on('pointerup', () => {
                this.toggleFullscreen()
            })


            this.icons['fullscreen_off'] = this.config.scene.add.sprite(290, 12, 'games2d-smaller')
            this.icons['fullscreen_off'].on('pointerup', () => {
                this.toggleFullscreen()
            })

            for (let icon of Object.values(this.icons)) {
                icon.setInteractive()
                icon.setAlpha(0.5)
                icon.setOrigin(0, 0)
                icon.setVisible(true)
            }

            this.icons['pause'].setVisible(!this.paused)
            this.icons['play'].setVisible(this.paused)
            this.icons['mute'].setVisible(!this.mute)
            this.icons['unmute'].setVisible(this.mute)
            this.icons['fullscreen_on'].setVisible(!this.fullscreen)
            this.icons['fullscreen_off'].setVisible(this.fullscreen)

            this.config.scene.input.keyboard.on('keydown', (event) => {
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





