import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { Comment } from '../../../models/comment';
import { Publication } from '../../../models/publication';
import { CommentApiService } from '../../services/comment-api';
import { SimulationApiService } from '../../services/simulation-api';
import { WasmSetupService } from '../../motor_interface/services/wasmSetUp';
import { PostCard } from './post-card';

const wasmSetupStub = {
  getConfig: vi.fn(() => of({ status: 'success', data: {} })),
  loadEngine: vi.fn(async () => ({
    controls: [],
    readSnapshot: () => ({ status: 'paused' as const, metrics: [] }),
    execute: () => undefined,
    destroy: () => undefined,
  })),
};
const simulationApiStub = {
  getByPublication: vi.fn(() => of({
    id: 3,
    title: 'Tiro oblicuo',
    phenomenon_type: 'Oblique Projectile Motion',
  })),
};
const commentApiStub = {
  createComment: vi.fn(() => of({
    id: 8,
    owner: {
      id: 12,
      username: 'test-user',
      first_name: 'Test',
      last_name: 'User',
    },
    publication: 7,
    content: 'A new comment',
    creation_date: '2026-10-21T12:00:00Z',
  })),
};

describe('PostCard', () => {
  let component: PostCard;
  let fixture: ComponentFixture<PostCard>;

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PostCard],
      providers: [
        { provide: WasmSetupService, useValue: wasmSetupStub },
        { provide: SimulationApiService, useValue: simulationApiStub },
        { provide: CommentApiService, useValue: commentApiStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostCard);
    component = fixture.componentInstance;
    component.publication = {
      id: 7,
      title: 'A test publication',
      description: 'Publication details',
      simulation: {
        id: 3,
        owner: {
          id: 12,
          username: 'test-user',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
        },
        title: 'Tiro oblicuo',
        description: '',
        phenomenon_type: 'Oblique Projectile Motion',
        visibility: 'public',
        allow_cloning: true,
        creation_date: '2026-10-21T10:00:00Z',
      },
      owner: {
        id: 12,
        username: 'test-user',
        first_name: 'Test',
        last_name: 'User',
      },
      forum: null,
      creation_date: '2026-10-21T10:00:00Z',
    };
    await fixture.whenStable();
  });

  it('renders a safe fallback when API owner fields are numeric IDs', () => {
    component.publication = { ...component.publication, owner: 12 };
    fixture.componentRef.setInput('comments', [{
      id: 5,
      owner: 13,
      publication: component.publication.id,
      content: 'Comment with an ID-only owner',
      creation_date: '2026-10-21T11:00:00Z',
    }]);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Usuario');
    expect(fixture.nativeElement.textContent).toContain('Comment with an ID-only owner');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders publication details and the empty comments state', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('A test publication');
    expect(fixture.nativeElement.textContent).toContain('Publication details');
    expect(fixture.nativeElement.textContent).toContain('test-user');
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay comentarios.');
  });

  it('renders comments linked to the publication', () => {
    const comment: Comment = {
      id: 4,
      owner: {
        id: 8,
        username: 'commenter',
        first_name: 'Comment',
        last_name: 'Author',
      },
      publication: component.publication.id,
      content: 'Useful comment',
      creation_date: '2026-10-21T11:00:00Z',
    };
    fixture.componentRef.setInput('comments', [comment]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Comentarios');
    expect(fixture.nativeElement.textContent).toContain('Useful comment');
    expect(fixture.nativeElement.textContent).toContain('commenter');
  });

  it('submits a comment and emits the created comment to the feed', () => {
    const emitted = vi.fn();
    component.commentAdded.subscribe(emitted);
    component.commentDraft = '  A new comment  ';

    component.submitComment();

    expect(commentApiStub.createComment).toHaveBeenCalledWith(7, 'A new comment');
    expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ content: 'A new comment' }));
    expect(component.commentDraft).toBe('');
  });

  it('mounts the WASM-backed simulation using the publication simulation', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const simulation = fixture.nativeElement.querySelector('app-motor-control');
    expect(simulation).toBeTruthy();
    expect(simulation.textContent).toContain('Estado de la simulación');
    expect(simulationApiStub.getByPublication).toHaveBeenCalledWith(7);
    expect(wasmSetupStub.getConfig).toHaveBeenCalledWith(3);
  });

  it('shows a loading state while the associated simulation is fetched', () => {
    simulationApiStub.getByPublication.mockReturnValueOnce(NEVER);
    const newFixture = TestBed.createComponent(PostCard);
    newFixture.componentInstance.publication = component.publication;
    newFixture.detectChanges();

    expect(newFixture.nativeElement.textContent).toContain('Cargando configuración de la simulación');
    expect(newFixture.nativeElement.querySelector('app-motor-control')).toBeNull();
  });
});
