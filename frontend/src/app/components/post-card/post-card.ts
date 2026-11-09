import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
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
import { PublicationApiService } from '../../services/publication-api';

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
  @Output() publicationDeleted = new EventEmitter<number>();  // Output marks a component's property as a custom event source

  readonly simulation = signal<Simulation | null>(null);
  readonly simulationError = signal('');
  commentDraft = '';
  commentError = '';
  submittingComment = false;
  deletingPublication = false;  // Flag used to indicate whether the request is in process or not
  readonly deletingCommentIds = new Set<number>();

  constructor(
    private readonly simulationApi: SimulationApiService,
    private readonly commentApi: CommentApiService,
    private readonly toast: ToastService,
    private readonly publicationApi: PublicationApiService,
  ) {}

  ngOnInit(): void {
    console.info(`Mounted publication card ${this.publication.id}; requesting its simulation`);
    this.simulationApi.getByPublication(this.publication.id).subscribe({
      next: (simulation) => {
        console.info(`Loaded simulation ${simulation.id} for publication ${this.publication.id}`);
        this.simulation.set(simulation);
      },
      error: (error: unknown) => {
        console.error(`Failed to load simulation for publication ${this.publication.id}`, error);
        this.simulationError.set('No se pudo cargar la configuración de esta simulación.');
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

  // Compares the owner's id with currentUserId. If there's no current user yet, it returns false
  isOwnPublication(): boolean {
    const ownerId = typeof this.publication.owner === 'number'
      ? this.publication.owner
      : this.publication.owner.id;
      
      return this.currentUserId !== null && ownerId === this.currentUserId;
  }

  // Delete an specific publication only if the currentUser is the owner of the post 
  deletePublication(): void {
    if (!this.isOwnPublication() || this.deletingPublication) return; 

    this.deletingPublication = true;
    this.publicationApi.deletePublication(this.publication.id)
      .pipe(finalize(() => (this.deletingPublication = false)))
      .subscribe({
        next: () => {
          this.publicationDeleted.emit(this.publication.id);  // Emits a new publicationDeleted event
          this.toast.success('Publicación eliminada.');
        },
        error: (error: unknown) => {
          console.error(`Failed to delete publication with ID: ${this.publication.id}`, error);
          this.toast.error('No se pudo eliminar la publicación. Inténtalo de nuevo.');
        },
      });
  }
}
