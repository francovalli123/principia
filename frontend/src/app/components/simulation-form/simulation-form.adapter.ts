export interface SimulationFieldDefinition {
  name: string;
  label: string;
  unit: string;
  min: number;
  step: number;
  defaultValue: number;
  max?: number;
}

export interface SimulationFormAdapter {
  phenomenonType: string;
  title: string;
  description: string;
  fields: SimulationFieldDefinition[];
  toParameters(values: Record<string, number>): Record<string, number>;
}

export interface ObliqueProjectileParameters extends Record<string, number> {
  initial_velocity: number;
  angle: number;
  initial_height: number;
}

export const obliqueProjectileMotionAdapter: SimulationFormAdapter = {
  phenomenonType: 'Oblique Projectile Motion',
  title: 'Movimiento de un proyectil',
  description: 'Definí las condiciones iniciales del lanzamiento.',
  fields: [
    {
      name: 'initial_velocity',
      label: 'Velocidad inicial',
      unit: 'm/s',
      min: 0,
      step: 0.1,
      defaultValue: 20,
    },
    {
      name: 'angle',
      label: 'Ángulo de lanzamiento',
      unit: '°',
      min: 0,
      max: 90,
      step: 1,
      defaultValue: 45,
    },
    {
      name: 'initial_height',
      label: 'Altura inicial',
      unit: 'm',
      min: 0,
      step: 0.1,
      defaultValue: 0,
    },
  ],
  toParameters: (values): ObliqueProjectileParameters => ({
    initial_velocity: Number(values['initial_velocity']),
    angle: Number(values['angle']),
    initial_height: Number(values['initial_height']),
  }),
};

const adapters = new Map<string, SimulationFormAdapter>([
  [obliqueProjectileMotionAdapter.phenomenonType, obliqueProjectileMotionAdapter],
]);

export function getSimulationFormAdapter(
  phenomenonType: string,
): SimulationFormAdapter | undefined {
  return adapters.get(phenomenonType);
}