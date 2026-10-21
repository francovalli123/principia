import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Comment } from '../../../models/comment';
import { Publication } from '../../../models/publication';
import { WasmSetupService } from '../../motor_interface/services/wasmSetUp';
import { PostCard } from './post-card';

const wasmSetupStub = {
  getConfig: () => of({ status: 'success', data: {} }),
  loadEngine: async () => ({
    controls: [],
    readSnapshot: () => ({ status: 'paused' as const, metrics: [] }),
    execute: () => undefined,
    destroy: () => undefined,
  }),
};

describe('PostCard', () => {
  let component: PostCard;
  let fixture: ComponentFixture<PostCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostCard],
      providers: [{ provide: WasmSetupService, useValue: wasmSetupStub }],
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
        phenomenon_type: 'Oblique Projectile Motion',
        visibility: 'public',
        creation_date: '2026-10-21T10:00:00Z',
      },
      owner: {
        id: 12,
        username: 'test-user',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      },
      forum: null,
      creation_date: '2026-10-21T10:00:00Z',
    };
    await fixture.whenStable();
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
        email: 'commenter@example.com',
        first_name: 'Comment',
        last_name: 'Author',
      },
      publication: component.publication.id,
      content: 'Useful comment',
      creation_date: '2026-10-21T11:00:00Z',
    };
    component.comments = [comment];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Comentarios');
    expect(fixture.nativeElement.textContent).toContain('Useful comment');
    expect(fixture.nativeElement.textContent).toContain('commenter');
  });

  it('mounts the WASM-backed simulation using the publication simulation', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const simulation = fixture.nativeElement.querySelector('app-motor-control');
    expect(simulation).toBeTruthy();
    expect(simulation.textContent).toContain('Estado de la simulación');
  });
});
