//// copyright: AGPLv3 or later

import { Games2d } from '../games2d.js'

const ScreenWidth = 900
const ScreenHeight = 900
const FPS = 40

class Game extends Phaser.Game {
    constructor() {
        const config: Phaser.Types.Core.GameConfig = {
            title: "Twin squares - games2d",
            parent: "content",
            width: ScreenWidth,
            height: ScreenHeight,
            scene: [Preloader, GameScene],
            fps: {
                target: FPS,
                forceSetTimeOut: true
            },
            scale: {
                parent: "content",
                expandParent: true,
                autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
                mode: Phaser.Scale.FIT,
                fullscreenTarget: "content",
            },
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false,
                },
            }
        }
        super(config)
    }
}

class Preloader extends Phaser.Scene {
    constructor() { super("Preloader") }

    preload() {
        Games2d.preload(this)

        this.load.audio('applause', '../assets/applause.ogg')
        this.load.audio('lose', '../assets/lose.ogg')
    }

    create() {
        this.scene.start("GameScene")
    }
}

const color1 = 0xCD5C5C
const color2 = 0xBDDA57
const backgroundColor1 = 0x004225
const backgroundColor2 = 0x243757 // 0x2b2b2b
const backgroundColors = [0x004225, 0x243757, 0x3b1420, 0x2b2b2b, 0x433D54]

enum GameState {
    Playing,
    GameOver
}

class Square extends Phaser.GameObjects.Rectangle {

}

class GameScene extends Phaser.Scene {
    state: GameState
    score: number
    backgroundColor: any
    highestScore: number
    highScoreBeatenSoundPlayed: boolean
    scoreText: Phaser.GameObjects.Text
    menu: Games2d.Menu
    gameOverDuration: number
    applauseSound: Phaser.Sound.BaseSound
    loseSound: Phaser.Sound.BaseSound
    square1: Square
    square2: Square
    frameLag: number

    constructor() {
        super('GameScene')
    }


    // fixme: change with a tween?
    changeBackgroundColor() {
        while (true) {
            let b = Phaser.Math.RND.pick(backgroundColors)
            if (b != this.backgroundColor) {
                this.cameras.main.setBackgroundColor(b)
                this.backgroundColor = b
                break
            }
        }
    }

    increaseScore(s: number = 1) {
        this.score += s
        if (this.score > this.highestScore) {
            this.highestScore = this.score
            this.saveData()
            if (!this.highScoreBeatenSoundPlayed) {
                if (!this.menu.isMute()) {
                    // fixme: particle emitter for score
                    this.applauseSound.play()
                    this.highScoreBeatenSoundPlayed = true
                }
            }
        }
        this.scoreText.text = `Score: ${this.score}/${this.highestScore}`
    }

    saveData() {
        let obj = {
            highestScore: this.highestScore,
        }
        localStorage.setItem('twin_squares', JSON.stringify(obj))
    }

    loadData() {
        let obj
        try {
            obj = JSON.parse(localStorage.getItem('twin_squares') || '')
        } catch {
        }
        if (obj) {
            this.highestScore = obj.highestScore
        } else {
            this.highestScore = 0
        }
        if (!this.highestScore) {
            this.highestScore = 0
        }
    }


    create() {
        this.loadData()

        this.frameLag = 0

        this.menu = new Games2d.Menu({ scene: this })

        this.sound.pauseOnBlur = false

        this.score = 0
        this.highScoreBeatenSoundPlayed = false
        this.state = GameState.Playing

        this.gameOverDuration = 1250

        this.applauseSound = this.sound.add('applause')
        this.loseSound = this.sound.add('lose')

        this.scoreText = this.add.text(ScreenWidth - 10, 10, `Score: ${this.score}/${this.highestScore}`)
            .setFontFamily('Serif')
            .setFontSize(50)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setAlpha(0.6)
            .setOrigin(1, 0)

        this.changeBackgroundColor()
    }

    gameOver() {
        if (this.state == GameState.GameOver) {
            return
        }
        if (!this.menu.isMute()) {
            this.loseSound.play()
        }
        this.state = GameState.GameOver

        this.cameras.main.flash(100, 100)
        this.cameras.main.fade(this.gameOverDuration * 2 / 3)
        this.time.delayedCall(this.gameOverDuration,
            () => {
                this.scene.restart()
            }, [], this)
    }

    update(_: number, delta: number) {
        let frameDuration = 1000 / FPS
        if (delta > 1000) {
            delta = frameDuration
        }
        this.frameLag += delta
        while (this.frameLag >= frameDuration) {
            this.updateFrame()
            this.frameLag -= frameDuration
        }
    }
    updateFrame() {
        if (this.state == GameState.GameOver) {
            return
        }
    }
}

window.onload = () => {
    new Game()
}
