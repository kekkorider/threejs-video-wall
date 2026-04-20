import { Pane } from 'tweakpane'

import { orbitSpeed } from '@/assets/materials/WallMaterial'

import {
	weight as radialBlurWeight,
	decay as radialBlurDecay,
	exposure as radialBlurExposure,
	count as radialBlurCount,
} from '@/assets/postprocess/radialBlur'

const pane = new Pane({
  container: document.getElementById('tweakpane-container'),
})

pane.addBinding(orbitSpeed, 'value', { label: 'Orbit speed', min: 0, max: 1, step: 0.01 })

{
  const folder = pane.addFolder({ title: 'Postprocess - Radial blur' })
  folder.addBinding(radialBlurWeight, 'value', { label: 'Weight', min: 0, max: 1, step: 0.01 })
  folder.addBinding(radialBlurDecay, 'value', { label: 'Decay', min: 0, max: 1, step: 0.01 })
  folder.addBinding(radialBlurExposure, 'value', { label: 'Exposure', min: 1, max: 10, step: 1 })
  folder.addBinding(radialBlurCount, 'value', { label: 'Count', min: 16, max: 64, step: 1 })
}
