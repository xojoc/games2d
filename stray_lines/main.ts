//// copyright: AGPLv3 or later

//// As level increases, change (with clamp)
////    target side
////    number of balls
////    ball radius
////    speed of balls
////    max length of drawn lines

// fixme: empty drawn lines
// menu: restart
// after N hits and no lines remaining to draw game over?
// remaining line border when used
// fixme: sound delayed if out of focus


import { Games2d } from '../games2d.js'

const ScreenWidth = 900
const ScreenHeight = 900

class Game extends Phaser.Game {
    constructor() {
        const config: Phaser.Types.Core.GameConfig = {
            title: "Stray lines - games2d",
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
            physics: {
                default: 'matter',
                matter: { debug: false },
            }
        }
        super(config)
    }
}

class Preloader extends Phaser.Scene {
    constructor() { super("Preloader") }

    preload() {
        Games2d.preload(this)

        // fixme: common assets
        this.load.audio('applause', 'assets/applause.ogg')
        this.load.audio('lose', 'assets/lose.ogg')
    }

    create() {
        this.scene.start("GameScene")
    }
}

const foregroundColors = [0x007FFF, 0xFFFFFF, 0xCD5C5C, 0xBDDA57, 0x4c4c4c]
const backgroundColors = [0x004225, 0x243757, 0x3b1420, 0x2b2b2b, 0x433D54]

enum GameState {
    Playing,
    GameOver
}

class GameScene extends Phaser.Scene {
    state: GameState
    score: number
    highestScore: number
    highScoreBeatenSoundPlayed: boolean;
    scoreText: Phaser.GameObjects.Text
    level: number
    background_color: any
    menu: Games2d.Menu
    gameOverDuration: number
    applauseSound: Phaser.Sound.BaseSound
    loseSound: Phaser.Sound.BaseSound
    balls: Phaser.GameObjects.Arc[]
    userDrawnLines: Phaser.GameObjects.GameObject[]
    userDrawnLineMaxLength: number
    userTemporaryLine: Phaser.GameObjects.Graphics
    userDrawnLineColor: number
    userDrawnLineWidth: number;
    remainingLines: Phaser.GameObjects.Rectangle[]
    targets: Phaser.GameObjects.GameObject[]
    firstPointerDownPosition: Phaser.Math.Vector2 | null

    constructor() {
        super('GameScene')
    }


    // fixme: change with a tween?
    changeBackgroundColor() {
        while (true) {
            let b = Phaser.Math.RND.pick(backgroundColors)
            if (b != this.background_color) {
                this.cameras.main.setBackgroundColor(b)
                this.background_color = b
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
        localStorage.setItem('stray_lines', JSON.stringify(obj))
    }

    loadData() {
        let obj
        try {
            obj = JSON.parse(localStorage.getItem('stray_lines') || '')
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

        this.menu = new Games2d.Menu({ scene: this })

        this.score = 0
        this.highScoreBeatenSoundPlayed = false
        this.state = GameState.Playing
        this.level = 1

        this.userDrawnLineColor = 0x00ff00
        this.userDrawnLineWidth = 6


        this.userDrawnLineMaxLength = 230

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

        this.matter.world.disableGravity()

        this.userDrawnLines = []
        this.firstPointerDownPosition = null

        this.input.on('pointerdown', this.callbackPointerDown, this)
        this.input.on('pointerdownoutside', this.callbackPointerDown, this)

        this.input.on('pointerup', this.callbackPointerUp, this)
        this.input.on('pointerupoutside', this.callbackPointerUp, this)

        this.input.on('pointermove', this.callbackPointerMove, this)

        this.createBalls()
        this.createTargets()
        this.createRemainingLines()

        this.matter.world.on('collisionstart', this.callbackCollision, this)


        this.changeBackgroundColor()
    }

    callbackPointerDown(this: GameScene, pointer: Phaser.Input.Pointer) {
        if (this.firstPointerDownPosition) {
            return
        }
        this.firstPointerDownPosition = pointer.position.clone()
        this.firstPointerDownPosition.x = Phaser.Math.Clamp(this.firstPointerDownPosition.x, 0, ScreenWidth - 1)
        this.firstPointerDownPosition.y = Phaser.Math.Clamp(this.firstPointerDownPosition.y, 0, ScreenHeight - 1)
    }
    callbackPointerUp(this: GameScene, pointer: Phaser.Input.Pointer) {
        if (this.firstPointerDownPosition == null) {
            return
        }

        if (this.remainingLines.length == 0) {
            this.cameras.main.shake(100, 0.005, true)
            Games2d.vibrate(1000)

            this.firstPointerDownPosition = null
            if (this.userTemporaryLine) {
                this.userTemporaryLine.destroy()
            }
            return
        }

        let toX = Phaser.Math.Clamp(pointer.position.x, 0, ScreenWidth - 1)
        let toY = Phaser.Math.Clamp(pointer.position.y, 0, ScreenHeight - 1)

        let geomLine = new Phaser.Geom.Line(
            this.firstPointerDownPosition.x,
            this.firstPointerDownPosition.y,
            toX,
            toY)
        let angle = Phaser.Geom.Line.Angle(geomLine) + ((3 * Math.PI) / 2)
        let len = Math.min(Phaser.Geom.Line.Length(geomLine), this.userDrawnLineMaxLength)

        if (len < 3) {
            this.firstPointerDownPosition = null
            if (this.userTemporaryLine) {
                this.userTemporaryLine.destroy()
            }
            return
        }

        Phaser.Geom.Line.Extend(geomLine, 0, len - Phaser.Geom.Line.Length(geomLine))
        let center = Phaser.Geom.Line.GetMidPoint(geomLine)

        let rect = this.add.rectangle(
            center.x,
            center.y,
            this.userDrawnLineWidth,
            len,
            this.userDrawnLineColor)
            .setOrigin(0.5, 0.5)
            .setActive(true)
            .setRotation(angle)
            .setAlpha(1)

        let rectPhysics = this.matter.add.gameObject(rect,
            {
                isStatic: true,
                angle: angle,
            })

        rectPhysics.name = "userLine"

        this.userDrawnLines.push(rectPhysics)
        let remainingLine = this.remainingLines.pop()
        if (remainingLine) {
            this.tweens.add({
                targets: remainingLine,
                alpha: 0,
                onComplete: (_tween, targets: Phaser.GameObjects.Rectangle[]) => {
                    targets[0].destroy()
                },
                duration: 100
            })

        }

        this.firstPointerDownPosition = null
        if (this.userTemporaryLine) {
            this.userTemporaryLine.destroy()
        }
    }

    callbackPointerMove(this: GameScene, pointer: Phaser.Input.Pointer) {
        if (this.firstPointerDownPosition == null) {
            return
        }


        if (this.userTemporaryLine) {
            this.userTemporaryLine.destroy()
        }

        this.userTemporaryLine = this.add.graphics()
        this.userTemporaryLine.setActive(true)

        this.userTemporaryLine.beginPath()
        this.userTemporaryLine.lineStyle(10, 0xff0000)

        this.userTemporaryLine.moveTo(
            this.firstPointerDownPosition.x,
            this.firstPointerDownPosition.y)

        let toX = Phaser.Math.Clamp(pointer.position.x, 0, ScreenWidth - 1)
        let toY = Phaser.Math.Clamp(pointer.position.y, 0, ScreenHeight - 1)
        let geomLine = new Phaser.Geom.Line(
            this.firstPointerDownPosition.x,
            this.firstPointerDownPosition.y,
            toX,
            toY)
        let len = Math.min(Phaser.Geom.Line.Length(geomLine), this.userDrawnLineMaxLength)

        Phaser.Geom.Line.Extend(geomLine, 0, len - Phaser.Geom.Line.Length(geomLine))
        let end = Phaser.Geom.Line.GetPoint(geomLine, 1)

        this.userTemporaryLine.lineTo(end.x, end.y)
        this.userTemporaryLine.alpha = 0.3

        this.userTemporaryLine.closePath()
        this.userTemporaryLine.strokePath()
    }

    // fixme: don't overlap
    createBalls() {
        if (this.balls) {
            for (let ball of this.balls) {
                ball.destroy()
            }
        }

        this.balls = []

        const radius = 12

        let numberOfBalls = Math.floor(this.level / 3) + 1

        for (let i = 0; i < numberOfBalls; i++) {
            let r = Phaser.Math.Between
            let randomSides = [
                {
                    x: 0 + radius * 2,
                    y: r(0 + radius * 2, ScreenHeight)
                },
                {
                    x: ScreenWidth - radius * 2,
                    y: r(0 + radius * 2, ScreenHeight)
                },
                {
                    x: r(0 + radius * 2, ScreenWidth),
                    y: 0 + radius * 2
                },
                {
                    x: r(0 + radius * 2, ScreenWidth),
                    y: ScreenHeight - radius * 2
                }]


            let side = Phaser.Math.RND.pick(randomSides)

            let offset = 250
            let angle = Phaser.Math.Angle.BetweenPoints(side,
                {
                    x: ScreenWidth / 2 + r(-offset, offset),
                    y: ScreenHeight / 2 + r(-offset, offset)
                })

            let ballBody = this.matter.add.circle(side.x, side.y, radius) as Matter.Body

            let v = new Phaser.Math.Vector2()
            v.setToPolar(angle, 1.7)
            this.matter.add.velocity(ballBody, v)

            ballBody.friction = 0
            ballBody.frictionAir = 0
            ballBody.frictionStatic = 0
            ballBody.restitution = 1.0
            // See: https://github.com/liabru/matter-js/issues/21 and
            //      https://github.com/liabru/matter-js/issues/256
            ballBody.inertia = Infinity
            ballBody.inverseInertia = 0

            let ballColor = Phaser.Math.RND.pick(foregroundColors)
            let ball = this.matter.add.gameObject(this.add.arc()
                .setActive(true)
                .setFillStyle(ballColor)
                .setRadius(radius)
                .setX(side.x)
                .setY(side.y),
                ballBody)

            ball.name = "ball"

            this.balls.push(ball as Phaser.GameObjects.Arc)
        }

        // @ts-ignore
        Phaser.Physics.Matter.Matter.Resolver._restingThresh = 0.001;
    }

    // fixme: don't overlap
    // fixme: only targets of color
    createTargets() {
        if (this.targets) {
            for (let target of this.targets) {
                target.destroy()
            }
        }

        let offset = 200
        let side = 25

        this.targets = []

        for (let ball of this.balls) {
            let rect =
                this.add.rectangle(
                    Phaser.Math.RND.integerInRange(offset, ScreenWidth - offset),
                    Phaser.Math.RND.integerInRange(offset, ScreenHeight - offset),
                    side, side)
                    .setActive(true)
                    .setFillStyle(ball.fillColor)

            let rectPhysics = this.matter.add.gameObject(rect,
                {
                    isStatic: true,
                })
            rectPhysics.name = "target"
            this.targets.push(rectPhysics)
        }
    }

    createRemainingLines() {
        if (this.remainingLines) {
            for (let l of this.remainingLines) {
                l.destroy()
            }
        }

        this.remainingLines = []
        for (let i = 0; i < 10; i++) {
            let r = this.add.rectangle(
                ScreenWidth - 17 * (i + 1),
                ScreenHeight - 43,
                this.userDrawnLineWidth,
                27,
                this.userDrawnLineColor)
                .setAngle(13)
                .setAlpha(0.8)
                .setOrigin(1, 0)

            this.remainingLines.push(r)
        }
    }


    callbackCollision(this: GameScene, _event: string | symbol, bodyA: MatterJS.Body, bodyB: MatterJS.Body) {
        // @ts-ignore
        let goA = bodyA.gameObject as Phaser.GameObjects.GameObject
        // @ts-ignore
        let goB = bodyB.gameObject as Phaser.GameObjects.GameObject

        if (!goA) {
            return
        }
        if (!goB) {
            return
        }

        let ball = null
        let target = null
        let userLine = null
        if (goA.name == "ball") {
            ball = goA
        }
        if (goB.name == "ball") {
            ball = goB
        }
        if (goA.name == "target") {
            target = goA
        }
        if (goB.name == "target") {
            target = goB
        }
        if (goA.name == "userLine") {
            userLine = goA
        }
        if (goB.name == "userLine") {
            userLine = goB
        }

        if (ball && target) {
            this.changeBackgroundColor()

            let ballTyped = ball as Phaser.GameObjects.Arc
            target = target as Phaser.GameObjects.Rectangle

            // fixme: emitter
            if (ballTyped.fillColor != target.fillColor) {
                this.gameOver()
                return
            }

            this.increaseScore()

            // fixme: particles emitter
            ball.destroy()
            this.balls = this.balls.filter(b => b !== ballTyped)

            // Don't destroy the target, just transform it into an obstacle
            // fixme: tween?
            target.fillColor = 0x000
        }

        if (ball && userLine ||
            (goA.name == "ball" && goB.name == "ball")) {

            this.cameras.main.shake(40, 0.005, false)
            Games2d.vibrate(30)
        }
    }


    gameOver() {
        if (this.state == GameState.GameOver) {
            return
        }
        if (!this.menu.isMute()) {
            this.loseSound.play()
        }
        this.state = GameState.GameOver
        this.cameras.main.fade(this.gameOverDuration * 2 / 3)
        this.time.delayedCall(this.gameOverDuration,
            () => {
                this.scene.restart()
            }, [], this)
    }

    update() {
        if (this.state == GameState.GameOver) {
            return
        }

        for (let ball of this.balls) {
            let bounds = ball.getBounds()
            if (bounds.x + bounds.width < 0 ||
                bounds.x > ScreenWidth ||
                bounds.y + bounds.height < 0 ||
                bounds.y > ScreenHeight) {

                this.gameOver()
            }
        }

        if (this.balls.length == 0) {
            this.nextLevel()
        }
    }
    nextLevel() {
        this.level += 1
        for (let line of this.userDrawnLines) {
            line.destroy()
        }
        this.userDrawnLines = []
        this.createBalls()
        this.createTargets()
        this.createRemainingLines()
    }
}

window.onload = () => {
    new Game()
}
