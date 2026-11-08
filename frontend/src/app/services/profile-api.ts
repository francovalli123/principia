import { Injectable } from '@angular/core';
import { Observable, Subject, map, switchMap, tap } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Profile } from '../../models/user';

interface ProfileResponse {
    status: string;
    data: Profile;
}

@Injectable({
    providedIn: 'root'
})
export class ProfileApiService {
    private readonly profileUpdatedSubject = new Subject<Profile>();
    readonly profileUpdated$ = this.profileUpdatedSubject.asObservable();

    constructor(private api: BaseApiService) {}

    getProfile(): Observable<Profile> {
        return this.api.get<Profile | ProfileResponse>('users/profile/').pipe(
            map((response) => resolveProfilePicture(unwrapProfile(response), this.api.getUrl(''))),
        );
    }

    updateProfile(data: FormData | Partial<Profile>): Observable<Profile> {
        return this.api.patch<unknown>('users/profile/', data).pipe(
            switchMap(() => this.getProfile()),
            tap((profile) => {
                if (profile.profile_picture) {
                    profile.profile_picture = addCacheBuster(profile.profile_picture);
                }
            }),
            tap((profile) => this.profileUpdatedSubject.next(profile)),
        );
    }

    replaceProfile(data: any): Observable<Profile> {
        return this.api.put<Profile>('users/profile/', data);
    }

    getSimulationsByPhenomenon(phenomenonType: string): Observable<any> {
        return this.api.get<any>(
            `users/profile/?phenomenon_type=${encodeURIComponent(phenomenonType)}`
        );
    }
}

function unwrapProfile(response: Profile | ProfileResponse): Profile {
    return 'data' in response ? response.data : response;
}

function resolveProfilePicture(profile: Profile, apiUrl: string): Profile {
    if (!profile.profile_picture) return profile;

    return {
        ...profile,
        profile_picture: new URL(profile.profile_picture, apiUrl).href,
    };
}

function addCacheBuster(imageUrl: string): string {
    const [urlWithoutFragment, fragment] = imageUrl.split('#', 2);
    const separator = urlWithoutFragment.includes('?') ? '&' : '?';
    const cacheKey = `profile_updated=${Date.now()}`;
    return `${urlWithoutFragment}${separator}${cacheKey}${fragment ? `#${fragment}` : ''}`;
}