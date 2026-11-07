import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
  exiting?: boolean;
}

const TOAST_EXIT_DURATION = 220;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  private nextId = 0;
  private readonly dismissingIds = new Set<number>();

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  dismiss(id: number): void {
    if (this.dismissingIds.has(id)) return;

    let found = false;
    this.messages.update((messages) => messages.map((message) => {
      if (message.id !== id) return message;
      found = true;
      return { ...message, exiting: true };
    }));

    if (!found) return;
    this.dismissingIds.add(id);
    setTimeout(() => {
      this.messages.update((messages) => messages.filter((message) => message.id !== id));
      this.dismissingIds.delete(id);
    }, TOAST_EXIT_DURATION);
  }

  private show(message: string, type: ToastMessage['type']): void {
    const id = this.nextId++;
    this.messages.update((messages) => [...messages, { id, message, type }]);
    setTimeout(() => this.dismiss(id), 4000);
  }
}
