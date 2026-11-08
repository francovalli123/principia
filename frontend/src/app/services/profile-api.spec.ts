import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Profile } from '../../models/user';
import { BaseApiService } from './base-api.service';
import { ProfileApiService } from './profile-api';

describe('ProfileApiService', () => {
  const profile = {
    id: 2,
    user: 7,
    bio: null,
    visible_name: null,
    profile_picture: '/media/avatar.png',
    creation_date: '2026-01-01T00:00:00Z',
  } satisfies Profile;
  const api = {
    patch: vi.fn(() => of({ status: 'success' })),
    get: vi.fn(() => of({ status: 'success', data: profile })),
    getUrl: vi.fn(() => 'http://127.0.0.1:8000/api/'),
  };
  let service: ProfileApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProfileApiService(api as unknown as BaseApiService);
  });

  it('reloads the profile after a successful update and returns a fresh picture URL', () => {
    const formData = new FormData();
    formData.append('profile_picture', new Blob(['image'], { type: 'image/png' }), 'avatar.png');
    let actual: Profile | undefined;
    service.updateProfile(formData).subscribe((updatedProfile) => actual = updatedProfile);

    expect(api.patch).toHaveBeenCalledWith('users/profile/', formData);
    expect(api.get).toHaveBeenCalledWith('users/profile/');
    expect(actual?.profile_picture).toMatch(/^http:\/\/127\.0\.0\.1:8000\/media\/avatar\.png\?profile_updated=\d+$/);
    expect(actual?.bio).toBeNull();
  });
});
