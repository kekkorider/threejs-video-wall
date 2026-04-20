import { Pane } from 'tweakpane'

import { orbitSpeed } from '@/assets/materials/WallMaterial'

const pane = new Pane({
  container: document.getElementById('tweakpane-container'),
})

pane.addBinding(orbitSpeed, 'value', { label: 'Orbit speed', min: 0, max: 1, step: 0.01 })
