import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Simulation } from '../../../models/simulation';
import { AuthService } from '../../services/auth';
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
  const auth = { clearTokens: vi.fn() };
  const route = {
    snapshot: {
      queryParamMap: {
        get: vi.fn((_key: string) => null as string | null),
      },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    route.snapshot.queryParamMap.get.mockImplementation((_key: string) => null);
    simulationApi.getPhenomena.mockReturnValue(
      of({ status: 'success', data: ['Oblique Projectile Motion'] }),
    );
    await TestBed.configureTestingModule({
      imports: [SimulationForm],
      providers: [
        { provide: SimulationApiService, useValue: simulationApi },
        { provide: AuthService, useValue: auth },
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
    const simulation = {
      id: 4,
      title: 'Tiro oblicuo',
      phenomenon_type: 'Oblique Projectile Motion',
    } as Simulation;
    simulationApi.createSimulation.mockReturnValue(
      of({ status: 'success', data: simulation }),
    );
    const created = vi.fn();
    component.simulationCreated.subscribe(created);

    component.selectPhenomenon('Oblique Projectile Motion');
    component.form.controls.title.setValue('Tiro oblicuo');
    component.parametersForm.setValue({
      initial_velocity: 18,
      angle: 37,
      initial_height: 2,
    });
    component.submit();

    expect(simulationApi.createSimulation).toHaveBeenCalledWith(
      'Tiro oblicuo',
      '',
      'Oblique Projectile Motion',
      'public',
      true,
      { initial_velocity: 18, angle: 37, initial_height: 2 },
    );
    expect(created).toHaveBeenCalledWith(simulation);
    expect(component.successMessage).toBe('Simulación creada correctamente.');
    expect(component.isSuccessModalOpen).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('shows contextual modal actions when created from a publication flow', () => {
    route.snapshot.queryParamMap.get.mockImplementation((key: string) =>
      key === 'forumId' ? '23' : key === 'returnTo' ? 'forum-publication' : null,
    );
    const simulation = {
      id: 4,
      title: 'Tiro oblicuo',
      phenomenon_type: 'Oblique Projectile Motion',
    } as Simulation;
    simulationApi.createSimulation.mockReturnValue(of({ status: 'success', data: simulation }));

    component.selectPhenomenon('Oblique Projectile Motion');
    component.form.controls.title.setValue('Tiro oblicuo');
    component.parametersForm.setValue({
      initial_velocity: 18,
      angle: 37,
      initial_height: 2,
    });
    component.submit();

    expect(component.isSuccessModalOpen).toBe(true);
    expect(component.successPrimaryLabel).toBe('Crear publicación');
    component.goToSuccessPrimaryAction();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/forums', 23, 'publications', 'crear', 4],
      { queryParams: { simulationTitle: 'Tiro oblicuo' } },
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('keeps the success modal open on backdrop clicks and Escape', () => {
    const simulation = { id: 4, phenomenon_type: 'Oblique Projectile Motion' } as Simulation;
    simulationApi.createSimulation.mockReturnValue(of({ status: 'success', data: simulation }));
    component.selectPhenomenon('Oblique Projectile Motion');
    component.form.controls.title.setValue('Tiro oblicuo');
    component.parametersForm.setValue({
      initial_velocity: 18,
      angle: 37,
      initial_height: 2,
    });
    component.submit();
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop') as HTMLElement | null;
    backdrop?.click();
    expect(component.isSuccessModalOpen).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(component.isSuccessModalOpen).toBe(true);
    expect(fixture.nativeElement.querySelector('.modal-close')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.modal-actions button')).toHaveLength(2);
  });

  it('requires a title before submitting', () => {
    component.selectPhenomenon('Oblique Projectile Motion');
    component.parametersForm.setValue({
      initial_velocity: 18,
      angle: 37,
      initial_height: 2,
    });

    component.submit();

    expect(simulationApi.createSimulation).not.toHaveBeenCalled();
    expect(component.form.controls.title.touched).toBe(true);
  });

  it('uses mutually exclusive visibility chips and describes the active choice', () => {
    const visibilityRadios = fixture.nativeElement.querySelectorAll(
      'input[type="radio"][formControlName="visibility"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(visibilityRadios).toHaveLength(3);
    expect(visibilityRadios[0].checked).toBe(true);

    visibilityRadios[1].click();
    fixture.detectChanges();
    expect(component.selectedVisibility).toBe('private');
    expect(visibilityRadios[0].checked).toBe(false);
    expect(visibilityRadios[1].checked).toBe(true);
    expect(component.visibilityDescription).toContain('Solo vos');

    visibilityRadios[2].click();
    fixture.detectChanges();
    expect(component.selectedVisibility).toBe('hidden');
    expect(visibilityRadios[1].checked).toBe(false);
    expect(visibilityRadios[2].checked).toBe(true);
    expect(component.visibilityDescription).toContain('en el foro');
  });

  it('releases the submit button when the create request does not complete', () => {
    vi.useFakeTimers();
    simulationApi.createSimulation.mockReturnValue(NEVER);
    component.selectPhenomenon('Oblique Projectile Motion');
    component.form.controls.title.setValue('Tiro oblicuo');
    component.parametersForm.setValue({
      initial_velocity: 18,
      angle: 37,
      initial_height: 2,
    });

    component.submit();
    expect(component.isSubmitting).toBe(true);
    vi.advanceTimersByTime(15001);
    fixture.detectChanges();

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toContain('no respondió a tiempo');
    vi.useRealTimers();
  });

  it('opens the modal and releases the button after the first response even if the stream stays open', () => {
    const simulation = { id: 21, phenomenon_type: 'Oblique Projectile Motion' } as Simulation;
    simulationApi.createSimulation.mockReturnValue(
      new Observable((subscriber) => subscriber.next({ status: 'success', data: simulation })),
    );
    component.selectPhenomenon('Oblique Projectile Motion');
    component.form.controls.title.setValue('Tiro oblicuo');
    component.parametersForm.setValue({
      initial_velocity: 18,
      angle: 37,
      initial_height: 2,
    });

    component.submit();
    fixture.detectChanges();

    expect(component.isSubmitting).toBe(false);
    expect(component.createdSimulation).toBe(simulation);
    expect(fixture.nativeElement.querySelector('.success-modal')).toBeTruthy();
  });

  it('returns to the correct page when cancelling from the publication flow', () => {
    route.snapshot.queryParamMap.get.mockImplementation((key: string) =>
      key === 'forumId' ? '23' : key === 'returnTo' ? 'forum-publication' : key === 'returnPage' ? 'choice' : null,
    );
    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith(['/forums', 23, 'publications', 'crear']);

    router.navigate.mockClear();
    route.snapshot.queryParamMap.get.mockImplementation((key: string) =>
      key === 'forumId' ? '23' : key === 'returnTo' ? 'forum-publication' : key === 'returnPage' ? 'selection' : null,
    );
    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith([
      '/forums', 23, 'publications', 'crear', 'seleccionar',
    ]);
  });

  it('routes standalone creation actions to home and the generic simulations list', () => {
    component.goToSuccessPrimaryAction();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');

    router.navigateByUrl.mockClear();
    component.goToMySimulations();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/simulaciones/mis');
  });
});
