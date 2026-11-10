// Target practice: bullseyes hang in the net. Knock every one down within eight balls to go
// on to the next round, where the targets move and get smaller and higher. Run out first and you
// take that round again. Clear the last round to complete the run.
import { BALL_RADIUS } from './physics.js?v=16'

// How many balls you get to clear each round.
export const BALLS = 8

// Each target's centre across the goal (y) and above the ground (z), and its radius. Low ones sit
// where a low shot rolls in; high ones need a chip.
export const ROUNDS = [
	{
		name: 'Four corners',
		targets: [
			{ name: 'Low left', y: -1.7, z: 0.5, radius: 0.55 },
			{ name: 'Low right', y: 1.85, z: 0.42, radius: 0.42 },
			{ name: 'Top left', y: -1.75, z: 1.65, radius: 0.55 },
			{ name: 'Top right', y: 1.9, z: 1.75, radius: 0.42 },
		],
	},
	{
		name: 'On the move',
		targets: [
			{ name: 'Low middle', y: 0, z: 0.45, radius: 0.5 },
			{ name: 'Low right', y: 1.9, z: 0.4, radius: 0.4 },
			{ name: 'Top left', y: -1.8, z: 1.7, radius: 0.5 },
			{ name: 'Top right', y: 1.8, z: 1.75, radius: 0.45 },
		],
	},
	{
		name: 'Smaller',
		targets: [
			{ name: 'Low right', y: 1.6, z: 0.4, radius: 0.42 },
			{ name: 'Low left', y: -1.9, z: 0.38, radius: 0.38 },
			{ name: 'Left', y: -1.2, z: 1.3, radius: 0.38 },
			{ name: 'Top middle', y: 0, z: 1.8, radius: 0.4 },
			{ name: 'Top right', y: 1.95, z: 1.8, radius: 0.35 },
		],
	},
	{
		name: 'Top bins',
		targets: [
			{ name: 'Low middle', y: 0.3, z: 0.35, radius: 0.35 },
			{ name: 'Left', y: -0.6, z: 1.4, radius: 0.35 },
			{ name: 'Top left', y: -1.95, z: 1.8, radius: 0.35 },
			{ name: 'Top right', y: 1.95, z: 1.85, radius: 0.32 },
		],
	},
]

/**
 * The standing target the ball touches where it enters the goal, or -1. A ball that clips the edge
 * counts, and one that touches two knocks down the one nearer its centre.
 */
export function targetAt(entry, targets, standing) {
	let best = -1
	let nearest = Infinity
	targets.forEach((target, index) => {
		const distance = Math.hypot(entry.y - target.y, entry.z - target.z)
		if (
			standing[index] &&
			distance < target.radius + BALL_RADIUS &&
			distance < nearest
		) {
			best = index
			nearest = distance
		}
	})
	return best
}

/** A round in numbers, for the card after it. */
export function totals(balls) {
	const count = (test) => balls.filter(test).length
	return {
		hits: count((ball) => ball.hit),
		misses: count((ball) => ball.outcome !== 'goal'),
		chips: count((ball) => ball.kind === 'chip'),
		chipHits: count((ball) => ball.kind === 'chip' && ball.hit),
		lows: count((ball) => ball.kind === 'low'),
		lowHits: count((ball) => ball.kind === 'low' && ball.hit),
	}
}

/** 'cleared' once every target is down, 'out' once the balls run out first, otherwise undefined. */
export function roundResult(standing, ballsUsed) {
	if (!standing.includes(true)) return 'cleared'
	if (ballsUsed >= BALLS) return 'out'
}

/** The round after a finished one, and whether clearing it completed the run. */
export function nextRound(round, result) {
	if (result !== 'cleared') return { round, complete: false }
	if (round === ROUNDS.length - 1) return { round: 0, complete: true }
	return { round: round + 1, complete: false }
}
