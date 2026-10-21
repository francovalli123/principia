import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ForumApiService } from '../../services/forum-api';
import { UserApiService } from '../../services/user-api';
import { ForumCardComponent, type ForumCardData } from '../forum-card/forum-card';

@Component({
  selector: 'app-principia-home',
  imports: [FormsModule, RouterLink, ForumCardComponent],
  templateUrl: './principia-home.html',
  styleUrl: './principia-home.css',
})
export class PrincipiaHome {
  searchTerm = '';
  firstName = '';
  //Signal is a reactive primitive in Angular
  // that allows you to create reactive state variables. It enables components
  //  to automatically update when the value of the signal changes, allowing in this case
  //  to automatically update the list of my forums, when the get request is completed and 
  //  the myForums signal is updated with the new data.
  myForums = signal<ForumCardData[]>([]);
  suggestedForums = signal<ForumCardData[]>([]);
  totalOtherForums = signal(0);
  suggestedForumsLoading = signal(true);
  suggestedForumsError = signal(false);
  ngOnInit(): void {
    this.userApi.getCurrentUser().subscribe({
      next: (user) => {
        this.firstName = typeof user?.first_name === 'string' ? user.first_name.trim() : '';
      },
      error: (error) => {
        console.error('Error loading current user', error);
      },
    });

    this.forumApi.getSuggestedForums().subscribe({
      next: (response) => {
        this.suggestedForums.set(response.data.results);
        this.totalOtherForums.set(response.data.total_other_forums);
        this.suggestedForumsLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading suggested forums', error);
        this.suggestedForumsError.set(true);
        this.suggestedForumsLoading.set(false);
      },
    });

     this.forumApi.getMyForums().subscribe({
    next: (forums) => {
      // console.log('FOROS RECIBIDOS:', forums);
      this.myForums.set(forums);
      // console.log('MY FORUMS:', this.myForums);
    },
    error: (error) => {
      console.error('Error loading forums', error);
    }
  });
    
  }

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly forumApi: ForumApiService,
    private readonly userApi: UserApiService,
  ) {}

  get visibleMyForums(): ForumCardData[] {
    return this.filterForums(this.myForums());
  }

  get visibleSuggestedForums(): ForumCardData[] {
    return this.filterForums(this.suggestedForums());
  }

  logout(): void {
    this.auth.clearTokens();
    void this.router.navigate(['/']);
  }

  private filterForums(forums: ForumCardData[]): ForumCardData[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    return query
      ? forums.filter((forum) => forum.name.toLocaleLowerCase().includes(query))
      : forums;
  }
}
