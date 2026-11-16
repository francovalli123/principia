import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForumFeed } from './forum-feed';
import { ForumApiService } from '../../services/forum-api';
import { PublicationApiService } from '../../services/publication-api';
import { CommentApiService } from '../../services/comment-api';
import { UserApiService } from '../../services/user-api';
import { ProfileApiService } from '../../services/profile-api';
import { SimulationApiService } from '../../services/simulation-api';
import { CommentRealtimeEvent, CommentRealtimeService } from '../../services/comment-realtime';
import { Comment } from '../../../models/comment';
import { Publication } from '../../../models/publication';

describe('ForumFeed', () => {
  let component: ForumFeed;
  let fixture: ComponentFixture<ForumFeed>;
  const publicationApi = {
    getPaginatedByForum: vi.fn(),
  };
  const forumApi = {
    getForum: vi.fn(() => of({
      id: 23,
      name: 'Physics',
      description: '',
      creation_date: '',
      owner: 1,
      member_count: 1,
      is_member: true,
      is_owner: false,
    })),
    getMembers: vi.fn(() => of([
      { id: 1, username: 'owner', profile_picture: 'https://example.test/owner.jpg' },
      { id: 45, username: 'member-one', profile_picture: 'https://example.test/member.jpg' },
    ])),
  };
  const commentApi = { getComments: () => of({ status: 'ok', data: { count: 0, next: null, previous: null, results: [] } }) };
  let onRealtimeEvent: (event: CommentRealtimeEvent) => void = () => {};
  const commentRealtime = {
    connect: vi.fn((_forumId: number, onEvent: (event: CommentRealtimeEvent) => void) => {
      onRealtimeEvent = onEvent;
      return vi.fn();
    }),
  };
  const profileApi = {
    profileUpdated$: EMPTY,
    getProfile: vi.fn(() => of({
      id: 8,
      user: 12,
      bio: null,
      visible_name: null,
      profile_picture: 'https://example.test/profile.jpg',
      creation_date: '',
    })),
  };
  const userApi = { getCurrentUser: vi.fn(() => of({ id: 12 })) };
  const simulationApi = { getFavourites: vi.fn(() => of([])) };
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    commentRealtime.connect.mockImplementation((_forumId, onEvent) => {
      onRealtimeEvent = onEvent;
      return vi.fn();
    });
    publicationApi.getPaginatedByForum.mockReturnValue(
      of({ status: 'ok', data: { count: 0, next: null, previous: null, results: [] } }),
    );
    await TestBed.configureTestingModule({
      imports: [ForumFeed],
      providers: [
        { provide: ForumApiService, useValue: forumApi },
        { provide: PublicationApiService, useValue: publicationApi },
        { provide: CommentApiService, useValue: commentApi },
        { provide: CommentRealtimeService, useValue: commentRealtime },
        { provide: ProfileApiService, useValue: profileApi },
        { provide: UserApiService, useValue: userApi },
        { provide: SimulationApiService, useValue: simulationApi },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '23' }, queryParamMap: { get: () => null } } } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForumFeed);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads publications on initialization and renders the empty state', () => {
    expect(component.posts()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Este foro todavía está vacío');
  });

  it('links to the publication form page for the current forum', () => {
    const composer = fixture.nativeElement.querySelector('.publication-composer') as HTMLElement;
    composer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(router.navigate).not.toHaveBeenCalled();

    const createButton = fixture.nativeElement.querySelector('.create-publication-button') as HTMLButtonElement;
    createButton.click();
    expect(router.navigate).toHaveBeenCalledWith(['/forums', 23, 'publications', 'crear']);
  });

  it('shows the current user profile picture beside the publish button', () => {
    const avatar = fixture.nativeElement.querySelector('.composer-avatar') as HTMLImageElement;
    expect(avatar.src).toBe('https://example.test/profile.jpg');
    expect(fixture.nativeElement.querySelector('.publication-composer .create-publication-button')).toBeTruthy();
    expect(fixture.debugElement.query(By.directive(RouterLink))).toBeTruthy();
    expect(avatar.closest('a')).toBeTruthy();
  });

  it('loads the current forum and provides a return action', () => {
    expect(forumApi.getForum).toHaveBeenCalledWith(23);
    expect(fixture.nativeElement.textContent).toContain('Physics');
    const backButton = fixture.nativeElement.querySelector('.back-button') as HTMLButtonElement;
    backButton.click();
    expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
  });

  it('shows forum members with profile links when the members button is clicked', () => {
    const membersButton = fixture.nativeElement.querySelector('.members-toggle') as HTMLButtonElement;
    membersButton.click();
    fixture.detectChanges();

    expect(forumApi.getMembers).toHaveBeenCalledWith(23);
    const memberAvatar = fixture.nativeElement.querySelector(
      '.member-link img[src="https://example.test/member.jpg"]',
    ) as HTMLImageElement;
    const memberLink = memberAvatar.closest('.member-link') as HTMLAnchorElement;
    expect(fixture.debugElement.query(By.css('.member-link')).injector.get(RouterLink)).toBeTruthy();
    expect(memberLink.textContent).toContain('member-one');
    expect(memberAvatar.src).toBe('https://example.test/member.jpg');
    const ownerBadge = fixture.nativeElement.querySelector('.member-owner-badge') as HTMLElement;
    const ownerLink = ownerBadge.closest('.member-link') as HTMLAnchorElement;
    expect((ownerLink.querySelector('img') as HTMLImageElement).src).toBe('https://example.test/owner.jpg');
    expect(ownerLink.querySelector('.member-owner-badge')?.textContent).toContain('Propietario');
  });

  it('loads the current user ID for own-comment actions', () => {
    expect(userApi.getCurrentUser).toHaveBeenCalledOnce();
    expect(component.currentUserId).toBe(12);
  });

  it('subscribes to forum events and applies comment creation and deletion', () => {
    const publication = { id: 31 } as Publication;
    component.posts.set([{
      publication,
      comments: [],
      nextCommentPage: null,
      loadingComments: false,
    }]);
    const comment = {
      id: 54,
      publication: 31,
      content: 'En tiempo real',
      owner: { id: 15, username: 'other-user' },
      creation_date: '2026-11-16T12:00:00Z',
    } as Comment;

    expect(commentRealtime.connect).toHaveBeenCalledWith(23, expect.any(Function));
    onRealtimeEvent({ type: 'comment.created', comment });
    expect(component.posts()[0].comments).toEqual([comment]);

    component.addComment(component.posts()[0], comment);
    expect(component.posts()[0].comments).toEqual([comment]);

    onRealtimeEvent({ type: 'comment.deleted', id: 54, publication: 31 });
    expect(component.posts()[0].comments).toEqual([]);
  });

  it('inserts and removes publications received from the forum event stream', () => {
    const publication = {
      id: 62,
      title: 'Nueva publicación',
      description: 'Creada desde otra sesión',
      simulation: 15,
      owner: 18,
      forum: 23,
      creation_date: '2026-11-16T12:00:00Z',
    } as Publication;

    onRealtimeEvent({ type: 'publication.created', publication });
    expect(component.posts().map((post) => post.publication.id)).toEqual([62]);

    onRealtimeEvent({ type: 'publication.created', publication });
    expect(component.posts()).toHaveLength(1);

    onRealtimeEvent({ type: 'publication.deleted', publication_id: 62 });
    expect(component.posts()).toEqual([]);
  });

  it('disconnects the forum event stream when destroyed', () => {
    const disconnect = commentRealtime.connect.mock.results[0]?.value as ReturnType<typeof vi.fn>;

    fixture.destroy();

    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('does not render a search field outside the home page', () => {
    expect(fixture.nativeElement.querySelector('app-header .search')).toBeNull();
  });
});
