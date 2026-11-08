import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicationApiService } from '../../services/publication-api';

@Component({
  selector: 'app-publish-simulation',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './publish-simulation.html',
  styleUrl: './publish-simulation.css',
})
export class PublishSimulationPage implements OnInit {
  forumId = 0;
  simulationId = 0;
  simulationTitle = '';
  title = '';
  description = '';
  isSubmitting = false;
  routeError = '';
  submitError = '';

  constructor(
    private readonly publicationApi: PublicationApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.forumId = Number(this.route.snapshot.paramMap.get('forumId'));
    this.simulationId = Number(this.route.snapshot.paramMap.get('simulationId'));
    this.simulationTitle = this.route.snapshot.queryParamMap.get('simulationTitle')?.trim() || 'Simulación';
    if (
      !Number.isSafeInteger(this.forumId) ||
      this.forumId <= 0 ||
      !Number.isSafeInteger(this.simulationId) ||
      this.simulationId <= 0
    ) {
      this.routeError = 'No pudimos identificar el foro o la simulación.';
    }
  }

  submit(): void {
    const title = this.title.trim();
    const description = this.description.trim();
    if (!title || this.routeError || this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitError = '';
    this.publicationApi
      .createPublication(title, description, this.simulationId, this.forumId)
      .subscribe({
        next: () => void this.router.navigate(['/forums', this.forumId]),
        error: (error: unknown) => {
          console.error('Failed to publish simulation to forum', error);
          this.submitError = 'No pudimos crear la publicación. Revisá los datos e intentá nuevamente.';
          this.isSubmitting = false;
        },
      });
  }

  backToSimulations(): void {
    void this.router.navigate(['/forums', this.forumId, 'publications', 'crear', 'seleccionar']);
  }
}
