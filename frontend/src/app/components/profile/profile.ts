import { Component, HostListener, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Simulation, SimulationVisibility } from '../../../models/simulation';
import { Profile, User } from '../../../models/user';
import { AppHeader } from '../app-header/app-header';
import { ProfileApiService } from '../../services/profile-api';
import { SimulationApiService } from '../../services/simulation-api';
import { UserApiService } from '../../services/user-api';
import { AuthService } from '../../services/auth';
import { MotorControl } from '../../motor_interface/components/motor-control/motor-control';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [AppHeader, MotorControl],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage implements OnInit {
  readonly profile = signal<Profile | null>(null);
  readonly user = signal<User | null>(null);
  readonly simulations = signal<Simulation[]>([]);
  readonly selectedSimulation = signal<Simulation | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly visibilityGroups: { key: SimulationVisibility; title: string }[] = [
    { key: 'public', title: 'Públicas' },
    { key: 'hidden', title: 'Ocultas' },
    { key: 'private', title: 'Privadas' },
  ];

  constructor(
    private readonly profileApi: ProfileApiService,
    private readonly simulationApi: SimulationApiService,
    private readonly userApi: UserApiService,
    private readonly auth: AuthService,
    private readonly router: Router,
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
      },
      error: (error: unknown) => this.handleLoadError(error),
    });
  }

  simulationsFor(visibility: SimulationVisibility): Simulation[] {
    return this.simulations().filter((simulation) => simulation.visibility === visibility);
  }

  openSimulation(simulation: Simulation): void {
    this.selectedSimulation.set(simulation);
  }

  closeSimulation(): void {
    this.selectedSimulation.set(null);
  }

  @HostListener('document:keydown.escape')
  closeSimulationOnEscape(): void {
    if (this.selectedSimulation()) this.closeSimulation();
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

  private handleLoadError(error: unknown): void {
    console.error('Failed to load profile information', error);
    this.loadError.set(true);
    this.isLoading.set(false);
  }
}
