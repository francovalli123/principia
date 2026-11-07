import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicationApiService } from '../../services/publication-api';
import { PublishSimulationPage } from './publish-simulation';

describe('PublishSimulationPage', () => {
  let fixture: ComponentFixture<PublishSimulationPage>;
  const publicationApi = { createPublication: vi.fn() };
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    publicationApi.createPublication.mockReturnValue(of({ id: 5 }));
    await TestBed.configureTestingModule({
      imports: [PublishSimulationPage],
      providers: [
        { provide: PublicationApiService, useValue: publicationApi },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'forumId' ? '23' : '17',
              },
            },
          },
        },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishSimulationPage);
    fixture.detectChanges();
  });

  it('publishes the chosen simulation to the current forum', () => {
    fixture.componentInstance.title = '  Tiro oblicuo  ';
    fixture.componentInstance.description = '  Alcance máximo  ';

    fixture.componentInstance.submit();

    expect(publicationApi.createPublication).toHaveBeenCalledWith(
      'Tiro oblicuo',
      'Alcance máximo',
      17,
      23,
    );
    expect(router.navigate).toHaveBeenCalledWith(['/forums', 23]);
  });

  it('keeps form data and shows an error when publication fails', () => {
    publicationApi.createPublication.mockReturnValue(throwError(() => new Error('offline')));
    fixture.componentInstance.title = 'Tiro oblicuo';
    fixture.componentInstance.description = 'Detalles';

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.title).toBe('Tiro oblicuo');
    expect(fixture.componentInstance.description).toBe('Detalles');
    expect(fixture.nativeElement.textContent).toContain('No pudimos crear la publicación');
  });
});
