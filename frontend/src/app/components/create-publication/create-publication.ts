import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicationApiService } from '../../services/publication-api';
import { SimulationApiService } from '../../services/simulation-api';
import { UserApiService } from '../../services/user-api';
import { Simulation } from '../../../models/simulation';

@Component({
  imports: [FormsModule],
  selector: 'app-create-publication-page',
  standalone: true,
  styleUrl: './create-publication.css',
  templateUrl: './create-publication.html',
})
export class CreatePublicationPage implements OnInit {
  forumId = 0;
  simulations: Simulation[] = [];
  title = '';
  description = '';
  simulationId: number | null = null;
  isLoadingSimulations = true;
  isSubmitting = false;
  simulationLoadError = '';
  submitError = '';

  constructor(
    private readonly publicationApi: PublicationApiService,
    private readonly simulationApi: SimulationApiService,
    private readonly userApi: UserApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.forumId = Number(this.route.snapshot.paramMap.get('forumId'));
    if (!Number.isInteger(this.forumId) || this.forumId <= 0) {
      this.simulationLoadError = 'No pudimos identificar el foro.';
      this.isLoadingSimulations = false;
      return;
    }
    this.loadSimulations();
  }

  loadSimulations(): void {
    this.isLoadingSimulations = true;
    this.simulationLoadError = '';
    this.userApi.getCurrentUser().subscribe({
      next: (user) => this.simulationApi.getByOwner(user.id).subscribe({
        next: (simulations) => {
          this.simulations = simulations;
          this.isLoadingSimulations = false;
        },
        error: () => this.failSimulationLoad(),
      }),
      error: () => this.failSimulationLoad(),
    });
  }

  submit(): void {
    const title = this.title.trim();
    const description = this.description.trim();
    if (!title || !description || this.simulationId === null || this.isSubmitting) return;
    if (!this.simulations.some((simulation) => simulation.id === this.simulationId)) return;

    this.isSubmitting = true;
    this.submitError = '';
    this.publicationApi
      .createPublication(title, description, this.simulationId, this.forumId)
      .subscribe({
        next: () => void this.router.navigate(['/forums', this.forumId]),
        error: () => {
          this.submitError = 'No pudimos crear la publicación. Revisá los datos e intentá nuevamente.';
          this.isSubmitting = false;
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/forums', this.forumId]);
  }

  createSimulation(): void {
    void this.router.navigate(['/simulaciones/crear']);
  }

  private failSimulationLoad(): void {
    this.simulationLoadError = 'No pudimos cargar tus simulaciones.';
    this.isLoadingSimulations = false;
  }
}