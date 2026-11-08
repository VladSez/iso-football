// Every pitch shares the same playable geometry; only ground, paint, props and light change.
const STEEL = [89, 107, 87]
const WOOD = [145, 111, 73]
const LINE = [226, 226, 186]

export function line3D(from, to, radius, color) {
	capsule(from, to, radius, radius, () => color, 'solid')
}

const frac = (value) => value - Math.floor(value)
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const shade = (color, grain = 0) =>
	rgb(color[0] + grain, color[1] + grain, color[2] + grain)
const inPitch = (x, y) => Math.abs(x) <= 9 && Math.abs(y) <= 6.5
const wearAt = (x, y) => Math.exp(-((x + 7.8) ** 2 / 2 + (y * y) / 5)) * 0.65

function markings(x, y, width = 0.065, boxesOnly = false) {
	const boundary =
		(Math.abs(Math.abs(x) - 8.8) < width && Math.abs(y) <= 6.1) ||
		(Math.abs(Math.abs(y) - 6.05) < width && Math.abs(x) < 8.85)
	const penaltyBox =
		(Math.abs(x + 3.4) < width && Math.abs(y) < 4.4) ||
		(Math.abs(Math.abs(y) - 4.35) < width && x < -3.4 && x > -8.8)
	const goalBox =
		(Math.abs(x + 7) < width && Math.abs(y) < 3.35) ||
		(Math.abs(Math.abs(y) - 3.3) < width && x < -7 && x > -8.8)
	if (boxesOnly) return boundary || penaltyBox || goalBox
	const arc = Math.abs(Math.hypot(x + 5.2, y) - 2.75) < width && x > -3.4
	const spot = Math.hypot(x + 5.2, y) < 0.105
	const halfway = Math.abs(x - 8.75) < 0.07
	const centerArc = Math.abs(Math.hypot(x - 8.75, y) - 2.1) < width
	return (
		boundary || penaltyBox || goalBox || arc || spot || halfway || centerArc
	)
}

// Distance to the island's edge, or -1 outside its ragged, dithered border.
function islandEdge(x, y, ix, iy, sizeX = 12.5, sizeY = 10.1) {
	const edge =
		((Math.abs(x) / sizeX) ** 6 + (Math.abs(y) / sizeY) ** 6) ** (1 / 6)
	const ragged = edge + (noise(x * 1.7, y * 1.7) - 0.5) * 0.09
	if (ragged > 1.03 || (ragged > 0.9 && hash(ix, iy) < (ragged - 0.9) / 0.13))
		return -1
	return edge
}

function shadowColumn(x, y, height, radius) {
	for (let z = 0; z < height; z += 0.2) castShadow(x, y, z, radius)
}

function bench(x0, y) {
	box(x0, y + 0.1, 0.55, x0 + 3.5, y + 0.7, 0.7, WOOD)
	box(x0, y, 0.9, x0 + 3.5, y + 0.15, 1.4, WOOD)
	for (const x of [x0 + 0.25, x0 + 3.15])
		box(x, y + 0.2, 0, x + 0.12, y + 0.65, 0.55, STEEL)
	for (let x = x0 + 0.2; x < x0 + 3.5; x += 0.2) castShadow(x, y + 0.45, 1, 0.35)
}

function cone(x, y) {
	capsule(
		[x, y, 0.02],
		[x, y, 0.5],
		0.17,
		0.025,
		(z) => (z > 0.2 && z < 0.3 ? [240, 236, 224] : [232, 112, 52]),
		'solid',
	)
	castShadow(x, y, 0.3, 0.15)
}

function palm(x, y, lean, seed) {
	const trunk = [[x, y, 0]]
	for (let k = 1; k <= 6; k++)
		trunk.push([
			x + lean[0] * k * k * 0.03,
			y + lean[1] * k * k * 0.03,
			k * 0.85,
		])
	for (let k = 0; k < 6; k++)
		capsule(
			trunk[k],
			trunk[k + 1],
			0.28 - k * 0.025,
			0.25 - k * 0.025,
			(z) => (frac(z * 2.2) < 0.25 ? [118, 92, 66] : [158, 126, 88]),
			'rough',
		)
	const top = trunk[6]
	for (let frond = 0; frond < 9; frond++) {
		const angle = (frond / 9) * 6.283 + seed
		const length = 2 + hash(frond, seed) * 0.7
		const color = frond % 2 ? [64, 112, 58] : [96, 142, 66]
		let from = top
		for (let step = 1; step <= 6; step++) {
			const t = step / 6
			const to = [
				top[0] + Math.cos(angle) * length * t,
				top[1] + Math.sin(angle) * length * t,
				top[2] + 0.4 * t - 1.6 * t * t,
			]
			capsule(from, to, 0.25 - 0.2 * t, 0.24 - 0.22 * t, () => color, 'solid')
			castShadow(to[0], to[1], to[2], 0.22)
			from = to
		}
	}
	for (let k = 0; k < 3; k++)
		sphere(
			top[0] + Math.cos(k * 2.1) * 0.25,
			top[1] + Math.sin(k * 2.1) * 0.25,
			top[2] - 0.2,
			0.15,
			[110, 82, 50],
		)
	for (const point of trunk) castShadow(point[0], point[1], point[2], 0.25)
}

function umbrella(x, y) {
	line3D([x, y, 0], [x, y, 2.3], 0.05, [236, 230, 214])
	for (let r = 0.15; r < 1.45; r += 0.09)
		for (let angle = 0; angle < 6.283; angle += 0.12 / r) {
			const stripe = Math.floor((angle / 6.283) * 8) % 2
			sphere(
				x + Math.cos(angle) * r,
				y + Math.sin(angle) * r,
				2.35 - r * 0.38,
				0.09,
				stripe ? [214, 82, 64] : [242, 232, 206],
				'solid',
			)
		}
	for (let r = 0; r < 1.45; r += 0.3)
		for (let angle = 0; angle < 6.283; angle += 0.5)
			castShadow(x + Math.cos(angle) * r, y + Math.sin(angle) * r, 2, 0.25)
}

function pine(x, y, scale) {
	capsule(
		[x, y, 0],
		[x, y, 0.8 * scale],
		0.18 * scale,
		0.14 * scale,
		() => BARK,
		'rough',
	)
	const tiers = [
		[0.6, 1.6, 1.2],
		[1.5, 2.4, 0.95],
		[2.3, 3.2, 0.7],
		[3.1, 3.9, 0.45],
	]
	for (const [z0, z1, radius] of tiers) {
		// Snow settles on the top of each tier and in a few stray clumps.
		const snowy = (z) => z > (z1 - 0.32) * scale || hash(z * 40, x) > 0.86
		capsule(
			[x, y, z0 * scale],
			[x, y, z1 * scale],
			radius * scale,
			0.06,
			(z) => (snowy(z) ? [236, 240, 246] : [44, 82, 66]),
			'rough',
		)
		for (let z = z0; z < z1; z += 0.25)
			castShadow(x, y, z * scale, radius * scale * (1 - (z - z0) / (z1 - z0)) + 0.1)
	}
}

function snowman(x, y) {
	const SNOW = [238, 242, 248]
	const COAL = [36, 36, 40]
	sphere(x, y, 0.5, 0.55, SNOW)
	sphere(x, y, 1.25, 0.4, SNOW)
	sphere(x, y, 1.82, 0.29, SNOW)
	capsule(
		[x + 0.25, y + 0.05, 1.86],
		[x + 0.6, y + 0.12, 1.84],
		0.06,
		0.02,
		() => [232, 120, 50],
		'solid',
	)
	for (const dy of [-0.11, 0.11]) sphere(x + 0.24, y + dy, 1.95, 0.04, COAL, 'solid')
	for (const z of [1, 1.2, 1.4]) sphere(x + 0.38, y, z, 0.045, COAL, 'solid')
	line3D([x, y - 0.35, 1.35], [x - 0.1, y - 0.95, 1.75], 0.03, BARK)
	line3D([x, y + 0.35, 1.35], [x + 0.1, y + 0.9, 1.6], 0.03, BARK)
	capsule([x, y, 2.02], [x, y, 2.3], 0.2, 0.2, () => [60, 70, 120], 'solid')
	line3D([x - 0.05, y - 0.25, 2.04], [x + 0.1, y + 0.25, 2.04], 0.08, [196, 60, 60])
	shadowColumn(x, y, 2.2, 0.45)
}

function tire(x, y, z) {
	for (let angle = 0; angle < 6.283; angle += 0.25)
		sphere(
			x + Math.cos(angle) * 0.38,
			y + Math.sin(angle) * 0.38,
			z + 0.14,
			0.15,
			[44, 44, 50],
			'solid',
		)
	castShadow(x, y, z + 0.1, 0.5)
}

export const COURTS = {
	neighborhood: {
		label: 'Neighborhood',
		ground(x, y, ix, iy, index) {
			if (islandEdge(x, y, ix, iy) < 0) return 0
			const grain =
				(hash(ix, iy) - 0.5) * 9 + (noise(x * 1.4, y * 1.4) - 0.5) * 8
			if (inPitch(x, y)) {
				kinds[index] = 1
				const stripe = Math.floor((x + 9) / 2.25) % 2
				let color = stripe ? [121, 150, 83] : [130, 157, 89]
				if (markings(x, y)) color = LINE
				return shade(mix(color, [157, 146, 98], wearAt(x, y)), grain)
			}
			if (y < -7 && y > -8.25 && x > -9.5 && x < 10) {
				kinds[index] = 2
				return shade([181, 173, 147], grain)
			}
			kinds[index] = KIND_GRASS
			const tone = clamp(
				Math.floor(noise(x * 0.8, y * 0.8) * 3.7 + hash(ix, iy)),
				0,
				4,
			)
			return rgb(...GRASS[tone])
		},
		props() {
			// A low boundary fence and a bench sit beyond the playable grass.
			for (let x = -9; x <= 9; x += 3)
				line3D([x, -8.35, 0], [x, -8.35, 1.6], 0.06, STEEL)
			for (const z of [0.4, 1.35])
				line3D([-9, -8.35, z], [9, -8.35, z], 0.045, STEEL)
			box(0.3, -8.25, 0.55, 3.8, -7.65, 0.7, WOOD)
			box(0.3, -8.35, 0.9, 3.8, -8.2, 1.4, WOOD)
			for (const x of [0.55, 3.45])
				box(x, -8.15, 0, x + 0.12, -7.7, 0.55, STEEL)
			line3D([3.25, -7.95, 0.72], [3.25, -7.95, 1.12], 0.11, [84, 127, 146])
			box(4.9, -8.2, 0, 5.5, -7.6, 0.8, STEEL)
			box(4.85, -8.25, 0.8, 5.55, -7.55, 0.9, [59, 80, 66])
			growTree(-6.7, -8.5, 0.84, 330, 0)
			growTree(9.7, 4.9, 0.61, 230, 1200)
			for (let x = 0.5; x < 3.8; x += 0.2) castShadow(x, -7.9, 1, 0.35)
		},
	},

	rooftop: {
		label: 'Rooftop cage',
		ground(x, y, ix, iy, index) {
			if (Math.abs(x) > 11.6 || Math.abs(y) > 9.4) return 0
			const grain = (hash(ix, iy) - 0.5) * 7
			if (inPitch(x, y)) {
				kinds[index] = 1
				let color = Math.floor((x + 9) / 1.5) % 2 ? [74, 146, 92] : [82, 156, 98]
				if (hash(ix * 3, iy * 7) > 0.93) color = [56, 104, 74] // rubber crumb
				if (markings(x, y)) color = [238, 240, 228]
				return shade(color, grain)
			}
			kinds[index] = 2
			const seam = frac(x / 1.6) < 0.035 || frac(y / 1.6) < 0.05
			if (seam) return shade([128, 122, 118], grain)
			const tile = (hash(Math.floor(x / 1.6), Math.floor(y / 1.6)) - 0.5) * 10
			return shade([172, 164, 152], grain + tile)
		},
		props() {
			const WALL = [178, 160, 142]
			box(-11.6, -9.4, 0, 11.6, -9, 0.9, WALL)
			box(-11.6, -9.4, 0, -11.2, 9.4, 0.9, WALL)
			for (let x = -11.5; x < 11.6; x += 0.2) castShadow(x, -9.2, 0.6, 0.35)
			for (let y = -9.3; y < 9.4; y += 0.2) castShadow(-11.4, y, 0.6, 0.35)
			// The cage closes only the two far sides, so the view of the pitch stays open.
			const CAGE = [62, 74, 82]
			const MESH = [128, 140, 146]
			for (let x = -10.4; x <= 9.6; x += 2.5) {
				line3D([x, -7.1, 0], [x, -7.1, 3.4], 0.06, CAGE)
				shadowColumn(x, -7.1, 3.4, 0.08)
			}
			for (let y = -7.1; y <= 6.6; y += 2.3) {
				line3D([-10.4, y, 0], [-10.4, y, 3.4], 0.06, CAGE)
				shadowColumn(-10.4, y, 3.4, 0.08)
			}
			for (const z of [0.05, 1.7, 3.4]) {
				line3D([-10.4, -7.1, z], [9.6, -7.1, z], 0.04, CAGE)
				line3D([-10.4, -7.1, z], [-10.4, 6.6, z], 0.04, CAGE)
			}
			for (let x = -10.4; x <= 9.6; x += 0.45)
				line3D([x, -7.1, 0.05], [x, -7.1, 3.4], 0.012, MESH)
			for (let y = -7.1; y <= 6.6; y += 0.45)
				line3D([-10.4, y, 0.05], [-10.4, y, 3.4], 0.012, MESH)
			// String lights sag between the posts.
			for (let x = -10.4; x < 9.6; x += 0.32) {
				const sag = Math.sin(frac((x + 10.4) / 2.5) * Math.PI) * 0.45
				const warm = Math.floor(x * 3) % 2 ? [255, 214, 120] : [255, 168, 96]
				sphere(x, -7.1, 3.25 - sag, 0.06, warm, 'gloss')
			}
			const UNIT = [196, 198, 194]
			box(4.6, -8.9, 0, 6.2, -7.8, 1, UNIT)
			box(4.8, -8.8, 1, 6, -7.9, 1.05, [120, 124, 126])
			box(6.6, -8.9, 0, 7.6, -8.1, 0.75, UNIT)
			shadowColumn(5.4, -8.3, 1, 0.7)
			bench(0.6, -8.8)
			const [tx, ty] = [10.4, -7.9]
			for (const [dx, dy] of [
				[-0.6, -0.6],
				[0.6, -0.6],
				[-0.6, 0.6],
				[0.6, 0.6],
			])
				line3D(
					[tx + dx, ty + dy, 0],
					[tx + dx * 0.8, ty + dy * 0.8, 3],
					0.06,
					[70, 66, 64],
				)
			capsule(
				[tx, ty, 3],
				[tx, ty, 4.6],
				0.95,
				0.95,
				(z) => (frac(z * 2.5) < 0.12 ? [96, 70, 50] : [150, 108, 74]),
				'rough',
			)
			capsule([tx, ty, 4.6], [tx, ty, 5.3], 1, 0.05, () => [80, 84, 88], 'solid')
			shadowColumn(tx, ty, 5, 0.9)
			for (const [x, y] of [
				[-11, 8.4],
				[11, 8.4],
			]) {
				box(x - 0.45, y - 0.45, 0, x + 0.45, y + 0.45, 0.6, [150, 104, 78])
				growTree(x, y, 0.32, 140, x * 10)
			}
		},
		grade: [1.03, 1, 0.96, 0],
	},

	beach: {
		label: 'Beach at sunset',
		aim: [56, 98, 150],
		ground(x, y, ix, iy, index) {
			const edge = islandEdge(x, y, ix, iy, 12.8, 10.4)
			if (edge < 0) return 0
			const grain =
				(hash(ix, iy) - 0.5) * 10 + (noise(x * 0.9, y * 2.2) - 0.5) * 14
			kinds[index] = 2
			const shore =
				-7.7 + Math.sin(x * 0.7) * 0.35 + (noise(x * 1.3, 4) - 0.5) * 0.5
			if (y < shore - 0.35) {
				const depth = shore - 0.35 - y
				if (depth < 0.22 || (depth < 0.4 && hash(ix, iy) > 0.5))
					return rgb(238, 242, 232)
				const swell = frac(x * 0.35 + y * 1.4 + noise(x, y) * 0.8) < 0.18
				return shade(
					depth > 1 ? [52, 120, 148] : [74, 152, 164],
					swell ? 18 : (hash(ix, iy) - 0.5) * 6,
				)
			}
			if (y < shore + 0.6) return shade([196, 168, 122], grain * 0.6)
			if (inPitch(x, y)) {
				let color = [226, 196, 140]
				if (hash(ix * 5, iy * 3) > 0.94) color = [196, 166, 118] // footprints
				if (markings(x, y, 0.07, true)) color = [56, 98, 150] // rope
				return shade(mix(color, [206, 174, 120], wearAt(x, y)), grain)
			}
			if (edge > 0.8 && noise(x * 1.1, y * 1.1) > 0.62) {
				kinds[index] = KIND_GRASS
				return rgb(...GRASS[3])
			}
			return shade([232, 206, 152], grain)
		},
		props() {
			for (const [x, y] of [
				[-8.8, -6.1],
				[8.8, -6.1],
				[-8.8, 6.1],
				[8.8, 6.1],
				[-3.4, -4.35],
				[-3.4, 4.35],
				[0, -6.1],
				[0, 6.1],
			]) {
				line3D([x, y, 0], [x, y, 0.45], 0.06, WOOD)
				castShadow(x, y, 0.3, 0.08)
			}
			palm(-7.2, -7.4, [0.6, -0.4], 0.3)
			palm(11.9, 1.5, [0.7, 0.2], 1.1)
			palm(-10.6, 5.6, [-0.5, 0.6], 2.2)
			umbrella(4.6, -7.3)
			box(2.6, -7.9, 0, 4, -7.2, 0.03, [214, 82, 64])
			box(2.6, -7.65, 0.03, 4, -7.45, 0.035, [242, 232, 206])
			box(5.8, -7.6, 0, 6.5, -7.1, 0.5, [70, 150, 190])
			box(5.75, -7.65, 0.5, 6.55, -7.05, 0.6, [240, 240, 232])
			shadowColumn(6.1, -7.35, 0.5, 0.4)
			sphere(1.6, -7.5, 0.22, 0.22, [240, 200, 84])
		},
		grade: [1.09, 0.99, 0.86, 4],
	},

	snow: {
		label: 'Snow day',
		aim: [70, 82, 110],
		ground(x, y, ix, iy, index) {
			if (islandEdge(x, y, ix, iy) < 0) return 0
			const drift =
				(noise(x * 0.6, y * 0.6) - 0.5) * 22 + (hash(ix, iy) - 0.5) * 6
			kinds[index] = 2
			if (!inPitch(x, y)) return shade([236, 240, 248], drift)
			kinds[index] = 1
			let color = [224, 228, 236]
			// Grass shows through where the goalmouth is trampled.
			const thaw =
				wearAt(x, y) * 1.3 + (noise(x * 1.2 + 9, y * 1.2) - 0.62) * 1.6
			if (thaw > 0.35)
				color = mix(color, [116, 138, 92], clamp((thaw - 0.35) * 2.2, 0, 0.85))
			if (markings(x, y, 0.07, true) && hash(ix * 2, iy) > 0.12)
				color = [206, 74, 66] // spray paint
			return shade(color, drift * 0.5)
		},
		props() {
			box(-11, -9.5, 0, 11, -8.9, 3.4, [148, 86, 72])
			box(-11.1, -9.6, 3.4, 11.1, -8.8, 3.6, [236, 240, 248])
			for (let x = -9.6; x < 10; x += 2.6) {
				box(x, -8.92, 1.2, x + 1.5, -8.86, 2.7, [150, 182, 204])
				box(x - 0.08, -8.95, 1.12, x + 1.58, -8.78, 1.2, [236, 240, 248])
			}
			for (let x = -11; x < 11; x += 0.25) castShadow(x, -9.2, 2.2, 0.5)
			pine(-10.6, -6.6, 1)
			pine(10.6, 4.6, 0.85)
			pine(-11, 3.8, 0.7)
			snowman(5.4, -7.8)
			box(1.6, -8, 0.12, 3, -7.4, 0.2, [196, 58, 52])
			for (const y of [-7.95, -7.45])
				line3D([1.6, y, 0.04], [3.1, y, 0.04], 0.03, [60, 60, 66])
			for (const [x, y] of [
				[-8.8, -6.1],
				[8.8, -6.1],
				[-8.8, 6.1],
				[8.8, 6.1],
			])
				cone(x, y)
		},
		// Flakes drift down through the scene and wrap back to the top.
		weather(time) {
			const flake = rgb(250, 252, 255)
			for (let n = 0; n < 260; n++) {
				const z = 7 - frac(hash(n, 3) + time * (0.08 + hash(n, 4) * 0.06)) * 7
				const sway = Math.sin(time * 0.9 + n) * 0.2
				plot(hash(n, 1) * 24 - 12 + sway, hash(n, 2) * 20 - 10, z, flake)
			}
		},
		grade: [0.95, 0.99, 1.07, 0],
	},

	overpass: {
		label: 'Under the overpass',
		ground(x, y, ix, iy, index) {
			const edge = islandEdge(x, y, ix, iy)
			if (edge < 0) return 0
			const grain =
				(hash(ix, iy) - 0.5) * 10 + (noise(x * 1.6, y * 1.6) - 0.5) * 12
			kinds[index] = 2
			if (inPitch(x, y)) {
				if (noise(x * 0.9 + 3, y * 0.9 - 2) > 0.85)
					return shade([96, 112, 122], (hash(ix, iy) - 0.5) * 8) // puddle
				kinds[index] = 1
				let color = noise(x * 0.5, y * 0.5) > 0.5 ? [172, 118, 80] : [160, 108, 74]
				const chalk = hash(Math.floor(x * 3), Math.floor(y * 3)) > 0.2
				if (markings(x, y, 0.07) && chalk) color = [222, 208, 176]
				return shade(mix(color, [196, 158, 116], wearAt(x, y)), grain)
			}
			if (edge > 0.82 && noise(x * 1.3, y * 1.3) > 0.55) {
				kinds[index] = KIND_GRASS
				return rgb(...GRASS[clamp(Math.floor(noise(x, y) * 4), 1, 4)])
			}
			const crack = Math.abs(noise(x * 0.9, y * 0.9) - 0.5) < 0.018
			return crack ? shade([62, 64, 70]) : shade([104, 104, 108], grain * 0.7)
		},
		props() {
			for (const x of [-10.8, -2.8, 5.2]) {
				box(x, -10.2, 0, x + 1.3, -8.9, 5, [168, 164, 154])
				for (let z = 0; z < 5; z += 0.3) castShadow(x + 0.65, -9.5, z, 0.75)
			}
			box(-12, -11, 5, 12, -8.5, 5.8, [150, 146, 138])
			box(-12, -8.6, 5.8, 12, -8.5, 6.2, [120, 118, 114])
			for (let x = -12; x < 12; x += 0.4) castShadow(x, -9.7, 5.2, 1.4)
			box(-2.8, -8.92, 0.6, -1.9, -8.88, 1.8, [214, 90, 110])
			box(-2.5, -8.93, 1.4, -1.6, -8.86, 2.3, [80, 170, 170])
			box(5.4, -8.92, 0.4, 6.4, -8.88, 1.3, [240, 200, 80])
			box(-10.6, -8.92, 0.9, -9.7, -8.88, 1.6, [110, 120, 200])
			// A dumped couch stands in for the bench.
			const SOFA = [120, 92, 140]
			box(0.2, -8.5, 0, 3.4, -7.6, 0.55, SOFA)
			box(0.2, -8.6, 0.55, 3.4, -8.25, 1.25, SOFA)
			box(0.1, -8.6, 0, 0.45, -7.6, 0.85, SOFA)
			box(3.2, -8.6, 0, 3.55, -7.6, 0.85, SOFA)
			for (let x = 0.2; x < 3.4; x += 0.25) castShadow(x, -8.1, 0.8, 0.45)
			tire(8.2, -7.6, 0)
			tire(8.2, -7.6, 0.3)
			tire(8.25, -7.6, 0.6)
			tire(7.2, -8.2, 0)
			cone(-9.6, 6.6)
			cone(6.5, -7.4)
			const POLE = [70, 74, 78]
			line3D([11.2, 7.2, 0], [11.2, 7.2, 4.6], 0.07, POLE)
			line3D([11.2, 7.2, 4.6], [10.5, 7.2, 4.8], 0.05, POLE)
			sphere(10.4, 7.2, 4.7, 0.16, [255, 204, 120], 'gloss')
			shadowColumn(11.2, 7.2, 4.6, 0.08)
			growTree(-10.6, 6.2, 0.5, 180, 777)
		},
		grade: [1.05, 0.99, 0.9, 2],
	},
}

// Warms or cools the finished frame; the white margin around the island is left alone.
export function gradeFrame(court) {
	if (!court.grade) return
	const [r, g, b, lift] = court.grade
	for (let i = 0; i < pix.length; i++) {
		if (zb[i] < -1e8) continue
		const color = pix[i]
		pix[i] = rgb(
			(color & 255) * r + lift,
			((color >> 8) & 255) * g + lift,
			((color >> 16) & 255) * b + lift,
		)
	}
}
