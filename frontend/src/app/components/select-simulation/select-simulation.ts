import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
  forumId: number | null = null;
  isForumPublicationFlow = false;
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
    const forumIdParameter = this.route.snapshot.paramMap.get('forumId');
    this.isForumPublicationFlow = forumIdParameter !== null;
    if (this.isForumPublicationFlow) {
      const forumId = Number(forumIdParameter);
      if (!Number.isSafeInteger(forumId) || forumId <= 0) {
        this.isLoading = false;
        this.loadError = 'No pudimos identificar el foro.';
        return;
      }
      this.forumId = forumId;
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
        console.error('Failed to load the current user simulations', error);
        this.loadError = error instanceof HttpErrorResponse && error.status === 0
          ? 'No pudimos conectar con el servidor. Verificá que Django esté iniciado en 127.0.0.1:8000 y volvé a intentar.'
          : 'No pudimos cargar tus simulaciones. Revisá tu conexión e intentá nuevamente.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  selectSimulation(simulation: Simulation): void {
    if (this.forumId === null) return;
    void this.router.navigate([
      '/forums',
      this.forumId,
      'publications',
      'crear',
      simulation.id,
    ]);
  }

  createSimulation(): void {
    if (this.forumId === null) {
      void this.router.navigate(['/simulaciones/crear']);
      return;
    }
    void this.router.navigate(['/simulaciones/crear'], {
      queryParams: {
        forumId: this.forumId,
        returnTo: 'forum-publication',
        returnPage: 'selection',
      },
    });
  }

  cancel(): void {
    if (this.forumId !== null) {
      void this.router.navigate(['/forums', this.forumId]);
    } else {
      void this.router.navigateByUrl('/inicio');
    }
  }

  get pageTitle(): string {
    return this.isForumPublicationFlow ? 'Elegí una simulación' : 'Mis simulaciones';
  }

  get pageDescription(): string {
    return this.isForumPublicationFlow
      ? 'Seleccioná una simulación que ya creaste para publicarla en el foro'
      : 'Consultá las simulaciones que creaste';
  }

  get emptyTitle(): string {
    return this.isForumPublicationFlow
      ? 'Todavía no creaste ninguna simulación'
      : 'Todavía no tenés simulaciones';
  }

  get emptyDescription(): string {
    return this.isForumPublicationFlow
      ? 'Cuando crees una simulación, vas a poder encontrarla acá para publicarla las veces que quieras.'
      : 'Cuando crees una simulación, vas a poder encontrarla acá.';
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
