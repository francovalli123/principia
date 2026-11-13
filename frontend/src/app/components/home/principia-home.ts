import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ForumApiService } from '../../services/forum-api';
import { UserApiService } from '../../services/user-api';
import { ForumCardComponent, type ForumCardData } from '../forum-card/forum-card';
import { AppHeader } from '../app-header/app-header';

@Component({
  selector: 'app-principia-home',
  imports: [RouterLink, ForumCardComponent, AppHeader],
  templateUrl: './principia-home.html',
  styleUrl: './principia-home.css',
})
export class PrincipiaHome implements OnInit {
  searchTerm = '';
  firstName = '';
  //Signal is a reactive primitive in Angular
  // that allows you to create reactive state variables. It enables components
  //  to automatically update when the value of the signal changes, allowing in this case
  //  to automatically update the list of my forums, when the get request is completed and 
  //  the myForums signal is updated with the new data.
  myForums = signal<ForumCardData[]>([]);
  suggestedForums = signal<ForumCardData[]>([]);
  searchResults = signal<ForumCardData[] | null>(null);
  totalOtherForums = signal(0);
  suggestedForumsLoading = signal(true);
  suggestedForumsError = signal(false);
  searchingForums = signal(false);
  searchError = signal(false);

  private readonly destroyRef = inject(DestroyRef);
  private readonly searchTerms = new Subject<string>();

  ngOnInit(): void {
    this.searchTerms.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query) return of({ query, forums: null, error: false });

        return this.forumApi.searchForums(query).pipe(
          map((forums) => ({ query, forums, error: false })),
          catchError((error: unknown) => {
            console.error(`Error searching forums for "${query}"`, error);
            return of({ query, forums: [], error: true });
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ query, forums, error }) => {
      if (query !== this.searchTerm.trim()) return;
      this.searchingForums.set(false);
      this.searchResults.set(forums);
      this.searchError.set(error);
    });

    this.userApi.getCurrentUser().subscribe({
      next: (user) => {
        this.firstName = typeof user?.first_name === 'string' ? user.first_name.trim() : '';
      },
      error: (error: unknown) => console.error('Error loading current user', error),
    });

    this.forumApi.getSuggestedForums().subscribe({
      next: (response) => {
        this.suggestedForums.set(response.data.results);
        this.totalOtherForums.set(response.data.total_other_forums);
        this.suggestedForumsLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading suggested forums', error);
        this.suggestedForumsError.set(true);
        this.suggestedForumsLoading.set(false);
      },
    });

     this.forumApi.getMyForums().subscribe({
    next: (forums) => {
      // console.log('FOROS RECIBIDOS:', forums);
      this.myForums.set(forums);
      // console.log('MY FORUMS:', this.myForums);
    },
    error: (error) => {
      console.error('Error loading forums', error);
    }
  });
    
  }

  constructor(
    private readonly forumApi: ForumApiService,
    private readonly userApi: UserApiService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  get visibleMyForums(): ForumCardData[] {
    if (this.searchTerm.trim()) {
      return (this.searchResults() ?? []).filter((forum) => forum.is_member || forum.is_owner);
    }
    return this.filterForums(this.myForums());
  }

  get visibleSuggestedForums(): ForumCardData[] {
    if (this.searchTerm.trim()) {
      return (this.searchResults() ?? []).filter((forum) => !forum.is_member && !forum.is_owner);
    }
    return this.filterForums(this.suggestedForums());
  }

  searchForums(searchTerm: string): void {
    const previousQuery = this.searchTerm.trim();
    this.searchTerm = searchTerm;
    const query = searchTerm.trim();
    if (query === previousQuery) return;

    this.searchError.set(false);
    this.searchingForums.set(query.length > 0);
    this.searchResults.set(query ? [] : null);
    this.searchTerms.next(query);
  }

  logout(): void {
    this.auth.clearTokens();
    void this.router.navigate(['/']);
  }

  updateMembership(event: { forum: ForumCardData; isMember: boolean }): void {
    const { forum, isMember } = event;
    this.searchResults.update((forums) => forums?.map((item) =>
      item.id === forum.id
        ? {
            ...item,
            is_member: isMember,
            member_count: Math.max(0, forum.member_count + (isMember ? 1 : -1)),
          }
        : item,
    ) ?? null);

    if (isMember) {
      this.suggestedForums.update((forums) => forums.filter((item) => item.id !== forum.id));
      this.myForums.update((forums) => [
        { ...forum, is_member: true, member_count: forum.member_count + 1 },
        ...forums.filter((item) => item.id !== forum.id),
      ]);
    } else {
      this.myForums.update((forums) => forums.filter((item) => item.id !== forum.id));
      this.suggestedForums.update((forums) => [
        { ...forum, is_member: false, member_count: Math.max(0, forum.member_count - 1) },
        ...forums.filter((item) => item.id !== forum.id),
      ]);
    }
  }

  private filterForums(forums: ForumCardData[]): ForumCardData[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    return query
      ? forums.filter((forum) => forum.name.toLocaleLowerCase().includes(query))
      : forums;
  }
}
