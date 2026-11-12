import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { Comment } from '../../../models/comment';
import { Publication } from '../../../models/publication';
import { CommentApiService } from '../../services/comment-api';
import { SimulationApiService } from '../../services/simulation-api';
import { ToastService } from '../../services/toast';
import { PublicationApiService } from '../../services/publication-api';
import { BaseApiService } from '../../services/base-api.service';
import { provideRouter } from '@angular/router';
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
    allow_cloning: true,
  })),
  cloneSimulation: vi.fn(() => of({
    id: 4,
    title: 'Tiro oblicuo',
    phenomenon_type: 'Oblique Projectile Motion',
  })),
  addFavourite: vi.fn(() => of({})),
  removeFavourite: vi.fn(() => of(undefined)),
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
  deleteComment: vi.fn(() => of(null)),
};
const publicationApiStub = { deletePublication: vi.fn(() => of(null)) };
const baseApiStub = { getUrl: vi.fn(() => 'http://127.0.0.1:8000/api') };
const toastStub = { success: vi.fn(), error: vi.fn() };

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
        { provide: PublicationApiService, useValue: publicationApiStub },
        { provide: BaseApiService, useValue: baseApiStub },
        { provide: ToastService, useValue: toastStub },
        provideRouter([]),
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

  it('renders the owner profile photo when the API includes its URL', () => {
    fixture.componentRef.setInput('publication', {
      ...component.publication,
      owner: {
        id: 12,
        username: 'test-user',
        first_name: 'Test',
        last_name: 'User',
        profile_picture: '/media/profile_pictures/avatar.png',
      },
    });
    expect(component.authorProfilePicture(component.publication.owner))
      .toBe('http://127.0.0.1:8000/media/profile_pictures/avatar.png');
    fixture.detectChanges();

    const photo = fixture.nativeElement.querySelector('.author-photo') as HTMLImageElement;
    expect(photo).toBeTruthy();
    expect(photo.src).toBe('http://127.0.0.1:8000/media/profile_pictures/avatar.png');
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

  it('only shows a delete button for the current user’s comment', () => {
    fixture.componentRef.setInput('currentUserId', 12);
    fixture.componentRef.setInput('comments', [
      {
        id: 4,
        owner: 12,
        publication: component.publication.id,
        content: 'My comment',
        creation_date: '2026-10-21T11:00:00Z',
      },
      {
        id: 5,
        owner: 13,
        publication: component.publication.id,
        content: 'Someone else’s comment',
        creation_date: '2026-10-21T11:01:00Z',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.comment-delete')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.comment-delete').getAttribute('aria-label'))
      .toBe('Eliminar comentario de Usuario');
  });

  it('deletes an owned comment and shows a success toast', () => {
    const deleted = vi.fn();
    component.commentDeleted.subscribe(deleted);
    component.currentUserId = 12;
    const comment: Comment = {
      id: 4,
      owner: 12,
      publication: component.publication.id,
      content: 'My comment',
      creation_date: '2026-10-21T11:00:00Z',
    };

    component.deleteComment(comment);

    expect(commentApiStub.deleteComment).toHaveBeenCalledWith(4);
    expect(deleted).toHaveBeenCalledWith(4);
    expect(toastStub.success).toHaveBeenCalledWith('Comentario eliminado.');
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

  it('clones an allowed simulation and shows the success actions', () => {
    component.currentUserId = 12;

    component.cloneSimulation();
    fixture.detectChanges();

    expect(simulationApiStub.cloneSimulation).toHaveBeenCalledWith(3, 7);
    expect(fixture.nativeElement.textContent).toContain('¡Simulación clonada con éxito!');
    expect(fixture.nativeElement.textContent).toContain('Ir a mis simulaciones');
    expect(fixture.nativeElement.textContent).toContain('Aceptar');

    fixture.nativeElement.querySelector('.clone-accept-button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.clone-success-dialog')).toBeNull();
  });

  it('adds and removes a simulation from favourites', () => {
    const changed = vi.fn();
    component.favoriteChanged.subscribe(changed);
    component.currentUserId = 12;

    component.toggleFavourite();
    expect(simulationApiStub.addFavourite).toHaveBeenCalledWith(3, 7);
    expect(component.isFavourite()).toBe(true);
    expect(changed).toHaveBeenLastCalledWith({ simulationId: 3, isFavourite: true });

    component.toggleFavourite();
    expect(simulationApiStub.removeFavourite).toHaveBeenCalledWith(3);
    expect(component.isFavourite()).toBe(false);
    expect(changed).toHaveBeenLastCalledWith({ simulationId: 3, isFavourite: false });
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
