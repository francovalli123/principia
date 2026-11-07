import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicationApiService } from '../../services/publication-api';
import { SimulationApiService } from '../../services/simulation-api';
import { UserApiService } from '../../services/user-api';
import { CreatePublicationPage } from './create-publication';

describe('CreatePublicationPage', () => {
  let component: CreatePublicationPage;
  let fixture: ComponentFixture<CreatePublicationPage>;
  const publicationApi = { createPublication: vi.fn() };
  const simulationApi = { getByOwner: vi.fn() };
  const userApi = { getCurrentUser: vi.fn() };
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    userApi.getCurrentUser.mockReturnValue(of({ id: 8 }));
    simulationApi.getByOwner.mockReturnValue(of([
      { id: 17, phenomenon_type: 'Oblique Projectile Motion' },
    ]));
    publicationApi.createPublication.mockReturnValue(of({ id: 5 }));
    await TestBed.configureTestingModule({
      imports: [CreatePublicationPage],
      providers: [
        { provide: PublicationApiService, useValue: publicationApi },
        { provide: SimulationApiService, useValue: simulationApi },
        { provide: UserApiService, useValue: userApi },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '23' } } } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePublicationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the signed-in user simulations onto the dedicated page', () => {
    expect(simulationApi.getByOwner).toHaveBeenCalledWith(8);
    expect(fixture.nativeElement.textContent).toContain('Oblique Projectile Motion');
  });

  it('creates the publication for the route forum and returns to that forum', () => {
    component.title = '  Projectile motion  ';
    component.description = '  Comparing launch angles  ';
    component.simulationId = 17;

    component.submit();

    expect(publicationApi.createPublication).toHaveBeenCalledWith(
      'Projectile motion',
      'Comparing launch angles',
      17,
      23,
    );
    expect(router.navigate).toHaveBeenCalledWith(['/forums', 23]);
  });
});