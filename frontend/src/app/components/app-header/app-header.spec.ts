import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileApiService } from '../../services/profile-api';
import { AppHeader } from './app-header';

describe('AppHeader', () => {
  const profileApi = {
    profileUpdated$: EMPTY,
    getProfile: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    profileApi.getProfile.mockReturnValue(of({
      id: 8,
      user: 12,
      first_name: 'Ada',
      last_name: 'Lovelace',
      bio: null,
      visible_name: null,
      profile_picture: null,
      creation_date: '',
    }));

    await TestBed.configureTestingModule({
      imports: [AppHeader],
      providers: [
        { provide: ProfileApiService, useValue: profileApi },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('shows the current user initials when they have no profile picture', () => {
    const fixture = TestBed.createComponent(AppHeader);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.profile-avatar-fallback')?.textContent.trim(),
    ).toBe('AL');
    expect(fixture.nativeElement.querySelector('.profile-photo')).toBeNull();
  });
});
