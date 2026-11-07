import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Author } from '../../../models/user';
import { Comment } from '../../../models/comment';
import { Publication } from '../../../models/publication';
import { Simulation } from '../../../models/simulation';
import { CommentApiService } from '../../services/comment-api';
import { SimulationApiService } from '../../services/simulation-api';
import { MotorControl } from '../../motor_interface/components/motor-control/motor-control';

@Component({
  imports: [DatePipe, FormsModule, MotorControl],
  selector: 'app-post-card',
  standalone: true,
  styleUrl: './post-card.css',
  templateUrl: './post-card.html',
})
export class PostCard implements OnInit {
  @Input({ required: true }) publication!: Publication;
  @Input() comments: Comment[] = [];
  @Output() commentAdded = new EventEmitter<Comment>();
  simulation: Simulation | null = null;
  simulationError = '';
  commentDraft = '';
  commentError = '';
  submittingComment = false;

  constructor(
    private readonly simulationApi: SimulationApiService,
    private readonly commentApi: CommentApiService,
  ) {}

  ngOnInit(): void {
    this.simulationApi.getByPublication(this.publication.id).subscribe({
      next: (simulation) => {
        this.simulation = simulation;
      },
      error: (error: unknown) => {
        console.error(`Failed to load simulation for publication ${this.publication.id}`, error);
        this.simulationError = 'No se pudo cargar la configuración de esta simulación.';
      },
    });
  }

  authorName(author: Author | number | null | undefined): string {
    if (typeof author === 'object' && author !== null && typeof author.username === 'string') {
      return author.username;
    }
    return 'Usuario';
  }

  authorInitials(author: Author | number | null | undefined): string {
    return this.authorName(author).slice(0, 2).toUpperCase();
  }

  submitComment(): void {
    const content = this.commentDraft.trim();
    if (!content || this.submittingComment) return;

    this.commentError = '';
    this.submittingComment = true;
    this.commentApi.createComment(this.publication.id, content)
      .pipe(finalize(() => (this.submittingComment = false)))
      .subscribe({
        next: (comment) => {
          this.commentDraft = '';
          this.commentAdded.emit(comment);
        },
        error: (error: unknown) => {
          this.commentError =
            error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
              ? error.error.message
              : 'No se pudo enviar el comentario. Inténtalo de nuevo.';
        },
      });
  }
}
