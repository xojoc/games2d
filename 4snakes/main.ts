//// copyright: AGPLv3 or later

// xojoc: this game is written in snake_case instead of
//        CamelCase because it's a snake game ;)

// todo: find better sounds

import { Games2d } from '../games2d.js'

const Scale = 2
const ScreenWidth = 450 * Scale
const ScreenHeight = 375 * Scale
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
                parent: "content",
                expandParent: true,
                autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
                mode: Phaser.Scale.FIT,
                fullscreenTarget: "content",
            },
            audio: {
                // xojoc(#5): temporaly disable WebAudio because of a bug on Firefox mobile
                disableWebAudio: true,
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
        this.load.audio('game_over', 'assets/game_over.ogg')
        this.load.audio('eat1', 'assets/eat1.ogg')
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
    left_eye: Phaser.GameObjects.Arc;
    right_eye: Phaser.GameObjects.Arc;
    rendered_atleast_once: boolean;
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
        for (let i = 0; i < 9; i++) {
            this.grow_only()
        }
        this.depth = 500
        this.render_frame = 0

        this.left_eye = this.config.game_scene.add.circle(0, 0, 3, 0x010101)
        this.left_eye.setDepth(this.depth + 1)
        this.right_eye = this.config.game_scene.add.circle(0, 0, 3, 0x010101)
        this.right_eye.setDepth(this.depth + 1)
    }
    grow_only() {
        let dtx = this.velocity.x * Math.cos(this.snake_angle)
        let dty = this.velocity.y * Math.sin(this.snake_angle)
        let new_cell = new Rt(this.tail[0].x + dtx,
            this.tail[0].y + dty,
            2 * Scale, 2 * Scale)

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
        let check_touch = (p: Phaser.Input.Pointer) => {
            if (p.isDown &&
                p.y > 70 * Scale) {
                if (p.x < ScreenWidth / 2) {
                    left_side_touch = true
                } else {
                    right_side_touch = true
                }
            }
        }
        check_touch(this.config.game_scene.input.pointer1)
        check_touch(this.config.game_scene.input.pointer2)
        check_touch(this.config.game_scene.input.pointer3)

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
        this.rendered_atleast_once = false

        //        let input_received = this.handle_input()
        this.handle_input()
        //     this.update_idle(input_received)

        this.move(this.velocity.x * Math.cos(this.snake_angle),
            this.velocity.y * Math.sin(this.snake_angle))
    }
    move(dtx: number, dty: number) {
        let new_cell = new Rt(this.tail[0].x + dtx,
            this.tail[0].y + dty,
            2 * Scale, 2 * Scale)
        new_cell.x += ScreenWidth
        new_cell.x %= ScreenWidth
        new_cell.y += ScreenHeight
        new_cell.y %= ScreenHeight

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
                if (!this.config.game_scene.menu.isMute()) {
                    this.config.game_scene.eat_sound.play()
                }
                this.config.game_scene.snakes.setActiveSnake(food.num)
                this.config.game_scene.increaseScore(1)
                this.velocity.x = Math.min(this.velocity.x + this.acceleration.x, 5.3 * Scale)
                this.velocity.y = Math.min(this.velocity.y + this.acceleration.y, 5.3 * Scale)

                this.config.game_scene.changeBackgroundColor()
                food.life = -1
                this.tail.push(this.tail[this.tail.length - 1])
                this.tail.push(this.tail[this.tail.length - 1])
                this.tail.push(this.tail[this.tail.length - 1])
                this.tail.push(this.tail[this.tail.length - 1])
                Games2d.vibrate(30)
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

        let snake_width = 10 * Scale



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

        let distance = 4.3

        let eyes_angle = this.snake_angle + Math.PI / 2

        this.left_eye.setPosition(this.tail[1].x - distance * Math.cos(eyes_angle),
            this.tail[1].y
            - distance * Math.sin(eyes_angle))

        this.left_eye.setRotation(eyes_angle)

        this.right_eye.setPosition(this.tail[1].x + distance * Math.cos(eyes_angle),
            this.tail[1].y
            + distance * Math.sin(eyes_angle))
        this.right_eye.setRotation(eyes_angle)


        this.rendered_atleast_once = true
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
            head: new Rt(51 * Scale, 50 * Scale, 10 * Scale, 10 * Scale),
            velocity: new Pt(3 * Scale, 3 * Scale),
            acceleration: new Pt(0.14 * Scale, 0.14 * Scale),
            num: 0,
            turn_angle: Math.PI / 18,
            turn_angle_idle: Math.PI / 120,
            keep_idle_direction_for_n_frames: 30,
            change_direction_after_n_idle_frames: 30
        }),
        new Snake({
            game_scene: scene,
            start_angle: Math.PI / 2,
            head: new Rt(ScreenWidth - 70 * Scale, 51 * Scale, 10 * Scale, 10 * Scale),
            velocity: new Pt(3 * Scale, 3 * Scale),
            acceleration: new Pt(0.14 * Scale, 0.14 * Scale),
            num: 1,
            turn_angle: Math.PI / 18,
            turn_angle_idle: Math.PI / 120,
            keep_idle_direction_for_n_frames: 30,
            change_direction_after_n_idle_frames: 30
        }),
        new Snake({
            game_scene: scene,
            start_angle: Math.PI,
            head: new Rt(ScreenWidth - 73 * Scale, ScreenHeight - 70 * Scale, 10 * Scale, 10 * Scale),
            velocity: new Pt(3 * Scale, 3 * Scale),
            acceleration: new Pt(0.14 * Scale, 0.14 * Scale),
            num: 2,
            turn_angle: Math.PI / 18,
            turn_angle_idle: Math.PI / 120,
            keep_idle_direction_for_n_frames: 30,
            change_direction_after_n_idle_frames: 30
        }),
        new Snake({
            game_scene: scene,
            start_angle: 3 * Math.PI / 2,
            head: new Rt(50 * Scale, ScreenHeight - 51 * Scale, 10 * Scale, 10 * Scale),
            velocity: new Pt(3 * Scale, 3 * Scale),
            acceleration: new Pt(0.14 * Scale, 0.14 * Scale),
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
            if (snake.rendered_atleast_once) {
                if (snake.config.game_scene.menu.isPaused()) {
                    continue
                }
                if (!snake.snake_is_active) {
                    continue
                }
            }
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
        let food_width = 13 * Scale
        let food_height = food_width
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
    highest_score: number
    score: number
    background_color: any
    foods: Foods
    snakes: Snakes
    game_over_text: Phaser.GameObjects.Text
    score_text: Phaser.GameObjects.Text
    frame_lag: number
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
    game_over_sound: Phaser.Sound.BaseSound
    eat_sound: Phaser.Sound.BaseSound
    a_key: Phaser.Input.Keyboard.Key
    d_key: Phaser.Input.Keyboard.Key
    instructions_text: Phaser.GameObjects.Text;
    game_over_timestamp: number;
    menu: Games2d.Menu;

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


    save_data() {
        let obj = {
            highest_score: this.highest_score,
        }
        localStorage.setItem('4snakes', JSON.stringify(obj))
    }

    load_data() {
        let obj;
        try {
            obj = JSON.parse(localStorage.getItem('4snakes') || '')
        } catch {
        }
        if (obj) {
            this.highest_score = obj.highest_score
        } else {
            this.highest_score = 0
        }
        if (!this.highest_score) {
            this.highest_score = 0
        }
    }


    create() {
        this.input.addPointer(2)
        this.frame_lag = 0
        this.state = GameState.FirstScreen
        this.score = 0
        this.snakes = new Snakes(this)
        this.foods = new Foods(this)
        this.cursors = this.input.keyboard.createCursorKeys()
        this.a_key = this.input.keyboard.addKey('a')
        this.d_key = this.input.keyboard.addKey('d')

        this.game_over_sound = this.sound.add('game_over')
        this.eat_sound = this.sound.add('eat1')

        this.load_data()

        this.menu = new Games2d.Menu({ scene: this })


        this.score_text = this.add.text(ScreenWidth - 6 * Scale, 4 * Scale, `${this.score}/${this.highest_score}`)
            .setFontFamily('Serif')
            .setFontSize(20 * Scale)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setAlpha(0.6)
            .setOrigin(1, 0)


        this.game_over_text = this.add.text(ScreenWidth / 2, ScreenHeight / 2, `GameOver`)
            .setFontFamily('Serif')
            .setFontSize(50 * Scale)
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

        this.instructions_text = this.add.text(ScreenWidth / 2, 100 * Scale, instructions)

            .setAlign('center')
            .setFontFamily('Serif')
            .setFontSize(17 * Scale)
            .setColor('#ffffff')
            .setFontStyle('bold')
            .setOrigin(0.5, 0)
            .setDepth(1000)
        this.instructions_text.setVisible(true)

        this.changeBackgroundColor()
    }

    game_over(snake_number: number) {
        this.game_over_timestamp = Date.now()
        this.game_over_text.setVisible(true)
        this.state = GameState.GameOver
        if (!this.menu.isMute()) {
            this.game_over_sound.play()
        }
        this.snakes.snakes[snake_number].left_eye.destroy()
        this.snakes.snakes[snake_number].right_eye.destroy()

        let square = this.add.graphics()
        square.fillStyle(snakeFoodColors[snake_number])
        let sz = 5 * Scale
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
                accelerationX: Phaser.Math.RND.between(-200 * Scale, 200 * Scale),
                accelerationY: Phaser.Math.RND.between(-200, 200),
                speed: { min: 80 * Scale, max: 120 * Scale },
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
                    this.input.activePointer.y > 70 * Scale)) {
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
            if (!this.menu.isPaused()) {
                this.snakes.update()
                this.foods.update()
            }
        }
    }

    update(_: number, delta: number) {
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
    new Game()
}
