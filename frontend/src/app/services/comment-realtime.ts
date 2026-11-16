import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Comment } from '../../models/comment';
import { Publication } from '../../models/publication';
import { BaseApiService } from './base-api.service';
import { CommentApiService } from './comment-api';

export type CommentRealtimeEvent =
  | { type: 'comment.created'; comment: Comment }
  | { type: 'comment.deleted'; id: number; publication: number }
  | { type: 'publication.created'; publication: Publication }
  | { type: 'publication.deleted'; publication_id: number };

@Injectable({ providedIn: 'root' })
export class CommentRealtimeService {
  constructor(
    private readonly api: BaseApiService,
    private readonly commentApi: CommentApiService,
  ) {}

  connect(forumId: number, onEvent: (event: CommentRealtimeEvent) => void): () => void {
    let disposed = false;
    let socket: WebSocket | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let ticketRequest: Subscription | undefined;
    let retryDelay = 1000;

    const scheduleReconnect = (): void => {
      if (disposed || retryTimer !== undefined) return;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        openConnection();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 10000);
    };

    const openConnection = (): void => {
      if (disposed || typeof WebSocket === 'undefined') return;

      ticketRequest = this.commentApi.getSocketTicket().subscribe({
        next: ({ ticket }) => {
          if (disposed) return;
          const connection = new WebSocket(
            this.api.getWebSocketUrl(`/ws/forums/${forumId}/events/`),
            ['principia.comments.v1', `ticket.${ticket}`],
          );
          socket = connection;
          connection.onopen = () => {
            retryDelay = 1000;
          };
          connection.onmessage = ({ data }: MessageEvent<string>) => {
            try {
              const event: unknown = JSON.parse(data);
              if (isForumRealtimeEvent(event)) onEvent(event);
            } catch (error) {
              console.error('Received an invalid comment event', error);
            }
          };
          connection.onerror = () => connection.close();
          connection.onclose = () => {
            if (socket === connection) socket = undefined;
            scheduleReconnect();
          };
        },
        error: (error: unknown) => {
          console.error('Could not obtain a comment WebSocket ticket', error);
          scheduleReconnect();
        },
      });
    };

    openConnection();

    return () => {
      disposed = true;
      ticketRequest?.unsubscribe();
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      socket?.close(1000, 'Forum feed closed');
    };
  }
}

function isForumRealtimeEvent(value: unknown): value is CommentRealtimeEvent {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  const event = value as Record<string, unknown>;
  if (event['type'] === 'comment.created') {
    const comment = event['comment'];
    return typeof comment === 'object' && comment !== null
      && 'id' in comment && typeof comment.id === 'number'
      && 'publication' in comment && typeof comment.publication === 'number';
  }
  if (event['type'] === 'comment.deleted') {
    return typeof event['id'] === 'number'
      && typeof event['publication'] === 'number';
  }
  if (event['type'] === 'publication.created') {
    const publication = event['publication'];
    return typeof publication === 'object' && publication !== null
      && 'id' in publication && typeof publication.id === 'number'
      && 'forum' in publication && typeof publication.forum === 'number';
  }
  return event['type'] === 'publication.deleted'
    && typeof event['publication_id'] === 'number';
}