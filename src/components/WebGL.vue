<template>
	<canvas
		class="canvas"
		ref="canvas"
		:width="windowWidth"
		:height="windowHeight"
	/>
</template>

<script setup>
import { useTemplateRef, onMounted, nextTick, watch } from 'vue'
import {
	useWindowSize,
	useDevicePixelRatio,
	useUrlSearchParams,
	get,
} from '@vueuse/core'
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls'

import { useGSAP } from '@/composables/useGSAP'
import { WallMaterial, videoTexture } from '@/assets/materials/WallMaterial'

const canvasRef = useTemplateRef('canvas')
let perfPanel, scene, camera, renderer, mesh, controls

const { width: windowWidth, height: windowHeight } = useWindowSize()
const { pixelRatio: dpr } = useDevicePixelRatio()
const params = useUrlSearchParams('history')

const { gsap } = useGSAP()

//
// Lifecycle
//
onMounted(async () => {
	await nextTick()

	createScene()
	createCamera()

	await createRenderer()

	createVideo()
	createWall()
	createControls()

	gsap.ticker.fps(60)

	gsap.ticker.add(time => {
		perfPanel?.begin()

		updateScene(time)
		renderer.render(scene, camera)

		perfPanel?.end()
	})

	if (Object.hasOwn(params, 'debug')) {
		await import('@/assets/Debug')

		if (!renderer.isWebGPURenderer) {
			const { ThreePerf } = await import('three-perf')

			perfPanel = new ThreePerf({
				anchorX: 'left',
				anchorY: 'top',
				domElement: document.body,
				renderer,
			})
		}
	}
})

//
// Watchers
//
watch(dpr, value => {
	renderer.setPixelRatio(value)
})

watch([windowWidth, windowHeight], value => {
	camera.aspect = value[0] / value[1]
	camera.updateProjectionMatrix()

	renderer.setSize(value[0], value[1])
})

//
// Methods
//
function updateScene(time = 0) {
	controls?.update()
}

function createScene() {
	scene = new THREE.Scene()
}

function createCamera() {
	camera = new THREE.PerspectiveCamera(
		40,
		get(windowWidth) / get(windowHeight),
		0.1,
		100,
	)

	camera.position.set(0, 2, 2)
}

async function createRenderer() {
	renderer = new THREE.WebGPURenderer({
		canvas: get(canvasRef),
		alpha: true,
		antialias: true,
		powerPreference: 'high-performance',
	})

	renderer.setClearColor(0x121212, 1)
	renderer.setSize(get(windowWidth), get(windowHeight))

	if (Object.hasOwn(params, 'debug')) {
		const { Inspector } = await import('three/addons/inspector/Inspector')

		renderer.inspector = new Inspector()
	}

	await renderer.init()
}

function createControls() {
	controls = new OrbitControls(camera, renderer.domElement)
	controls.target.set(0, 2, 0)
	controls.enableDamping = true
	controls.minPolarAngle = Math.PI / 2
	controls.maxPolarAngle = Math.PI / 2
}

function createVideo() {
	const video = document.createElement('video')
	video.src = '/video.mp4'
	video.autoplay = true
	video.muted = true
	video.loop = true

	video.play()

	const texture = new THREE.VideoTexture(video)
	texture.colorSpace = THREE.SRGBColorSpace
	texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping

	videoTexture.value = texture
}

function createWall() {
	const geometry = new THREE.BoxGeometry()
	geometry.scale(0.6, 0.6, 0.6)
	const material = WallMaterial

	const stories = 7
	const meshesPerStory = 64
	const count = stories * meshesPerStory
	const gap = (Math.PI * 2) / meshesPerStory

	mesh = new THREE.InstancedMesh(geometry, material, count)

	const dummyMatrix = new THREE.Matrix4()

	let i, j
	for (i = 0; i < stories; i++) {
		for (j = 0; j < meshesPerStory; j++) {
			const position = new THREE.Vector3(
				Math.cos(gap * j) * 7,
				i * 0.65,
				Math.sin(gap * j) * 7,
			)

			const rotation = new THREE.Quaternion().setFromAxisAngle(
				new THREE.Vector3(0, 1, 0),
				-gap * j,
			)

			const scale = new THREE.Vector3(1, 1, 1)

			const instanceMatrix = dummyMatrix.clone()
			instanceMatrix.compose(position, rotation, scale)

			mesh.setMatrixAt(i * meshesPerStory + j, instanceMatrix)
		}
	}

	mesh.instanceMatrix.needsUpdate = true

	mesh.name = 'Wall mesh'

	scene.add(mesh)
}
</script>

<style scoped>
.canvas {
	height: 100dvh;
	width: 100dvw;
}
</style>
