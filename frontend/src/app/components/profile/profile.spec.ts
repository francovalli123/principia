import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../services/auth';
import { ProfileApiService } from '../../services/profile-api';
import { SimulationApiService } from '../../services/simulation-api';
import { ToastService } from '../../services/toast';
import { UserApiService } from '../../services/user-api';
import { WasmSetupService } from '../../motor_interface/services/wasmSetUp';
import { Simulation } from '../../../models/simulation';
import { ProfilePage } from './profile';

const profile = {
  id: 2,
  user: 7,
  first_name: 'Ada',
  last_name: 'Lovelace',
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
const simulations: Simulation[] = [
  { id: 1, owner: user, title: 'Public', description: '', phenomenon_type: 'Oblique Projectile Motion', visibility: 'public', allow_cloning: true, creation_date: '' },
  { id: 2, owner: user, title: 'Hidden', description: '', phenomenon_type: 'Dynamics', visibility: 'hidden', allow_cloning: true, creation_date: '' },
  { id: 3, owner: user, title: 'Private', description: '', phenomenon_type: 'Dynamics', visibility: 'private', allow_cloning: true, creation_date: '' },
];

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  const profileUpdated = new Subject<typeof profile>();
  const profileApi = {
    getProfile: vi.fn(() => of(profile)),
    updateProfile: vi.fn((data: FormData | Partial<typeof profile>) =>
      of(data instanceof FormData ? profile : { ...profile, ...data })),
    profileUpdated$: profileUpdated.asObservable(),
  };
  const userApi = { getCurrentUser: vi.fn(() => of(user)) };
  const simulationApi = {
    getByOwner: vi.fn(() => of(simulations)),
    getFavourites: vi.fn(() => of([])),
    removeFavourite: vi.fn(() => of(undefined)),
    updateSimulation: vi.fn((id: number, data: { title?: string; visibility?: Simulation['visibility'] }) =>
      of({ ...simulations.find((simulation) => simulation.id === id)!, ...data }),
    ),
    deleteSimulation: vi.fn(() => of(undefined)),
  };
  const auth = { clearTokens: vi.fn() };
  const router = { navigate: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  const wasmSetup = {
    getConfig: vi.fn(() => of({
      status: 'success',
      data: { initial_velocity: 18, angle: 37, initial_height: 2 },
    })),
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
        { provide: ToastService, useValue: toast },
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

  it('shows the empty state when the user has no favourite simulations', () => {
    expect(fixture.nativeElement.textContent).toContain('Simulaciones favoritas');
    expect(fixture.nativeElement.textContent).toContain(
      'Todavía no marcaste simulaciones como favoritas.',
    );
  });

  it('clears the session and navigates to the landing page on logout', () => {
    fixture.nativeElement.querySelector('.logout-button').click();

    expect(auth.clearTokens).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('uploads a selected image as multipart profile data and updates the avatar', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:profile-preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const updatedProfile = { ...profile, profile_picture: '/media/new-avatar.png' };
    profileApi.updateProfile.mockReturnValueOnce(of(updatedProfile));
    const file = new File(['image'], 'avatar.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    fixture.componentInstance.uploadProfilePicture({ target: input } as unknown as Event);
    fixture.detectChanges();

    const requestBody = profileApi.updateProfile.mock.calls[0][0] as FormData;
    expect(requestBody).toBeInstanceOf(FormData);
    expect(requestBody.get('profile_picture')).toBe(file);
    expect(fixture.componentInstance.profile()?.profile_picture).toBe('/media/new-avatar.png');
    expect(fixture.nativeElement.querySelector('.profile-picture').getAttribute('src'))
      .toBe('/media/new-avatar.png');
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

  it('updates first and last name and biography through the profile editor', () => {
    fixture.componentInstance.openEditProfile();
    fixture.componentInstance.profileForm.setValue({
      firstName: 'Augusta',
      lastName: 'King',
      bio: 'Mathematician',
    });

    fixture.componentInstance.saveProfile();
    fixture.detectChanges();

    expect(profileApi.updateProfile).toHaveBeenCalledWith({
      first_name: 'Augusta',
      last_name: 'King',
      bio: 'Mathematician',
    });
    expect(fixture.componentInstance.fullName).toBe('Augusta King');
    expect(toast.success).toHaveBeenCalledWith('Tu perfil se actualizó correctamente.');
    expect(fixture.nativeElement.querySelector('[aria-labelledby="profile-editor-title"]')).toBeNull();
  });

  it('updates simulation title, parameters, and visibility in the manager', () => {
    fixture.componentInstance.openSimulationManager(simulations[0]);
    fixture.componentInstance.simulationForm.setValue({ title: 'Nuevo nombre', visibility: 'private' });
    fixture.componentInstance.simulationParametersForm.setValue({
      initial_velocity: 22,
      angle: 42,
      initial_height: 4,
    });

    fixture.componentInstance.saveSimulation();
    fixture.detectChanges();

    expect(simulationApi.updateSimulation).toHaveBeenCalledWith(1, {
      title: 'Nuevo nombre',
      visibility: 'private',
      parameters: { initial_velocity: 22, angle: 42, initial_height: 4 },
    });
    expect(fixture.componentInstance.simulations()[0]).toMatchObject({
      title: 'Nuevo nombre',
      visibility: 'private',
    });
    expect(toast.success).toHaveBeenCalledWith('La simulación se actualizó correctamente.');
  });

  it('requires confirmation before deleting a simulation and removes it after success', () => {
    fixture.componentInstance.openSimulationManager(simulations[0]);
    fixture.componentInstance.confirmSimulationDeletion();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeTruthy();

    fixture.componentInstance.deleteSimulation();
    fixture.detectChanges();

    expect(simulationApi.deleteSimulation).toHaveBeenCalledWith(1);
    expect(fixture.componentInstance.simulations()).toHaveLength(2);
    expect(toast.success).toHaveBeenCalledWith('La simulación se eliminó correctamente.');
  });
});
