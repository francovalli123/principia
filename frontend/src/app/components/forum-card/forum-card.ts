import { Component, Input } from '@angular/core';
import {Router} from "@angular/router";
import {ForumApiService} from "../../services/forum-api";
export interface ForumCardData {
  id: number;
  name: string;
  member_count: number;
  latestPost?: string;
  isNew?: boolean;
}

@Component({
  selector: 'app-forum-card',
  standalone: true,
  templateUrl: './forum-card.html',
  styleUrl: './forum-card.css',
})
export class ForumCardComponent {
  @Input({ required: true }) forum!: ForumCardData;
  @Input() variant: 'active' | 'suggested' = 'active';
  constructor(
    private readonly router: Router,
    private readonly forumApi: ForumApiService
  ) {}

  openForum(): void {
    void this.router.navigate(['/forums', this.forum.id]);
    this.forumApi.joinForum(this.forum.id).subscribe({
      next: () => {
        console.log(`Joined forum with ID: ${this.forum.id}`);
      },
      error: (error) => {
        console.error(`Failed to join forum with ID: ${this.forum.id}`, error);
      }
    });
  }
}