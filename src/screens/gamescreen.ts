import { Display } from 'rot-js'
import {
	BaseInputHandler,
	GameInputHandler,
	InputState,
	handleMouse,
} from '../input-handler'
import { Action } from '../actions/actions'
import { Entity } from '../entity'
import { GameMap } from '../map'
import { generateDungeon } from '../procgen'
import { renderFrameWithTitle, renderHearts, renderInventory } from '../render'
import { ImpossibleException } from '../messagelog'
import { Colors } from '../values'
import { BaseScreen } from './screen'

export class GameScreen extends BaseScreen {
	public static readonly MAP_WIDTH = 80
	public static readonly MAP_HEIGHT = 43
	public static readonly MAX_ROOMS = 6
	public static readonly MIN_ROOM_SIZE = 3
	public static readonly MAX_ROOM_SIZE = 23
	public static readonly MAX_MONSTERS_PER_ROOM = 2
	public static readonly MAX_ITEMS_PER_ROOM = 2

	inputHandler: BaseInputHandler
	gameMap!: GameMap

	constructor(
		display: Display,
		player: Entity,
		public currentFloor: number = 0
	) {
		super(display, player)
		this.generateFloor()

		this.inputHandler = new GameInputHandler()
		this.gameMap.updateFov(this.player)
		//	this.player.get('body').takeDamage(6)
	}
	generateFloor(): void {
		this.currentFloor += 1

		this.gameMap = generateDungeon(
			GameScreen.MAP_WIDTH,
			GameScreen.MAP_HEIGHT,
			GameScreen.MAX_ROOMS,
			GameScreen.MIN_ROOM_SIZE,
			GameScreen.MAX_ROOM_SIZE,
			GameScreen.MAX_MONSTERS_PER_ROOM,
			GameScreen.MAX_ITEMS_PER_ROOM,
			this.player,
			this.display
		)
	}

	handleEnemyTurns() {
		this.gameMap.actors.forEach((e) => {
			if (e.cmp.body?.isAlive && e.cmp.ai) {
				try {
					e.cmp.ai.update()
					//e.ai?.perform(e)
				} catch (error) {
					//console.log(error)
				}
			}
		})
	}

	update(event: KeyboardEvent) {
		const action = this.inputHandler.handleKeyboardInput(event)
		if (action instanceof Action) {
			try {
				action.perform(this.player, this.gameMap)
				this.handleEnemyTurns()
				this.gameMap.updateFov(this.player)
			} catch (error) {
				if (error instanceof ImpossibleException) {
					window.msgLog.addMessage(error.message, Colors.Gray)
				}
			}
		}

		this.inputHandler = this.inputHandler.nextHandler

		this.render()
		return this
	}

	render() {
		this.display.clear()
		window.msgLog.render(this.display, 21, 45, 40, 5)
		renderHearts(this.display, 1, 47, 5)

		this.display.drawText(0, 47, `Dungeon level: ${this.currentFloor}`)
		this.gameMap.render()

		if (this.inputHandler.inputState === InputState.Log) {
			renderFrameWithTitle(3, 3, 74, 38, 'Message Log')
			window.msgLog.renderMessages(
				this.display,
				4,
				4,
				72,
				36,
				window.msgLog.messages.slice(0, this.inputHandler.logCursorPosition + 1)
			)
		}
		if (this.inputHandler.inputState === InputState.UseInventory) {
			renderInventory('Select an item to use')
		}
		if (this.inputHandler.inputState === InputState.DropInventory) {
			renderInventory('Select an item to drop')
		}
		if (this.inputHandler.inputState === InputState.Target) {
			const { x, y } = this.inputHandler.mousePosition
			this.display.drawOver(x, y, null, '#000', '#fff')
		}
		this.inputHandler.onRender(this.display)
	}
}
