import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, NEVER, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationApiService } from '../../services/simulation-api';
import { UserApiService } from '../../services/user-api';
import { SelectSimulationPage } from './select-simulation';

describe('SelectSimulationPage', () => {
  let fixture: ComponentFixture<SelectSimulationPage>;
  const firstSimulation = {
    id: 17,
    title: 'Mi tiro oblicuo',
    owner: { id: 8, username: 'student', email: '', first_name: '', last_name: '' },
    phenomenon_type: 'Oblique Projectile Motion',
    visibility: 'public' as const,
    creation_date: '2026-11-06T10:00:00Z',
  };
  const simulationApi = {
    getByOwner: vi.fn(),
    getFavourites: vi.fn(),
  };
  const userApi = { getCurrentUser: vi.fn() };
  const router = { navigate: vi.fn() };
  let routeForumId: string | null = '23';

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    routeForumId = '23';
    userApi.getCurrentUser.mockReturnValue(of({ id: 8 }));
    simulationApi.getByOwner.mockReturnValue(of([firstSimulation]));
    simulationApi.getFavourites.mockReturnValue(of([{ id: 2, simulation: 17, marked_date: '' }]));

    await TestBed.configureTestingModule({
      imports: [SelectSimulationPage],
      providers: [
        { provide: SimulationApiService, useValue: simulationApi },
        { provide: UserApiService, useValue: userApi },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => routeForumId },
              routeConfig: { path: 'forums/:forumId/publications/crear/seleccionar' },
            },
          },
        },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectSimulationPage);
    fixture.detectChanges();
  });

  it('loads the current user simulations and their favourite state', () => {
    expect(simulationApi.getByOwner).toHaveBeenCalledWith(8);
    expect(simulationApi.getFavourites).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Tiro oblicuo');
    expect(fixture.nativeElement.textContent).toContain('Pública');
    expect(fixture.nativeElement.querySelector('.favourite-mark.is-favourite')).toBeTruthy();
  });

  it('continues to the publication form with the selected simulation and forum', () => {
    fixture.nativeElement.querySelector('.select-button').click();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/forums', 23, 'publications', 'crear', 17],
      { queryParams: { simulationTitle: 'Mi tiro oblicuo' } },
    );
  });

  it('shows the designed empty state and keeps forum context when creating a simulation', () => {
    simulationApi.getByOwner.mockReturnValue(of([]));
    fixture.componentInstance.loadSimulations();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todavía no creaste ninguna simulación');
    fixture.nativeElement.querySelector('.primary-button').click();
    expect(router.navigate).toHaveBeenCalledWith(['/simulaciones/crear'], {
      queryParams: { forumId: 23, returnTo: 'forum-publication', returnPage: 'selection' },
    });
  });

  it('loads the generic my simulations page without forum actions', async () => {
    routeForumId = null;
    const genericFixture = TestBed.createComponent(SelectSimulationPage);
    genericFixture.detectChanges();

    expect(genericFixture.componentInstance.isForumPublicationFlow).toBe(false);
    expect(genericFixture.nativeElement.textContent).toContain('Mis simulaciones');
    expect(genericFixture.nativeElement.querySelector('.select-button')).toBeNull();
    expect(genericFixture.nativeElement.textContent).not.toContain('Crear una simulación nueva');
  });

  it('shows an error and retry action when simulations cannot be loaded', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    simulationApi.getByOwner.mockReturnValue(throwError(() => new Error('offline')));
    fixture.componentInstance.loadSimulations();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tus simulaciones');
    expect(fixture.nativeElement.querySelector('.primary-button')?.textContent).toContain('Reintentar');
  });

  it('stops loading and explains when the backend cannot be reached', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    userApi.getCurrentUser.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );

    fixture.componentInstance.loadSimulations();
    fixture.detectChanges();

    expect(fixture.componentInstance.isLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Verificá que Django esté iniciado');
    expect(fixture.nativeElement.querySelector('.primary-button')?.textContent).toContain('Reintentar');
  });

  it('ends loading when an API completes without returning data', () => {
    userApi.getCurrentUser.mockReturnValue(EMPTY);
    fixture.componentInstance.loadSimulations();
    fixture.detectChanges();

    expect(fixture.componentInstance.isLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tus simulaciones');
  });

  it('times out a request that never responds instead of leaving the spinner indefinitely', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers();
    simulationApi.getByOwner.mockReturnValue(NEVER);
    fixture.componentInstance.loadSimulations();
    vi.advanceTimersByTime(15001);
    fixture.detectChanges();

    expect(fixture.componentInstance.isLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tus simulaciones');
  });
});
