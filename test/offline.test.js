import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const DIST = new URL('../dist/', import.meta.url)

function read(file) {
	return readFileSync(new URL(file, DIST), 'utf8')
}

function cachedFiles() {
	const literal = read('sw.js').match(/const FILES = \[([^\]]*)\]/)
	assert.ok(literal, 'FILES should be an array literal in sw.js')
	return [...literal[1].matchAll(/'([^']+)'/g)].map(match => match[1])
}

// Every same-site file the page loads: links and scripts in index.html, the modules
// game.js imports (and what those import), and the manifest's icons.
function loadedFiles() {
	const html = read('index.html')
	const files = new Set(['./'])
	for (const [, url] of html.matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)="([^"]+)"/g)) {
		if (!/^https?:/.test(url)) files.add(url)
	}

	const modules = [...files].filter(file => file.split('?')[0].endsWith('.js'))
	while (modules.length > 0) {
		const source = read(modules.pop().split('?')[0])
		for (const [, url] of source.matchAll(/\bfrom '\.\/([^']+)'/g)) {
			if (!files.has(url)) {
				files.add(url)
				modules.push(url)
			}
		}
	}

	for (const icon of JSON.parse(read('manifest.webmanifest')).icons) files.add(icon.src)
	return files
}

test('the service worker saves exactly the files the page loads', () => {
	assert.deepEqual(new Set(cachedFiles()), loadedFiles())
})

test('every file the service worker saves exists', () => {
	for (const file of cachedFiles()) {
		assert.ok(existsSync(new URL(file.split('?')[0], DIST)), `${file} is missing from dist/`)
	}
})

test('the page links the manifest and registers the service worker', () => {
	const html = read('index.html')
	assert.match(html, /<link rel="manifest" href="manifest.webmanifest" \/>/)
	assert.match(html, /navigator\.serviceWorker\.register\('sw\.js'\)/)
})
