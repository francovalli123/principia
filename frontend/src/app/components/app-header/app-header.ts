import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  @Input() searchTerm = '';
  @Input() showSearch = false;
  @Output() readonly searchTermChange = new EventEmitter<string>();
  readonly profile = signal<Profile | null>(null);

  constructor(
    private readonly profileApi: ProfileApiService,
  ) {}

  ngOnInit(): void {
    this.profileApi.getProfile().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error: unknown) => console.error('Failed to load profile picture for header', error),
    });
  }
}
