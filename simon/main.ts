//// copyright: AGPLv3 or later

import { Games2d } from '../games2d.js'

const ScreenWidth = 900
const ScreenHeight = 900

class Game extends Phaser.Game {
    constructor() {
        const config: Phaser.Types.Core.GameConfig = {
            title: "Simon - games2d",
            parent: "content",
            width: ScreenWidth,
            height: ScreenHeight,
            scene: [Preloader, GameScene],
            scale: {
                parent: "content",
                expandParent: true,
                autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
                mode: Phaser.Scale.FIT,
                fullscreenTarget: "content",
            },
            type: Phaser.CANVAS,
        }
        super(config)
    }
}

class Preloader extends Phaser.Scene {
    constructor() { super("Preloader") }

    preload() {
        Games2d.preload(this)

        this.load.audio('meow', 'assets/meow.ogg')
        this.load.audio('pig', 'assets/pig.ogg')
        //        this.load.audio('dog-grumble', 'assets/dog-grumble.ogg')
        this.load.audio('caw', 'assets/caw.ogg')
        this.load.audio('quail', 'assets/quail.ogg')

        this.load.audio('applause', 'assets/applause.ogg')
        this.load.audio('lose', 'assets/lose.ogg')
    }

    create() {
        this.scene.start("GameScene")
    }
}

const colors = [0x243757, 0xCD5C5C, 0xBDDA57, 0x2b2b2b]

enum GameState {
    StartScreen,
    GeneratedSequence,
    UserSequence,
    GameOver
}

class GameScene extends Phaser.Scene {
    state: GameState
    highestScore: number
    score: number
    gameOverText: Phaser.GameObjects.Text
    scoreText: Phaser.GameObjects.Text
    instructionsText: Phaser.GameObjects.Text
    quadrants: Phaser.GameObjects.Rectangle[]
    selectedQuadrant: number
    menu: Games2d.Menu
    notes: Phaser.Sound.BaseSound[]
    gameOverDuration: number
    flashingDuration: number
    flashing: boolean
    generatedSequence: number[]
    generatedSequenceIndex: number
    userSequenceIndex: number
    startButton: Phaser.GameObjects.Arc
    startText: Phaser.GameObjects.Text
    applauseSound: Phaser.Sound.BaseSound
    loseSound: Phaser.Sound.BaseSound
    gameOverRectangle: Phaser.GameObjects.Rectangle;

    constructor() {
        super('GameScene')
    }

    increaseScore(s: number) {
        this.score += s
        if (this.score > this.highestScore) {
            this.highestScore = this.score
            // fixme: sound?
            this.saveDate()
        }
        this.scoreText.text = `${this.score}/${this.highestScore}`
    }

    saveDate() {
        let obj = {
            highestScore: this.highestScore,
        }
        localStorage.setItem('simon', JSON.stringify(obj))
    }

    loadData() {
        let obj
        try {
            obj = JSON.parse(localStorage.getItem('simon') || '')
        } catch {
        }
        if (obj) {
            this.highestScore = obj.highestScore
        } else {
            this.highestScore = 1
        }
        if (!this.highestScore) {
            this.highestScore = 1
        }
    }


    create() {
        this.loadData()

        this.quadrants = []
        for (let i = 0; i < 4; i++) {
            this.quadrants.push(this.add.rectangle(0, 0, ScreenWidth / 2, ScreenHeight / 2, colors[i]))
        }

        Phaser.Actions.GridAlign(this.quadrants, {
            x: ScreenWidth / 4,
            y: ScreenHeight / 4,
            width: 2,
            height: 2,
            cellWidth: ScreenWidth / 2,
            cellHeight: ScreenHeight / 2,
        })

        for (let i in this.quadrants) {
            this.quadrants[i].setInteractive()
            this.quadrants[i].on('pointerup', () => {
                if (this.state == GameState.UserSequence) {
                    this.selectedQuadrant = Number(i)
                    this.flashing = false
                }
            })
        }

        this.menu = new Games2d.Menu({ scene: this })

        this.score = 1
        this.state = GameState.StartScreen
        this.generatedSequence = []
        this.generatedSequenceIndex = 0

        this.userSequenceIndex = 0

        this.flashing = false
        this.flashingDuration = 350

        this.gameOverDuration = 1250

        this.notes = [this.sound.add('meow'),
        this.sound.add('pig'),
        this.sound.add('quail'),
        this.sound.add('caw')]

        this.applauseSound = this.sound.add('applause')
        this.loseSound = this.sound.add('lose')

        //        this.sound.volume = 0.1


        this.scoreText = this.add.text(ScreenWidth - 6, 4, `${this.score}/${this.highestScore}`)
            .setFontFamily('Serif')
            .setFontSize(50)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setAlpha(0.6)
            .setOrigin(1, 0)


        this.gameOverText = this.add.text(ScreenWidth / 2, ScreenHeight / 2, `GameOver`)
            .setFontFamily('Serif')
            .setFontSize(50)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setOrigin(0.5, 0.5)
            .setDepth(1000)
        this.gameOverText.setVisible(false)


        let instructions: string


        if (this.sys.game.device.input.touch) {
            instructions = `Tap on the left/right side of the screen`
        } else {
            instructions = `Use the left/right arrow
OR
Click on the left/right side of the screen

Press: 
 r - to restart
 m - to mute/unmute
 p - to pause/unpause
 f - to toggle fullscreen`
        }

        this.instructionsText = this.add.text(ScreenWidth / 2, 100, instructions)

            .setAlign('center')
            .setFontFamily('Serif')
            .setFontSize(17)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setOrigin(0.5, 0)
            .setDepth(1000)
        this.instructionsText.setVisible(false)

        this.startButton = this.add.circle(ScreenWidth / 2, ScreenHeight / 2, 160, 0xffffff)
        this.startButton.setInteractive()
        this.startButton.on('pointerup', () => {
            this.startButton.setVisible(false)
            this.startText.setVisible(false)
            this.state = GameState.GeneratedSequence
            this.generatedSequenceIndex = 0
            this.userSequenceIndex = 0
            this.selectedQuadrant = -1
        })
        this.startText = this.add.text(ScreenWidth / 2, ScreenHeight / 2, `Start`)
            .setAlign('center')
            .setFontFamily('Serif')
            .setFontSize(75)
            .setColor('#000000')
            //            .setFontStyle('bold')
            .setOrigin(0.5, 0.5)
        this.startText.setVisible(true)

        this.gameOverRectangle = this.add.rectangle(0, 0, ScreenWidth, ScreenHeight, 0x000000)
            .setDepth(1000)
            .setOrigin(0, 0)
            .setVisible(false)
    }

    flashQuadrant(i: number) {
        this.quadrants[i].setFillStyle(0xfcfcfc)
        if (!this.menu.isMute()) {
            this.notes[i].play()
        }
        this.flashing = true
        this.time.delayedCall(this.flashingDuration, () => {
            this.quadrants[i].setFillStyle(colors[i])
            this.time.delayedCall(160, () => {
                this.flashing = false
            }, [], this)
        }, [], this)
    }

    gameOver() {
        if (!this.menu.isMute()) {
            this.loseSound.play()
        }
        this.gameOverRectangle.setVisible(true)
        this.state = GameState.GameOver
        this.time.delayedCall(this.gameOverDuration,
            () => {
                this.scene.restart()
            }, [], this)
    }

    updateStartScreen() {
        if (this.state != GameState.StartScreen) {
            return
        }
        this.startButton.setVisible(true)
        this.startText.setVisible(true)
    }

    updateGeneratedSequence() {
        if (this.state != GameState.GeneratedSequence) {
            return
        }
        if (this.generatedSequenceIndex == this.score) {
            this.state = GameState.UserSequence
            return
        }
        if (this.generatedSequenceIndex == this.generatedSequence.length) {
            this.generatedSequence.push(Phaser.Math.RND.between(0, 3))
        }
        this.flashQuadrant(this.generatedSequence[this.generatedSequenceIndex])
        this.generatedSequenceIndex += 1
    }

    updateUserSequence() {
        if (this.state != GameState.UserSequence) {
            return
        }
        if (this.userSequenceIndex == this.generatedSequence.length) {
            if (!this.menu.isMute()) {
                this.applauseSound.play()
            }
            this.state = GameState.StartScreen
            this.increaseScore(1)
            return
        }

        if (this.selectedQuadrant == -1) {
            return
        }

        if (this.selectedQuadrant != this.generatedSequence[this.userSequenceIndex]) {
            this.gameOver()
        } else {
            this.flashQuadrant(this.selectedQuadrant)
            this.userSequenceIndex += 1
        }

        this.selectedQuadrant = -1
    }

    update() {
        if (this.flashing) {
            return
        }
        this.updateStartScreen()
        this.updateGeneratedSequence()
        this.updateUserSequence()
    }
}

window.onload = () => {
    new Game()
}
