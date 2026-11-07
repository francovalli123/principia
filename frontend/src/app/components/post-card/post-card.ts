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
import { ToastService } from '../../services/toast';
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
  @Input() currentUserId: number | null = null;
  @Output() commentAdded = new EventEmitter<Comment>();
  @Output() commentDeleted = new EventEmitter<number>();
  simulation: Simulation | null = null;
  simulationError = '';
  commentDraft = '';
  commentError = '';
  submittingComment = false;
  readonly deletingCommentIds = new Set<number>();

  constructor(
    private readonly simulationApi: SimulationApiService,
    private readonly commentApi: CommentApiService,
    private readonly toast: ToastService,
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

  isOwnComment(comment: Comment): boolean {
    const ownerId = typeof comment.owner === 'number' ? comment.owner : comment.owner?.id;
    return this.currentUserId !== null && ownerId === this.currentUserId;
  }

  deleteComment(comment: Comment): void {
    if (!this.isOwnComment(comment) || this.deletingCommentIds.has(comment.id)) return;

    this.deletingCommentIds.add(comment.id);
    this.commentApi.deleteComment(comment.id)
      .pipe(finalize(() => this.deletingCommentIds.delete(comment.id)))
      .subscribe({
        next: () => {
          this.commentDeleted.emit(comment.id);
          this.toast.success('Comentario eliminado.');
        },
        error: (error: unknown) => {
          console.error(`Failed to delete comment with ID: ${comment.id}`, error);
          this.toast.error('No se pudo eliminar el comentario. Inténtalo de nuevo.');
        },
      });
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
