import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GOAL, BALL_RADIUS, createShot, stepBall } from '../dist/physics.js'
import {
	ROUNDS,
	targetAt,
	totals,
	roundResult,
	BALLS,
	nextRound,
} from '../dist/targets.js'

const [FIRST] = ROUNDS
const TARGETS = FIRST.targets
const allUp = (targets) => targets.map(() => true)
const ALL_UP = allUp(TARGETS)

test('every target hangs inside the frame, clear of the others', () => {
	const inner = GOAL.postRadius + BALL_RADIUS
	for (const round of ROUNDS)
		for (const target of round.targets) {
			const label = `${round.name}: ${target.name}`
			assert.ok(
				Math.abs(target.y) + target.radius < GOAL.halfWidth - inner,
				label,
			)
			assert.ok(target.z + target.radius < GOAL.height - inner, label)
			for (const other of round.targets)
				if (other !== target)
					assert.ok(
						Math.hypot(other.y - target.y, other.z - target.z) >
							other.radius + target.radius,
						`${label} overlaps ${other.name}`,
					)
		}
})

test('each round moves the targets and makes them smaller', () => {
	const meanRadius = (round) =>
		round.targets.reduce((sum, target) => sum + target.radius, 0) /
		round.targets.length
	const spots = (round) =>
		round.targets.map((target) => `${target.y},${target.z}`).join(' ')
	for (let i = 1; i < ROUNDS.length; i++) {
		const [before, after] = [ROUNDS[i - 1], ROUNDS[i]]
		assert.ok(meanRadius(after) < meanRadius(before), after.name)
		assert.notEqual(spots(after), spots(before), after.name)
	}
})

test('a round is cleared once every target is down, and lost once the balls run out first', () => {
	assert.equal(roundResult([false, true, true, true], 3), undefined)
	assert.equal(roundResult([false, false, false, false], 7), 'cleared')
	// Knocking the last one down with the last ball still clears it.
	assert.equal(roundResult([false, false, false, false], BALLS), 'cleared')
	assert.equal(roundResult([false, true, false, false], BALLS), 'out')
})

test('clearing a round moves you on, running out repeats it, and the last round completes the run', () => {
	assert.deepEqual(nextRound(0, 'cleared'), { round: 1, complete: false })
	assert.deepEqual(nextRound(1, 'out'), { round: 1, complete: false })
	assert.deepEqual(nextRound(ROUNDS.length - 1, 'cleared'), {
		round: 0,
		complete: true,
	})
})

test('a ball through a target hits it, unless that target is already down', () => {
	const [first, second] = TARGETS
	assert.equal(targetAt({ y: first.y, z: first.z }, TARGETS, ALL_UP), 0)
	assert.equal(targetAt({ y: second.y, z: second.z }, TARGETS, ALL_UP), 1)
	assert.equal(targetAt({ y: 0, z: 1 }, TARGETS, ALL_UP), -1)
	// A ball whose edge clips the target counts; one that clears it doesn't.
	const edge = first.radius + BALL_RADIUS
	const nearEdge = (offset) => ({ y: first.y + edge + offset, z: first.z })
	assert.equal(targetAt(nearEdge(-0.01), TARGETS, ALL_UP), 0)
	assert.equal(targetAt(nearEdge(0.01), TARGETS, ALL_UP), -1)
	const firstDown = [false, true, true, true]
	assert.equal(targetAt({ y: first.y, z: first.z }, TARGETS, firstDown), -1)
})

test('a ball touching two targets knocks down the one nearer its centre', () => {
	const [lowLeft, , topLeft] = TARGETS
	const gap = (lowLeft.z + lowLeft.radius + topLeft.z - topLeft.radius) / 2
	assert.equal(targetAt({ y: lowLeft.y, z: gap - 0.05 }, TARGETS, ALL_UP), 0)
	assert.equal(targetAt({ y: lowLeft.y, z: gap + 0.05 }, TARGETS, ALL_UP), 2)
	assert.equal(
		targetAt({ y: lowLeft.y, z: gap + 0.05 }, TARGETS, [
			true,
			true,
			false,
			true,
		]),
		0,
	)
})

function shoot(spot, aimY, power, kind) {
	const ball = createShot(
		spot,
		Math.atan2(aimY - spot.y, GOAL.x - spot.x),
		power,
		kind,
	)
	for (let t = 0; t < 4 && !ball.outcome; t += 1 / 60) stepBall(ball, 1 / 60)
	return ball
}

test('the ball remembers where it crossed the goal line', () => {
	const ball = shoot({ x: -1, y: 0 }, 1.2, 0.5, 'low')
	assert.equal(ball.outcome, 'goal')
	assert.ok(Math.abs(ball.entry.y - 1.2) < 0.1)
	assert.ok(ball.entry.z < 0.4)
})

test('from the penalty spot, every target in every round can be hit', () => {
	const spot = { x: -1, y: 0 }
	for (const round of ROUNDS) {
		const found = new Set()
		for (const kind of ['low', 'chip'])
			for (let power = 0; power <= 1; power += 0.04)
				for (let aim = -2.4; aim <= 2.4; aim += 0.1) {
					const ball = shoot(spot, aim, power, kind)
					if (ball.outcome === 'goal')
						found.add(targetAt(ball.entry, round.targets, allUp(round.targets)))
				}
		for (const [index, target] of round.targets.entries())
			assert.ok(found.has(index), `${round.name}: ${target.name}`)
	}
})

test('low shots only reach the low targets', () => {
	const spot = { x: -1, y: 0 }
	const found = new Set()
	for (let power = 0; power <= 1; power += 0.02)
		for (let aim = -2.6; aim <= 2.6; aim += 0.05) {
			const ball = shoot(spot, aim, power, 'low')
			if (ball.outcome === 'goal')
				found.add(targetAt(ball.entry, TARGETS, ALL_UP))
		}
	found.delete(-1)
	const names = [...found].map((index) => TARGETS[index].name).sort()
	assert.deepEqual(names, ['Low left', 'Low right'])
})

test('the round totals count hits, misses and each shot type', () => {
	assert.deepEqual(
		totals([
			{ kind: 'chip', outcome: 'goal', hit: true },
			{ kind: 'chip', outcome: 'miss', hit: false },
			{ kind: 'low', outcome: 'goal', hit: false },
			{ kind: 'low', outcome: 'goal', hit: true },
			{ kind: 'low', outcome: 'post', hit: false },
		]),
		{ hits: 2, misses: 2, chips: 2, chipHits: 1, lows: 3, lowHits: 1 },
	)
})
