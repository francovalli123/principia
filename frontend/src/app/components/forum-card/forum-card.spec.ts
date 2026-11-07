import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForumApiService } from '../../services/forum-api';
import { ToastService } from '../../services/toast';
import { ForumCardComponent, type ForumCardData } from './forum-card';

describe('ForumCardComponent', () => {
  let fixture: ComponentFixture<ForumCardComponent>;
  const forumApi = {
    joinForum: vi.fn(() => of({})),
    leaveForum: vi.fn(() => of({})),
  };
  const router = { navigate: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  const forum: ForumCardData = {
    id: 7,
    name: 'Physics',
    member_count: 3,
    is_member: false,
    is_owner: false,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ForumCardComponent],
      providers: [
        { provide: ForumApiService, useValue: forumApi },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForumCardComponent);
    fixture.componentRef.setInput('forum', forum);
    fixture.detectChanges();
  });

  it('does not join on initialization or when opening a forum', () => {
    fixture.nativeElement.querySelector('.open-mark').click();

    expect(forumApi.joinForum).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/forums', 7]);
  });

  it('joins only after the user activates the membership control', () => {
    fixture.nativeElement.querySelector('.membership-mark').click();

    expect(forumApi.joinForum).toHaveBeenCalledWith(7);
    expect(toast.success).toHaveBeenCalledWith('Ahora sos miembro de Physics.');
  });

  it('offers leave in the three-dot menu and confirms the action', () => {
    fixture.componentRef.setInput('forum', { ...forum, is_member: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.forum-card .membership-mark')).toBeNull();

    const menuTrigger = fixture.nativeElement.querySelector('.actions-menu-trigger') as HTMLButtonElement;
    menuTrigger.click();
    fixture.detectChanges();

    expect(forumApi.leaveForum).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Salir del foro');

    const leaveButton = fixture.nativeElement.querySelector('[role="menuitem"]') as HTMLButtonElement;
    leaveButton.click();

    expect(forumApi.leaveForum).toHaveBeenCalledWith(7);
    expect(toast.success).toHaveBeenCalledWith('Dejaste de ser miembro de Physics.');
  });

  it('shows an owner label and hides leave actions for the owner', () => {
    fixture.componentRef.setInput('forum', { ...forum, is_member: true, is_owner: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Propietario');
    expect(fixture.nativeElement.querySelector('.actions-menu-trigger')).toBeNull();
  });

  it('does not show an owner label for a non-owner', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Propietario');
  });

  it('closes the actions menu with Escape and an outside click', () => {
    fixture.componentRef.setInput('forum', { ...forum, is_member: true });
    fixture.detectChanges();
    const menuTrigger = fixture.nativeElement.querySelector('.actions-menu-trigger') as HTMLButtonElement;
    menuTrigger.click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();

    menuTrigger.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
  });
});
