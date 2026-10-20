import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { User } from '../../models/user';
import { BaseApiService } from './base-api.service';

interface UserResponse {
  status: string;
  data: User;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  constructor(private readonly api: BaseApiService) {}

  getCurrentUser(): Observable<User> {
    return this.api.get<UserResponse>('users/me/').pipe(map((response) => response.data));
  }
}
