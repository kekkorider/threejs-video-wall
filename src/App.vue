<template>
	<div class="app">
		<WebGL class="webgl" />

		<div class="controls" ref="controlsRef">
			<button class="btn" @click="start" ref="startBtnRef">Start</button>
		</div>

		<div class="panel">
			<div class="inner">
				<h1>ThreeJS music wall</h1>

				<p>
					This ThreeJS demo features a music video projected on a wall with
					moving bricks.
				</p>

				<p>
					The video is from <strong>Annisokay</strong>, one of my favorite
					bands.
				</p>

				<ul>
					<li>
						Repository link:
						<a
							href="https://github.com/kekkorider/threejs-video-wall"
							target="_blank"
							>Click here</a
						>
					</li>
					<li>
						Demo by
						<a href="https://www.francescomichelini.com" target="_blank"
							>Francesco Michelini</a
						>
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>

<script setup>
import { onMounted, shallowRef } from 'vue'

import { EVENTS } from '@/constants'
import WebGL from '@/components/WebGL.vue'
import { useGSAP } from '@/composables/useGSAP'

const controlsRef = shallowRef(null)
const startBtnRef = shallowRef(null)

const { gsap } = useGSAP()

onMounted(() => {
	window.addEventListener(EVENTS.RESET, () => {
		reset()
	})
})

function start() {
	startBtnRef.value.disabled = true

	const tl = gsap.timeline()
	tl.addLabel('start')

	tl.to(
		controlsRef.value,
		{
			opacity: 0,
			duration: 1,
			ease: 'power2.out',
		},
		'start',
	)

	window.dispatchEvent(new CustomEvent(EVENTS.ANIMATE_IN))
}

function reset() {
	startBtnRef.value.disabled = false

	gsap.to(
		controlsRef.value,
		{
			opacity: 1,
			duration: 1,
			ease: 'power2.out',
		},
		'start',
	)
}
</script>

<style scoped>
.app {
	width: 100dvw;
	height: 100dvh;
	display: grid;
}

.webgl,
.controls,
.panel {
	grid-area: 1 / 1;
}

.controls {
	place-self: center;
}

.btn {
	all: unset;

	cursor: pointer;
	color: var(--color-D);
	font-family: var(--font-primary);
	position: relative;
	padding: 0.4em 1em;
	font-size: 140%;
	border: 2px solid var(--color-E);
	border-radius: 0.5em 0 0.5em 0;
	corner-shape: bevel;

	background: -webkit-linear-gradient(
		rgb(from var(--color-A) r g b / 0.5),
		rgb(from var(--color-F) r g b / 0.5)
	);

	transition:
		border-color 0.3s ease-out,
		letter-spacing 0.4s ease-out;

	&:hover {
		border-color: var(--color-B);
		letter-spacing: 0.1em;
	}
}

.panel {
	place-self: end start;
	padding: 20px;
	width: 100%;

	@media (min-width: 640px) {
		width: clamp(200px, 50%, 400px);
	}

	.inner {
		display: grid;
		grid-template-columns: 1fr;
		grid-auto-rows: auto;
		gap: 16px;
		border: 2px solid var(--color-E);
		background: -webkit-linear-gradient(
			rgb(from var(--color-A) r g b / 0.5),
			rgb(from var(--color-F) r g b / 0.5)
		);
		padding: 0 20px 20px;
		corner-shape: bevel;
		border-radius: 1em 0 1em 0;
	}

	h1 {
		font-family: var(--font-primary);
		margin-bottom: 0;
		padding-bottom: 0.3em;
	}

	a {
		color: var(--color-D);
		text-underline-offset: 0.2em;

		&:hover {
			text-decoration: none;
		}
	}

	ul {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 0;
		margin: 0;
	}
}
</style>
