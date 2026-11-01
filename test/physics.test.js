import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BALL_RADIUS, GOAL, createShot, stepBall } from '../dist/physics.js'

function simulate(ball, keeper, seconds = 4, delta = 1 / 60) {
	const events = []
	for (let t = 0; t < seconds; t += delta)
		events.push(...stepBall(ball, delta, keeper))
	return events
}

test('a low shot through an open goal counts once', () => {
	const ball = createShot({ x: 3, y: 1.9 }, Math.PI, 0.6, 'low')
	const events = simulate(ball)
	assert.equal(events.filter((event) => event === 'goal').length, 1)
	assert.equal(ball.outcome, 'goal')
	assert.ok(ball.x >= GOAL.x - GOAL.depth)
})

test('a centered shot is stopped by the goalkeeper', () => {
	const ball = createShot({ x: 3, y: 0 }, Math.PI, 0.6, 'low')
	const events = simulate(ball, { x: -7.95, y: 0, diving: false })
	assert.ok(events.includes('save'))
	assert.ok(!events.includes('goal'))
	assert.equal(ball.outcome, 'save')
})

test('a chip can clear a diving keeper and enter the goal', () => {
	const ball = createShot({ x: 3, y: 0 }, Math.PI, 0.6, 'chip')
	const events = simulate(ball, { x: -7.95, y: 0, diving: true })
	assert.ok(events.includes('goal'))
	assert.ok(!events.includes('save'))
})

test('an overpowered chip sails over the bar', () => {
	const ball = createShot({ x: 3, y: 0 }, Math.PI, 1, 'chip')
	assert.ok(simulate(ball).includes('miss'))
	assert.equal(ball.outcome, 'miss')
})

test('shots outside the posts do not score', () => {
	const ball = createShot({ x: 3, y: 3.2 }, Math.PI, 0.8, 'low')
	assert.ok(simulate(ball).includes('miss'))
})

test('post contact rebounds without awarding a goal', () => {
	const ball = createShot({ x: -3, y: GOAL.halfWidth }, Math.PI, 1, 'low')
	const events = simulate(ball)
	assert.ok(events.includes('post'))
	assert.ok(!events.includes('goal'))
	assert.equal(ball.outcome, 'post')
})

test('fast shots cannot tunnel through a post during a slow frame', () => {
	const ball = createShot({ x: -3, y: GOAL.halfWidth }, Math.PI, 1, 'low')
	assert.ok(simulate(ball, undefined, 1, 0.1).includes('post'))
})

test('shots directed away from the goal eventually miss', () => {
	const ball = createShot({ x: 3, y: 0 }, 0, 0.6, 'low')
	assert.ok(simulate(ball).includes('miss'))
})

test('shot power is bounded and a chip has more lift', () => {
	const player = { x: 3, y: 0 }
	assert.equal(
		createShot(player, 0, 5, 'low').vx,
		createShot(player, 0, 1, 'low').vx,
	)
	assert.equal(
		createShot(player, 0, -5, 'low').vx,
		createShot(player, 0, 0, 'low').vx,
	)
	assert.ok(
		createShot(player, 0, 0.5, 'chip').vz >
			createShot(player, 0, 0.5, 'low').vz,
	)
})

test('the ball never sinks below the turf', () => {
	const ball = createShot({ x: 3, y: 4 }, Math.PI, 0.1, 'low')
	for (let i = 0; i < 600; i++) {
		stepBall(ball, 1 / 60)
		assert.ok(ball.z >= BALL_RADIUS)
	}
})
