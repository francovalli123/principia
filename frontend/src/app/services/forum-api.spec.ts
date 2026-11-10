import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseApiService } from './base-api.service';
import { ForumApiService } from './forum-api';

describe('ForumApiService', () => {
  const api = { get: vi.fn() };
  let service: ForumApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ForumApiService(api as unknown as BaseApiService);
  });

  it('returns the members from the paginated response', () => {
    const members = [
      { id: 12, username: 'owner', first_name: '', last_name: '' },
    ];
    api.get.mockReturnValueOnce(of({
      status: 'success',
      data: { count: 1, next: null, previous: null, results: members },
    }));

    let result: unknown;
    service.getMembers(23).subscribe((response) => result = response);

    expect(api.get).toHaveBeenCalledWith('forums/23/members/');
    expect(result).toEqual(members);
  });
});