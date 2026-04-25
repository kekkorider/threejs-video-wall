<template>
	<canvas
		class="canvas"
		ref="canvas"
		:width="windowWidth"
		:height="windowHeight"
	/>
</template>

<script setup>
import { useTemplateRef, onMounted, nextTick, watch, shallowRef } from 'vue'
import {
	useWindowSize,
	useDevicePixelRatio,
	useUrlSearchParams,
	get,
} from '@vueuse/core'
import * as THREE from 'three/webgpu'
import { pass } from 'three/tsl'
import { radialBlur } from 'three/addons/tsl/display/radialBlur'
import { OrbitControls } from 'three/addons/controls/OrbitControls'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry'

import { useGSAP } from '@/composables/useGSAP'
import {
	WallMaterial,
	videoTexture,
	startTexture,
	videoMaskProgress,
} from '@/assets/materials/WallMaterial'
import { WaterMesh } from '@/assets/WaterMesh'
import { textureLoader } from '@/assets/loaders'

import { EVENTS } from '@/constants'

import {
	weight as radialBlurWeight,
	decay as radialBlurDecay,
	exposure as radialBlurExposure,
	count as radialBlurCount,
} from '@/assets/postprocess/radialBlur'

import { createAO } from '@/assets/postprocess/ao'

const canvasRef = useTemplateRef('canvas')
let perfPanel,
	scene,
	camera,
	renderer,
	mesh,
	controls,
	floorMesh,
	ceilingMesh,
	video,
	renderPipeline

const cameraStartPos = new THREE.Vector3(0, 28, 0)
const cameraFinalPos = new THREE.Vector3(0, 2, 0)

const cameraTargetStartPos = new THREE.Vector3(0, 0, 0)
const cameraTargetFinalPos = new THREE.Vector3(0, 2, -2)
const cameraTarget = cameraTargetStartPos.clone()

const isDebug = shallowRef(false)

const textures = new Map()

const { width: windowWidth, height: windowHeight } = useWindowSize()
const { pixelRatio: dpr } = useDevicePixelRatio()
const params = useUrlSearchParams('history')

const { gsap } = useGSAP()

//
// Lifecycle
//
onMounted(async () => {
	await nextTick()

	isDebug.value = Object.hasOwn(params, 'debug')

	createScene()
	createCamera()

	await createRenderer()
	await loadTextures()

	createVideo()
	createWall()
	createFloor()
	isDebug.value && createControls()
	createPostprocess()

	gsap.ticker.fps(60)

	gsap.ticker.add(time => {
		perfPanel?.begin()

		updateScene(time)
		renderPipeline.render()

		perfPanel?.end()
	})

	if (isDebug.value) {
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

	window.addEventListener(EVENTS.ANIMATE_IN, () => {
		animateIn()
	})
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

	!isDebug.value && camera.lookAt(cameraTarget)
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

	if (isDebug.value) {
		camera.position.copy(cameraFinalPos)
	} else {
		camera.position.copy(cameraStartPos)
	}
}

async function createRenderer() {
	renderer = new THREE.WebGPURenderer({
		canvas: get(canvasRef),
		alpha: true,
		antialias: true,
		powerPreference: 'high-performance',
	})

	renderer.setClearColor(0x010101, 1)
	renderer.setSize(get(windowWidth), get(windowHeight))

	if (Object.hasOwn(params, 'debug')) {
		const { Inspector } = await import('three/addons/inspector/Inspector')

		renderer.inspector = new Inspector()
	}

	await renderer.init()
}

async function loadTextures() {
	const result = await textureLoader.load([
		'/Water_1_M_Normal.jpg',
		'/Water_2_M_Normal.jpg',
		'/no-signal.webp',
	])

	result[0].wrapS = result[0].wrapT = THREE.RepeatWrapping
	result[1].wrapS = result[1].wrapT = THREE.RepeatWrapping

	result[2].wrapS = THREE.RepeatWrapping
	result[2].colorSpace = THREE.SRGBColorSpace

	textures.set('waterNormalMap0', result[0])
	textures.set('waterNormalMap1', result[1])
	textures.set('noSignal', result[2])

	startTexture.value = textures.get('noSignal')
}

function createControls() {
	controls = new OrbitControls(camera, renderer.domElement)
	controls.target.set(
		cameraTargetFinalPos.x,
		cameraTargetFinalPos.y,
		cameraTargetFinalPos.z,
	)

	controls.enablePan = false
	controls.enableDamping = true
	controls.minPolarAngle = Math.PI / 2
	controls.maxPolarAngle = Math.PI / 2
}

function createVideo() {
	video = document.createElement('video')
	video.src = '/video.mp4'
	video.autoplay = false
	video.muted = true
	video.loop = false

	video.addEventListener('ended', () => {
		animateOut()
	})

	const texture = new THREE.VideoTexture(video)
	texture.colorSpace = THREE.SRGBColorSpace
	texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping

	videoTexture.value = texture
}

function createWall() {
	const geometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.1)
	geometry.scale(0.6, 0.6, 0.6)
	const material = WallMaterial

	const stories = 7
	const meshesPerStory = 64
	const count = stories * meshesPerStory
	const gap = (Math.PI * 2) / meshesPerStory

	mesh = new THREE.InstancedMesh(geometry, material, count)

	const dummyMatrix = new THREE.Matrix4()
	const directionLocalArray = new Float32Array(count * 2)
	const yAxis = new THREE.Vector3(0, 1, 0)
	const directionWorld = new THREE.Vector3()
	const directionLocal = new THREE.Vector3()

	const positionArray = new Float32Array(count * 3)

	let i, j
	for (i = 0; i < stories; i++) {
		for (j = 0; j < meshesPerStory; j++) {
			const position = new THREE.Vector3(
				Math.cos(gap * j) * 7,
				i * 0.65,
				Math.sin(gap * j) * 7,
			)

			positionArray[(i * meshesPerStory + j) * 3 + 0] = position.x
			positionArray[(i * meshesPerStory + j) * 3 + 1] = position.y
			positionArray[(i * meshesPerStory + j) * 3 + 2] = position.z

			const rotation = new THREE.Quaternion().setFromAxisAngle(yAxis, -gap * j)

			// Direction away from world center, converted into this instance local space.
			directionWorld.set(position.x, 0, position.z).normalize()
			directionLocal
				.copy(directionWorld)
				.applyQuaternion(rotation.clone().invert())
			directionLocalArray[(i * meshesPerStory + j) * 2 + 0] = directionLocal.x
			directionLocalArray[(i * meshesPerStory + j) * 2 + 1] = directionLocal.z

			const scale = new THREE.Vector3(1, 1, 1)

			const instanceMatrix = dummyMatrix.clone()
			instanceMatrix.compose(position, rotation, scale)

			mesh.setMatrixAt(i * meshesPerStory + j, instanceMatrix)
		}
	}

	mesh.instanceMatrix.needsUpdate = true

	mesh.geometry.setAttribute(
		'instancePosition',
		new THREE.InstancedBufferAttribute(positionArray, 3),
	)

	mesh.geometry.setAttribute(
		'instanceDirectionLocal',
		new THREE.InstancedBufferAttribute(directionLocalArray, 2),
	)

	mesh.name = 'Wall mesh'
	mesh.rotation.y = Math.PI * 0.25

	scene.add(mesh)
}

function createFloor() {
	const geometry = new THREE.CircleGeometry(7.5, 64)

	floorMesh = new WaterMesh(geometry, {
		color: 0xffffff,
		flowDirection: new THREE.Vector2(1, 0),
		normalMap0: textures.get('waterNormalMap0'),
		normalMap1: textures.get('waterNormalMap1'),
	})

	floorMesh.rotation.x = -Math.PI / 2
	floorMesh.renderOrder = 10

	ceilingMesh = new WaterMesh(geometry, {
		color: 0xffffff,
		flowDirection: new THREE.Vector2(-0.3, 0.7),
		normalMap0: textures.get('waterNormalMap1'),
		normalMap1: textures.get('waterNormalMap0'),
	})

	ceilingMesh.rotation.x = Math.PI / 2
	ceilingMesh.renderOrder = 10
	ceilingMesh.position.y = 3.7

	scene.add(floorMesh)
	scene.add(ceilingMesh)
}

function createPostprocess() {
	renderPipeline = new THREE.RenderPipeline(renderer)

	const aoPass = createAO(scene, camera)

	const blurPass = radialBlur(aoPass.getTextureNode(), {
		weight: radialBlurWeight.value,
		decay: radialBlurDecay.value,
		exposure: radialBlurExposure.value,
		count: radialBlurCount.value,
	})

	renderPipeline.outputNode = blurPass
}

function animateIn() {
	const tl = gsap.timeline()
	tl.addLabel('start')

	tl.fromTo(
		camera.position,
		{
			x: cameraStartPos.x,
			y: cameraStartPos.y,
			z: cameraStartPos.z,
		},
		{
			x: cameraFinalPos.x,
			y: cameraFinalPos.y,
			z: cameraFinalPos.z,
			duration: 5,
			ease: 'power2.inOut',
		},
		'start',
	)

	tl.fromTo(
		cameraTarget,
		{
			x: cameraTargetStartPos.x,
			y: cameraTargetStartPos.y,
			z: cameraTargetStartPos.z,
		},
		{
			x: cameraTargetFinalPos.x,
			y: cameraTargetFinalPos.y,
			z: cameraTargetFinalPos.z,
			duration: 3.2,
			ease: 'power2.inOut',
			onComplete: () => {
				video.currentTime = 0
				video.play()
			},
		},
		'start+=1',
	)

	tl.fromTo(
		videoMaskProgress,
		{
			value: 0,
		},
		{
			value: 1,
			duration: 1.7,
			ease: 'power2.out',
		},
		'>0.7',
	)
}

function animateOut() {
	const tl = gsap.timeline({
		onComplete: () => {
			window.dispatchEvent(new CustomEvent(EVENTS.RESET))
		},
	})
	tl.addLabel('start')

	tl.to(
		videoMaskProgress,
		{
			value: 0,
			duration: 1.5,
			ease: 'sine.out',
		},
		'start',
	)

	tl.to(
		camera.position,
		{
			x: cameraStartPos.x,
			y: cameraStartPos.y,
			z: cameraStartPos.z,
			duration: 3.2,
			ease: 'sine.inOut',
		},
		'start+=0.5',
	)

	tl.to(
		cameraTarget,
		{
			x: cameraTargetStartPos.x,
			y: cameraTargetStartPos.y,
			z: cameraTargetStartPos.z,
			duration: 3.2,
			ease: 'sine.inOut',
		},
		'start+=0.5',
	)
}
</script>

<style scoped>
.canvas {
	height: 100dvh;
	width: 100dvw;
}
</style>
