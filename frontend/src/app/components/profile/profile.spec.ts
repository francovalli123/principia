import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../services/auth';
import { ProfileApiService } from '../../services/profile-api';
import { SimulationApiService } from '../../services/simulation-api';
import { UserApiService } from '../../services/user-api';
import { WasmSetupService } from '../../motor_interface/services/wasmSetUp';
import { ProfilePage } from './profile';

const profile = {
  id: 2,
  user: 7,
  bio: 'Physics educator',
  visible_name: 'Ada',
  profile_picture: '/media/ada.png',
  creation_date: '2026-01-01T00:00:00Z',
};
const user = {
  id: 7,
  username: 'ada',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
};
const simulations = [
  { id: 1, title: 'Public', phenomenon_type: 'Dynamics', visibility: 'public' },
  { id: 2, title: 'Hidden', phenomenon_type: 'Dynamics', visibility: 'hidden' },
  { id: 3, title: 'Private', phenomenon_type: 'Dynamics', visibility: 'private' },
] as never[];

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  const profileApi = { getProfile: vi.fn(() => of(profile)) };
  const userApi = { getCurrentUser: vi.fn(() => of(user)) };
  const simulationApi = { getByOwner: vi.fn(() => of(simulations)) };
  const auth = { clearTokens: vi.fn() };
  const router = { navigate: vi.fn() };
  const wasmSetup = {
    getConfig: vi.fn(() => of({ status: 'success', data: {} })),
    loadEngine: vi.fn(async () => ({
      controls: [],
      readSnapshot: () => ({ status: 'paused' as const, metrics: [] }),
      execute: vi.fn(),
      destroy: vi.fn(),
    })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        { provide: ProfileApiService, useValue: profileApi },
        { provide: UserApiService, useValue: userApi },
        { provide: SimulationApiService, useValue: simulationApi },
        { provide: AuthService, useValue: auth },
        { provide: WasmSetupService, useValue: wasmSetup },
        { provide: ActivatedRoute, useValue: { snapshot: {} } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows profile details and groups simulations by visibility', () => {
    expect(fixture.nativeElement.textContent).toContain('Ada Lovelace');
    expect(fixture.nativeElement.textContent).toContain('Nombre completo');
    expect(fixture.nativeElement.textContent).toContain('ada@example.com');
    expect(fixture.nativeElement.textContent).toContain('Physics educator');
    expect(fixture.nativeElement.querySelectorAll('.simulation-item')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[aria-labelledby="visibility-public"] .simulation-item'))
      .toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-labelledby="visibility-hidden"] .simulation-item'))
      .toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-labelledby="visibility-private"] .simulation-item'))
      .toBeTruthy();
  });

  it('clears the session and navigates to the landing page on logout', () => {
    fixture.nativeElement.querySelector('.logout-button').click();

    expect(auth.clearTokens).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('opens the chosen simulation in a modal and closes it from the close button', async () => {
    fixture.nativeElement.querySelector('.view-simulation-button').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(wasmSetup.getConfig).toHaveBeenCalledWith(1);
    expect(fixture.nativeElement.querySelector('app-motor-control')).toBeTruthy();

    fixture.nativeElement.querySelector('.simulation-modal-close').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-motor-control')).toBeNull();
  });
});
