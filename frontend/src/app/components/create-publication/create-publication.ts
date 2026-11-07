import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  imports: [],
  selector: 'app-create-publication-page',
  standalone: true,
  styleUrl: './create-publication.css',
  templateUrl: './create-publication.html',
})
export class CreatePublicationPage implements OnInit {
  forumId = 0;
  routeError = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.forumId = Number(this.route.snapshot.paramMap.get('forumId'));
    if (!Number.isSafeInteger(this.forumId) || this.forumId <= 0) {
      this.routeError = 'No pudimos identificar el foro.';
    }
  }

  createSimulation(): void {
    void this.router.navigate(['/simulaciones/crear'], {
      queryParams: { forumId: this.forumId, returnTo: 'forum-publication' },
    });
  }

  viewSimulations(): void {
    void this.router.navigate(['/forums', this.forumId, 'publications', 'crear', 'seleccionar']);
  }

  cancel(): void {
    void this.router.navigate(['/forums', this.forumId]);
  }
}
