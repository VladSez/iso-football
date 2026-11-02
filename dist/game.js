import { PITCH, GOAL, BALL_RADIUS, createShot, stepBall } from './physics.js'

// Pixel Plays supplies the rasterizer, camera, vegetation and articulated figures.
const PLAYER_COLORS = {
	shirt: [194, 85, 51],
	stripe: [194, 85, 51],
	legs: [44, 57, 69],
	skin: [193, 138, 97],
	hair: [48, 36, 31],
}
const KEEPER_COLORS = {
	shirt: [218, 183, 67],
	stripe: [218, 183, 67],
	legs: [50, 64, 65],
	skin: [176, 124, 89],
	hair: [47, 38, 32],
}
const POST = [241, 237, 217]
const NET = [187, 193, 166]
const STEEL = [89, 107, 87]
const BALL_WHITE = [245, 239, 217]
const BALL_DARK = [40, 49, 47]
const WOOD = [145, 111, 73]
const nodes = Object.fromEntries(
	[
		'goals',
		'shots',
		'saves',
		'feedback',
		'power-value',
		'power-fill',
		'power-meter',
		'shoot',
		'shoot-label',
		'low',
		'chip',
		'help',
		'help-open',
		'help-close',
		'help-play',
		'sound',
		'stage',
		'callout',
		'pause-overlay',
		'resume',
	].map((id) => [id, document.getElementById(id)]),
)
const state = {
	player: { x: 3.4, y: 1.2 },
	yaw: Math.atan2(0.6, -12.2),
	pointer: undefined,
	keeper: {
		x: -7.95,
		y: 0,
		diving: false,
		diveDirection: 1,
		reaction: 0,
		targetY: 0,
	},
	keys: new Set(),
	phase: 'ready',
	power: 0,
	shotKind: 'low',
	chargeSource: undefined,
	ball: undefined,
	returnAt: undefined,
	time: 0,
	walking: false,
	stride: 0,
	kick: 0,
	goals: 0,
	shots: 0,
	saves: 0,
	paused: false,
	scoredAt: -10,
}

function groundColor(x, y, ix, iy, index) {
	const edge =
		((Math.abs(x) / 12.5) ** 6 + (Math.abs(y) / 10.1) ** 6) ** (1 / 6)
	const ragged = edge + (noise(x * 1.7, y * 1.7) - 0.5) * 0.09
	if (ragged > 1.03 || (ragged > 0.9 && hash(ix, iy) < (ragged - 0.9) / 0.13))
		return 0
	const grain = (hash(ix, iy) - 0.5) * 9 + (noise(x * 1.4, y * 1.4) - 0.5) * 8
	if (Math.abs(x) <= 9 && Math.abs(y) <= 6.5) {
		kinds[index] = 1
		const stripe = Math.floor((x + 9) / 2.25) % 2
		let color = stripe ? [121, 150, 83] : [130, 157, 89]
		const boundary =
			(Math.abs(Math.abs(x) - 8.8) < 0.065 && Math.abs(y) <= 6.1) ||
			(Math.abs(Math.abs(y) - 6.05) < 0.065 && Math.abs(x) < 8.85)
		const penaltyBox =
			(Math.abs(x + 3.4) < 0.065 && Math.abs(y) < 4.4) ||
			(Math.abs(Math.abs(y) - 4.35) < 0.065 && x < -3.4 && x > -8.8)
		const goalBox =
			(Math.abs(x + 7) < 0.065 && Math.abs(y) < 3.35) ||
			(Math.abs(Math.abs(y) - 3.3) < 0.065 && x < -7 && x > -8.8)
		const arc = Math.abs(Math.hypot(x + 5.2, y) - 2.75) < 0.065 && x > -3.4
		const spot = Math.hypot(x + 5.2, y) < 0.105
		const halfway = Math.abs(x - 8.75) < 0.07
		const centerArc = Math.abs(Math.hypot(x - 8.75, y) - 2.1) < 0.065
		if (
			boundary ||
			penaltyBox ||
			goalBox ||
			arc ||
			spot ||
			halfway ||
			centerArc
		)
			color = [226, 226, 186]
		const wear = Math.exp(-((x + 7.8) ** 2 / 2 + (y * y) / 5)) * 0.65
		return rgb(
			lerp(color[0], 157, wear) + grain,
			lerp(color[1], 146, wear) + grain,
			lerp(color[2], 98, wear) + grain,
		)
	}
	if (y < -7 && y > -8.25 && x > -9.5 && x < 10) {
		kinds[index] = 2
		return rgb(181 + grain, 173 + grain, 147 + grain)
	}
	kinds[index] = KIND_GRASS
	const tone = clamp(
		Math.floor(noise(x * 0.8, y * 0.8) * 3.7 + hash(ix, iy)),
		0,
		4,
	)
	return rgb(...GRASS[tone])
}

function line3D(from, to, radius, color) {
	capsule(from, to, radius, radius, () => color, 'solid')
}

function drawGoal() {
	const { x, halfWidth: width, height, depth } = GOAL
	const age = state.time - state.scoredAt
	const ripple =
		!STILL && age < 1.1 ? Math.sin(age * 22) * Math.exp(-age * 3) * 0.28 : 0
	// The open front stays clear; the net occupies the back, sides and roof.
	for (let y = -width; y <= width + 0.01; y += 0.33) {
		line3D(
			[x - depth - ripple, y, 0.05],
			[x - depth - ripple, y, height],
			0.018,
			NET,
		)
		line3D([x, y, height], [x - depth - ripple, y, height], 0.018, NET)
	}
	for (let z = 0.05; z <= height; z += 0.3) {
		line3D(
			[x - depth - ripple, -width, z],
			[x - depth - ripple, width, z],
			0.018,
			NET,
		)
		for (const y of [-width, width])
			line3D([x, y, z], [x - depth - ripple, y, z], 0.018, NET)
	}
	for (let offset = 0.33; offset < depth; offset += 0.33) {
		for (const y of [-width, width])
			line3D([x - offset, y, 0], [x - offset, y, height], 0.018, NET)
	}
	for (const y of [-width, width]) {
		line3D([x, y, 0], [x, y, height], GOAL.postRadius, POST)
		line3D([x, y, height], [x - depth, y, height], 0.045, POST)
		line3D([x - depth, y, 0], [x - depth, y, height], 0.045, POST)
		line3D([x, y, 0.05], [x - depth, y, 0.05], 0.045, POST)
	}
	line3D([x, -width, height], [x, width, height], GOAL.postRadius, POST)
}

function bakePitch() {
	zb.fill(-1e9)
	pix.fill(rgb(255, 255, 255))
	for (let iy = 0; iy < H; iy++)
		for (let ix = 0; ix < W; ix++) {
			const p = unproject(ix + 0.5, iy + 0.5)
			const index = iy * W + ix
			const color = groundColor(p.x, p.y, ix, iy, index)
			if (!color) continue
			pix[index] = color
			ground[index] = 1
			zb[index] = ((p.x + p.y) / R2) * COS
		}
	groundZ.set(zb)
	growGrass()
	// A low boundary fence and a bench sit beyond the playable grass.
	for (let x = -9; x <= 9; x += 3)
		line3D([x, -8.35, 0], [x, -8.35, 1.6], 0.06, STEEL)
	for (const z of [0.4, 1.35])
		line3D([-9, -8.35, z], [9, -8.35, z], 0.045, STEEL)
	box(0.3, -8.25, 0.55, 3.8, -7.65, 0.7, WOOD)
	box(0.3, -8.35, 0.9, 3.8, -8.2, 1.4, WOOD)
	for (const x of [0.55, 3.45]) box(x, -8.15, 0, x + 0.12, -7.7, 0.55, STEEL)
	line3D([3.25, -7.95, 0.72], [3.25, -7.95, 1.12], 0.11, [84, 127, 146])
	box(4.9, -8.2, 0, 5.5, -7.6, 0.8, STEEL)
	box(4.85, -8.25, 0.8, 5.55, -7.55, 0.9, [59, 80, 66])
	growTree(-6.7, -8.5, 0.84, 330, 0)
	growTree(9.7, 4.9, 0.61, 230, 1200)
	for (let x = 0.5; x < 3.8; x += 0.2) castShadow(x, -7.9, 1, 0.35)
	for (const y of [-GOAL.halfWidth, GOAL.halfWidth]) {
		for (let z = 0; z < GOAL.height; z += 0.15) castShadow(GOAL.x, y, z, 0.1)
	}
	for (let y = -GOAL.halfWidth; y < GOAL.halfWidth; y += 0.15)
		castShadow(GOAL.x, y, GOAL.height, 0.1)
	bakeOcclusion()
	staticShadow.set(shadowMask)
	applyShadows(groundZ)
	bakedPix.set(pix)
	bakedZ.set(zb)
}

function setFeedback(message, goal = false) {
	nodes.feedback.textContent = message
	nodes.feedback.classList.toggle('goal', goal)
}

function updateStats() {
	for (const name of ['goals', 'shots', 'saves'])
		nodes[name].textContent = String(state[name]).padStart(2, '0')
}

function updateMeter() {
	const percent = Math.round(state.power * 100)
	nodes['power-value'].textContent = `${percent}%`
	nodes['power-fill'].style.width = `${percent}%`
	nodes['power-meter'].setAttribute('aria-valuenow', String(percent))
	document.body.classList.toggle('charging', state.phase === 'charging')
	nodes['shoot-label'].textContent =
		state.phase === 'charging'
			? 'Release to kick'
			: state.phase === 'flight'
				? 'Ball returns in a moment…'
				: 'Hold to charge · release to shoot'
	nodes.shoot.disabled = state.phase === 'flight' || state.paused
	nodes.low.disabled = state.phase === 'flight'
	nodes.chip.disabled = state.phase === 'flight'
}

function selectShot(kind) {
	if (state.phase === 'flight') return
	state.shotKind = kind
	nodes.low.setAttribute('aria-pressed', String(kind === 'low'))
	nodes.chip.setAttribute('aria-pressed', String(kind === 'chip'))
}

function beginCharge(source) {
	if (state.phase !== 'ready' || state.paused || nodes.help.open) return
	state.phase = 'charging'
	state.chargeSource = source
	state.power = 0
	updateMeter()
}

function releaseShot(source) {
	if (state.phase !== 'charging' || state.chargeSource !== source) return
	state.ball = createShot(state.player, state.yaw, state.power, state.shotKind)
	state.phase = 'flight'
	state.chargeSource = undefined
	state.returnAt = undefined
	state.shots++
	state.kick = 0.35
	state.keeper.reaction = 0.2
	state.keeper.diving = false
	const ball = state.ball
	const timeToKeeper = ball.vx < -0.1 ? (state.keeper.x - ball.x) / ball.vx : 0
	state.keeper.targetY = clamp(ball.y + ball.vy * timeToKeeper, -2.5, 2.5)
	state.keeper.diveDirection =
		Math.sign(state.keeper.targetY - state.keeper.y) || 1
	setFeedback(state.shotKind === 'chip' ? 'Up and over?' : 'Pick your corner.')
	updateStats()
	updateMeter()
	playSound('kick')
}

function cancelInput() {
	state.keys.clear()
	if (state.phase === 'charging') state.phase = 'ready'
	state.chargeSource = undefined
	state.power = 0
	state.walking = false
	updateMeter()
}

function pauseGame(paused) {
	cancelInput()
	state.paused = paused
	nodes['pause-overlay'].hidden = !paused
	updateMeter()
}

function returnBall() {
	state.phase = 'ready'
	state.ball = undefined
	state.power = 0
	state.returnAt = undefined
	state.keeper.diving = false
	updateMeter()
	setFeedback('Find your spot. Have another go.')
}

function aimAtPointer(event) {
	const rect = canvas.getBoundingClientRect()
	state.pointer = unproject(
		((event.clientX - rect.left) * W) / rect.width,
		((event.clientY - rect.top) * H) / rect.height,
	)
	updateAim()
}

function updateAim() {
	if (!state.pointer || state.phase === 'flight') return
	const dx = state.pointer.x - state.player.x
	const dy = state.pointer.y - state.player.y
	if (Math.hypot(dx, dy) > 0.3) state.yaw = Math.atan2(dy, dx)
}

function updateKeeper(delta) {
	const keeper = state.keeper
	let target = clamp(state.player.y * 0.32, -1.65, 1.65)
	let speed = 1.6
	if (state.ball && !state.ball.outcome) {
		keeper.reaction -= delta
		if (keeper.reaction <= 0 && state.ball.vx < 0) {
			target = keeper.targetY
			speed = 3.7
			const remaining = (keeper.x - state.ball.x) / state.ball.vx
			if (remaining > 0 && remaining < 0.23) keeper.diving = true
		} else return
	}
	if (state.ball?.outcome) return
	keeper.y += clamp(target - keeper.y, -speed * delta, speed * delta)
}

function update(delta) {
	if (state.paused || nodes.help.open) return
	state.time += delta
	state.kick = Math.max(0, state.kick - delta)
	const keys = state.keys
	let screenX =
		Number(keys.has('KeyD') || keys.has('ArrowRight')) -
		Number(keys.has('KeyA') || keys.has('ArrowLeft'))
	let screenY =
		Number(keys.has('KeyS') || keys.has('ArrowDown')) -
		Number(keys.has('KeyW') || keys.has('ArrowUp'))
	const length = Math.hypot(screenX, screenY)
	state.walking = length > 0
	if (length) {
		screenX /= length
		screenY /= length
		const speed = state.phase === 'charging' ? 2.4 : 4.1
		state.player.x = clamp(
			state.player.x + ((screenX + screenY) / R2) * speed * delta,
			-6.5,
			PITCH.maxX - 0.5,
		)
		state.player.y = clamp(
			state.player.y + ((screenY - screenX) / R2) * speed * delta,
			-PITCH.halfWidth + 0.5,
			PITCH.halfWidth - 0.5,
		)
		state.stride += delta * 11
		updateAim()
	}
	const turn = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'))
	if (turn && state.phase !== 'flight') {
		state.pointer = undefined
		state.yaw += turn * 1.7 * delta
	}
	if (state.phase === 'charging')
		state.power = Math.min(1, state.power + delta / 1.2)
	updateKeeper(delta)
	if (state.ball) {
		const events = stepBall(state.ball, delta, state.keeper)
		for (const event of events) {
			playSound(event)
			if (event === 'goal') {
				state.goals++
				state.scoredAt = state.time
				nodes.callout.hidden = false
				setFeedback(
					state.shotKind === 'chip'
						? 'Lovely chip. Goal!'
						: 'In the back of the net!',
					true,
				)
			} else if (event === 'save') {
				state.saves++
				setFeedback('Saved. Try the far corner.')
			} else if (event === 'post') setFeedback('Off the woodwork!')
			else if (event === 'miss') setFeedback('Just the next one, then.')
			if (event !== 'bounce') {
				state.returnAt = state.time + (event === 'goal' ? 1.8 : 1.5)
				updateStats()
			}
		}
		if (state.returnAt !== undefined && state.time >= state.returnAt)
			returnBall()
	}
	if (state.time - state.scoredAt > 1.7) nodes.callout.hidden = true
	updateMeter()
}

function drawFootball(ball) {
	castShadow(ball.x, ball.y, ball.z, BALL_RADIUS, 2, 0)
	sphere(ball.x, ball.y, ball.z, BALL_RADIUS, BALL_WHITE, 'solid')
	const rotation = state.time * (state.ball ? 9 : state.walking ? 7 : 0)
	for (let i = 0; i < 5; i++) {
		const angle = rotation + (i * Math.PI * 2) / 5
		sphere(
			ball.x + Math.cos(angle) * 0.13,
			ball.y + Math.sin(angle) * 0.13,
			ball.z + (i % 2 ? 0.09 : 0.015),
			0.061,
			BALL_DARK,
			'solid',
		)
	}
}

function drawKeeper() {
	const keeper = state.keeper
	if (!keeper.diving) {
		figure(
			keeper.x,
			keeper.y,
			0,
			{ scale: 0.68, stance: 0.37, crouch: 0.4, armR: 0.5, armL: 0.5 },
			KEEPER_COLORS,
			dynamicAdd,
		)
		return
	}
	const direction = keeper.diveDirection
	const p = (y, z) => [keeper.x, keeper.y + y * direction, z]
	dynamicAdd(
		p(-0.55, 0.4),
		p(0.15, 0.75),
		0.19,
		0.23,
		() => KEEPER_COLORS.shirt,
	)
	dynamicAdd(p(0.15, 0.75), p(0.48, 0.9), 0.15, 0.16, () => KEEPER_COLORS.skin)
	dynamicAdd(
		p(-0.55, 0.4),
		p(-1.05, 0.22),
		0.12,
		0.09,
		() => KEEPER_COLORS.legs,
	)
	dynamicAdd(p(-0.55, 0.4), p(-0.8, 0.12), 0.12, 0.09, () => KEEPER_COLORS.legs)
	for (const offset of [-0.14, 0.14]) {
		dynamicAdd(
			[keeper.x + offset, keeper.y + 0.1 * direction, 0.7],
			[keeper.x + offset, keeper.y + 0.83 * direction, 0.68],
			0.09,
			0.07,
			() => KEEPER_COLORS.shirt,
		)
		sphere(
			keeper.x + offset,
			keeper.y + 0.87 * direction,
			0.68,
			0.1,
			BALL_WHITE,
			'solid',
		)
	}
}

function drawAim() {
	if (state.phase === 'flight') return
	const points = []
	const distance = state.pointer
		? clamp(
				Math.hypot(
					state.pointer.x - state.player.x,
					state.pointer.y - state.player.y,
				),
				2,
				15,
			)
		: 12
	for (let t = 1; t < distance; t += 0.5) {
		const x = state.player.x + Math.cos(state.yaw) * t
		const y = state.player.y + Math.sin(state.yaw) * t
		if (x < GOAL.x - 0.1 || x > 9 || Math.abs(y) > 6.2) break
		const p = project(x, y, 0.03)
		points.push([p.sx, p.sy])
	}
	drawDots(points, rgb(246, 241, 207))
}

function draw() {
	pix.set(bakedPix)
	zb.set(bakedZ)
	pendingShadows.length = 0
	drawTufts(STILL ? 0 : Math.floor(state.time * WIND_FPS) / WIND_FPS)
	drawLeaves(STILL ? 0 : Math.floor(state.time * WIND_FPS) / WIND_FPS)
	drawGoal()
	drawAim()
	const stride = state.walking ? Math.sin(state.stride) * 0.27 : 0.12
	const kickPose = state.kick > 0 ? Math.sin((state.kick / 0.35) * Math.PI) : 0
	figure(
		state.player.x,
		state.player.y,
		state.yaw,
		{
			scale: 0.72,
			stance: stride + kickPose * 0.55,
			lean: state.phase === 'charging' ? 0.12 : kickPose * -0.15,
			armR: state.walking ? -stride * 1.3 : -0.12,
			armL: state.walking ? stride * 1.3 : 0.16,
		},
		PLAYER_COLORS,
		dynamicAdd,
	)
	drawKeeper()
	const dribble = state.walking ? 0.07 * Math.sin(state.stride * 2) : 0
	const ball = state.ball ?? {
		x: state.player.x + Math.cos(state.yaw) * (0.65 + dribble),
		y: state.player.y + Math.sin(state.yaw) * (0.65 + dribble),
		z: BALL_RADIUS,
	}
	drawFootball(ball)
	flushShadows()
	applyShadows(groundZ)
	shadeEdges()
	ctx.putImageData(image, 0, 0)
}

let audioContext
let soundEnabled = false
function playSound(kind) {
	if (!soundEnabled) return
	audioContext ??= new AudioContext()
	if (audioContext.state === 'suspended') audioContext.resume()
	const sounds = {
		kick: [105, 0.08],
		bounce: [155, 0.045],
		save: [90, 0.12],
		post: [720, 0.22],
		goal: [523, 0.3],
		miss: [175, 0.08],
	}
	const [frequency, duration] = sounds[kind]
	const oscillator = audioContext.createOscillator()
	const gain = audioContext.createGain()
	oscillator.type = kind === 'post' ? 'triangle' : 'sine'
	oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
	oscillator.frequency.exponentialRampToValueAtTime(
		kind === 'goal' ? 880 : frequency * 0.5,
		audioContext.currentTime + duration,
	)
	gain.gain.setValueAtTime(0.055, audioContext.currentTime)
	gain.gain.exponentialRampToValueAtTime(
		0.001,
		audioContext.currentTime + duration,
	)
	oscillator.connect(gain).connect(audioContext.destination)
	oscillator.start()
	oscillator.stop(audioContext.currentTime + duration)
}

function resize() {
	const rect = nodes.stage.getBoundingClientRect()
	const dpr = devicePixelRatio || 1
	// Fit the visible diorama, excluding the canvas's white margins.
	const available = Math.min(
		(rect.width - 24) / 320,
		(rect.height - 24) / 190,
		3,
	)
	// Small windows need fractional scaling to use their available width.
	const scale = Math.max(
		0.5,
		available < 1.5 ? available : Math.floor(available * dpr) / dpr,
	)
	canvas.style.width = `${W * scale}px`
	canvas.style.height = `${H * scale}px`
}

function openHelp() {
	cancelInput()
	nodes.help.showModal()
}

canvas.addEventListener('pointermove', aimAtPointer)
canvas.addEventListener('pointerdown', (event) => {
	aimAtPointer(event)
	canvas.focus()
})
window.addEventListener('keydown', (event) => {
	const controlled = [
		'Space',
		'ArrowUp',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'KeyW',
		'KeyA',
		'KeyS',
		'KeyD',
		'KeyQ',
		'KeyE',
		'KeyC',
	]
	if (event.ctrlKey || event.metaKey || event.altKey) return
	if (nodes.help.open) return
	// Preserve keyboard activation for focused buttons and links.
	if (document.activeElement?.matches('button, a') && event.code !== 'Escape')
		return
	if (controlled.includes(event.code)) event.preventDefault()
	if (event.code === 'Escape') {
		event.preventDefault()
		if (state.phase === 'charging') cancelInput()
		else pauseGame(!state.paused)
		return
	}
	if (state.paused) return
	state.keys.add(event.code)
	if (event.repeat) return
	if (event.code === 'Space') beginCharge('keyboard')
	if (event.code === 'KeyC')
		selectShot(state.shotKind === 'low' ? 'chip' : 'low')
})
window.addEventListener('keyup', (event) => {
	state.keys.delete(event.code)
	if (event.code === 'Space') releaseShot('keyboard')
})
window.addEventListener('blur', () => pauseGame(true))
document.addEventListener('visibilitychange', () => {
	if (document.hidden) pauseGame(true)
})
nodes.shoot.addEventListener('pointerdown', (event) => {
	if (event.button !== 0) return
	event.preventDefault()
	nodes.shoot.setPointerCapture(event.pointerId)
	beginCharge('pointer')
})
nodes.shoot.addEventListener('pointerup', () => {
	releaseShot('pointer')
	canvas.focus()
})
nodes.shoot.addEventListener('pointercancel', cancelInput)
nodes.shoot.addEventListener('keydown', (event) => {
	if (event.code === 'Space' || event.code === 'Enter') {
		event.preventDefault()
		if (!event.repeat) beginCharge('button')
	}
})
nodes.shoot.addEventListener('keyup', (event) => {
	if (event.code === 'Space' || event.code === 'Enter') {
		event.preventDefault()
		releaseShot('button')
	}
})
nodes.low.addEventListener('click', () => {
	selectShot('low')
	canvas.focus()
})
nodes.chip.addEventListener('click', () => {
	selectShot('chip')
	canvas.focus()
})
nodes['help-open'].addEventListener('click', openHelp)
for (const id of ['help-close', 'help-play'])
	nodes[id].addEventListener('click', () => nodes.help.close())
nodes.help.addEventListener('close', () => {
	cancelInput()
	canvas.focus()
})
nodes.resume.addEventListener('click', () => {
	pauseGame(false)
	canvas.focus()
})
nodes.sound.addEventListener('click', () => {
	soundEnabled = !soundEnabled
	nodes.sound.textContent = soundEnabled ? 'Sound on' : 'Sound off'
	nodes.sound.setAttribute('aria-pressed', String(soundEnabled))
	if (soundEnabled) playSound('kick')
	canvas.focus()
})
window.addEventListener('resize', resize)

bakePitch()
resize()
updateStats()
updateMeter()
let previousTime
let accumulator = 0
function frame(now) {
	if (previousTime !== undefined)
		accumulator += Math.min((now - previousTime) / 1000, 0.1)
	previousTime = now
	while (accumulator >= 1 / 60) {
		update(1 / 60)
		accumulator -= 1 / 60
	}
	draw()
	requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
