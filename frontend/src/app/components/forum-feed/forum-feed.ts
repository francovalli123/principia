import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { Comment } from '../../models/comment';
import { Publication } from '../../models/publication';
import { CommentApiService } from '../services/comment-api';
import { PublicationApiService } from '../services/publication-api';
import { PostCard } from '../components/post-card/post-card';

interface FeedPost {
  publication: Publication;
  comments: Comment[];
  nextCommentPage: number | null;
  loadingComments: boolean;
}

@Component({
  imports: [PostCard],
  selector: 'app-forum-feed',
  styleUrl: './forum-feed.css',
  templateUrl: './forum-feed.html',
})
export class ForumFeed implements OnInit, AfterViewInit, OnDestroy {
  @Input() forumId?: number;
  @ViewChild('feedEnd') private feedEnd?: ElementRef<HTMLElement>;

  readonly posts = signal<FeedPost[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(true);
  readonly error = signal(false);

  private page = 1;
  private observer?: IntersectionObserver;

  constructor(
    private readonly publicationApi: PublicationApiService,
    private readonly commentApi: CommentApiService,
  ) {}

  ngOnInit(): void {
    this.loadPublications(true);
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
    this.publicationApi.getPaginatedByForum(requestedPage, this.forumId).subscribe({
      next: (response) => {
        const newPosts = response.data.results.map((publication) => ({
          publication,
          comments: [],
          nextCommentPage: 1,
          loadingComments: true,
        }));
        this.posts.update((current) => [...current, ...newPosts]);
        this.page = requestedPage + 1;
        this.hasMore.set(response.data.next !== null);
        this.loading.set(false);
        this.loadingMore.set(false);
        newPosts.forEach((post) => this.loadInitialComments(post));
      },
      error: () => {
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
