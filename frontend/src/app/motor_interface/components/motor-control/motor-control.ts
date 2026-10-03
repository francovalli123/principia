import { AsyncPipe, DecimalPipe } from '@angular/common'; 
import { Component, Input, OnDestroy, OnInit } from '@angular/core'; 
import { BehaviorSubject, Observable, Subscription } from 'rxjs'; // Manages state publication and HTTP subscriptions
import { SimController } from '../../services/simulation-engine.controller'; 
import { WasmSetupService } from '../../services/wasmSetUp'; 
import {
  EngineControl, 
  EngineState, 
  EngineStatus, 
  SimulationDescriptor
} from '../../services/wasm.types'; // Imports shared engine contracts

@Component({
  imports: [AsyncPipe, DecimalPipe], // Makes the template pipes available to this standalone component
  selector: 'app-motor-control', 
  styleUrl: './motor-control.css', 
  templateUrl: './motor-control.html', 
})

// Loads an engine and renders its generic state
export class MotorControl implements OnInit, OnDestroy { 
  @Input({ required: true }) simulation!: SimulationDescriptor; 

  // Keeps an explicit loading state until engine initialization completes
  private readonly stateSubject = new BehaviorSubject<EngineState>({
    status: 'loading' 
  });

  readonly state$: Observable<EngineState> = this.stateSubject.asObservable(); 
  private configSubscription?: Subscription; 
  private controllerStateSubscription?: Subscription; 
  private controller?: SimController; // Holds the active engine controller
  private destroyed = false; 
  controls: readonly EngineControl[] = []; // Holds controls defined by the selected adapter

  constructor(private readonly wasmSetup: WasmSetupService) {} // Injects the shared engine setup service

  // Starts loading configuration when Angular initializes the component
  ngOnInit(): void { 
    this.configSubscription = this.wasmSetup
      .getConfig(this.simulation.id) // Fetches configuration using the simulation identifier.
      .subscribe({
      next: (response) => { // Passes the backend payload to the selected adapter
        void this.wasmSetup
        .loadEngine(this.simulation, response) 
        .then((engine) => { 
          const controller = new SimController(engine); 
          if (this.destroyed) {
            controller.destroy(); 
            return; 
          }

          this.controller = controller; 
          this.controls = controller.controls; // Renders the adapter's supported controls
          this.controllerStateSubscription = controller.state$.subscribe(
            (state) => this.stateSubject.next(state) // Forwards engine updates to the template
          );
        })
        .catch((error: unknown) => this.showError(error)); 
      },
      error: (error: unknown) => this.showError(error) 
      });
  }

  // Stops requests, state updates, and engine activity on removal.
  ngOnDestroy(): void { 
    this.destroyed = true; 
    this.configSubscription?.unsubscribe(); // Cancels the backend subscription if still active.
    this.controllerStateSubscription?.unsubscribe(); 
    this.controller?.destroy(); 
    this.stateSubject.complete(); // Notifies any remaining observers that the component is gone.
  }

  // Sends a rendered control action to the controller
  executeControl(controlId: string): void { 
    this.controller?.execute(controlId); 
  }

  // Converts stable status codes to localized labels
  statusLabel(status: EngineStatus): string { 
    return {
      paused: 'Pausada', 
      running: 'En ejecución', 
      completed: 'Finalizada' 
    }[status]; // Returns the label matching the current status.
  }

  // Chooses the context-sensitive control label
  controlLabel(control: EngineControl, status: EngineStatus): string {
    return status === 'running' && control.labelWhenRunning
      ? control.labelWhenRunning // Uses the optional running-state label when provided
      : control.label; 
  }
  
  // Chooses the context-sensitive control label.
  private showError(error: unknown): void {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to load the simulation state';
    this.stateSubject.next({ status: 'error', message }); 
  }
}
