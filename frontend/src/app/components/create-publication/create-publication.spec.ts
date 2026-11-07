import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatePublicationPage } from './create-publication';

describe('CreatePublicationPage', () => {
  let component: CreatePublicationPage;
  let fixture: ComponentFixture<CreatePublicationPage>;
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [CreatePublicationPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '23' } } } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePublicationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the two publication choices without starting a simulations request', () => {
      expect(fixture.nativeElement.textContent).toContain('¿Qué querés hacer?');
      expect(fixture.nativeElement.textContent).toContain('Crear una simulación nueva');
      expect(fixture.nativeElement.textContent).toContain('Publicar una simulación existente');
  });

  it('navigates to create simulation preserving the forum context', () => {
      fixture.nativeElement.querySelector('.primary-button').click();

      expect(router.navigate).toHaveBeenCalledWith(['/simulaciones/crear'], {
        queryParams: { forumId: 23, returnTo: 'forum-publication' },
      });
  });

  it('navigates to the owned simulations list', () => {
      fixture.nativeElement.querySelectorAll('.primary-button')[1].click();

      expect(router.navigate).toHaveBeenCalledWith([
        '/forums', 23, 'publications', 'crear', 'seleccionar',
      ]);
  });
});