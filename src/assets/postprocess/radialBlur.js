import { uniform, float, int } from 'three/tsl'

export const weight = uniform(float(0.5))
export const decay = uniform(float(0.78))
export const exposure = uniform(int(3))
export const count = uniform(int(32))
