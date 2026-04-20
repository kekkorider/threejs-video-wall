<template>
	<div class="app">
		<WebGL class="webgl" />

		<div class="controls" ref="controlsRef">
			<button @click.once="start">Play Video</button>
		</div>
	</div>
</template>

<script setup>
import { shallowRef } from 'vue'

import { EVENTS } from '@/constants'
import WebGL from '@/components/WebGL.vue'
import { useGSAP } from '@/composables/useGSAP'

const controlsRef = shallowRef(null)

const { gsap } = useGSAP()

function start() {
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
</script>

<style scoped>
.app {
	width: 100dvw;
	height: 100dvh;
	display: grid;
}

.webgl,
.controls {
	grid-area: 1 / 1;
}

.controls {
	place-self: center;
}
</style>
