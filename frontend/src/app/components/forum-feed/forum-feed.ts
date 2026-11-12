import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Comment } from '../../../models/comment';
import { Forum } from '../../../models/forum';
import { Publication } from '../../../models/publication';
import { Author, Profile } from '../../../models/user';
import { AppHeader } from '../app-header/app-header';
import { CommentApiService } from '../../services/comment-api';
import { ForumApiService } from '../../services/forum-api';
import { PublicationApiService } from '../../services/publication-api';
import { ProfileApiService } from '../../services/profile-api';
import { UserApiService } from '../../services/user-api';
import { SimulationApiService } from '../../services/simulation-api';
import { PostCard } from '../../components/post-card/post-card';
import { FormsModule } from '@angular/forms';

interface FeedPost {
  publication: Publication;
  comments: Comment[];
  nextCommentPage: number | null;
  loadingComments: boolean;
}

@Component({
  imports: [AppHeader, PostCard, RouterLink, FormsModule],
  standalone: true,
  selector: 'app-forum-feed',
  styleUrl: './forum-feed.css',
  templateUrl: './forum-feed.html',
})
export class ForumFeed implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('feedEnd') private feedEnd?: ElementRef<HTMLElement>;

  readonly posts = signal<FeedPost[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(true);
  readonly error = signal(false);
  readonly forum = signal<Forum | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly favoriteIds = signal<Set<number>>(new Set());
  readonly members = signal<Author[]>([]);
  readonly membersOpen = signal(false);
  readonly membersLoading = signal(false);
  readonly membersLoaded = signal(false);
  readonly membersError = signal(false);
  readonly settingsOpen = signal(false);
  readonly savingSettings = signal(false);
  readonly deletingForum = signal(false);
  readonly deleteConfirmation = signal(false);
  readonly settingsError = signal('');

  forumName = '';
  forumDescription = '';
  currentUserId: number | null = null;

  private page = 1;
  private observer?: IntersectionObserver;
  private targetPublicationId: number | null = null;
  forumId!: number;

  constructor(
    private readonly forumApi: ForumApiService,
    private readonly publicationApi: PublicationApiService,
    private readonly commentApi: CommentApiService,
    private readonly profileApi: ProfileApiService,
    private readonly userApi: UserApiService,
    private readonly simulationApi: SimulationApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const routeForumId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(routeForumId) || routeForumId <= 0) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }

    this.forumId = routeForumId;
    const targetPublicationId = Number(this.route.snapshot.queryParamMap.get('publicationId'));
    if (Number.isSafeInteger(targetPublicationId) && targetPublicationId > 0) {
      this.targetPublicationId = targetPublicationId;
    }
    this.userApi.getCurrentUser().subscribe({
      next: (user) => {
        if (Number.isSafeInteger(user.id) && user.id > 0) {
          this.currentUserId = user.id;
          this.simulationApi.getFavourites().subscribe({
            next: (favourites) => this.favoriteIds.set(
              new Set(favourites.map((favourite) => favourite.simulation)),
            ),
            error: (error: unknown) => console.error('Failed to load favourite simulations for the forum feed', error),
          });
        } else {
          console.error('Current user response did not contain a valid user ID');
        }
      },
      error: (error: unknown) => console.error('Failed to load the current user for comment actions', error),
    });
    this.profileApi.getProfile().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error: unknown) => console.error('Failed to load the current user profile for the publication composer', error),
    });
    this.forumApi.getForum(this.forumId).subscribe({
      next: (forum) => this.forum.set(forum),
      error: (error: unknown) => console.error(`Failed to load forum with ID: ${this.forumId}`, error),
    });
    this.loadPublications(true);
  }

  goBack(): void {
    void this.router.navigate(['/inicio']);
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined' || !this.feedEnd) return;

    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) this.loadMore();
    }, { rootMargin: '240px' });
    this.observer.observe(this.feedEnd.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  loadMore(): void {
    if (!this.loading() && !this.loadingMore() && !this.error() && this.hasMore()) {
      this.loadPublications(false);
    }
  }

  retry(): void {
    if (!this.loading() && !this.loadingMore()) this.loadPublications(this.posts().length === 0);
  }

  createPublication(): void {
    void this.router.navigate(['/forums', this.forumId, 'publications', 'crear']);
  }

  toggleMembers(): void {
    this.membersOpen.update((isOpen) => !isOpen);
    if (this.membersOpen() && !this.membersLoaded() && !this.membersLoading()) {
      this.loadMembers();
    }
  }

  loadMembers(): void {
    this.membersLoading.set(true);
    this.membersError.set(false);
    this.forumApi.getMembers(this.forumId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.membersLoaded.set(true);
        this.membersLoading.set(false);
      },
      error: (error: unknown) => {
        console.error(`Failed to load members for forum ${this.forumId}`, error);
        this.membersError.set(true);
        this.membersLoading.set(false);
      },
    });
  }

  memberInitials(member: Author): string {
    return member.username.slice(0, 2).toUpperCase();
  }

  loadMoreComments(post: FeedPost): void {
    if (post.nextCommentPage === null || post.loadingComments) return;

    const requestedPage = post.nextCommentPage;
    this.updatePost(post.publication.id, (current) => ({ ...current, loadingComments: true }));
    this.commentApi.getComments(post.publication.id, requestedPage).subscribe({
      next: (response) => this.updatePost(post.publication.id, (current) => ({
        ...current,
        comments: [...current.comments, ...response.data.results],
        nextCommentPage: response.data.next ? requestedPage + 1 : null,
        loadingComments: false,
      })),
      error: () => this.updatePost(post.publication.id, (current) => ({ ...current, loadingComments: false })),
    });
  }

  addComment(post: FeedPost, comment: Comment): void {
    this.updatePost(post.publication.id, (current) => ({
      ...current,
      comments: [...current.comments, comment],
    }));
  }

  removeComment(post: FeedPost, commentId: number): void {
    this.updatePost(post.publication.id, (current) => ({
      ...current,
      comments: current.comments.filter((comment) => comment.id !== commentId),
    }));
  }

  removePublication(publicationId: number): void {
    this.posts.update((posts) => 
      posts.filter((post) => post.publication.id !== publicationId)  
    );
  }

  updateFavourite(event: { simulationId: number; isFavourite: boolean }): void {
    this.favoriteIds.update((current) => {
      const next = new Set(current);
      if (event.isFavourite) next.add(event.simulationId);
      else next.delete(event.simulationId);
      return next;
    });
  }

  openSettings(): void {
    const forum = this.forum();
    if (!forum?.is_owner) return;

    this.forumName = forum.name;
    this.forumDescription = forum.description;
    this.settingsError.set('');
    this.deleteConfirmation.set(false);
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    if (this.savingSettings() || this.deletingForum()) return;
    this.settingsOpen.set(false);
  }

  saveForumSettings(): void {
    const forum = this.forum();
    const name = this.forumName.trim();

    if (!forum?.is_owner || this.savingSettings() || this.deletingForum()) return;

    if (!name) {
      this.settingsError.set('El nombre del foro no puede estar vacío.');
      return;
    }

    this.settingsError.set('');
    this.savingSettings.set(true);

    this.forumApi.updateForum(this.forumId, {
      name,
      description: this.forumDescription.trim(),
    }).subscribe({
      next: (response) => {
        this.forum.set(response.data);
        this.savingSettings.set(false);
        this.settingsOpen.set(false);
      },
      error: (error: unknown) => {
        console.error(`Failed to update forum ${this.forumId}`, error);
        this.settingsError.set('No se pudieron ganar los cambios. Intenta nuevamente.');
        this.savingSettings.set(false);
      },
    });
  }

  requestForumDeletion(): void {
    if (!this.forum()?.is_owner || this.deletingForum()) return;

    this.settingsError.set('');
    this.deleteConfirmation.set(true);
  }

  deleteForum(): void {
    if (
      !this.forum()?.is_owner || 
      !this.deleteConfirmation() ||
      this.savingSettings() ||
      this.deletingForum()
    ) {
      return;
    }

    this.settingsError.set('');
    this.deletingForum.set(true);

    this.forumApi.deleteForum(this.forumId).subscribe({
      next: () => {
        void this.router.navigate(['/inicio']);
      },
      error: (error: unknown) => {
        console.error(`Failed to delete forum ${this.forumId}`, error);
        this.settingsError.set('No se pudo borrar el foro. Intenta nuevamente.');
        this.deletingForum.set(false);
      },
    });
  }

  private loadPublications(initial: boolean): void {
    if (initial) {
      this.loading.set(true);
      this.error.set(false);
      this.posts.set([]);
      this.page = 1;
      this.hasMore.set(true);
    } else {
      this.loadingMore.set(true);
    }
    this.error.set(false);

    const requestedPage = this.page;
    console.info(`Loading publications for forum ${this.forumId}, page ${requestedPage}`);
    this.publicationApi.getPaginatedByForum(requestedPage, this.forumId).subscribe({
      next: (response) => {
        const newPosts = response.data.results.map((publication) => ({
          publication,
          comments: [],
          nextCommentPage: 1,
          loadingComments: true,
        }));
        console.info(`Loaded ${newPosts.length} publications for forum ${this.forumId}, page ${requestedPage}`);
        this.posts.update((current) => [...current, ...newPosts]);
        this.page = requestedPage + 1;
        this.hasMore.set(response.data.next !== null);
        this.loading.set(false);
        this.loadingMore.set(false);
        newPosts.forEach((post) => this.loadInitialComments(post));
        this.scrollToTargetPublication();
        if (this.targetPublicationId !== null) {
          if (response.data.next !== null) {
            this.loadPublications(false);
          } else {
            console.warn(`Publication ${this.targetPublicationId} was not found in forum ${this.forumId}`);
            this.targetPublicationId = null;
          }
        }
      },
      error: (error: unknown) => {
        console.error(`Failed to load publications for forum ${this.forumId}, page ${requestedPage}`, error);
        this.error.set(true);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  private loadInitialComments(post: FeedPost): void {
    this.commentApi.getComments(post.publication.id, 1).subscribe({
      next: (response) => this.updatePost(post.publication.id, (current) => ({
        ...current,
        comments: response.data.results,
        nextCommentPage: response.data.next ? 2 : null,
        loadingComments: false,
      })),
      error: () => this.updatePost(post.publication.id, (current) => ({ ...current, loadingComments: false })),
    });
  }

  private updatePost(publicationId: number, update: (post: FeedPost) => FeedPost): void {
    this.posts.update((posts) => posts.map((post) =>
      post.publication.id === publicationId ? update(post) : post
    ));
  }

  private scrollToTargetPublication(): void {
    if (this.targetPublicationId === null) return;
    const target = this.posts().find((post) => post.publication.id === this.targetPublicationId);
    if (!target) return;

    const publicationId = this.targetPublicationId;
    this.targetPublicationId = null;
    setTimeout(() => {
      document.getElementById(`publication-${publicationId}`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  }
}
