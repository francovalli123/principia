import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, switchMap, throwIfEmpty, timeout } from 'rxjs';
import { Simulation } from '../../../models/simulation';
import { SimulationApiService } from '../../services/simulation-api';
import { UserApiService } from '../../services/user-api';

@Component({
  selector: 'app-select-simulation',
  standalone: true,
  templateUrl: './select-simulation.html',
  styleUrl: './select-simulation.css',
})
export class SelectSimulationPage implements OnInit {
  forumId = 0;
  simulations: Simulation[] = [];
  favouriteIds = new Set<number>();
  isLoading = true;
  loadError = '';

  constructor(
    private readonly simulationApi: SimulationApiService,
    private readonly userApi: UserApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.forumId = Number(this.route.snapshot.paramMap.get('forumId'));
    if (!Number.isSafeInteger(this.forumId) || this.forumId <= 0) {
      this.isLoading = false;
      this.loadError = 'No pudimos identificar el foro.';
      return;
    }

    this.loadSimulations();
  }

  loadSimulations(): void {
    this.isLoading = true;
    this.loadError = '';
    this.changeDetector.markForCheck();
    this.userApi.getCurrentUser().pipe(
      timeout(15000),
      throwIfEmpty(() => new Error('La solicitud del usuario no devolvió datos.')),
      switchMap((user) => {
        if (!Number.isSafeInteger(user.id) || user.id <= 0) {
          throw new Error('El usuario actual no tiene un identificador válido.');
        }
        return forkJoin({
          simulations: this.simulationApi.getByOwner(user.id),
          favourites: this.simulationApi.getFavourites(),
        });
      }),
      timeout(15000),
      throwIfEmpty(() => new Error('La carga de simulaciones no devolvió datos.')),
    ).subscribe({
      next: ({ simulations, favourites }) => {
        this.favouriteIds = new Set(favourites.map((favourite) => favourite.simulation));
        this.simulations = [...simulations].sort((a, b) => {
          const favouriteDifference =
            Number(this.favouriteIds.has(b.id)) - Number(this.favouriteIds.has(a.id));
          if (favouriteDifference !== 0) return favouriteDifference;
          return new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime();
        });
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        console.error('Failed to load simulations for forum publication', error);
        this.loadError = 'No pudimos cargar tus simulaciones. Revisá tu conexión e intentá nuevamente.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  selectSimulation(simulation: Simulation): void {
    void this.router.navigate([
      '/forums',
      this.forumId,
      'publications',
      'crear',
      simulation.id,
    ]);
  }

  createSimulation(): void {
    void this.router.navigate(['/simulaciones/crear'], {
      queryParams: { forumId: this.forumId, returnTo: 'forum-publication' },
    });
  }

  cancel(): void {
    void this.router.navigate(['/forums', this.forumId]);
  }

  phenomenonLabel(phenomenonType: string): string {
    const labels: Record<string, string> = {
      'oblique projectile motion': 'Tiro oblicuo',
      'uniformly accelerated motion': 'MRUV',
      'uniform rectilinear motion': 'MRU',
      'dynamics': 'Dinámica',
    };
    return labels[phenomenonType.toLocaleLowerCase()] ?? phenomenonType;
  }

  visibilityLabel(visibility: Simulation['visibility']): string {
    return {
      public: 'Pública',
      hidden: 'Oculta',
      private: 'Privada',
    }[visibility];
  }

  creationLabel(creationDate: string): string {
    const timestamp = new Date(creationDate).getTime();
    if (!Number.isFinite(timestamp)) return 'Fecha no disponible';

    const elapsedDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
    if (elapsedDays < 1) return 'Creada hoy';
    const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    if (elapsedDays < 7) return `Creada ${relative.format(-elapsedDays, 'day')}`;
    if (elapsedDays < 30) return `Creada ${relative.format(-Math.floor(elapsedDays / 7), 'week')}`;
    if (elapsedDays < 365) return `Creada ${relative.format(-Math.floor(elapsedDays / 30), 'month')}`;
    return `Creada ${relative.format(-Math.floor(elapsedDays / 365), 'year')}`;
  }
}
