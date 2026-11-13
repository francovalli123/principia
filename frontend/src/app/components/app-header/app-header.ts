import { Component, EventEmitter, Input, OnInit, Output, signal, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Profile } from '../../../models/user';
import { ProfileApiService } from '../../services/profile-api';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
})
export class AppHeader implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  @Input() searchTerm = '';
  @Input() showSearch = false;
  @Input() showLogout = false;
  @Output() readonly searchTermChange = new EventEmitter<string>();
  @Output() readonly logoutClicked = new EventEmitter<void>();
  readonly profile = signal<Profile | null>(null);

  constructor(
    private readonly profileApi: ProfileApiService,
  ) {}

  ngOnInit(): void {
    this.profileApi.profileUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => this.profile.set(profile));
    this.profileApi.getProfile().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error: unknown) => console.error('Failed to load profile picture for header', error),
    });
  }
}
