import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { Simulation, SimulationVisibility } from '../../../models/simulation';
import { Profile, User } from '../../../models/user';
import { SimulationFavourite } from '../../services/simulation-api';
import { AppHeader } from '../app-header/app-header';
import { ProfileApiService } from '../../services/profile-api';
import { SimulationApiService } from '../../services/simulation-api';
import { ForumApiService } from '../../services/forum-api';
import { UserApiService } from '../../services/user-api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { MotorControl } from '../../motor_interface/components/motor-control/motor-control';
import { WasmSetupService } from '../../motor_interface/services/wasmSetUp';
import {
  getSimulationFormAdapter,
  SimulationFormAdapter,
} from '../simulation-form/simulation-form.adapter';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [AppHeader, MotorControl, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage implements OnInit, OnDestroy {
  private parameterConfigSubscription?: Subscription;
  readonly profile = signal<Profile | null>(null);
  readonly user = signal<User | null>(null);
  readonly simulations = signal<Simulation[]>([]);
  readonly favouriteSimulations = signal<SimulationFavourite[]>([]);
  readonly favouriteForumAccessDialog = signal<SimulationFavourite | null>(null);
  readonly joiningFavouriteForum = signal(false);
  readonly favouriteForumError = signal('');
  readonly loadingFavourites = signal(true);
  readonly favouritesError = signal(false);
  readonly removingFavouriteIds = signal<Set<number>>(new Set());
  readonly selectedSimulation = signal<Simulation | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly picturePreview = signal<string | null>(null);
  readonly pictureUploadError = signal('');
  readonly isUploadingPicture = signal(false);
  readonly isEditProfileOpen = signal(false);
  readonly isSavingProfile = signal(false);
  readonly profileFormError = signal('');
  readonly editingSimulation = signal<Simulation | null>(null);
  readonly editingSimulationAdapter = signal<SimulationFormAdapter | null>(null);
  readonly isLoadingParameters = signal(false);
  readonly simulationParametersLoaded = signal(false);
  readonly isSavingSimulation = signal(false);
  readonly isDeletingSimulation = signal(false);
  readonly isDeleteConfirmationOpen = signal(false);
  readonly simulationEditorError = signal('');
  readonly profileForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    bio: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });
  readonly simulationForm = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
    }),
    visibility: new FormControl<SimulationVisibility>('public', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  simulationParametersForm = new FormGroup<Record<string, FormControl<number>>>({});
  readonly visibilityGroups: { key: SimulationVisibility; title: string }[] = [
    { key: 'public', title: 'Públicas' },
    { key: 'hidden', title: 'Ocultas' },
    { key: 'private', title: 'Privadas' },
  ];

  constructor(
    private readonly profileApi: ProfileApiService,
    private readonly simulationApi: SimulationApiService,
    private readonly forumApi: ForumApiService,
    private readonly userApi: UserApiService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly wasmSetup: WasmSetupService,
  ) {}

  ngOnInit(): void {
    forkJoin({ profile: this.profileApi.getProfile(), user: this.userApi.getCurrentUser() }).subscribe({
      next: ({ profile, user }) => {
        this.profile.set(profile);
        this.user.set(user);
        this.simulationApi.getByOwner(user.id).subscribe({
          next: (simulations) => {
            this.simulations.set(simulations);
            this.isLoading.set(false);
          },
          error: (error: unknown) => this.handleLoadError(error),
        });
        this.simulationApi.getFavourites().subscribe({
          next: (favourites) => {
            this.favouriteSimulations.set(favourites);
            this.loadingFavourites.set(false);
          },
          error: (error: unknown) => {
            console.error('Failed to load favourite simulations', error);
            this.favouritesError.set(true);
            this.loadingFavourites.set(false);
          },
        });
      },
      error: (error: unknown) => this.handleLoadError(error),
    });
  }

  ngOnDestroy(): void {
    this.parameterConfigSubscription?.unsubscribe();
    this.clearPicturePreview();
  }

  uploadProfilePicture(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.pictureUploadError.set('Seleccioná un archivo de imagen válido.');
      input.value = '';
      return;
    }

    this.clearPicturePreview();
    this.picturePreview.set(URL.createObjectURL(file));
    this.pictureUploadError.set('');
    this.isUploadingPicture.set(true);

    const formData = new FormData();
    formData.append('profile_picture', file);
    this.profileApi.updateProfile(formData).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.clearPicturePreview();
        this.isUploadingPicture.set(false);
        input.value = '';
      },
      error: (error: unknown) => {
        console.error('Failed to update profile picture', error);
        this.pictureUploadError.set('No se pudo actualizar la foto. Intentá nuevamente.');
        this.clearPicturePreview();
        this.isUploadingPicture.set(false);
        input.value = '';
      },
    });
  }

  simulationsFor(visibility: SimulationVisibility): Simulation[] {
    return this.simulations().filter((simulation) => simulation.visibility === visibility);
  }

  openSimulation(simulation: Simulation): void {
    this.selectedSimulation.set(simulation);
  }

  openFavouritePublication(favourite: SimulationFavourite): void {
    const publication = favourite.publication;
    if (!publication || publication.forum === null) return;

    this.forumApi.getForum(publication.forum).subscribe({
      next: () => this.navigateToFavouritePublication(favourite),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.favouriteForumError.set('');
          this.favouriteForumAccessDialog.set(favourite);
          return;
        }

        console.error(`Failed to verify membership for forum ${publication.forum}`, error);
        this.toast.error('No se pudo comprobar tu acceso al foro. Intentá nuevamente.');
      },
    });
  }

  rejoinFavouriteForum(): void {
    const favourite = this.favouriteForumAccessDialog();
    const publication = favourite?.publication;
    if (!publication || publication.forum === null || this.joiningFavouriteForum()) return;

    this.favouriteForumError.set('');
    this.joiningFavouriteForum.set(true);
    this.forumApi.joinForum(publication.forum).subscribe({
      next: () => {
        this.joiningFavouriteForum.set(false);
        this.favouriteForumAccessDialog.set(null);
        this.navigateToFavouritePublication(favourite);
      },
      error: (error: unknown) => {
        console.error(`Failed to rejoin forum ${publication.forum}`, error);
        this.joiningFavouriteForum.set(false);
        this.favouriteForumError.set('No se pudo volver a entrar al foro. Intentá nuevamente.');
      },
    });
  }

  closeFavouriteForumAccessDialog(): void {
    if (this.joiningFavouriteForum()) return;
    this.favouriteForumAccessDialog.set(null);
    this.favouriteForumError.set('');
  }

  removeFavourite(favourite: SimulationFavourite): void {
    const simulationId = favourite.simulation;
    if (this.removingFavouriteIds().has(simulationId)) return;

    this.removingFavouriteIds.update((ids) => new Set(ids).add(simulationId));
    this.simulationApi.removeFavourite(simulationId).subscribe({
      next: () => {
        this.favouriteSimulations.update((favourites) =>
          favourites.filter((item) => item.simulation !== simulationId));
        if (this.favouriteForumAccessDialog()?.simulation === simulationId) {
          this.closeFavouriteForumAccessDialog();
        }
        this.removingFavouriteIds.update((ids) => {
          const next = new Set(ids);
          next.delete(simulationId);
          return next;
        });
        this.toast.success('Simulación quitada de favoritos.');
      },
      error: (error: unknown) => {
        console.error(`Failed to remove simulation ${simulationId} from favourites`, error);
        this.removingFavouriteIds.update((ids) => {
          const next = new Set(ids);
          next.delete(simulationId);
          return next;
        });
        this.toast.error('No se pudo quitar la simulación de favoritos.');
      },
    });
  }

  openEditProfile(): void {
    const user = this.user();
    const profile = this.profile();
    this.profileForm.reset({
      firstName: user?.first_name ?? profile?.first_name ?? '',
      lastName: user?.last_name ?? profile?.last_name ?? '',
      bio: profile?.bio ?? '',
    });
    this.profileFormError.set('');
    this.isEditProfileOpen.set(true);
  }

  closeEditProfile(): void {
    this.isEditProfileOpen.set(false);
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSavingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    this.isSavingProfile.set(true);
    this.profileFormError.set('');
    this.profileApi.updateProfile({
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      bio: values.bio.trim(),
    }).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.user.update((user) => user
          ? { ...user, first_name: profile.first_name, last_name: profile.last_name }
          : user);
        this.isSavingProfile.set(false);
        this.closeEditProfile();
        this.toast.success('Tu perfil se actualizó correctamente.');
      },
      error: (error: unknown) => {
        console.error('Failed to update profile details', error);
        this.isSavingProfile.set(false);
        this.profileFormError.set('No se pudieron guardar los cambios. Intentá nuevamente.');
        this.toast.error('No se pudo actualizar tu perfil.');
      },
    });
  }

  openSimulationManager(simulation: Simulation): void {
    this.parameterConfigSubscription?.unsubscribe();
    const adapter = getSimulationFormAdapter(simulation.phenomenon_type);
    this.editingSimulation.set(simulation);
    this.editingSimulationAdapter.set(adapter ?? null);
    this.simulationForm.reset({
      title: simulation.title || this.phenomenonLabel(simulation.phenomenon_type),
      visibility: simulation.visibility,
    });
    this.simulationEditorError.set('');
    this.simulationParametersLoaded.set(adapter === undefined);
    this.isLoadingParameters.set(adapter !== undefined);
    this.simulationParametersForm = new FormGroup<Record<string, FormControl<number>>>({});

    if (!adapter) return;

    for (const field of adapter.fields) {
      const validators = [Validators.required, Validators.min(field.min)];
      if (field.max !== undefined) validators.push(Validators.max(field.max));
      this.simulationParametersForm.addControl(
        field.name,
        new FormControl(field.defaultValue, { nonNullable: true, validators }),
      );
    }

    this.parameterConfigSubscription = this.wasmSetup.getConfig(simulation.id).subscribe({
      next: (response) => {
        try {
          const parameters = readSimulationParameters(response);
          for (const field of adapter.fields) {
            const value = parameters[field.name];
            if (typeof value !== 'number' || !Number.isFinite(value)) {
              throw new Error(`Missing or invalid simulation parameter: ${field.name}`);
            }
            this.simulationParametersForm.controls[field.name].setValue(value);
          }
          this.simulationParametersLoaded.set(true);
        } catch (error) {
          console.error(`Failed to parse parameters for simulation ${simulation.id}`, error);
          this.simulationEditorError.set('No se pudieron cargar los parámetros de esta simulación.');
        }
        this.isLoadingParameters.set(false);
      },
      error: (error: unknown) => {
        console.error(`Failed to load parameters for simulation ${simulation.id}`, error);
        this.simulationEditorError.set('No se pudieron cargar los parámetros de esta simulación.');
        this.isLoadingParameters.set(false);
      },
    });
  }

  closeSimulationManager(): void {
    this.parameterConfigSubscription?.unsubscribe();
    this.parameterConfigSubscription = undefined;
    this.isDeleteConfirmationOpen.set(false);
    this.editingSimulation.set(null);
    this.editingSimulationAdapter.set(null);
    this.simulationParametersLoaded.set(false);
    this.simulationEditorError.set('');
  }

  saveSimulation(): void {
    const simulation = this.editingSimulation();
    const adapter = this.editingSimulationAdapter();
    if (!simulation || this.simulationForm.invalid || this.isSavingSimulation()) {
      this.simulationForm.markAllAsTouched();
      this.simulationParametersForm.markAllAsTouched();
      return;
    }
    if (
      this.isLoadingParameters() ||
      (adapter && (!this.simulationParametersLoaded() || this.simulationParametersForm.invalid))
    ) {
      this.simulationParametersForm.markAllAsTouched();
      return;
    }

    const payload = {
      title: this.simulationForm.controls.title.value.trim(),
      visibility: this.simulationForm.controls.visibility.value,
      ...(adapter ? { parameters: adapter.toParameters(this.simulationParametersForm.getRawValue()) } : {}),
    };
    this.isSavingSimulation.set(true);
    this.simulationEditorError.set('');
    this.simulationApi.updateSimulation(simulation.id, payload).subscribe({
      next: (updatedSimulation) => {
        this.simulations.update((simulations) => simulations.map((item) =>
          item.id === updatedSimulation.id ? { ...item, ...updatedSimulation } : item));
        this.isSavingSimulation.set(false);
        this.closeSimulationManager();
        this.toast.success('La simulación se actualizó correctamente.');
      },
      error: (error: unknown) => {
        console.error(`Failed to update simulation ${simulation.id}`, error);
        this.isSavingSimulation.set(false);
        this.simulationEditorError.set('No se pudo guardar la simulación. Revisá los datos e intentá nuevamente.');
        this.toast.error('No se pudo actualizar la simulación.');
      },
    });
  }

  confirmSimulationDeletion(): void {
    this.isDeleteConfirmationOpen.set(true);
  }

  deleteSimulation(): void {
    const simulation = this.editingSimulation();
    if (!simulation || this.isDeletingSimulation()) return;

    this.isDeletingSimulation.set(true);
    this.simulationApi.deleteSimulation(simulation.id).subscribe({
      next: () => {
        this.simulations.update((simulations) => simulations.filter((item) => item.id !== simulation.id));
        this.isDeletingSimulation.set(false);
        this.closeSimulationManager();
        if (this.selectedSimulation()?.id === simulation.id) this.closeSimulation();
        this.toast.success('La simulación se eliminó correctamente.');
      },
      error: (error: unknown) => {
        console.error(`Failed to delete simulation ${simulation.id}`, error);
        this.isDeletingSimulation.set(false);
        this.isDeleteConfirmationOpen.set(false);
        this.simulationEditorError.set('No se pudo eliminar la simulación. Intentá nuevamente.');
        this.toast.error('No se pudo eliminar la simulación.');
      },
    });
  }

  closeSimulation(): void {
    this.selectedSimulation.set(null);
  }

  @HostListener('document:keydown.escape')
  closeSimulationOnEscape(): void {
    if (this.isDeleteConfirmationOpen()) {
      this.isDeleteConfirmationOpen.set(false);
    } else if (this.favouriteForumAccessDialog()) {
      this.closeFavouriteForumAccessDialog();
    } else if (this.editingSimulation()) {
      this.closeSimulationManager();
    } else if (this.isEditProfileOpen()) {
      this.closeEditProfile();
    } else if (this.selectedSimulation()) {
      this.closeSimulation();
    }
  }

  simulationTitle(simulation: Simulation): string {
    return simulation.title || this.phenomenonLabel(simulation.phenomenon_type);
  }

  get fullName(): string {
    const accountName = [this.user()?.first_name, this.user()?.last_name]
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      .map((name) => name.trim())
      .join(' ');
    return accountName || this.profile()?.visible_name?.trim() || this.user()?.username || 'Mi perfil';
  }

  phenomenonLabel(value: string): string {
    const labels: Record<string, string> = {
      'oblique projectile motion': 'Tiro oblicuo',
      'uniformly accelerated motion': 'MRUV',
      'uniform rectilinear motion': 'MRU',
      dynamics: 'Dinámica',
    };
    return labels[value.toLocaleLowerCase()] ?? value;
  }

  logout(): void {
    this.auth.clearTokens();
    void this.router.navigate(['/']);
  }

  private navigateToFavouritePublication(favourite: SimulationFavourite): void {
    const publication = favourite.publication;
    if (!publication || publication.forum === null) return;

    void this.router.navigate(['/forums', publication.forum], {
      queryParams: { publicationId: publication.id },
    });
  }

  private handleLoadError(error: unknown): void {
    console.error('Failed to load profile information', error);
    this.loadError.set(true);
    this.isLoading.set(false);
  }

  private clearPicturePreview(): void {
    const preview = this.picturePreview();
    if (preview) URL.revokeObjectURL(preview);
    this.picturePreview.set(null);
  }
}

function readSimulationParameters(response: unknown): Record<string, unknown> {
  if (typeof response !== 'object' || response === null || !('data' in response)) {
    throw new Error('The simulation configuration response is invalid');
  }
  const parameters = response.data;
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    throw new Error('The simulation configuration is invalid');
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parameters)) result[key] = value;
  return result;
}
