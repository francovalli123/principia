import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ForumApiService } from '../../services/forum-api';
import { UserApiService } from '../../services/user-api';
import { ForumCardData } from '../forum-card/forum-card';
import { PrincipiaHome } from './principia-home';

describe('PrincipiaHome', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('searches forums outside the initial lists and separates memberships', async () => {
    vi.useFakeTimers();
    const memberForum: ForumCardData = {
      id: 21,
      name: 'Astronomy members',
      member_count: 2,
      is_member: true,
      is_owner: false,
    };
    const availableForum: ForumCardData = {
      id: 22,
      name: 'Astronomy group',
      member_count: 1,
      is_member: false,
      is_owner: false,
    };
    const forumApi = {
      getSuggestedForums: vi.fn(() => of({
        status: 'success',
        data: { results: [], total_other_forums: 0 },
      })),
      getMyForums: vi.fn(() => of([])),
      searchForums: vi.fn(() => of([memberForum, availableForum])),
    };
    const userApi = {
      getCurrentUser: vi.fn(() => of({ id: 1, first_name: 'Ada' })),
    };

    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(() =>
      new PrincipiaHome(
        forumApi as unknown as ForumApiService,
        userApi as unknown as UserApiService,
      ),
    );
    component.ngOnInit();
    component.searchForums('astronomy');
    await vi.advanceTimersByTimeAsync(250);

    expect(forumApi.searchForums).toHaveBeenCalledWith('astronomy');
    expect(component.visibleMyForums).toEqual([memberForum]);
    expect(component.visibleSuggestedForums).toEqual([availableForum]);
  });
});
