import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createShot, stepBall } from '../dist/physics.js'
import {
	ROUNDS,
	roundResult,
	keeperGuess,
	advance,
	summarize,
} from '../dist/shootout.js'

const kicks = (results) => results.map((scored) => ({ scored }))

test('a round is through at three goals and over once three are out of reach', () => {
	assert.equal(roundResult(kicks([true, true])), undefined)
	assert.equal(roundResult(kicks([true, false, true, true])), 'through')
	assert.equal(roundResult(kicks([false, false, true])), undefined)
	assert.equal(roundResult(kicks([false, false, false])), 'out')
	assert.equal(roundResult(kicks([true, false, true, false, false])), 'out')
	assert.equal(roundResult(kicks([false, true, false, true, true])), 'through')
})

test('getting through moves the run up a round, the final wins the cup, and falling short starts over', () => {
	assert.deepEqual(advance(0, 'through'), { round: 1, cup: false })
	assert.deepEqual(advance(ROUNDS.length - 1, 'through'), { round: 0, cup: true })
	assert.deepEqual(advance(2, 'out'), { round: 0, cup: false })
})

test('each round has a better keeper than the last', () => {
	for (let i = 1; i < ROUNDS.length; i++)
		for (const key of ['read', 'diveTop', 'diveReach', 'speed'])
			assert.ok(ROUNDS[i][key] > ROUNDS[i - 1][key], `${ROUNDS[i].name} ${key}`)
})

test('the round summary counts goals, saves, misses and each shot type', () => {
	const kicks = [
		{ scored: true, kind: 'chip', outcome: 'goal' },
		{ scored: false, kind: 'chip', outcome: 'save' },
		{ scored: false, kind: 'low', outcome: 'post' },
		{ scored: true, kind: 'low', outcome: 'goal' },
		{ scored: false, kind: 'low', outcome: 'miss' },
	]
	assert.deepEqual(summarize(kicks), {
		goals: 2,
		saves: 1,
		misses: 2,
		chips: 2,
		chipGoals: 1,
		lows: 3,
		lowGoals: 1,
	})
})

test('the keeper guesses the side you face more often in later rounds', () => {
	const guessesRight = (read) => {
		let right = 0
		for (let roll = 0; roll < 1; roll += 0.001) right += keeperGuess(2, roll, read) === 1
		return right
	}
	assert.ok(guessesRight(ROUNDS.at(-1).read) > guessesRight(ROUNDS[0].read))
	assert.equal(keeperGuess(-2, 0.1, 0.5), -1)
	assert.equal(keeperGuess(2, 0.99, 0.5), 0)
})

test('facing the middle, a better keeper stays put more often', () => {
	assert.equal(keeperGuess(0, 0.35, 0.5), 0)
	assert.equal(keeperGuess(0, 0.45, 0.5), -1)
	assert.equal(keeperGuess(0, 0.45, 0.7), 0)
})

function penalty(aimY, kind, power, keeperY, round = ROUNDS[0]) {
	const spot = { x: -1, y: 0 }
	const yaw = Math.atan2(aimY - spot.y, -8.8 - spot.x)
	const ball = createShot(spot, yaw, power, kind)
	const keeper = {
		x: -7.95,
		y: keeperY,
		diving: keeperY !== 0,
		diveTop: round?.diveTop,
		diveReach: round?.diveReach,
		standTop: round ? 2.3 : undefined,
	}
	for (let t = 0; t < 4; t += 1 / 60) stepBall(ball, 1 / 60, keeper)
	return ball.outcome
}

test('a low penalty into the corner the keeper guessed is saved, and the other corner scores', () => {
	assert.equal(penalty(2, 'low', 0.6, 1.7), 'save')
	assert.equal(penalty(2, 'low', 0.6, -1.7), 'goal')
})

test('no chip into a guessed corner is sure to beat a shootout keeper', () => {
	for (let power = 0.2; power <= 0.8; power += 0.01) {
		const outcome = penalty(2.1, 'chip', power, 1.7)
		assert.notEqual(outcome, 'goal', `chip at ${power.toFixed(2)} power`)
	}
})

test('a chip into the guessed corner clears a practice dive', () => {
	assert.equal(penalty(2, 'chip', 0.6, 1.7, null), 'goal')
})

test('a keeper who stays in the middle saves a chip down the middle', () => {
	assert.equal(penalty(0, 'chip', 0.65, 0), 'save')
	assert.equal(penalty(0, 'chip', 0.65, 0, null), 'goal')
})
