let audioContext
let masterGain
let musicGain
let musicEnabled = true
let effectsEnabled = true
let audioPaused = false

function reportAudioError(error) {
	console.warn('Audio could not start. Try toggling sound on again.', error)
}

/** Starts audio inside a user gesture, as required by browser autoplay rules. */
export function startAudio() {
	if (!(musicEnabled || effectsEnabled) || audioPaused) return
	if (!audioContext) {
		audioContext = new AudioContext()
		masterGain = audioContext.createGain()
		masterGain.connect(audioContext.destination)
		const music = audioContext.createBufferSource()
		music.buffer = createMusicBuffer(audioContext)
		music.loop = true
		musicGain = audioContext.createGain()
		musicGain.gain.value = musicEnabled ? 0.75 : 0
		music.connect(musicGain).connect(masterGain)
		music.start()
	}
	if (audioContext.state === 'suspended')
		audioContext.resume().catch(reportAudioError)
}

export function setSound({ music, effects }) {
	musicEnabled = music
	effectsEnabled = effects
	if (musicGain) {
		musicGain.gain.setTargetAtTime(
			music ? 0.75 : 0,
			audioContext.currentTime,
			0.02,
		)
	}
}

export function setAudioPaused(paused) {
	audioPaused = paused
	if (!audioContext) return
	if (paused) audioContext.suspend().catch(reportAudioError)
	else startAudio()
}

// An original eight-bar loop. Note tails wrap into the start for a seamless loop.
function createMusicBuffer(context) {
	const sampleRate = 22050
	const beat = 60 / 82
	const buffer = context.createBuffer(
		1,
		Math.round(32 * beat * sampleRate),
		sampleRate,
	)
	const samples = buffer.getChannelData(0)
	const chords = [
		[48, 60, 64, 67, 71],
		[45, 60, 64, 67, 69],
		[41, 57, 60, 64, 67],
		[43, 55, 59, 62, 67],
	]
	const melody = [
		[76, 79, 74],
		[72, 76, 71],
		[69, 76, 72],
		[71, 74, 67],
		[76, 79, 83],
		[81, 76, 72],
		[76, 72, 69],
		[74, 71, 67],
	]
	for (let bar = 0; bar < 8; bar++) {
		const [bass, ...chord] = chords[bar % chords.length]
		const start = bar * 4 * beat
		addNote(bass, start, 3.7 * beat, 0.018, 'pad')
		for (const note of chord) addNote(note, start, 4.5 * beat, 0.007, 'pad')
		for (let i = 0; i < 3; i++) {
			addNote(
				melody[bar][i],
				start + [0.5, 2, 3.25][i] * beat,
				1.8,
				0.027,
				'pluck',
			)
		}
	}
	return buffer

	function addNote(note, start, duration, volume, voice) {
		const frequency = 440 * 2 ** ((note - 69) / 12)
		const offset = Math.round(start * sampleRate)
		const count = Math.round(duration * sampleRate)
		for (let i = 0; i < count; i++) {
			const time = i / sampleRate
			const phase = 2 * Math.PI * frequency * time
			const envelope =
				voice === 'pad'
					? Math.sin((Math.PI * i) / count) ** 2
					: (1 - Math.exp(-time * 80)) * Math.exp(-time * 3) * (1 - i / count)
			const tone =
				Math.sin(phase) + Math.sin(phase * 2) * (voice === 'pad' ? 0.12 : 0.3)
			samples[(offset + i) % samples.length] += tone * envelope * volume
		}
	}
}

export function playSound(kind) {
	if (!effectsEnabled || audioPaused) return
	startAudio()
	const sounds = {
		kick: [105, 0.08],
		bounce: [155, 0.045],
		save: [90, 0.12],
		post: [720, 0.22],
		goal: [523, 0.3],
		miss: [175, 0.08],
	}
	const [frequency, duration] = sounds[kind]
	const oscillator = audioContext.createOscillator()
	const gain = audioContext.createGain()
	oscillator.type = kind === 'post' ? 'triangle' : 'sine'
	oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
	oscillator.frequency.exponentialRampToValueAtTime(
		kind === 'goal' ? 880 : frequency * 0.5,
		audioContext.currentTime + duration,
	)
	gain.gain.setValueAtTime(0.055, audioContext.currentTime)
	gain.gain.exponentialRampToValueAtTime(
		0.001,
		audioContext.currentTime + duration,
	)
	oscillator.connect(gain).connect(masterGain)
	oscillator.start()
	oscillator.stop(audioContext.currentTime + duration)
}
