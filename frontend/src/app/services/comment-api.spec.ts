import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseApiService } from './base-api.service';
import { CommentApiService } from './comment-api';

describe('CommentApiService', () => {
  const api = { post: vi.fn() };
  let service: CommentApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommentApiService(api as unknown as BaseApiService);
  });

  it('unwraps the created comment response envelope', () => {
    const comment = {
      id: 8,
      publication: 7,
      content: 'A new comment',
      creation_date: '2026-10-21T12:00:00Z',
      owner: {
        id: 12,
        username: 'test-user',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      },
    };
    api.post.mockReturnValueOnce(of({ status: 'success', data: comment }));

    let result: unknown;
    service.createComment(7, 'A new comment').subscribe((response) => result = response);

    expect(api.post).toHaveBeenCalledWith('comments/', {
      publication: 7,
      content: 'A new comment',
    });
    expect(result).toEqual(comment);
  });
});
