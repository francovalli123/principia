import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForumFeed } from './forum-feed';
import { ForumApiService } from '../../services/forum-api';
import { PublicationApiService } from '../../services/publication-api';
import { CommentApiService } from '../../services/comment-api';

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
      owner: { id: 1, username: 'owner', email: '', first_name: '', last_name: '' },
      member_count: 1,
      is_member: true,
      is_owner: false,
    })),
  };
  const commentApi = { getComments: () => of({ status: 'ok', data: { count: 0, next: null, previous: null, results: [] } }) };
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    publicationApi.getPaginatedByForum.mockReturnValue(
      of({ status: 'ok', data: { count: 0, next: null, previous: null, results: [] } }),
    );
    await TestBed.configureTestingModule({
      imports: [ForumFeed],
      providers: [
        { provide: ForumApiService, useValue: forumApi },
        { provide: PublicationApiService, useValue: publicationApi },
        { provide: CommentApiService, useValue: commentApi },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '23' } } } },
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
    const createButton = fixture.nativeElement.querySelector('.create-publication-button') as HTMLButtonElement;
    createButton.click();
    expect(router.navigate).toHaveBeenCalledWith(['/forums', 23, 'publications', 'crear']);
  });

  it('loads the current forum and provides a return action', () => {
    expect(forumApi.getForum).toHaveBeenCalledWith(23);
    expect(fixture.nativeElement.textContent).toContain('Physics');
    const backButton = fixture.nativeElement.querySelector('.back-button') as HTMLButtonElement;
    backButton.click();
    expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
  });

  it('does not render a search field outside the home page', () => {
    expect(fixture.nativeElement.querySelector('app-header .search')).toBeNull();
  });
});
