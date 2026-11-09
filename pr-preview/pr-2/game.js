import {
	PITCH,
	GOAL,
	BALL_RADIUS,
	createShot,
	stepBall,
} from './physics.js?v=10'
import { startAudio, setSound, setAudioPaused, playSound } from './audio.js?v=10'
import { COURTS, gradeFrame, line3D } from './courts.js?v=10'
import {
	KICKS,
	TARGET,
	ROUNDS,
	score,
	roundResult,
	advance,
	summarize,
	keeperGuess,
} from './shootout.js?v=10'

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
const BALL_WHITE = [245, 239, 217]
const BALL_DARK = [40, 49, 47]
const nodes = Object.fromEntries(
	[
		'goals',
		'shots',
		'saves',
		'accuracy',
		'stats',
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
		'round-card',
		'round-stage',
		'round-title',
		'round-note',
		'sheet-you',
		'round-goals',
		'round-saves',
		'round-misses',
		'round-shots',
		'round-next',
		'round-next-label',
		'sound',
		'sound-menu',
		'sound-options',
		'sound-label',
		'sound-arrow',
		'pitch',
		'pitch-menu',
		'pitch-options',
		'pitch-label',
		'pitch-arrow',
		'mode',
		'mode-menu',
		'mode-options',
		'mode-label',
		'mode-arrow',
		'stage',
		'stick',
		'stick-knob',
		'turn',
		'callout',
		'callout-detail',
		'pause-overlay',
		'resume',
	].map((id) => [id, document.getElementById(id)]),
)
// Phones and tablets get the on-screen stick, turn buttons and Shoot button instead of the keyboard hints.
const IS_TOUCH = matchMedia('(pointer: coarse)').matches
// On touch the player faces the goal mouth until a tap or drag on the pitch aims somewhere else.
const GOAL_MOUTH = { x: GOAL.x, y: 0 }
// Where the player can stand: short of the goal area, and inside the touchlines.
const PLAYER_RANGE = {
	minX: -6.5,
	maxX: PITCH.maxX - 0.5,
	halfWidth: PITCH.halfWidth - 0.5,
}
// The kicker stands here in a shootout, with the ball on the spot just ahead, about 10 m out.
const PENALTY_SPOT = { x: -1, y: 0 }
const KEEPER_DIVE_Y = 1.7
// A keeper who stays in the middle can jump for a chip down the middle.
const KEEPER_STAND_TOP = 2.3
const state = {
	mode: 'practice',
	shootout: undefined,
	cup: { round: 0, best: 0, cups: 0 },
	player: { x: 3.4, y: 1.2 },
	yaw: Math.atan2(0.6, -12.2),
	pointer: undefined,
	stick: { x: 0, y: 0 },
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
	shotKind: 'chip',
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
	court: COURTS.neighborhood,
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

let sceneBox

function bakePitch() {
	const court = state.court
	zb.fill(-1e9)
	// Transparent, so the pitch's drop shadow in style.css follows its edge instead of the canvas box.
	pix.fill(0)
	ground.fill(0)
	kinds.fill(KIND_NONE)
	shadowMask.fill(0)
	tufts.length = 0
	leaves.length = 0
	for (let iy = 0; iy < H; iy++)
		for (let ix = 0; ix < W; ix++) {
			const p = unproject(ix + 0.5, iy + 0.5)
			const index = iy * W + ix
			const color = court.ground(p.x, p.y, ix, iy, index)
			if (!color) continue
			pix[index] = color
			ground[index] = 1
			zb[index] = ((p.x + p.y) / R2) * COS
		}
	groundZ.set(zb)
	growGrass()
	court.props()
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
	sceneBox = measureScene()
}

// The drawn diorama in canvas pixels: the baked scene plus the leaves, which sway a pixel each way.
function measureScene() {
	const box = { left: W, top: H, right: 0, bottom: 0 }
	const include = (ix, iy, margin) => {
		box.left = Math.min(box.left, ix - margin)
		box.top = Math.min(box.top, iy - margin)
		box.right = Math.max(box.right, ix + 1 + margin)
		box.bottom = Math.max(box.bottom, iy + 1 + margin)
	}
	for (let iy = 0; iy < H; iy++)
		for (let ix = 0; ix < W; ix++)
			if (bakedPix[iy * W + ix] !== 0) include(ix, iy, 0)
	for (const leaf of leaves)
		for (let n = 0; n < leaf.pixels.length; n += 4)
			include(leaf.pixels[n], leaf.pixels[n + 1], 1)
	return box
}

function setFeedback(message, goal = false) {
	nodes.feedback.textContent = message
	nodes.feedback.classList.toggle('goal', goal)
}

const STAT_NAMES = {
	practice: ['GOALS', 'SHOTS', 'SAVES', 'ACCURACY'],
	shootout: ['GOALS', 'SAVED', 'KICKS', 'ROUND'],
}

function updateStats() {
	nodes.stats.querySelectorAll('span').forEach((label, index) => {
		label.textContent = STAT_NAMES[state.mode][index]
	})
	if (state.shootout) {
		const kicks = state.shootout
		setGoals(`${score(kicks)}/${TARGET}`)
		nodes.shots.textContent = String(summarize(kicks).saves)
		nodes.saves.textContent = `${kicks.length}/${KICKS}`
		nodes.accuracy.textContent = `${state.cup.round + 1}/${ROUNDS.length}`
		return
	}
	setGoals(String(state.goals).padStart(2, '0'))
	for (const name of ['shots', 'saves'])
		nodes[name].textContent = String(state[name]).padStart(2, '0')
	nodes.accuracy.textContent = state.shots
		? `${Math.round((state.goals / state.shots) * 100)}%`
		: '—'
}

// The goal count pops when it goes up, but not when a new round resets it or the mode changes.
function setGoals(text) {
	const { goals } = nodes
	const isUp = goals.dataset.mode === state.mode && parseInt(text) > parseInt(goals.textContent)
	if (isUp) replayAnimation(goals, 'scored')
	goals.dataset.mode = state.mode
	goals.textContent = text
}

function replayAnimation(node, className) {
	node.classList.remove(className)
	void node.offsetWidth
	node.classList.add(className)
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
	if (state.phase !== 'ready' || state.paused || isDialogOpen()) return
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
	if (!state.shootout) state.shots++
	state.kick = 0.35
	state.keeper.reaction = 0.2
	state.keeper.diving = false
	const ball = state.ball
	const timeToKeeper = ball.vx < -0.1 ? (state.keeper.x - ball.x) / ball.vx : 0
	const aimY = ball.y + ball.vy * timeToKeeper
	if (state.shootout) {
		// A penalty is too quick to read, so the keeper guesses a side as the ball is struck.
		state.keeper.reaction = 0
		const { read } = ROUNDS[state.cup.round]
		state.keeper.targetY = keeperGuess(aimY, Math.random(), read) * KEEPER_DIVE_Y
	} else state.keeper.targetY = clamp(aimY, -2.5, 2.5)
	state.keeper.diveDirection =
		Math.sign(state.keeper.targetY - state.keeper.y) || 1
	setFeedback(
		state.shootout
			? 'The keeper guesses…'
			: state.shotKind === 'chip'
				? 'Up and over?'
				: 'Pick your corner.',
	)
	updateStats()
	updateMeter()
	playSound('kick')
}

function cancelInput() {
	state.keys.clear()
	state.stick.x = 0
	state.stick.y = 0
	if (state.phase === 'charging') state.phase = 'ready'
	state.chargeSource = undefined
	state.power = 0
	state.walking = false
	updateMeter()
}

function pauseGame(paused) {
	cancelInput()
	state.paused = paused
	setAudioPaused(paused || isDialogOpen())
	nodes['pause-overlay'].hidden = !paused
	updateMeter()
}

function isDialogOpen() {
	return nodes.help.open || nodes['round-card'].open
}

function returnBall() {
	const kick = state.ball && {
		scored: state.ball.outcome === 'goal',
		kind: state.shotKind,
		outcome: state.ball.outcome,
	}
	state.phase = 'ready'
	state.ball = undefined
	state.power = 0
	state.returnAt = undefined
	state.keeper.diving = false
	updateMeter()
	if (state.shootout) recordPenalty(kick)
	else setFeedback('Find your spot. Have another go.')
}

// Each kick goes on the sheet; the round ends as soon as you're through or can't get there.
function recordPenalty(kick) {
	state.shootout = [...state.shootout, kick]
	updateStats()
	const result = roundResult(state.shootout)
	if (result) return finishRound(result)
	const needed = TARGET - score(state.shootout)
	const left = KICKS - state.shootout.length
	setFeedback(
		`${needed} more ${needed === 1 ? 'goal' : 'goals'} to go through, ${left} ${left === 1 ? 'kick' : 'kicks'} left.`,
	)
}

function finishRound(result) {
	const played = ROUNDS[state.cup.round]
	const next = advance(state.cup.round, result)
	state.cup = {
		round: next.round,
		best: Math.max(state.cup.best, result === 'through' ? state.cup.round + 1 : 0),
		cups: state.cup.cups + Number(next.cup),
	}
	save(CUP_STORAGE_KEY, JSON.stringify(state.cup))
	showRoundCard(played, result, next)
}

const SHEET_MARKS = { goal: '●', save: '○', miss: '×', post: '×' }

function showRoundCard(played, result, next) {
	const kicks = state.shootout
	const won = result === 'through'
	const nextName = ROUNDS[next.round].name.toLowerCase()
	nodes['round-stage'].textContent = `${played.name.toUpperCase()} · ${score(kicks)} OF ${kicks.length} SCORED`
	nodes['round-title'].textContent = next.cup
		? 'Cup winners!'
		: won
			? `Through to the ${nextName}.`
			: 'Knocked out.'
	nodes['round-note'].textContent = next.cup
		? `That's ${state.cup.cups} ${state.cup.cups === 1 ? 'cup' : 'cups'}. The next run starts from round one.`
		: won
			? 'The next keeper reads you better, dives further and moves faster.'
			: 'The run starts over from round one.'
	nodes['sheet-you'].textContent = Array.from({ length: KICKS }, (_, index) =>
		kicks[index] ? SHEET_MARKS[kicks[index].outcome] : '·',
	).join(' ')
	const numbers = summarize(kicks)
	nodes['round-goals'].textContent = `${numbers.goals} of ${kicks.length}`
	nodes['round-saves'].textContent = String(numbers.saves)
	nodes['round-misses'].textContent = String(numbers.misses)
	nodes['round-shots'].textContent =
		`Chips: ${numbers.chipGoals} of ${numbers.chips} went in. Low shots: ${numbers.lowGoals} of ${numbers.lows} went in.`
	nodes['round-next-label'].textContent = next.cup || !won
		? 'Start a new run'
		: `On to the ${nextName}`
	cancelInput()
	nodes['round-card'].showModal()
	setAudioPaused(true)
	playSound(won ? 'goal' : 'save')
}

function startShootout() {
	const round = ROUNDS[state.cup.round]
	state.shootout = []
	state.yaw = Math.PI
	state.pointer = undefined
	Object.assign(state.keeper, {
		y: 0,
		diving: false,
		diveTop: round.diveTop,
		diveReach: round.diveReach,
		standTop: KEEPER_STAND_TOP,
		speed: round.speed,
	})
	setFeedback(`${round.name}. Score ${TARGET} of ${KICKS} to go through.`)
	updateStats()
}

function setMode(mode) {
	cancelInput()
	state.mode = mode
	state.ball = undefined
	state.phase = 'ready'
	state.returnAt = undefined
	document.body.classList.toggle('shootout', mode === 'shootout')
	if (mode === 'shootout') {
		state.player = { ...PENALTY_SPOT }
		state.yaw = Math.PI
		state.pointer = undefined
		startShootout()
	} else {
		state.shootout = undefined
		Object.assign(state.keeper, {
			y: 0,
			diving: false,
			diveTop: undefined,
			diveReach: undefined,
			standTop: undefined,
			speed: undefined,
		})
		setFeedback('A little grass. All afternoon.')
		updateStats()
	}
	updateMeter()
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
	const target = state.pointer ?? (IS_TOUCH ? GOAL_MOUTH : undefined)
	if (!target || state.phase === 'flight') return
	const dx = target.x - state.player.x
	const dy = target.y - state.player.y
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
			speed = keeper.speed ?? 3.7
			const remaining = (keeper.x - state.ball.x) / state.ball.vx
			if (remaining > 0 && remaining < 0.23 && keeper.targetY !== 0)
				keeper.diving = true
		} else return
	}
	if (state.ball?.outcome) return
	keeper.y += clamp(target - keeper.y, -speed * delta, speed * delta)
}

function update(delta) {
	if (state.paused || isDialogOpen()) return
	state.time += delta
	state.kick = Math.max(0, state.kick - delta)
	const keys = state.keys
	let screenX =
		Number(keys.has('KeyD') || keys.has('ArrowRight')) -
		Number(keys.has('KeyA') || keys.has('ArrowLeft')) +
		state.stick.x
	let screenY =
		Number(keys.has('KeyS') || keys.has('ArrowDown')) -
		Number(keys.has('KeyW') || keys.has('ArrowUp')) +
		state.stick.y
	// The penalty taker stays on the spot and only turns.
	const length = state.shootout ? 0 : Math.hypot(screenX, screenY)
	state.walking = length > 0
	if (length) {
		// Keys always walk at full speed; a partly pushed stick walks slower, for small adjustments.
		if (length > 1) {
			screenX /= length
			screenY /= length
		}
		const speed = state.phase === 'charging' ? 2.4 : 4.1
		state.player.x = clamp(
			state.player.x + ((screenX + screenY) / R2) * speed * delta,
			PLAYER_RANGE.minX,
			PLAYER_RANGE.maxX,
		)
		state.player.y = clamp(
			state.player.y + ((screenY - screenX) / R2) * speed * delta,
			-PLAYER_RANGE.halfWidth,
			PLAYER_RANGE.halfWidth,
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
				if (!state.shootout) state.goals++
				state.scoredAt = state.time
				showCallout()
				setFeedback(
					state.shotKind === 'chip'
						? 'Lovely chip. Goal!'
						: 'In the back of the net!',
					true,
				)
			} else if (event === 'save') {
				if (!state.shootout) state.saves++
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
	if (state.time - state.scoredAt > 1.8) nodes.callout.hidden = true
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
	drawDots(points, rgb(...(state.court.aim ?? [246, 241, 207])))
}

function draw() {
	pix.set(bakedPix)
	zb.set(bakedZ)
	pendingShadows.length = 0
	const windTime = STILL ? 0 : Math.floor(state.time * WIND_FPS) / WIND_FPS
	drawTufts(windTime)
	drawLeaves(windTime)
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
	state.court.weather?.(windTime)
	gradeFrame(state.court)
	ctx.putImageData(image, 0, 0)
}

// The pitch's playing surface, in canvas pixels. Narrow screens fit its width instead of the
// whole diorama, cropping the grass and scenery at the sides, which makes the pitch about 1.5× bigger.
const PITCH_SPAN = (() => {
	const xs = [
		[PITCH.minX, PITCH.halfWidth],
		[PITCH.maxX, -PITCH.halfWidth],
	].map(([x, y]) => project(x, y, 0).sx)
	return { left: xs[0], right: xs[1] }
})()
const SCENE_GAP = 16
const header = document.querySelector('.header')
const footer = document.querySelector('.footer')

// The play area in canvas pixels: everywhere the player can stand (with their height), and the goal frame.
// Touch screens fit this instead of the whole diorama, like iso-hoops fits its court, and fade out the grass,
// scenery and pitch corners that crop, which makes the pitch about 15% bigger upright and 50% bigger sideways.
const PLAY_BOX = (() => {
	const { minX, maxX, halfWidth } = PLAYER_RANGE
	const points = [
		...[minX, maxX].flatMap((x) =>
			[-halfWidth, halfWidth].flatMap((y) => [
				project(x, y, 0),
				project(x, y, 2),
			]),
		),
		...[GOAL.x, GOAL.x - GOAL.depth].flatMap((x) =>
			[-GOAL.halfWidth, GOAL.halfWidth].flatMap((y) => [
				project(x, y, 0),
				project(x, y, GOAL.height),
			]),
		),
	]
	const xs = points.map((point) => point.sx)
	const ys = points.map((point) => point.sy)
	return {
		left: Math.min(...xs) - 2,
		top: Math.min(...ys) - 2,
		right: Math.max(...xs) + 2,
		bottom: Math.max(...ys) + 2,
	}
})()
const TOUCH_GUTTER = 8
// Phone landscape moves the settings and links into a column on the left, beside the pitch.
const TOUCH_LANDSCAPE = matchMedia(
	'(pointer: coarse) and (orientation: landscape) and (max-height: 500px)',
)

// Fills the space between the header and the shot panel with the drawn diorama, ignoring the
// canvas's empty margins, which may run under them.
// The kick is not on the sheet yet, so this goal is counted by hand.
function showCallout() {
	const goals = state.shootout && score(state.shootout) + 1
	nodes['callout-detail'].textContent = state.shootout
		? `${goals} OF ${TARGET}${goals === TARGET ? ' · THROUGH' : ' TO GO THROUGH'}`
		: state.shotKind === 'chip'
			? 'OVER THE KEEPER'
			: 'BACK OF THE NET'
	nodes.callout.hidden = false
	replayAnimation(nodes.callout, 'celebrate')
}

// Pins the GOAL! popup just above the crossbar, wherever the canvas has been moved to.
function placeCallout() {
	const bar = project(GOAL.x, 0, GOAL.height)
	const scale = canvas.offsetWidth / W
	nodes.callout.style.left = `${canvas.offsetLeft + bar.sx * scale}px`
	nodes.callout.style.top = `${canvas.offsetTop + (bar.sy - 6) * scale}px`
}

function resize() {
	const stage = nodes.stage.getBoundingClientRect()
	// The stats' white backing reaches below the header's own box.
	const top =
		Math.max(
			header.getBoundingClientRect().bottom,
			nodes.stats.getBoundingClientRect().bottom,
		) + SCENE_GAP
	const bottom = nodes.feedback.getBoundingClientRect().top - SCENE_GAP
	if (IS_TOUCH) return fitPlayArea(stage, top, bottom)
	const width = stage.width - SCENE_GAP * 2
	const box = sceneBox
	const heightFit = (bottom - top) / (box.bottom - box.top)
	const widthFit = width / (box.right - box.left)
	const pitchFit = width / (PITCH_SPAN.right - PITCH_SPAN.left)
	const cropped = widthFit < heightFit && pitchFit > widthFit
	const scale = Math.max(
		0.5,
		cropped ? Math.min(pitchFit, heightFit) : Math.min(widthFit, heightFit),
	)
	nodes.stage.classList.toggle('cropped', cropped)
	// Centre the diorama (or, when cropped, the pitch) in the free space.
	const centreX = cropped
		? (PITCH_SPAN.left + PITCH_SPAN.right) / 2
		: (box.left + box.right) / 2
	const left = stage.width / 2 - centreX * scale
	const canvasTop =
		(top + bottom) / 2 - stage.top - ((box.top + box.bottom) / 2) * scale
	canvas.style.width = `${W * scale}px`
	canvas.style.height = `${H * scale}px`
	canvas.style.left = `${left}px`
	canvas.style.top = `${canvasTop}px`
	placeCallout()
}

function fitPlayArea(stage, top, bottom) {
	const left = TOUCH_LANDSCAPE.matches
		? footer.getBoundingClientRect().right + SCENE_GAP
		: TOUCH_GUTTER
	const right = stage.width - TOUCH_GUTTER
	const box = PLAY_BOX
	const scale = Math.min(
		(right - left) / (box.right - box.left),
		(bottom - top) / (box.bottom - box.top),
	)
	// Centred on the screen, like iso-hoops, unless the pitch is too wide for that and would run under the settings.
	const half = ((box.right - box.left) / 2) * scale
	const centreX = clamp(stage.width / 2, left + half, right - half)
	canvas.style.width = `${W * scale}px`
	canvas.style.height = `${H * scale}px`
	canvas.style.left = `${centreX - ((box.left + box.right) / 2) * scale}px`
	canvas.style.top = `${(top + bottom) / 2 - stage.top - ((box.top + box.bottom) / 2) * scale}px`
	// style.css fades the scenery out across the gaps around the play area.
	const fade = nodes.stage.style
	fade.setProperty('--fit-top', `${top - SCENE_GAP - stage.top}px`)
	fade.setProperty('--fit-bottom', `${bottom + SCENE_GAP - stage.top}px`)
	fade.setProperty('--fit-left', `${left - SCENE_GAP}px`)
	placeCallout()
}

function openHelp() {
	cancelInput()
	nodes.help.showModal()
	setAudioPaused(true)
}

for (const eventName of ['pointerdown', 'keydown']) {
	window.addEventListener(eventName, (event) => {
		if (!nodes['sound-menu'].contains(event.target)) startAudio()
	})
}

canvas.addEventListener('pointermove', aimAtPointer)
// Hold the left button on the pitch to charge and release to kick; aim follows the pointer meanwhile.
// A finger on the pitch only aims, so a thumb resting there never fires a shot.
canvas.addEventListener('pointerdown', (event) => {
	aimAtPointer(event)
	canvas.focus({ preventScroll: true })
	if (event.button !== 0) return
	event.preventDefault()
	canvas.setPointerCapture(event.pointerId)
	if (event.pointerType !== 'touch') beginCharge('mouse')
})
canvas.addEventListener('pointerup', () => releaseShot('mouse'))
canvas.addEventListener('pointercancel', cancelInput)
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
	if (isDialogOpen()) return
	// Preserve keyboard activation for focused buttons and links.
	if (
		document.activeElement?.matches('button, a, input') &&
		event.code !== 'Escape'
	)
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
// Switching apps on a phone can land a stray touch on the pitch, which reads as aiming at that spot and stops the
// player facing the goal. Coming back starts from facing the goal again.
document.addEventListener('visibilitychange', () => {
	if (!document.hidden) return
	pauseGame(true)
	state.pointer = undefined
	updateAim()
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

// The stick's offset from its centre is a screen-space direction, like WASD, scaled to 0..1.
const STICK_DEAD_ZONE = 0.15
let stickPointerId
function moveStick(event) {
	const rect = nodes.stick.getBoundingClientRect()
	const radius = rect.width / 2
	let dx = (event.clientX - rect.left - radius) / radius
	let dy = (event.clientY - rect.top - radius) / radius
	const length = Math.hypot(dx, dy)
	if (length > 1) {
		dx /= length
		dy /= length
	}
	const isPushed = length > STICK_DEAD_ZONE
	state.stick.x = isPushed ? dx : 0
	state.stick.y = isPushed ? dy : 0
	// The knob travels half the base's radius, so it stays inside the ring.
	nodes['stick-knob'].style.transform =
		`translate(${(dx * radius) / 2}px, ${(dy * radius) / 2}px)`
}
function releaseStick() {
	stickPointerId = undefined
	state.stick.x = 0
	state.stick.y = 0
	nodes['stick-knob'].style.transform = ''
	nodes.stick.classList.remove('active')
}
nodes.stick.addEventListener('pointerdown', (event) => {
	if (stickPointerId !== undefined) return
	event.preventDefault()
	stickPointerId = event.pointerId
	nodes.stick.setPointerCapture(event.pointerId)
	nodes.stick.classList.add('active')
	moveStick(event)
})
nodes.stick.addEventListener('pointermove', (event) => {
	if (event.pointerId === stickPointerId) moveStick(event)
})
for (const type of ['pointerup', 'pointercancel'])
	nodes.stick.addEventListener(type, (event) => {
		if (event.pointerId === stickPointerId) releaseStick()
	})
// The ↺ / ↻ buttons hold Q / E, so they turn the aim exactly like the keys do.
for (const button of nodes.turn.children) {
	const key = button.dataset.key
	button.addEventListener('pointerdown', (event) => {
		event.preventDefault()
		button.setPointerCapture(event.pointerId)
		button.classList.add('active')
		state.keys.add(key)
	})
	for (const type of ['pointerup', 'pointercancel'])
		button.addEventListener(type, () => {
			button.classList.remove('active')
			state.keys.delete(key)
		})
}
// iOS starts its long-press text selection and Copy menu from touch events, which user-select: none and a
// prevented pointerdown don't always stop, so the held controls cancel the touch itself. Pointer events still fire.
for (const control of [nodes.shoot, nodes.stick, ...nodes.turn.children])
	for (const type of ['touchstart', 'contextmenu', 'selectstart'])
		control.addEventListener(type, (event) => event.preventDefault(), {
			passive: false,
		})
// iOS Safari can start a pinch-zoom when a second finger lands outside the controls while a thumb holds the stick,
// Shoot or a turn button. Block it only while a control is held, so the page can still be zoomed otherwise.
document.addEventListener('gesturestart', (event) => {
	const isHoldingControl =
		stickPointerId !== undefined ||
		state.chargeSource === 'pointer' ||
		nodes.turn.querySelector('.active') !== null
	if (isHoldingControl) event.preventDefault()
})
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
	setAudioPaused(state.paused)
	canvas.focus()
})
nodes['round-next'].addEventListener('click', () => nodes['round-card'].close())
// Closing the card any way, Esc included, starts the next shootout.
nodes['round-card'].addEventListener('close', () => {
	cancelInput()
	setAudioPaused(state.paused)
	if (state.shootout) startShootout()
	canvas.focus()
})
nodes.resume.addEventListener('click', () => {
	pauseGame(false)
	canvas.focus()
})

// A footer button that opens a small radio list above it, like a native select.
function createMenu(name, labelOf, onChange) {
	const menu = nodes[`${name}-menu`]
	const options = nodes[`${name}-options`]
	const button = nodes[name]
	const selected = () => options.querySelector(':checked').value
	const update = () => {
		const open = !options.hidden
		nodes[`${name}-label`].textContent = labelOf(selected())
		nodes[`${name}-arrow`].textContent = open ? '▴' : '▾'
		button.setAttribute('aria-expanded', String(open))
	}
	const setOpen = (open) => {
		options.hidden = !open
		update()
		if (open) options.querySelector(':checked').focus()
	}
	button.addEventListener('click', () => setOpen(options.hidden))
	// Arrow keys move through the options and keep the menu open; a click, Space or Enter picks one and closes it.
	let browsing = false
	options.addEventListener('keydown', (event) => {
		browsing = event.key.startsWith('Arrow')
		if (event.key === 'Enter') {
			event.preventDefault()
			setOpen(false)
			button.focus()
		}
	})
	options.addEventListener('change', () => {
		onChange(selected())
		if (browsing) update()
		else {
			setOpen(false)
			canvas.focus()
		}
		browsing = false
	})
	menu.addEventListener('keydown', (event) => {
		if (event.code !== 'Escape' || options.hidden) return
		event.stopPropagation()
		setOpen(false)
		button.focus()
	})
	document.addEventListener('pointerdown', (event) => {
		if (!menu.contains(event.target)) setOpen(false)
	})
	menu.addEventListener('focusout', (event) => {
		if (event.relatedTarget && !menu.contains(event.relatedTarget))
			setOpen(false)
	})
	return (value) => {
		options.querySelector(`[value="${value}"]`).checked = true
		update()
	}
}

function readSaved(key, choices, fallback) {
	try {
		const saved = localStorage.getItem(key)
		if (saved in choices) return saved
	} catch {}
	return fallback
}

function save(key, value) {
	try {
		localStorage.setItem(key, value)
	} catch {}
}

const SOUND_MODES = {
	all: { label: 'On', music: true, effects: true },
	effects: { label: 'Effects only', music: false, effects: true },
	off: { label: 'Off', music: false, effects: false },
}
const SOUND_STORAGE_KEY = 'iso-football:sound'
const showSoundMode = createMenu(
	'sound',
	(mode) => SOUND_MODES[mode].label,
	(mode) => {
		setSound(SOUND_MODES[mode])
		startAudio()
		save(SOUND_STORAGE_KEY, mode)
	},
)
const soundMode = readSaved(SOUND_STORAGE_KEY, SOUND_MODES, 'all')
setSound(SOUND_MODES[soundMode])
showSoundMode(soundMode)

const PITCH_STORAGE_KEY = 'iso-football:pitch'
const showPitch = createMenu(
	'pitch',
	(id) => COURTS[id].label,
	(id) => {
		state.court = COURTS[id]
		bakePitch()
		resize()
		save(PITCH_STORAGE_KEY, id)
	},
)
const pitch = readSaved(PITCH_STORAGE_KEY, COURTS, 'neighborhood')
state.court = COURTS[pitch]
showPitch(pitch)

const MODES = {
	practice: { label: 'Practice' },
	shootout: { label: 'Shootout' },
}
const MODE_STORAGE_KEY = 'iso-football:mode'
const CUP_STORAGE_KEY = 'iso-football:cup'
const showMode = createMenu(
	'mode',
	(id) => MODES[id].label,
	(id) => {
		setMode(id)
		save(MODE_STORAGE_KEY, id)
	},
)
try {
	const { round, best, cups } = JSON.parse(localStorage.getItem(CUP_STORAGE_KEY))
	if (
		[round, best, cups].every((value) => Number.isInteger(value) && value >= 0) &&
		round < ROUNDS.length
	)
		state.cup = { round, best, cups }
} catch {}
const mode = readSaved(MODE_STORAGE_KEY, MODES, 'practice')
showMode(mode)
setMode(mode)
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
