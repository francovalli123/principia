import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Simulation } from '../../models/simulation';
import { BaseApiService } from './base-api.service';
import { SimulationApiService, SimulationFavourite, SimulationFavouriteListResponse, SimulationListResponse } from './simulation-api';

describe('SimulationApiService', () => {
  const api = { get: vi.fn(), patch: vi.fn(), delete: vi.fn() };
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

  it('unwraps the simulation associated with a publication', () => {
    const simulation = {
      id: 17,
      phenomenon_type: 'Oblique Projectile Motion',
    } as Simulation;
    api.get.mockReturnValueOnce(of({ status: 'success', data: simulation }));

    let actual: Simulation | undefined;
    service.getByPublication(9).subscribe((result) => actual = result);

    expect(api.get).toHaveBeenCalledWith('simulations/?publication_id=9');
    expect(actual).toEqual(simulation);
  });

  it('updates and deletes a simulation by its id', () => {
    const simulation = {
      id: 17,
      title: 'Updated',
      phenomenon_type: 'Oblique Projectile Motion',
      visibility: 'private',
    } as Simulation;
    const update = {
      title: 'Updated',
      visibility: 'private' as const,
      parameters: { initial_velocity: 20, angle: 45, initial_height: 1 },
    };
    api.patch.mockReturnValueOnce(of({ status: 'success', data: simulation }));
    api.delete.mockReturnValueOnce(of(undefined));

    let updated: Simulation | undefined;
    service.updateSimulation(17, update).subscribe((result) => updated = result);
    service.deleteSimulation(17).subscribe();

    expect(api.patch).toHaveBeenCalledWith('simulations/17/', update);
    expect(api.delete).toHaveBeenCalledWith('simulations/17/');
    expect(updated).toEqual(simulation);
  });

  it('normalizes raw, wrapped, and paginated favourite lists', () => {
    const favourite = { id: 2, simulation: 17, marked_date: '2026-11-01T10:00:00Z' };
    const responses: SimulationFavouriteListResponse[] = [
      [favourite],
      { data: [favourite] },
      { data: { results: [favourite] } },
      { results: [favourite] },
    ];

    for (const response of responses) {
      api.get.mockReturnValueOnce(of(response));
      let actual: SimulationFavourite[] = [];
      service.getFavourites().subscribe((favourites) => actual = favourites);
      expect(actual).toEqual([favourite]);
    }

    expect(api.get).toHaveBeenCalledWith('simulations/favourites/');
  });
});