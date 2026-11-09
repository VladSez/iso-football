// A penalty cup run: each round is five kicks against that round's keeper. Score three to go
// through and face a better keeper; fall short and the run starts over.
export const KICKS = 5
export const TARGET = 3

// The keeper in each round. read: how often it dives to the side you face. diveTop and diveReach:
// how high and how far across a dive reaches. speed: how fast it moves across the goal.
export const ROUNDS = [
	{ name: 'Round one', read: 0.35, diveTop: 2.05, diveReach: 0.85, speed: 3.4 },
	{ name: 'Quarter-final', read: 0.5, diveTop: 2.1, diveReach: 0.95, speed: 3.9 },
	{ name: 'Semi-final', read: 0.64, diveTop: 2.25, diveReach: 1.05, speed: 4.5 },
	{ name: 'Final', read: 0.7, diveTop: 2.35, diveReach: 1.1, speed: 4.8 },
]

export function score(kicks) {
	return kicks.filter((kick) => kick.scored).length
}

/** 'through' once the target is reached, 'out' once it can't be, otherwise undefined. */
export function roundResult(kicks) {
	const goals = score(kicks)
	if (goals >= TARGET) return 'through'
	if (goals + KICKS - kicks.length < TARGET) return 'out'
}

/** The round after a finished one, and whether getting through it took the cup. */
export function advance(round, result) {
	if (result !== 'through') return { round: 0, cup: false }
	if (round === ROUNDS.length - 1) return { round: 0, cup: true }
	return { round: round + 1, cup: false }
}

/** A round in numbers, for the card after it. */
export function summarize(kicks) {
	const count = (test) => kicks.filter(test).length
	return {
		goals: score(kicks),
		saves: count((kick) => kick.outcome === 'save'),
		misses: count((kick) => kick.outcome === 'miss' || kick.outcome === 'post'),
		chips: count((kick) => kick.kind === 'chip'),
		chipGoals: count((kick) => kick.kind === 'chip' && kick.scored),
		lows: count((kick) => kick.kind === 'low'),
		lowGoals: count((kick) => kick.kind === 'low' && kick.scored),
	}
}

/**
 * Where the keeper dives: -1, 1, or 0 to stay put. Facing a corner, it picks that side `read` of the
 * time. Facing the middle, the better it reads you the more often it stays.
 */
export function keeperGuess(aimY, roll, read) {
	if (Math.abs(aimY) < 0.6) {
		const stay = read * 0.8
		return roll < stay ? 0 : roll < stay + (1 - stay) / 2 ? -1 : 1
	}
	const side = Math.sign(aimY)
	if (roll < read) return side
	if (roll < read + (1 - read) * 0.6) return -side
	return 0
}
