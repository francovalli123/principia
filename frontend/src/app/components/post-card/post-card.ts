import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Comment } from '../../../models/comment';
import { Publication } from '../../../models/publication';
import { MotorControl } from '../../motor_interface/components/motor-control/motor-control';

@Component({
  imports: [DatePipe, MotorControl],
  selector: 'app-post-card',
  standalone: true,
  styleUrl: './post-card.css',
  templateUrl: './post-card.html',
})
export class PostCard {
  @Input({ required: true }) publication!: Publication;
  @Input() comments: Comment[] = [];
}
