import { Component, HostListener, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PublicProfile } from '../../../models/user';
import { Simulation } from '../../../models/simulation';
import { ProfileApiService } from '../../services/profile-api';
import { SimulationApiService } from '../../services/simulation-api';
import { AppHeader } from '../app-header/app-header';
import { MotorControl } from '../../motor_interface/components/motor-control/motor-control';

@Component({
    selector: 'app-public-profile',
    standalone: true,
    imports: [AppHeader, MotorControl],
    templateUrl: './public-profile.html',
    styleUrl: './public-profile.css',
})
export class PublicProfilePage implements OnInit {
    readonly profile = signal<PublicProfile | null>(null);
    readonly simulations = signal<Simulation[]>([]);
    readonly selectedSimulation = signal<Simulation | null>(null);
    readonly loading = signal(true);
    readonly error = signal(false);

    constructor(
        private readonly route: ActivatedRoute,
        private readonly profileApi: ProfileApiService,
        private readonly simulationApi: SimulationApiService,
    ) {}

    ngOnInit(): void {
        const userId = Number(this.route.snapshot.paramMap.get('id'));

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            this.loading.set(false);
            this.error.set(true);
            return;
        }

        forkJoin({
            profile: this.profileApi.getPublicProfile(userId),
            simulations: this.simulationApi.getByOwner(userId),
        }).subscribe({
            next: ({ profile, simulations }) => {
                this.profile.set(profile);
                this.simulations.set(simulations);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                console.error(`Failed to load public profile for user ${userId}`, error);
                this.error.set(true);
                this.loading.set(false);
            },
        });
    }

    get displayName(): string {
        const profile = this.profile();
        const fullName = [profile?.first_name, profile?.last_name]
            .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
            .map((name) => name.trim())
            .join(' ');
        return fullName || profile?.visible_name?.trim() || profile?.username || 'Usuario';
    }

    get initials(): string {
        return this.displayName.slice(0, 2).toUpperCase();
    }

    simulationTitle(simulation: Simulation): string {
        return simulation.title || this.phenomenonLabel(simulation.phenomenon_type);
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
}