export const PITCH = { minX: -8.8, maxX: 9, halfWidth: 6.3 }
export const GOAL = {
	x: -8.8,
	halfWidth: 2.65,
	height: 2.5,
	depth: 1.35,
	postRadius: 0.085,
}
export const BALL_RADIUS = 0.19
export const GRAVITY = 14

/** Creates a shot at the player's feet. Speeds are world units per second. */
export function createShot(player, yaw, power, kind) {
	const charge = Math.max(0, Math.min(1, power))
	const speed = kind === 'chip' ? 9 + charge * 13 : 10 + charge * 18
	return {
		x: player.x + Math.cos(yaw) * 0.65,
		y: player.y + Math.sin(yaw) * 0.65,
		z: BALL_RADIUS,
		vx: Math.cos(yaw) * speed,
		vy: Math.sin(yaw) * speed,
		vz: kind === 'chip' ? 4.8 + charge * 4 : 0.65 + charge * 0.7,
		age: 0,
		bounces: 0,
		outcome: undefined,
		postHit: false,
	}
}

/** Uses short simulation steps so fast shots cannot skip posts or the keeper. */
export function stepBall(ball, delta, keeper) {
	const events = []
	const steps = Math.max(1, Math.ceil(delta / (1 / 240)))
	const dt = delta / steps
	for (let step = 0; step < steps; step++) {
		const previousX = ball.x
		const previousY = ball.y
		const previousZ = ball.z
		ball.age += dt
		ball.vz -= GRAVITY * dt
		ball.x += ball.vx * dt
		ball.y += ball.vy * dt
		ball.z += ball.vz * dt
		if (ball.z < BALL_RADIUS) {
			ball.z = BALL_RADIUS
			if (ball.vz < -1.5) {
				ball.vz *= -0.42
				ball.bounces++
				if (ball.bounces < 4) events.push('bounce')
			} else ball.vz = 0
			const friction = Math.exp(-1.25 * dt)
			ball.vx *= friction
			ball.vy *= friction
		}

		if (
			!ball.outcome &&
			keeper &&
			previousX >= keeper.x &&
			ball.x <= keeper.x
		) {
			const t = (previousX - keeper.x) / (previousX - ball.x)
			const y = previousY + (ball.y - previousY) * t
			const z = previousZ + (ball.z - previousZ) * t
			const reach = keeper.diving ? (keeper.diveReach ?? 0.88) : 0.43
			const top = keeper.diving
				? (keeper.diveTop ?? 1.15)
				: (keeper.standTop ?? 1.7)
			if (
				Math.abs(y - keeper.y) < reach + BALL_RADIUS &&
				z < top + BALL_RADIUS
			) {
				ball.x = keeper.x + BALL_RADIUS + 0.15
				ball.vx = Math.abs(ball.vx) * 0.3
				ball.vy *= 0.35
				ball.vz = 1.6
				ball.outcome = 'save'
				events.push('save')
			}
		}

		const frameRadius = BALL_RADIUS + GOAL.postRadius
		if (
			!ball.outcome &&
			!ball.postHit &&
			Math.abs(ball.x - GOAL.x) < frameRadius
		) {
			const hitsPost =
				Math.abs(Math.abs(ball.y) - GOAL.halfWidth) < frameRadius &&
				ball.z < GOAL.height + frameRadius
			const hitsBar =
				Math.abs(ball.z - GOAL.height) < frameRadius &&
				Math.abs(ball.y) < GOAL.halfWidth + frameRadius
			if (hitsPost || hitsBar) {
				ball.vx *= -0.6
				ball.x = GOAL.x + frameRadius + 0.01
				ball.postHit = true
				if (hitsBar) ball.vz *= -0.5
				ball.outcome = 'post'
				events.push('post')
			}
		}

		// The whole ball must cross the goal line, inside the frame.
		const scoringPlane = GOAL.x - BALL_RADIUS
		if (!ball.outcome && previousX >= scoringPlane && ball.x < scoringPlane) {
			const t = (previousX - scoringPlane) / (previousX - ball.x)
			const y = previousY + (ball.y - previousY) * t
			const z = previousZ + (ball.z - previousZ) * t
			ball.outcome =
				Math.abs(y) < GOAL.halfWidth - frameRadius &&
				z < GOAL.height - frameRadius
					? 'goal'
					: 'miss'
			events.push(ball.outcome)
		}
		if (ball.outcome === 'goal') {
			if (ball.x < GOAL.x - GOAL.depth + BALL_RADIUS) {
				ball.x = GOAL.x - GOAL.depth + BALL_RADIUS
				ball.vx = Math.abs(ball.vx) * 0.12
				ball.vy *= 0.35
			}
			if (Math.abs(ball.y) > GOAL.halfWidth - BALL_RADIUS) {
				ball.y = Math.sign(ball.y) * (GOAL.halfWidth - BALL_RADIUS)
				ball.vy *= -0.25
			}
		}
		if (
			!ball.outcome &&
			(Math.abs(ball.y) > 7.5 || ball.x > 10.5 || ball.age > 4)
		) {
			ball.outcome = 'miss'
			events.push('miss')
		}
	}
	return events
}
