import {
  Fn,
  If,
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
  time,
  luminance,
  positionLocal,
  attribute,
  mx_noise_vec3
} from 'three/tsl'
import { MeshBasicNodeMaterial, DataTexture, RGBAFormat } from 'three/webgpu'

const dummyTexture = new DataTexture(
  new Uint8Array(1, 0, 0, 1),
  1,
  1,
  RGBAFormat
)

export const videoTexture = uniform(dummyTexture)

export const WallMaterial = new MeshBasicNodeMaterial()
WallMaterial.name = 'Wall material'

export const scale = uniform(1)

const instancesPerStory = float(64)
const totalPlanes = int(4)
const totalStories = int(7)
const instancesPerPlaneX = div(instancesPerStory, totalPlanes)

const sampleTexture = Fn(() => {
  const currentStory = floor(div(float(instanceIndex), instancesPerStory))
  const currentPlane = floor(div(float(instanceIndex), instancesPerPlaneX))
  const currentInstancePerStory = mod(float(instanceIndex), instancesPerStory)

  const x = div(mod(currentInstancePerStory, instancesPerPlaneX), instancesPerPlaneX)
  const y = div(currentStory, totalStories)

  x.addAssign(time.mul(0.1))

  return vec3(x, y, currentPlane)
})

const videoUV = Fn(() => {
  const sample = sampleTexture()

  const uvOffsetX = sample.x
  const uvCellX = uv().x.div(instancesPerPlaneX).add(uvOffsetX)

  If(float(sample.z).mod(2).equal(0), () => {
    uvCellX.oneMinusAssign()
  })

  const uvOffsetY = sample.y
  const uvCellY = uv().y.div(totalStories).add(uvOffsetY)

  return vec2(uvCellX, uvCellY)
})

const getScale = Fn(() => {
  const sample = sampleTexture()
  const tex0 = texture(videoTexture.value, sample.xy.toVec2())
  const lum = luminance(tex0.xyz.toVec3(), 0.8)

  return lum
})

WallMaterial.uvNode = Fn(() => {
  return videoUV()
})()

WallMaterial.colorNode = Fn(() => {
  // return sampleTexture().xy.toVec2()
  // return getScale()

  return texture(videoTexture.value, videoUV())
})()

WallMaterial.positionNode = Fn(() => {
  const pos = positionLocal.toVar()

  const instancePosition = attribute('instancePosition').toVec3()

  const base = vec3(0.7)
  const scale = getScale()
  scale.assign(mx_noise_vec3(instancePosition.yxz.mul(0.35).add(time.mul(0.3)), 1))
  pos.mulAssign(add(base, scale.mul(0.6)))

  const dirLocal = attribute('instanceDirectionLocal').toVec2()
  pos.xz.subAssign(dirLocal.mul(scale.mul(0.4)))

  return pos
})()

