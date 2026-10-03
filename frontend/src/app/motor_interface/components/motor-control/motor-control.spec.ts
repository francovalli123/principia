import { ComponentFixture, TestBed } from '@angular/core/testing'; 
import { of } from 'rxjs'; 
import { beforeEach, describe, expect, it } from 'vitest'; 
import { MotorControl } from './motor-control'; 
import { WasmSetupService } from '../../services/wasmSetUp'; 
import { SimulationEngine } from '../../services/wasm.types'; 

// Groups tests for the motor control component.
describe('MotorControl', () => { 
  let component: MotorControl; 
  let fixture: ComponentFixture<MotorControl>; 
  const engine: SimulationEngine = { 
    controls: [ 
      {
        id: 'pause', // Gives the test control a stable command identifier.
        label: 'Reanudar', // Sets the paused-state button text.
        labelWhenRunning: 'Pausar', // Sets the running-state button text.
        disabledWhenCompleted: true // Specifies completion behavior for this control.
      }
    ],
    // Returns a sample generic engine snapshot.
    readSnapshot: () => ({
      status: 'paused', 
      metrics: [ 
        { id: 'time', label: 'Tiempo', value: 1.25, unit: 's' }, 
        {
          id: 'horizontal-position', 
          label: 'Posición horizontal', 
          value: 8.5, 
          unit: 'm' 
        }
      ]
    }),
    execute: vi.fn(), // Records commands sent by the component if needed.
    destroy: vi.fn() // Records lifecycle cleanup if needed.
  };
  const setup = { // Mocks the setup service and its asynchronous engine loading.
    getConfig: vi.fn(() => // Records the requested simulation identifier.
      of({
        status: 'success' as const, // Mimics the backend's success envelope.
        data: { initial_velocity: 10, angle: 45, initial_height: 2 } // Supplies projectile config for adapter loading.
      })
    ),
    loadEngine: vi.fn(async () => engine) // Resolves the fake generic engine.
  };

  beforeEach(async () => { // Creates a fresh Angular testing module before each test.
    await TestBed.configureTestingModule({ // Registers the component and service mock.
      imports: [MotorControl], // Imports the standalone component.
      providers: [{ provide: WasmSetupService, useValue: setup }], // Replaces HTTP/WASM setup with the test double.
    }).compileComponents(); // Compiles the component template and metadata.

    fixture = TestBed.createComponent(MotorControl); 
    fixture.componentRef.setInput('simulation', { 
      id: 7, 
      phenomenon_type: 'Oblique Projectile Motion'
    });
    component = fixture.componentInstance; 
    fixture.detectChanges(); 
    await fixture.whenStable(); 
    fixture.detectChanges();
  });

  it('should create', () => { // Confirms the component can be instantiated.
    expect(component).toBeTruthy(); // Asserts Angular produced a component instance.
  });

  // Verifies generic snapshot rendering and service integration.
  it('displays the parsed engine state and results', () => { 
    expect(fixture.nativeElement.textContent).toContain('Pausada'); 
    expect(fixture.nativeElement.textContent).toContain('1.25 s'); 
    expect(fixture.nativeElement.textContent).toContain('8.5 m'); 
    expect(setup.getConfig).toHaveBeenCalledWith(7); 
    expect(setup.loadEngine).toHaveBeenCalledWith( 
      { id: 7, phenomenon_type: 'Oblique Projectile Motion' }, 
      expect.objectContaining({ status: 'success' }) 
    );
  });
});
