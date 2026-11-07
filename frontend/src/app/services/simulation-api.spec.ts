import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Simulation } from '../../models/simulation';
import { BaseApiService } from './base-api.service';
import { SimulationApiService, SimulationListResponse } from './simulation-api';

describe('SimulationApiService', () => {
  const api = { get: vi.fn() };
  let service: SimulationApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SimulationApiService(api as unknown as BaseApiService);
  });

  it('normalizes raw, wrapped, and paginated owner simulation lists', () => {
    const simulation = { id: 17, phenomenon_type: 'Oblique Projectile Motion' } as Simulation;
    const responses: SimulationListResponse[] = [
      [simulation],
      { data: [simulation] },
      { data: { results: [simulation] } },
      { results: [simulation] },
    ];

    for (const response of responses) {
      api.get.mockReturnValueOnce(of(response));
      let actual: Simulation[] | undefined;
      service.getByOwner(8).subscribe((simulations) => actual = simulations);
      expect(actual).toEqual([simulation]);
    }

    expect(api.get).toHaveBeenCalledWith('simulations/?owner_id=8');
  });
});