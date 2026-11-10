// Around the world: seven spots in an arc around the goal, all the same distance from it. Score from a spot to
// move on to the next. Every miss or save costs one of three lives, and the third ends the trip. Get all the way
// round to go on to the next round, where the arc is further back. Run out of lives and the run starts over from
// round one. Clear the last round to complete the run.
import { GOAL } from './physics.js?v=16'

export const LIVES = 3
export const SPOT_COUNT = 7

// The widest arc a round may use, and how far inside the touchline its outer spots stay.
const WIDEST = 45
const TOUCHLINE = 5.4

// From one wing round to the other, starting wide, evenly spread across the widest arc that keeps every spot
// on the pitch. Further back, the arc narrows.
function arc(distance) {
	const widest = Math.min(WIDEST, (Math.asin(TOUCHLINE / distance) * 180) / Math.PI)
	return Array.from({ length: SPOT_COUNT }, (_, index) => {
		const degrees = -widest + (2 * widest * index) / (SPOT_COUNT - 1)
		const angle = (degrees * Math.PI) / 180
		return {
			x: GOAL.x + Math.cos(angle) * distance,
			y: Math.sin(angle) * distance,
		}
	})
}

export const ROUNDS = [8, 10, 12, 14].map((distance) => ({
	distance,
	spots: arc(distance),
}))

export function startTrip() {
	return { spot: 0, misses: 0, kicks: [] }
}

/** The trip after one more kick, and 'complete' or 'out' once it's over. */
export function shoot(trip, kick) {
	const kicks = [...trip.kicks, kick]
	if (kick.scored) {
		const spot = trip.spot + 1
		return {
			...trip,
			spot,
			kicks,
			result: spot === SPOT_COUNT ? 'complete' : undefined,
		}
	}
	const misses = trip.misses + 1
	return {
		...trip,
		misses,
		kicks,
		result: misses >= LIVES ? 'out' : undefined,
	}
}

/** The round after a finished trip, and whether getting round completed the run. */
export function nextRound(round, result) {
	if (result !== 'complete') return { round: 0, complete: false }
	if (round === ROUNDS.length - 1) return { round: 0, complete: true }
	return { round: round + 1, complete: false }
}
