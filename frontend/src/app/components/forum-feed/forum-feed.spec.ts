import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ForumFeed } from './forum-feed';
import { PublicationApiService } from '../../services/publication-api';
import { CommentApiService } from '../../services/comment-api';

describe('ForumFeed', () => {
  let component: ForumFeed;
  let fixture: ComponentFixture<ForumFeed>;
  const publicationApi = {
    getPaginatedByForum: () => of({ status: 'ok', data: { count: 0, next: null, previous: null, results: [] } }),
  };
  const commentApi = { getComments: () => of({ status: 'ok', data: { count: 0, next: null, previous: null, results: [] } }) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForumFeed],
      providers: [
        { provide: PublicationApiService, useValue: publicationApi },
        { provide: CommentApiService, useValue: commentApi },
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
});
