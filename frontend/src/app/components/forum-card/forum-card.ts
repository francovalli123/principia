import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ForumApiService } from '../../services/forum-api';
import { ToastService } from '../../services/toast';

export interface ForumCardData {
  id: number;
  name: string;
  member_count: number;
  is_member: boolean;
  is_owner: boolean;
  latestPost?: string;
  isNew?: boolean;
}

@Component({
  selector: 'app-forum-card',
  standalone: true,
  templateUrl: './forum-card.html',
  styleUrl: './forum-card.css',
})
export class ForumCardComponent implements OnChanges {
  @Input({ required: true }) forum!: ForumCardData;
  @Input() variant: 'active' | 'suggested' = 'active';
  @Output() readonly membershipChanged = new EventEmitter<{ forum: ForumCardData; isMember: boolean }>();
  readonly isMember = signal(false);
  readonly updatingMembership = signal(false);
  readonly actionsMenuOpen = signal(false);

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly router: Router,
    private readonly forumApi: ForumApiService,
    private readonly toast: ToastService,
  ) {}

  ngOnChanges(): void {
    this.isMember.set(this.forum.is_member);
  }

  openForum(): void {
    void this.router.navigate(['/forums', this.forum.id]);
  }

  toggleActionsMenu(event: Event): void {
    event.stopPropagation();
    this.actionsMenuOpen.update((isOpen) => !isOpen);
  }

  closeActionsMenu(): void {
    this.actionsMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  closeActionsMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeActionsMenu();
    }
  }

  @HostListener('document:keydown.escape')
  closeActionsMenuOnEscape(): void {
    this.closeActionsMenu();
  }

  toggleMembership(event: Event): void {
    event.stopPropagation();
    if (this.updatingMembership()) return;

    this.closeActionsMenu();
    this.updatingMembership.set(true);
    const request = this.isMember()
      ? this.forumApi.leaveForum(this.forum.id)
      : this.forumApi.joinForum(this.forum.id);
    const nextMembership = !this.isMember();

    request.subscribe({
      next: () => {
        this.isMember.set(nextMembership);
        this.updatingMembership.set(false);
        this.membershipChanged.emit({ forum: this.forum, isMember: nextMembership });
        this.toast.success(
          nextMembership ? `Ahora sos miembro de ${this.forum.name}.` : `Dejaste de ser miembro de ${this.forum.name}.`,
        );
      },
      error: (error: unknown) => {
        this.updatingMembership.set(false);
        console.error(`Failed to update membership for forum with ID: ${this.forum.id}`, error);
        this.toast.error('No se pudo actualizar tu pertenencia al foro. Intentá nuevamente.');
      },
    });
  }
}