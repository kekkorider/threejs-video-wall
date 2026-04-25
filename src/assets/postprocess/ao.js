import { N8AONode, createN8AOScenePass } from 'n8ao-webgpu'

export function createAO(scene, camera) {
  const scenePass = createN8AOScenePass(scene, camera)

  const n8ao = new N8AONode({
    beautyNode: scenePass.getTextureNode('output'),
    beautyTexture: scenePass.getTexture('output'),
    depthNode: scenePass.getTextureNode('depth'),
    depthTexture: scenePass.getTexture('depth'),
    normalNode: scenePass.getTextureNode('normal'),
    normalTexture: scenePass.getTexture('normal'),
    scenePassNode: scenePass,
    scene,
    camera,
  })

  return n8ao
}
