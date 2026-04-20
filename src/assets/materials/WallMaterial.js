import {
  Fn,
  If,
  cos,
  sin,
  uv,
  uniform,
  texture,
  instanceIndex,
  add,
  div,
  int,
  float,
  floor,
  mod,
  vec2,
  vec3,
  time,  luminance,
  positionLocal,
  attribute,
  mx_noise_vec3,
  hash,
  modelWorldMatrix,
  TWO_PI,
} from 'three/tsl'
import { MeshBasicNodeMaterial, DataTexture, RGBAFormat } from 'three/webgpu'

const dummyTexture = new DataTexture(
  new Uint8Array(1, 0, 0, 1),
  1,
  1,
  RGBAFormat
)

export const orbitSpeed = uniform(0.12)
export const videoTexture = uniform(dummyTexture)

export const WallMaterial = new MeshBasicNodeMaterial()
WallMaterial.name = 'Wall material'

export const scale = uniform(1)

const instancesPerStory = float(64)
const totalPlanes = int(4)
const totalStories = int(7)
const instancesPerPlaneX = div(instancesPerStory, totalPlanes)

const getCurrentStory = Fn(() => {
  return floor(div(float(instanceIndex), instancesPerStory))
})

const getMovementDirection = Fn(([currentStory]) => {
  const direction = hash(currentStory.add(358))
  direction.remapAssign(0, 1, -1, 1)

  return direction
})

const getOrbitAngle = Fn(() => {
  const currentStory = getCurrentStory()
  const movementDirection = getMovementDirection(currentStory)

  return time.mul(orbitSpeed).mul(movementDirection)
})

const getOrbitTurns = Fn(() => {
  return getOrbitAngle().div(TWO_PI)
})

const sampleTexture = Fn(() => {
  const currentStory = getCurrentStory()
  const currentInstancePerStory = mod(float(instanceIndex), instancesPerStory)
  const orbitTurns = getOrbitTurns()

  // Ring phase (0..1) shared with orbit transform, then split into plane + in-plane X.
  const ringPhase = currentInstancePerStory.div(instancesPerStory).add(orbitTurns)
  const wrappedRingPhase = mod(ringPhase, 1)
  const planePhase = wrappedRingPhase.mul(float(totalPlanes))
  const currentPlane = floor(planePhase)
  const x = mod(planePhase, 1)
  const y = div(currentStory, totalStories)

  return vec3(x, y, currentPlane)
})

const videoUV = Fn(() => {
  const sample = sampleTexture()
  const uvCellX = uv().x.div(instancesPerPlaneX).add(sample.x)

  If(float(sample.z).mod(2).equal(0), () => {
    uvCellX.oneMinusAssign()
  })

  const uvOffsetY = sample.y
  const uvCellY = uv().y.div(totalStories).add(uvOffsetY)

  return vec2(uvCellX, uvCellY)
})

WallMaterial.uvNode = Fn(() => {
  return videoUV()
})()

WallMaterial.colorNode = Fn(() => {
  const videoUv = videoUV()
  // return videoUv
  // return sampleTexture().xy.toVec2()
  // return getScale()

  return texture(videoTexture.value, videoUv)
})()

WallMaterial.positionNode = Fn(() => {
  const pos = positionLocal.toVar()

  const instancePosition = attribute('instancePosition').toVec3()
  const dirLocal = attribute('instanceDirectionLocal').toVec2()

  const angle = getOrbitAngle()
  const cosAngle = cos(angle)
  const sinAngle = sin(angle)
  const radius = instancePosition.xz.length()
  const tangentLocal = vec2(dirLocal.y.mul(-1), dirLocal.x)

  // Rotate the instance itself with the same phase as the orbit.
  const localX = pos.x.toVar()
  const localZ = pos.z.toVar()
  pos.x.assign(localX.mul(cosAngle).sub(localZ.mul(sinAngle)))
  pos.z.assign(localX.mul(sinAngle).add(localZ.mul(cosAngle)))

  const instancePositionWorld = modelWorldMatrix.mul(instancePosition)

  const base = vec3(0.8)
  const scale = mx_noise_vec3(instancePositionWorld.mul(0.5).add(time.mul(0.3)), 1)
  pos.mulAssign(add(base, scale.xxx.mul(0.7)))

  // Local-space orbit delta around world center, built from radial+tangent basis.
  const orbitDelta = dirLocal
    .mul(cosAngle.sub(1).mul(radius))
    .add(tangentLocal.mul(sinAngle.mul(radius)))
  pos.xz.addAssign(orbitDelta)

  return pos
})()

