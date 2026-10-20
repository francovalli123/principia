import { Component, Input } from '@angular/core';

export interface ForumCardData {
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
}