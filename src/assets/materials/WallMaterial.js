import { Fn, uv, positionLocal, uniform, texture, instanceIndex, mul, div, int, float, ceil, mod, vec2 } from 'three/tsl'
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

const videoUV = Fn(() => {
  const instancesPerStory = float(64)
  const totalPlanes = int(4)
  const totalStories = int(8)

  const instancesPerPlaneX = div(instancesPerStory, totalPlanes)

  const currentStory = ceil(div(float(instanceIndex), instancesPerStory))
  const currentInstancePerStory = mod(float(instanceIndex), instancesPerStory)

  const x = div(mod(currentInstancePerStory, instancesPerPlaneX), instancesPerPlaneX)
  const y = div(currentStory, totalStories)

  return vec2(x, y)
})

WallMaterial.positionNode = Fn(() => {
  return positionLocal.mul(scale)
})()

WallMaterial.uvNode = Fn(() => {
  return videoUV()
})()

WallMaterial.colorNode = Fn(() => {
  const text0 = texture(videoTexture.value, videoUV())
  return text0
})()
