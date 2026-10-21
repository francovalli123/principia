import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ForumApiService } from '../../services/forum-api';

@Component({
  selector: 'app-create-forum',
  imports: [FormsModule, RouterLink],
  templateUrl: './create-forum.html',
  styleUrl: './create-forum.css',
})
export class CreateForumPage {
  name = '';
  description = '';
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private readonly forumApi: ForumApiService,
    private readonly router: Router,
  ) {}

  submit(): void {
    const name = this.name.trim();
    const description = this.description.trim();
    if (!name || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.forumApi.createForum({ name, description }).subscribe({
      next: () => void this.router.navigate(['/inicio']),
      error: () => {
        this.errorMessage = 'No pudimos crear el foro. Revisá los datos e intentá nuevamente.';
        this.isSubmitting = false;
      },
    });
  }
}
