import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast';

describe('ToastService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a toast in the DOM state while it animates out', () => {
    vi.useFakeTimers();
    const service = new ToastService();
    service.success('Listo');
    const id = service.messages()[0].id;

    service.dismiss(id);
    expect(service.messages()).toEqual([
      { id, message: 'Listo', type: 'success', exiting: true },
    ]);

    vi.advanceTimersByTime(220);
    expect(service.messages()).toEqual([]);
  });
});
