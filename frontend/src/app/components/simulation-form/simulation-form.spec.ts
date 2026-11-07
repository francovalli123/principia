import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Simulation } from '../../../models/simulation';
import { SimulationApiService } from '../../services/simulation-api';
import { SimulationForm } from './simulation-form';
import {
  getSimulationFormAdapter,
  obliqueProjectileMotionAdapter,
} from './simulation-form.adapter';

describe('SimulationForm', () => {
  let component: SimulationForm;
  let fixture: ComponentFixture<SimulationForm>;
  const simulationApi = {
    getPhenomena: vi.fn(),
    createSimulation: vi.fn(),
  };
  const router = {
    navigateByUrl: vi.fn(),
    navigate: vi.fn(),
  };
  const route = {
    snapshot: {
      queryParamMap: {
        get: vi.fn((_key: string) => null as string | null),
      },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    simulationApi.getPhenomena.mockReturnValue(
      of({ status: 'success', data: ['Oblique Projectile Motion'] }),
    );
    await TestBed.configureTestingModule({
      imports: [SimulationForm],
      providers: [
        { provide: SimulationApiService, useValue: simulationApi },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SimulationForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the phenomenon catalog after loading', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(component.isLoading).toBe(false);
    expect(component.phenomena).toContain('Oblique Projectile Motion');
    expect(element.querySelector('option[value="Oblique Projectile Motion"]')?.textContent).toContain(
      'Oblique Projectile Motion',
    );
    expect(element.textContent).not.toContain('Cargando fenómenos');
  });

  it('maps projectile phenomenon fields and serializes API parameter names', () => {
    const adapter = getSimulationFormAdapter('Oblique Projectile Motion');

    expect(adapter?.fields.map((field) => field.name)).toEqual([
      'initial_velocity',
      'angle',
      'initial_height',
    ]);
    expect(
      adapter?.toParameters({ initial_velocity: 18, angle: 37, initial_height: 2 }),
    ).toEqual({ initial_velocity: 18, angle: 37, initial_height: 2 });
    expect(getSimulationFormAdapter('unregistered')).toBeUndefined();
  });

  it('matches the projectile model nonnegative and angle range validators', () => {
    expect(obliqueProjectileMotionAdapter.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'initial_velocity', min: 0 }),
        expect.objectContaining({ name: 'angle', min: 0, max: 90 }),
        expect.objectContaining({ name: 'initial_height', min: 0 }),
      ]),
    );
  });

  it('creates a simulation with the selected adapter parameters', () => {
    const simulation = { id: 4, phenomenon_type: 'Oblique Projectile Motion' } as Simulation;
    simulationApi.createSimulation.mockReturnValue(
      of({ status: 'success', data: simulation }),
    );
    const created = vi.fn();
    component.simulationCreated.subscribe(created);

    component.selectPhenomenon('Oblique Projectile Motion');
    component.parametersForm.setValue({
      initial_velocity: 18,
      angle: 37,
      initial_height: 2,
    });
    component.submit();

    expect(simulationApi.createSimulation).toHaveBeenCalledWith(
      'Oblique Projectile Motion',
      'public',
      { initial_velocity: 18, angle: 37, initial_height: 2 },
    );
    expect(created).toHaveBeenCalledWith(simulation);
    expect(component.successMessage).toBe('Simulación creada correctamente.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');
  });

  it('returns to the forum simulation list when created from a publication flow', () => {
    route.snapshot.queryParamMap.get.mockImplementation((key: string) =>
      key === 'forumId' ? '23' : key === 'returnTo' ? 'forum-publication' : null,
    );
    const simulation = { id: 4, phenomenon_type: 'Oblique Projectile Motion' } as Simulation;
    simulationApi.createSimulation.mockReturnValue(of({ status: 'success', data: simulation }));

    component.selectPhenomenon('Oblique Projectile Motion');
    component.parametersForm.setValue({
      initial_velocity: 18,
      angle: 37,
      initial_height: 2,
    });
    component.submit();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/forums', 23, 'publications', 'crear', 'seleccionar'],
      { queryParams: { createdSimulation: 4 } },
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
