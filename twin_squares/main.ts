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
                    debugShowBody: false,
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

const colors = [0xCD5C5C, 0xBDDA57]
const backgroundColors = [0x004225, 0x243757, 0x3b1420, 0x2b2b2b, 0x433D54]

enum GameState {
    Playing,
    GameOver
}

enum SquareState {
    Running,
    Jumping
}

const Pt = Phaser.Geom.Point
const Rt = Phaser.Geom.Rectangle

class Square extends Phaser.GameObjects.Graphics {
    game_scene: GameScene
    r1: Phaser.GameObjects.Rectangle
    deltay: number
    squareTouchingGround: boolean
    keys: Phaser.Input.Keyboard.Key[]
    index: integer
    sign: integer
    emitter: Phaser.GameObjects.Particles.ParticleEmitter
    state: SquareState
    tween: Phaser.Tweens.Tween | undefined

    readonly SIDE = 20
    static jumpVelocityY = -100
    static gravityVelocityY = 200
    static velocityX = 150

    constructor(scene: GameScene, index: integer) {
        super(scene, {})
        scene.add.existing(this)

        this.game_scene = scene

        this.index = index
        this.squareTouchingGround = false

        this.state = SquareState.Running

        let squarey = 0
        let keys = []
        if (index == 0) {
            this.sign = -1
            this.deltay = -1
            squarey = this.SIDE * 10
            keys = ['a', 'left']
        } else {
            this.sign = 1
            this.deltay = 1
            squarey = ScreenHeight - this.SIDE * 7
            keys = ['d', 'right']
        }

        this.keys = []
        for (let key of keys) {
            this.keys.push(this.scene.input.keyboard.addKey(key))
        }

        this.deltay *= 100


        this.r1 = scene.add.rectangle(this.SIDE * 3, squarey,
            this.SIDE, this.SIDE,
            colors[index])
        this.scene.physics.add.existing(this.r1)
        let body = this.r1.body as Phaser.Physics.Arcade.Body
        body.setVelocityX(Square.velocityX)
        body.setGravityY(Square.gravityVelocityY * this.sign)
        //        body.setBounce(0, 0.1)

        let particleName = `particle-${this.index}`
        if (!this.scene.textures.exists(particleName)) {
            let particleSide = 7
            let canvas = this.scene.textures.createCanvas(particleName,
                particleSide, particleSide)

            canvas.context.fillStyle = `#${colors[this.index].toString(16).toUpperCase()}`
            canvas.context.fillRect(0, 0,
                particleSide, particleSide)

            canvas.refresh()
        }
        let particles = this.scene.add.particles(particleName)
        this.emitter = particles.createEmitter({
            speed: 50,
            follow: this.r1,
            followOffset: { x: 0, y: this.SIDE / 2 * 0.80 * this.sign },
            on: false,
            angle: { min: 150 * this.sign, max: 200 * this.sign },
            scale: { start: 0.7, end: 1 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
        })
    }

    userJumped() {
        for (let key of this.keys) {
            if (key.isDown) {
                return true
            }
        }
        let p = this.scene.input.activePointer
        if (p.isDown && p.y > 70) {
            if (this.index == 0 && p.x < ScreenWidth / 2) {
                return true
            }
            if (this.index == 1 && p.x > ScreenWidth / 2) {
                return true
            }
        }
        return false
    }

    update() {
        let body = this.r1.body as Phaser.Physics.Arcade.Body
        if (body.touching.down || body.touching.up) {
            if (!this.emitter.on) {
                this.emitter.start()
            }
            this.state = SquareState.Running
            if (this.tween) {
                this.tween.stop()
                this.tween = undefined
                this.r1.angle = 0
            }
        } else {
            this.emitter.stop()
        }

        if (this.userJumped() && (body.touching.down || body.touching.up)) {
            this.state = SquareState.Jumping
            this.r1.angle = 0

            body.setVelocityY(Square.jumpVelocityY * this.sign)
            this.createRotatationTween()
        }

        if (!(body.touching.down || body.touching.up)) {
            if (this.state == SquareState.Running) {
                this.createRotatationTween()
            }
        }

        if (this.index == 0) {
            if (this.r1.y <= 0) {
                this.game_scene.gameOver()
            }
        }
        if (this.index == 1) {
            if (this.r1.y + this.SIDE > ScreenHeight) {
                this.game_scene.gameOver()
            }
        }

        if (body.touching.left || body.touching.right) {
            this.game_scene.gameOver()
        }
    }

    createRotatationTween() {
        if (this.tween) {
            return
        }
        let t = Square.jumpTime()
        let targetAngle = this.r1.angle + (180 * this.sign)
        this.tween = this.scene.tweens.add({
            targets: this.r1,
            angle: targetAngle,
            duration: t * 1000 * 0.95,
            ease: 'Power1'
        })
    }

    render() {
        this.setVisible(true)
    }

    static jumpTime() {
        return Math.abs((this.jumpVelocityY * 2) / this.gravityVelocityY)
    }

    static jumpDistanceX() {
        return this.velocityX * this.jumpTime()
    }

    static jumpDistanceY() {
        let t = this.jumpTime() / 2
        return this.jumpVelocityY * t + this.gravityVelocityY * t ** 2 / 2
    }
}


class Ground extends Phaser.GameObjects.Graphics {
    rects: Phaser.GameObjects.Rectangle[]
    rect_i: integer
    game_scene: GameScene
    ypos: number
    ground: Phaser.Physics.Arcade.Group
    index: integer
    sign: integer


    readonly WIDTH
    readonly HEIGHT = 20

    constructor(scene: GameScene, index: integer) {
        super(scene, {})
        scene.add.existing(this)

        this.game_scene = scene

        this.index = index

        this.WIDTH = Square.jumpDistanceX() * 0.5

        if (index == 0) {
            this.ypos = this.HEIGHT * 7
            this.sign = -1
        } else {
            this.ypos = ScreenHeight - this.HEIGHT * 3
            this.sign = 1
        }

        this.ground = this.scene.physics.add.group()

        this.rect_i = 0
        this.rects = []

        for (let i = 0; i < 1000; i++) {
            let ypos = this.ypos
            /*
            if ((i + 1) % 5 == 0) {
                ypos += Square.jumpDistanceY() * this.sign * 0.8
            }

            if ((i + 1) % 8 == 0) {
                continue
            }
            */
            this.rects.push(scene.add.rectangle(i * this.WIDTH,
                ypos,
                this.WIDTH, this.HEIGHT,
                colors[index]))

            this.ground.add(this.rects[this.rect_i])

            let body = this.rects[this.rect_i].body as Phaser.Physics.Arcade.Body
            body.setImmovable(true)
            body.allowGravity = false

            this.rect_i += 1
        }
    }

    update() {
        for (let r of this.rects) {
            let p = this.game_scene.getRelativePosition(r)
            if (r.y == this.ypos) {
                let body = r.body as Phaser.Physics.Arcade.Body
                if (p.x + r.width <= this.WIDTH * 1) {
                    let y = 40
                    if (this.index == 0) {
                        y *= -1
                    }
                    body.setVelocityY(y)

                    this.scene.tweens.add({
                        targets: r,
                        alpha: 0,
                        duration: 2000,
                        delay: 100,
                        ease: 'Power1'
                    })
                    let angle = 90
                    if (this.index == 1) {
                        angle *= -1
                    }
                    this.scene.tweens.add({
                        targets: r,
                        angle: angle,
                        duration: 3000,
                        delay: 100,
                        ease: 'Exponential'
                    })
                }
            }
            if (p.x + this.WIDTH < 0) {
                r.destroy()
                r.active
                this.rects.shift()
            }
        }
    }

    render() {
        this.setVisible(true)
    }
}


class Obstacles extends Phaser.GameObjects.Graphics {
    game_scene: GameScene
    triangles: Phaser.GameObjects.Triangle[]
    index: integer
    sign: integer

    constructor(scene: GameScene, index: integer) {
        super(scene, {})
        scene.add.existing(this)

        this.game_scene = scene

        this.index = index

        if (this.index == 0) {
            this.sign = -1
        } else {
            this.sign = 1
        }

        this.triangles = []

        for (let i = 0; i < 100; i++) {
            if ((i + 1) % 11 != 0) {
                continue
            }


            let ypos = 200
            if (this.index == 1) {
                ypos = ScreenHeight - 200
            }
            let width = Square.jumpDistanceX() * 0.5

            let triangle = this.scene.add.triangle(width * i, ypos,
                4, 10,
                8, 0,
                0, 0,
                colors[(this.index + 1) % 2])

            triangle.scale = 2

            if (this.index == 1) {
                triangle.angle = 180
            }

            this.scene.physics.add.existing(triangle)
            this.triangles.push(triangle)

            let body = triangle.body as Phaser.Physics.Arcade.Body
            body.setGravityY(Square.gravityVelocityY * this.sign)
        }

    }

    update() {

    }
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
    squares: Square[]
    grounds: Ground[]
    obstacles: Obstacles[]

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
            .setScrollFactor(0, 0)

        this.changeBackgroundColor()

        this.grounds = [new Ground(this, 0), new Ground(this, 1)]
        this.squares = [new Square(this, 0), new Square(this, 1)]
        this.obstacles = [new Obstacles(this, 0), new Obstacles(this, 1)]

        this.physics.add.collider(this.squares[0].r1,
            this.grounds[0].ground,
            (obj1, obj2) => {
                return
            })
        this.physics.add.collider(this.squares[1].r1, this.grounds[1].ground)

        this.physics.add.collider(this.squares[0].r1,
            this.obstacles[0].triangles)
        this.physics.add.collider(this.squares[1].r1,
            this.obstacles[1].triangles)

        this.physics.add.collider(this.grounds[0].ground,
            this.obstacles[0].triangles)
        this.physics.add.collider(this.grounds[1].ground,
            this.obstacles[1].triangles)

        this.cameras.main.startFollow(this.squares[1].r1, false, 1, 0)
        this.cameras.main.followOffset.set(-300, 0)
        this.cameras.main.scrollY -= 300
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
        for (let square of this.squares) {
            square.update()
        }
        for (let ground of this.grounds) {
            ground.update()
        }
        for (let obstacles of this.obstacles) {
            obstacles.update()
        }
    }
    getRelativePosition(gameObject: Phaser.GameObjects.Shape) {
        let camera = this.cameras.main
        return {
            x: (gameObject.x - camera.worldView.x) * camera.zoom,
            y: (gameObject.y - camera.worldView.y) * camera.zoom
        }
    }
}

declare global {
    var game: Game
    var square: typeof Square
    var ground: typeof Ground
    var obstacles: typeof Obstacles
}

globalThis.square = Square
globalThis.ground = Ground
globalThis.obstacles = Obstacles

window.onload = () => {
    console.log(this)
    globalThis.game = new Game()
}
