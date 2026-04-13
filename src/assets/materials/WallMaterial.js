import { Fn, uv, positionLocal, uniform, texture } from 'three/tsl'
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

WallMaterial.positionNode = Fn(() => {
  return positionLocal.mul(scale)
})()

WallMaterial.colorNode = Fn(() => {
  const text0 = texture(videoTexture.value, uv())
  return text0
})()
