// Crossbar challenge: an empty net and ten balls, each from its own spot. Ring the crossbar for three
// points or a post for one. A goal earns nothing.
export const POINTS = { bar: 3, post: 1 }

// Where each ball is kicked from, further out as the round goes on. All of them are far enough out
// that a full-power chip clears the bar, so every ball needs its power judged. test/modes.test.js
// checks that each has a window of chip power that rings the bar.
export const SPOTS = [
	{ x: 3, y: 0 },
	{ x: 4, y: -2.5 },
	{ x: 5, y: 2.5 },
	{ x: 3.5, y: 4.2 },
	{ x: 6, y: 0 },
	{ x: 4.5, y: -4.5 },
	{ x: 7, y: 3 },
	{ x: 5.5, y: -1.2 },
	{ x: 8, y: -3.5 },
	{ x: 8.3, y: 0.8 },
]
export const BALLS = SPOTS.length

/** What a ball earns: the part of the frame it struck, or nothing if it struck none. */
export function pointsFor(ball) {
	return ball.outcome === 'post' ? (POINTS[ball.frame] ?? 0) : 0
}

/** A round in numbers, for the scoreboard and the card after it. */
export function tally(balls) {
	const count = (test) => balls.filter(test).length
	return {
		points: balls.reduce((sum, ball) => sum + pointsFor(ball), 0),
		bars: count((ball) => ball.outcome === 'post' && ball.frame === 'bar'),
		posts: count((ball) => ball.outcome === 'post' && ball.frame === 'post'),
		goals: count((ball) => ball.outcome === 'goal'),
		misses: count((ball) => ball.outcome === 'miss'),
	}
}

export function isOver(balls) {
	return balls.length >= BALLS
}
