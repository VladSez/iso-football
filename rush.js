// 60-second rush: free practice against the clock. The clock starts with the first kick, the ball
// comes back much sooner, and a ball already struck when time runs out still counts.
export const DURATION = 60

// Seconds from the outcome to the ball back at your feet; free practice waits 1.8 and 1.5.
export const RETURN_DELAY = { goal: 0.7, other: 0.5 }

/** Whole seconds left on the clock: 60 until the first kick, 0 once time is up. */
export function secondsLeft(startedAt, now) {
	if (startedAt === undefined) return DURATION
	return Math.max(0, Math.ceil(DURATION - (now - startedAt)))
}

export function isTimeUp(startedAt, now) {
	return startedAt !== undefined && now - startedAt >= DURATION
}

/** A rush in numbers, for the card after it. */
export function summarize(shots) {
	const count = (test) => shots.filter(test).length
	const goals = count((shot) => shot.scored)
	return {
		goals,
		shots: shots.length,
		saves: count((shot) => shot.outcome === 'save'),
		misses: count((shot) => shot.outcome === 'miss' || shot.outcome === 'post'),
		accuracy: shots.length ? Math.round((goals / shots.length) * 100) : 0,
	}
}
