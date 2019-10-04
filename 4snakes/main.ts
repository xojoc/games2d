//// copyright: AGPLv3 or later

// todo: find better sounds


const ScreenWidth = 450
const ScreenHeight = 375
const FPS = 40

class Game extends Phaser.Game {
    constructor() {
        const config: Phaser.Types.Core.GameConfig = {
            title: "4snakes - games2d",
            parent: "content",
            width: ScreenWidth,
            height: ScreenHeight,
            scene: [Preloader, GameScene],
            fps: {
                min: FPS,
                target: FPS,
            },
            scale: {
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
        // icons from https://opengameart.org/content/game-icons
        this.load.image('restart', 'assets/return.png')
        this.load.image('pause', 'assets/pause.png')
        this.load.image('play', 'assets/right.png')
        this.load.image('mute', 'assets/musicOn.png')
        this.load.image('unmute', 'assets/musicOff.png')
        this.load.image('larger', 'assets/larger.png')
        this.load.image('smaller', 'assets/smaller.png')


        this.load.audio('game_over', 'assets/game_over.wav')
        this.load.audio('eat1', 'assets/eat1.wav')
    }

    create() {
        this.scene.start("GameScene")
    }
}


const Pt = Phaser.Geom.Point
const Rt = Phaser.Geom.Rectangle

const snakeFoodColors = [0x007FFF, 0xFFFFFF, 0xCD5C5C, 0xBDDA57]

type SnakeConfig = {
    game_scene: GameScene;
    start_angle: number;
    head: Phaser.Geom.Rectangle;
    velocity: Phaser.Geom.Point;
    acceleration: Phaser.Geom.Point;
    num: number;
    turn_angle: number;
    turn_angle_idle: number;
    change_direction_after_n_idle_frames: number;
    keep_idle_direction_for_n_frames: number;
}


class Snake extends Phaser.GameObjects.Graphics {
    config: SnakeConfig;
    tail: Phaser.Geom.Rectangle[]
    snake_angle: number
    velocity: Phaser.Geom.Point
    acceleration: Phaser.Geom.Point
    snake_is_active: boolean
    idle_direction: number
    count_idle_frames: number;
    count_frames_after_input: number;
    first_idle_change_of_direction: boolean;
    render_frame: number;
    tongue_cell: Phaser.Geom.Rectangle;
    tongue: Phaser.GameObjects.Rectangle;
    constructor(config: SnakeConfig) {
        super(config.game_scene, {})
        config.game_scene.add.existing(this)

        this.config = config

        this.snake_angle = config.start_angle
        this.velocity = config.velocity
        this.acceleration = config.acceleration
        this.idle_direction = Phaser.Math.RND.pick([-1.0, 1.0])
        this.snake_is_active = false
        this.count_idle_frames = 0
        this.count_frames_after_input = 0
        this.first_idle_change_of_direction = true

        this.tail = [config.head];
        for (let i = 0; i < 7; i++) {
            this.grow_only()
        }
        this.depth = 500
        this.render_frame = 0
        this.tongue = this.config.game_scene.add.rectangle(0, 0, 4, 5)
        this.tongue.setFillStyle(0xff1144)
        this.tongue_cell = new Rt(0, 0, this.tongue.width, this.tongue.height)
    }
    grow_only() {
        let dtx = this.velocity.x * Math.cos(this.snake_angle)
        let dty = this.velocity.y * Math.sin(this.snake_angle)
        let new_cell = new Rt(this.tail[0].x + dtx,
            this.tail[0].y + dty,
            10, 10)

        this.tail.unshift(new_cell)
    }
    update_idle(input_received: boolean) {
        if (input_received) {
            this.idle_direction = Phaser.Math.RND.pick([-1.0, 1.0])
            this.count_idle_frames = 0
            this.count_frames_after_input = 0
            this.first_idle_change_of_direction = true
            return
        }
        this.count_frames_after_input += 1
        if (this.count_frames_after_input > this.config.change_direction_after_n_idle_frames) {
            this.count_idle_frames += 1

            if ((this.count_idle_frames > this.config.keep_idle_direction_for_n_frames) ||
                (this.first_idle_change_of_direction && this.count_idle_frames > this.config.keep_idle_direction_for_n_frames / 2)) {
                this.first_idle_change_of_direction = false
                this.count_idle_frames = 0
                this.idle_direction *= -1
            }
            this.snake_angle += this.config.turn_angle_idle * this.idle_direction
        }
    }
    handle_input(): boolean {
        let input_received = false
        let left_side_touch = false
        let right_side_touch = false
        let pointer = this.config.game_scene.input.activePointer
        if (pointer.isDown &&
            pointer.y > 70) {
            if (pointer.x < ScreenWidth / 2) {
                left_side_touch = true
            } else {
                right_side_touch = true
            }
        }
        if (this.config.game_scene.cursors.left.isDown ||
            this.config.game_scene.a_key.isDown ||
            left_side_touch) {

            this.snake_angle -= this.config.turn_angle
            input_received = true
        }
        if (this.config.game_scene.cursors.right.isDown ||
            this.config.game_scene.d_key.isDown ||
            right_side_touch) {

            this.snake_angle += this.config.turn_angle
            input_received = true
        }
        return input_received
    }
    update() {
        if (!this.snake_is_active) {
            return
        }

        let input_received = this.handle_input()
        this.update_idle(input_received)

        this.move(this.velocity.x * Math.cos(this.snake_angle),
            this.velocity.y * Math.sin(this.snake_angle))
    }
    move(dtx: number, dty: number) {
        let new_cell = new Rt(this.tail[0].x + dtx,
            this.tail[0].y + dty,
            2, 2)
        new_cell.x += ScreenWidth
        new_cell.x %= ScreenWidth
        new_cell.y += ScreenHeight
        new_cell.y %= ScreenHeight

        this.tongue_cell.x = new_cell.x + 1.3 * Math.cos(this.snake_angle)
        this.tongue_cell.y = new_cell.y + 1.3 * Math.sin(this.snake_angle)
        this.tongue_cell.x += ScreenWidth
        this.tongue_cell.x %= ScreenWidth
        this.tongue_cell.y += ScreenHeight
        this.tongue_cell.y %= ScreenHeight

        for (let snake of this.config.game_scene.snakes.snakes) {
            let start_idx = 0
            if (snake.config.num == this.config.num) {
                start_idx = 3
            }
            if (rectangleCollidesWithAny(new_cell, snake.tail.slice(start_idx))) {
                this.config.game_scene.game_over(this.config.num)
                return
            }
        }
        for (let food of this.config.game_scene.foods.foods) {
            if (Rt.Overlaps(new_cell, food.pos)) {
                if (!this.config.game_scene.mute) {
                    this.config.game_scene.eat_sound.play()
                }
                this.config.game_scene.snakes.setActiveSnake(food.num)
                this.config.game_scene.increaseScore(1)
                this.velocity.x += this.acceleration.x
                this.velocity.y += this.acceleration.y
                this.config.game_scene.changeBackgroundColor()
                food.life = -1
                this.tail.unshift(new_cell)
                this.tail.unshift(new_cell)
                this.tail.unshift(new_cell)
                this.tail.unshift(new_cell)
            }
        }
        this.tail.pop()
        this.tail.unshift(new_cell)
    }
    render() {
        this.clear()

        this.render_frame += 1

        if (this.config.game_scene.state == GameState.GameOver &&
            this.snake_is_active == true) {

            return
        }

        let snake_width = 10


        this.lineStyle(snake_width, snakeFoodColors[this.config.num])
        this.beginPath()

        let prev_cell = new Rt(Infinity, Infinity, 0, 0)

        for (let cell of this.tail) {
            if ((Math.abs(cell.x - prev_cell.x) > ScreenWidth / 2) ||
                (Math.abs(cell.y - prev_cell.y) > ScreenHeight / 2)) {

                this.moveTo(cell.x + cell.width / 2, cell.y + cell.height / 2)

            }

            this.lineTo(cell.x + cell.width / 2, cell.y + cell.height / 2)
            prev_cell = cell
        }
        this.strokePath()

        this.tongue.setPosition(this.tongue_cell.x + 1, this.tongue_cell.y)
        this.tongue.setRotation(this.snake_angle)
    }
}

class Snakes extends Phaser.GameObjects.Graphics {
    snakes: Snake[]
    constructor(scene: GameScene) {
        super(scene, {})
        scene.add.existing(this)

        this.snakes = [new Snake({
            game_scene: scene,
            start_angle: 0,
            head: new Rt(51, 50, 10, 10),
            velocity: new Pt(4, 4),
            acceleration: new Pt(0.1, 0.1),
            num: 0,
            turn_angle: Math.PI / 18,
            turn_angle_idle: Math.PI / 120,
            keep_idle_direction_for_n_frames: 30,
            change_direction_after_n_idle_frames: 30
        }),
        new Snake({
            game_scene: scene,
            start_angle: Math.PI / 2,
            head: new Rt(ScreenWidth - 70, 51, 10, 10),
            velocity: new Pt(4, 4),
            acceleration: new Pt(0.1, 0.1),
            num: 1,
            turn_angle: Math.PI / 18,
            turn_angle_idle: Math.PI / 120,
            keep_idle_direction_for_n_frames: 30,
            change_direction_after_n_idle_frames: 30
        }),
        new Snake({
            game_scene: scene,
            start_angle: Math.PI,
            head: new Rt(ScreenWidth - 73, ScreenHeight - 70, 10, 10),
            velocity: new Pt(4, 4),
            acceleration: new Pt(0.1, 0.1),
            num: 2,
            turn_angle: Math.PI / 18,
            turn_angle_idle: Math.PI / 120,
            keep_idle_direction_for_n_frames: 30,
            change_direction_after_n_idle_frames: 30
        }),
        new Snake({
            game_scene: scene,
            start_angle: 3 * Math.PI / 2,
            head: new Rt(50, ScreenHeight - 51, 10, 10),
            velocity: new Pt(4, 4),
            acceleration: new Pt(0.1, 0.1),
            num: 3,
            turn_angle: Math.PI / 18,
            turn_angle_idle: Math.PI / 120,
            keep_idle_direction_for_n_frames: 30,
            change_direction_after_n_idle_frames: 30
        })]

        this.setActiveSnake(Phaser.Math.RND.pick(this.snakes).config.num)
    }
    setActiveSnake(num: number) {
        for (let snake of this.snakes) {
            snake.snake_is_active = false
        }
        this.snakes[num].snake_is_active = true
    }
    update() {
        for (let snake of this.snakes) {
            snake.update()
        }
    }
    render() {
        for (let snake of this.snakes) {
            snake.render()
        }
    }
}

function rectangleCollidesWithAny(rt: Phaser.Geom.Rectangle, list: Phaser.Geom.Rectangle[]): boolean {
    for (let rect of list) {
        if (Rt.Overlaps(rt, rect)) {
            return true
        }
    }
    return false
}

class Food extends Phaser.GameObjects.Graphics {
    life: number
    num: number
    pos: Phaser.Geom.Rectangle
    game_scene: GameScene

    constructor(scene: GameScene) {
        super(scene, {})
        scene.add.existing(this)

        this.game_scene = scene
        for (let i = 0; i < 100; i++) {
            this.num = Phaser.Math.RND.between(0, 3)
            if (this.game_scene.snakes.snakes[this.num].snake_is_active) {
                continue
            }
            break
        }

        this.pos = this.random_rectangle()
        this.life = 300

        this.fillStyle(snakeFoodColors[this.num])
        this.fillCircle(this.pos.x + this.pos.width / 2, this.pos.y + this.pos.height / 2, this.pos.width / 2)
        //        this.fillRect(this.pos.x, this.pos.y, this.pos.width, this.pos.height)
    }
    update() {
        this.life -= 1
    }
    random_rectangle(): Phaser.Geom.Rectangle {
        let food_width = 13
        let food_height = 13
        while (true) {
            let rt = new Rt(Phaser.Math.RND.between(0, ScreenWidth - food_width),
                Phaser.Math.RND.between(0, ScreenHeight - food_height), food_width, food_height)

            let rt_collides = false
            for (let food of this.game_scene.foods.foods) {
                if (Rt.Overlaps(rt, food.pos)) {
                    rt_collides = true
                    break
                }
            }

            for (let snake of this.game_scene.snakes.snakes) {
                if (rectangleCollidesWithAny(rt, snake.tail)) {
                    rt_collides = true
                    break
                }
            }
            if (rt_collides) {
                continue
            }

            return rt
        }
    }
    render() {
        if (this.life <= 30 && this.life % 4 == 1) {
            this.setVisible(false)
        } else {
            this.setVisible(true)
        }
    }
}

class Foods extends Phaser.GameObjects.Graphics {
    foods: Food[]
    max_food: number
    next_food_min: number
    next_food: number
    next_food_max: number
    game_scene: GameScene

    constructor(scene: GameScene) {
        super(scene, {})
        this.game_scene = scene
        scene.add.existing(this)

        this.foods = []
        this.max_food = 3
        this.next_food_min = 40
        this.next_food_max = 90
        this.next_food = 0
    }
    update() {
        this.next_food -= 1
        if (this.next_food <= 0) {
            if (this.foods.length < this.max_food) {
                this.foods.unshift(new Food(this.game_scene))
                this.next_food = Phaser.Math.RND.between(this.next_food_min, this.next_food_max)
            }
        }
        for (let food of this.foods) {
            food.update()
        }
        this.foods = this.foods.filter(function(food) {
            if (food.life > 0) {
                return true
            }
            food.clear()
            food.destroy()
            return false
        })
    }
    render() {
        for (let food of this.foods) {
            food.render()
        }
    }
}


enum GameState {
    FirstScreen,
    Playing,
    GameOver
}

const background_colors = [0x004225, 0x243757, 0x3b1420, 0x2b2b2b, 0x433D54]


class GameScene extends Phaser.Scene {
    state: GameState;
    paused: boolean
    highest_score: number
    score: number
    background_color: any
    foods: Foods
    snakes: Snakes
    pause_sprite: Phaser.GameObjects.Sprite
    play_sprite: Phaser.GameObjects.Sprite
    mute_sprite: Phaser.GameObjects.Sprite
    unmute_sprite: Phaser.GameObjects.Sprite
    restart_sprite: Phaser.GameObjects.Sprite
    fullscreen_on_sprite: Phaser.GameObjects.Sprite
    fullscreen_off_sprite: Phaser.GameObjects.Sprite
    game_over_text: Phaser.GameObjects.Text
    score_text: Phaser.GameObjects.Text
    frame_lag: number
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
    game_over_sound: Phaser.Sound.BaseSound
    eat_sound: Phaser.Sound.BaseSound
    a_key: Phaser.Input.Keyboard.Key
    d_key: Phaser.Input.Keyboard.Key
    instructions_text: Phaser.GameObjects.Text;
    mute: boolean;
    game_over_timestamp: number;

    constructor() {
        super('GameScene')
    }

    changeBackgroundColor() {
        while (true) {
            let b = Phaser.Math.RND.pick(background_colors)
            if (b != this.background_color) {
                this.cameras.main.setBackgroundColor(b)
                this.background_color = b
                break
            }
        }
    }

    increaseScore(s: number) {
        this.score += s
        if (this.score > this.highest_score) {
            this.highest_score = this.score
            // fixme: sound?
            this.save_data()
        }
        this.score_text.text = `${this.score}/${this.highest_score}`
    }

    toggle_mute() {
        this.mute = !this.mute
        this.sound.mute = this.mute
        if (this.mute) {
            this.mute_sprite.setVisible(false)
            this.mute_sprite.disableInteractive()
            this.unmute_sprite.setInteractive()
            this.unmute_sprite.setVisible(true)
        } else {
            this.mute_sprite.setVisible(true)
            this.mute_sprite.setInteractive()
            this.unmute_sprite.disableInteractive()
            this.unmute_sprite.setVisible(false)
        }
        this.save_data()
    }

    toggle_pause() {
        this.paused = !this.paused
        if (this.paused) {
            this.pause_sprite.setVisible(false)
            this.pause_sprite.disableInteractive()
            this.play_sprite.setInteractive()
            this.play_sprite.setVisible(true)
        } else {
            this.pause_sprite.setVisible(true)
            this.pause_sprite.setInteractive()
            this.play_sprite.disableInteractive()
            this.play_sprite.setVisible(false)
        }
    }

    toggle_fullscreen() {
        if (this.scale.isFullscreen) {
            this.fullscreen_on_sprite.setVisible(true)
            this.fullscreen_on_sprite.setInteractive()
            this.fullscreen_off_sprite.setVisible(false)
            this.fullscreen_off_sprite.disableInteractive()
            this.scale.stopFullscreen()
        } else {
            this.fullscreen_on_sprite.setVisible(false)
            this.fullscreen_on_sprite.disableInteractive()
            this.fullscreen_off_sprite.setVisible(true)
            this.fullscreen_off_sprite.setInteractive()
            this.scale.startFullscreen()
        }
    }

    save_data() {
        let obj = {
            mute: this.mute,
            highest_score: this.highest_score,
        }
        localStorage.setItem('save', JSON.stringify(obj))
    }

    load_data() {
        let obj;
        try {
            obj = JSON.parse(localStorage.getItem('save') || '')
        } catch {
        }
        if (obj) {
            this.mute = obj.mute
            this.sound.mute = obj.mute
            this.highest_score = obj.highest_score
        } else {
            this.mute = false
            this.sound.mute = false
            this.highest_score = 0
        }
        if (!this.highest_score) {
            this.highest_score = 0
        }
        if (!this.sound.mute) {
            this.sound.mute = false
        }
        if (!this.mute) {
            this.mute = false
        }
    }


    create() {
        this.frame_lag = 0
        this.state = GameState.FirstScreen
        this.paused = false
        this.score = 0
        this.snakes = new Snakes(this)
        this.foods = new Foods(this)
        this.cursors = this.input.keyboard.createCursorKeys()
        this.a_key = this.input.keyboard.addKey('a')
        this.d_key = this.input.keyboard.addKey('d')

        this.sound.volume = 0.1
        this.game_over_sound = this.sound.add('game_over')
        this.eat_sound = this.sound.add('eat1')

        this.load_data()

        this.restart_sprite = this.add.sprite(105, 6, 'restart')
            .setScale(0.5)
            .setInteractive()
            .setAlpha(0.5)
            .setOrigin(0, 0)
        this.restart_sprite.on('pointerdown', function() {
            this.scene.scene.restart()
        })

        this.pause_sprite = this.add.sprite(65, 6, 'pause')
            .setScale(0.5)
            .setInteractive()
            .setAlpha(0.5)
            .setOrigin(0, 0)
        this.pause_sprite.on('pointerdown', function() {
            this.scene.toggle_pause()
        })

        this.play_sprite = this.add.sprite(65, 6, 'play')
            .setScale(0.5)
            .setInteractive()
            .setAlpha(0.5)
            .setOrigin(0, 0)
            .setVisible(false)
        this.play_sprite.on('pointerdown', function() {
            this.scene.toggle_pause()
        })

        this.mute_sprite = this.add.sprite(26, 6, 'mute')
            .setScale(0.5)
            .setInteractive()
            .setAlpha(0.5)
            .setOrigin(0, 0)
            .setVisible(!this.mute)
        this.mute_sprite.on('pointerdown', function() {
            this.scene.toggle_mute()
        })

        this.unmute_sprite = this.add.sprite(26, 6, 'unmute')
            .setScale(0.5)
            .setInteractive()
            .setAlpha(0.5)
            .setOrigin(0, 0)
            .setVisible(this.mute)
        this.unmute_sprite.on('pointerdown', function() {
            this.scene.toggle_mute()
        })


        this.fullscreen_on_sprite = this.add.sprite(145, 6, 'larger')
        this.fullscreen_on_sprite.setScale(0.5)
            .setInteractive()
            .setAlpha(0.5)
            .setOrigin(0, 0)
            .setVisible(!this.scale.isFullscreen)
        this.fullscreen_on_sprite.on('pointerup', function() {
            this.scene.toggle_fullscreen()
        })


        this.fullscreen_off_sprite = this.add.sprite(145, 6, 'smaller')
        this.fullscreen_off_sprite.setScale(0.5)
            .setInteractive()
            .setAlpha(0.5)
            .setOrigin(0, 0)
            .setVisible(this.scale.isFullscreen)
        this.fullscreen_off_sprite.on('pointerup', function() {
            this.scene.toggle_fullscreen()
        })



        this.score_text = this.add.text(ScreenWidth - 6, 4, `${this.score}/${this.highest_score}`)
            .setFontFamily('Serif')
            .setFontSize(20)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setAlpha(0.6)
            .setOrigin(1, 0)


        this.game_over_text = this.add.text(ScreenWidth / 2, ScreenHeight / 2, `GameOver`)
            .setFontFamily('Serif')
            .setFontSize(50)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setOrigin(0.5, 0.5)
            .setDepth(1000)
        this.game_over_text.setVisible(false)


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

        this.input.keyboard.enabled

        this.instructions_text = this.add.text(ScreenWidth / 2, 100, instructions)

            .setAlign('center')
            .setFontFamily('Serif')
            .setFontSize(17)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setOrigin(0.5, 0)
            .setDepth(1000)
        this.instructions_text.setVisible(true)


        this.input.keyboard.on('keydown', (event) => {
            switch (event.key) {
                case "r":
                case "n":
                    this.scene.restart()
                    break
                case "m":
                    this.toggle_mute()
                    break
                case "p":
                    this.toggle_pause()
                    break
                case "f":
                    this.toggle_fullscreen()
                    break
            }
        })

        this.changeBackgroundColor()
    }

    game_over(snake_number: number) {
        this.game_over_timestamp = Date.now()
        this.game_over_text.setVisible(true)
        this.state = GameState.GameOver
        if (!this.mute) {
            this.game_over_sound.play()
        }
        this.snakes.snakes[snake_number].tongue.destroy()

        let square = this.add.graphics()
        square.fillStyle(snakeFoodColors[snake_number])
        let sz = 5
        square.fillRect(0, 0, sz, sz)
        square.generateTexture('square', sz, sz)

        let particles = this.add.particles('square')
        for (let cell of this.snakes.snakes[snake_number].tail) {
            let emitter = particles.createEmitter({
                x: cell.x + cell.width / 2,
                y: cell.y + cell.height / 2,
                frequency: 50,
                scale: { start: 1.0, end: 0.0 },
                lifespan: { min: 100, max: 200 },
                accelerationX: Phaser.Math.RND.between(-200, 200),
                accelerationY: Phaser.Math.RND.between(-200, 200),
                speed: { min: 80, max: 120 },
                angle: { min: 0, max: 360 },
                blendMode: 'ADD'

            })

            this.time.delayedCall(1000, function() { emitter.stop() }, [], this)
        }
    }

    update_frame() {
        if (this.state == GameState.FirstScreen ||
            this.state == GameState.GameOver) {
            if (this.a_key.isDown ||
                this.d_key.isDown ||
                this.cursors.left.isDown ||
                this.cursors.right.isDown ||
                (this.input.activePointer.isDown &&
                    this.input.activePointer.y > 70)) {
                if (this.state == GameState.GameOver &&
                    ((Date.now() - this.game_over_timestamp) > 500)) {
                    this.scene.restart()
                }
                if (this.state == GameState.FirstScreen) {
                    this.state = GameState.Playing
                    this.instructions_text.destroy()
                }

            }
        }
        if (this.state == GameState.Playing) {
            if (!this.paused) {
                this.snakes.update()
                this.foods.update()
            }
        }
    }

    update(time: number, delta: number) {
        let frameDuration = 1000 / FPS
        if (delta > 1000) {
            delta = frameDuration
        }
        this.frame_lag += delta
        while (this.frame_lag >= frameDuration) {
            this.update_frame()
            this.frame_lag -= frameDuration
        }
        //        let lagOffset = this.frame_lag / frameDuration
        this.render()
    }
    render() {
        this.snakes.render()
        this.foods.render()
    }
}

window.onload = () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('../service_worker.js?game_name=4snakes')
    }
    new Game()
}
