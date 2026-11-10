import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GOAL, PITCH, createShot, stepBall } from '../dist/physics.js'
import {
	BALLS,
	SPOTS as CROSSBAR_SPOTS,
	pointsFor,
	tally,
	isOver,
} from '../dist/crossbar.js'
import {
	LIVES,
	SPOT_COUNT,
	ROUNDS as WORLD_ROUNDS,
	startTrip,
	shoot,
	nextRound,
} from '../dist/world.js'
import { DURATION, secondsLeft, isTimeUp, summarize } from '../dist/rush.js'

// Fires a shot from `player` at the goal point (GOAL.x, y) and runs it to its outcome.
function strike(player, y, power, kind) {
	const yaw = Math.atan2(y - player.y, GOAL.x - player.x)
	const ball = createShot(player, yaw, power, kind)
	for (let i = 0; i < 600 && !ball.outcome; i++) stepBall(ball, 1 / 60)
	return ball
}

test('the physics says which part of the frame a ball struck', () => {
	const post = strike({ x: -2, y: GOAL.halfWidth }, GOAL.halfWidth, 0.5, 'low')
	assert.equal(post.outcome, 'post')
	assert.equal(post.frame, 'post')
	const bar = strike({ x: 0, y: 0 }, 0, 1, 'chip')
	assert.equal(bar.outcome, 'post')
	assert.equal(bar.frame, 'bar')
})

test('every crossbar spot has a window of chip power that rings the bar, and full power clears it', () => {
	for (const spot of CROSSBAR_SPOTS) {
		const label = JSON.stringify(spot)
		const bars = Array.from({ length: 101 }, (_, i) =>
			strike(spot, 0, i / 100, 'chip'),
		).filter((ball) => ball.frame === 'bar')
		assert.ok(
			bars.length >= 10,
			`${label}: ${bars.length}% of powers hit the bar`,
		)
		assert.notEqual(strike(spot, 0, 1, 'chip').frame, 'bar', label)
		assert.ok(spot.x > -6.5 && spot.x < PITCH.maxX - 0.5, label)
		assert.ok(Math.abs(spot.y) < PITCH.halfWidth - 0.5, label)
	}
})

test('the crossbar is worth three, a post one, and a goal nothing', () => {
	assert.equal(pointsFor({ outcome: 'post', frame: 'bar' }), 3)
	assert.equal(pointsFor({ outcome: 'post', frame: 'post' }), 1)
	assert.equal(pointsFor({ outcome: 'goal' }), 0)
	assert.equal(pointsFor({ outcome: 'miss' }), 0)
	assert.deepEqual(
		tally([
			{ outcome: 'post', frame: 'bar' },
			{ outcome: 'post', frame: 'bar' },
			{ outcome: 'post', frame: 'post' },
			{ outcome: 'goal' },
			{ outcome: 'miss' },
		]),
		{ points: 7, bars: 2, posts: 1, goals: 1, misses: 1 },
	)
})

test('a crossbar round is ten balls', () => {
	const ball = { outcome: 'miss' }
	assert.equal(isOver(Array(BALLS - 1).fill(ball)), false)
	assert.equal(isOver(Array(BALLS).fill(ball)), true)
})

test('each round has seven spots where the player can stand, all the same distance from goal, wing to wing', () => {
	for (const { distance, spots } of WORLD_ROUNDS) {
		assert.equal(spots.length, SPOT_COUNT)
		for (const spot of spots) {
			const label = `${distance} m: ${JSON.stringify(spot)}`
			assert.ok(
				Math.abs(Math.hypot(spot.x - GOAL.x, spot.y) - distance) < 1e-9,
				label,
			)
			assert.ok(spot.x > -6.5 && spot.x < PITCH.maxX - 0.5, label)
			assert.ok(Math.abs(spot.y) < PITCH.halfWidth - 0.5, label)
		}
		for (let i = 1; i < spots.length; i++)
			assert.ok(spots[i].y > spots[i - 1].y)
	}
})

test('each round is further from the goal than the last', () => {
	for (let i = 1; i < WORLD_ROUNDS.length; i++)
		assert.ok(WORLD_ROUNDS[i].distance > WORLD_ROUNDS[i - 1].distance)
})

test('getting round moves on a round, the last completes the run, and running out of lives starts the run over', () => {
	assert.deepEqual(nextRound(0, 'complete'), { round: 1, complete: false })
	assert.deepEqual(nextRound(WORLD_ROUNDS.length - 1, 'complete'), {
		round: 0,
		complete: true,
	})
	assert.deepEqual(nextRound(2, 'out'), { round: 0, complete: false })
	assert.deepEqual(nextRound(0, 'out'), { round: 0, complete: false })
})

test('a goal moves the trip on a spot, a miss costs a life, and the third miss ends it', () => {
	assert.equal(LIVES, 3)
	let trip = startTrip()
	trip = shoot(trip, { scored: true })
	assert.equal(trip.spot, 1)
	trip = shoot(trip, { scored: false })
	assert.deepEqual([trip.spot, trip.misses, trip.result], [1, 1, undefined])
	trip = shoot(trip, { scored: true })
	assert.equal(trip.spot, 2)
	trip = shoot(trip, { scored: false })
	assert.deepEqual([trip.spot, trip.misses, trip.result], [2, 2, undefined])
	trip = shoot(trip, { scored: false })
	assert.equal(trip.misses, LIVES)
	assert.equal(trip.result, 'out')
	assert.equal(trip.kicks.length, 5)
})

test('scoring from every spot completes the trip', () => {
	let trip = startTrip()
	for (let i = 0; i < SPOT_COUNT; i++) trip = shoot(trip, { scored: true })
	assert.equal(trip.result, 'complete')
	assert.equal(trip.spot, SPOT_COUNT)
})

test('the rush clock waits for the first kick, then runs down to zero', () => {
	assert.equal(secondsLeft(undefined, 100), DURATION)
	assert.equal(isTimeUp(undefined, 1000), false)
	assert.equal(secondsLeft(10, 10), 60)
	assert.equal(secondsLeft(10, 10.2), 60)
	assert.equal(secondsLeft(10, 69.5), 1)
	assert.equal(isTimeUp(10, 69.9), false)
	assert.equal(isTimeUp(10, 70), true)
	assert.equal(secondsLeft(10, 90), 0)
})

test('a rush in numbers', () => {
	assert.deepEqual(
		summarize([
			{ scored: true, outcome: 'goal' },
			{ scored: true, outcome: 'goal' },
			{ scored: false, outcome: 'save' },
			{ scored: false, outcome: 'post' },
		]),
		{ goals: 2, shots: 4, saves: 1, misses: 1, accuracy: 50 },
	)
	assert.equal(summarize([]).accuracy, 0)
})
