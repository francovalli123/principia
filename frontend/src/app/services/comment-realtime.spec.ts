import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseApiService } from './base-api.service';
import { CommentApiService } from './comment-api';
import { CommentRealtimeService } from './comment-realtime';

describe('CommentRealtimeService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a one-use ticket subprotocol and dispatches comment events', () => {
    class FakeWebSocket {
      static latest: FakeWebSocket;
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      close = vi.fn();

      constructor(readonly url: string, readonly protocols: string[]) {
        FakeWebSocket.latest = this;
      }
    }
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const api = { getWebSocketUrl: vi.fn(() => 'ws://localhost/ws/forums/23/events/') };
    const commentApi = { getSocketTicket: vi.fn(() => of({ ticket: 'one-use-ticket' })) };
    const service = new CommentRealtimeService(
      api as unknown as BaseApiService,
      commentApi as unknown as CommentApiService,
    );
    const onEvent = vi.fn();

    const disconnect = service.connect(23, onEvent);
    const socket = FakeWebSocket.latest;
    socket.onmessage?.({
      data: JSON.stringify({
        type: 'comment.created',
        comment: { id: 8, publication: 19, content: 'Hola', owner: 3, creation_date: '' },
      }),
    } as MessageEvent<string>);

    expect(api.getWebSocketUrl).toHaveBeenCalledWith('/ws/forums/23/events/');
    expect(socket.protocols).toEqual(['principia.comments.v1', 'ticket.one-use-ticket']);
    expect(onEvent).toHaveBeenCalledWith({
      type: 'comment.created',
      comment: { id: 8, publication: 19, content: 'Hola', owner: 3, creation_date: '' },
    });

    const publication = {
      id: 19,
      title: 'Nueva publicación',
      description: '',
      simulation: 7,
      owner: 3,
      forum: 23,
      creation_date: '',
    };
    socket.onmessage?.({
      data: JSON.stringify({ type: 'publication.created', publication }),
    } as MessageEvent<string>);
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'publication.created', publication });

    socket.onmessage?.({
      data: JSON.stringify({ type: 'publication.deleted', publication_id: 19 }),
    } as MessageEvent<string>);
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'publication.deleted', publication_id: 19 });

    disconnect();
    expect(socket.close).toHaveBeenCalledWith(1000, 'Forum feed closed');
  });

  it('ignores malformed comment events', () => {
    class FakeWebSocket {
      static latest: FakeWebSocket;
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      close = vi.fn();

      constructor() {
        FakeWebSocket.latest = this;
      }
    }
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const service = new CommentRealtimeService(
      { getWebSocketUrl: () => 'ws://localhost/ws/' } as unknown as BaseApiService,
      { getSocketTicket: () => of({ ticket: 'ticket' }) } as unknown as CommentApiService,
    );
    const onEvent = vi.fn();

    const disconnect = service.connect(23, onEvent);
    FakeWebSocket.latest.onmessage?.({ data: '{"type":"comment.created"}' } as MessageEvent<string>);

    expect(onEvent).not.toHaveBeenCalled();
    disconnect();
  });
});