import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForumFeed } from './forum-feed';

describe('ForumFeed', () => {
  let component: ForumFeed;
  let fixture: ComponentFixture<ForumFeed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForumFeed],
    }).compileComponents();

    fixture = TestBed.createComponent(ForumFeed);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
