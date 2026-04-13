import { Fn, uv, positionLocal, uniform } from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'

export const WallMaterial = new MeshBasicNodeMaterial()
WallMaterial.name = 'Wall material'

export const scale = uniform(1)

WallMaterial.positionNode = Fn(() => {
  return positionLocal.mul(scale)
})()

WallMaterial.colorNode = Fn(() => {
  return uv().toVec4()
})()
