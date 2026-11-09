import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Comment } from '../../../models/comment';
import { Forum } from '../../../models/forum';
import { Publication } from '../../../models/publication';
import { Profile } from '../../../models/user';
import { AppHeader } from '../app-header/app-header';
import { CommentApiService } from '../../services/comment-api';
import { ForumApiService } from '../../services/forum-api';
import { PublicationApiService } from '../../services/publication-api';
import { ProfileApiService } from '../../services/profile-api';
import { UserApiService } from '../../services/user-api';
import { PostCard } from '../../components/post-card/post-card';

interface FeedPost {
  publication: Publication;
  comments: Comment[];
  nextCommentPage: number | null;
  loadingComments: boolean;
}

@Component({
  imports: [AppHeader, PostCard],
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
  currentUserId: number | null = null;

  private page = 1;
  private observer?: IntersectionObserver;
  forumId!: number;

  constructor(
    private readonly forumApi: ForumApiService,
    private readonly publicationApi: PublicationApiService,
    private readonly commentApi: CommentApiService,
    private readonly profileApi: ProfileApiService,
    private readonly userApi: UserApiService,
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
    this.userApi.getCurrentUser().subscribe({
      next: (user) => {
        if (Number.isSafeInteger(user.id) && user.id > 0) {
          this.currentUserId = user.id;
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
}
