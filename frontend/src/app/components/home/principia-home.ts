import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import type { Forum } from '../../../models/forum';
import { ForumApiService } from '../../services/forum-api';

interface ForumCard extends Pick<Forum, 'name' | 'member_count'> {
  latestPost?: string;
  isNew?: boolean;
}

@Component({
  selector: 'app-principia-home',
  imports: [FormsModule, RouterLink],
  templateUrl: './principia-home.html',
  styleUrl: './principia-home.css',
})
export class PrincipiaHome {
  searchTerm = '';

  myForums: ForumCard[] = [];
  ngOnInit(): void {
     this.forumApi.getMyForums().subscribe({
    next: (forums) => {
      this.myForums = forums;
    },
    error: (error) => {
      console.error('Error loading forums', error);
    }
  });
    
  }

  readonly suggestedForums: ForumCard[] = [
    { name: 'Electromagnetismo', member_count: 740, latestPost: 'Santiago Díaz' },
    { name: 'Óptica y Ondas', member_count: 685, latestPost: 'Camila Romero' },
    { name: 'Termodinámica', member_count: 530, latestPost: 'Julieta Silva' },
  ];

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly forumApi: ForumApiService
  ) {}

  get visibleMyForums(): ForumCard[] {
    return this.filterForums(this.myForums);
  }

  get visibleSuggestedForums(): ForumCard[] {
    return this.filterForums(this.suggestedForums);
  }

  logout(): void {
    this.auth.clearTokens();
    void this.router.navigate(['/']);
  }

  private filterForums(forums: ForumCard[]): ForumCard[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    return query
      ? forums.filter((forum) => forum.name.toLocaleLowerCase().includes(query))
      : forums;
  }
}
