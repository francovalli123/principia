import { AsyncPipe, DecimalPipe } from '@angular/common'; 
import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
export class MotorControl implements OnInit, AfterViewInit, OnDestroy {
  private static nextCanvasId = 0;

  @Input({ required: true }) simulation!: SimulationDescriptor; 
  @ViewChild('simulationCanvas')
  private readonly simulationCanvas!: ElementRef<HTMLCanvasElement>;
  readonly canvasId = `simulation-canvas-${MotorControl.nextCanvasId++}`;

  // Keeps an explicit loading state until engine initialization completes
  private readonly stateSubject = new BehaviorSubject<EngineState>({
    status: 'loading' 
  });

  readonly state$: Observable<EngineState> = this.stateSubject.asObservable(); 
  private configSubscription?: Subscription; 
  private controllerStateSubscription?: Subscription; 
  private controller?: SimController; // Holds the active engine controller
  private destroyed = false; 
  private validSimulation = false;
  controls: readonly EngineControl[] = []; // Holds controls defined by the selected adapter

  constructor(private readonly wasmSetup: WasmSetupService) {} // Injects the shared engine setup service

  ngOnInit(): void {
    console.info('MotorControl initialized with simulation:', {
      id: this.simulation?.id,
      phenomenon_type: this.simulation?.phenomenon_type,
    });
    if (
      !Number.isSafeInteger(this.simulation?.id) ||
      this.simulation.id <= 0 ||
      typeof this.simulation.phenomenon_type !== 'string' ||
      !this.simulation.phenomenon_type
    ) {
      const error = new Error('La simulación no tiene una configuración válida');
      console.error('MotorControl rejected simulation before requesting its configuration:', error);
      this.showError(error);
      return;
    }
    this.validSimulation = true;
  }

  // Starts loading after the canvas element is available to the WASM runtime.
  ngAfterViewInit(): void {
    if (!this.validSimulation) {
      console.warn('MotorControl skipped configuration request because the simulation is invalid.');
      return;
    }

    console.info(`MotorControl requesting configuration for simulation ID: ${this.simulation.id}`);
    this.configSubscription = this.wasmSetup
      .getConfig(this.simulation.id) // Fetches configuration using the simulation identifier.
      .subscribe({
      next: (response) => { // Passes the backend payload to the selected adapter
        void this.wasmSetup
        .loadEngine(this.simulation, response, this.simulationCanvas.nativeElement)
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
        .catch((error: unknown) => {
          console.error(`Failed to initialize engine for simulation ID: ${this.simulation.id}`, error);
          this.showError(error);
        }); 
      },
      error: (error: unknown) => {
        console.error(`Failed to retrieve configuration for simulation ID: ${this.simulation.id}`, error);
        this.showError(error);
      }
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

  activateSimulation(): void {
    (window as Window & { __principiaFocusedSimulationCanvasId?: string })
      .__principiaFocusedSimulationCanvasId = this.canvasId;
  }

  focusCanvas(): void {
    this.activateSimulation();
    this.simulationCanvas.nativeElement.focus({ preventScroll: true });
  }

  preventSpaceScroll(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
    }
  }

  @HostListener('document:keydown', ['$event'])
  preventPageScrollDuringPlayback(event: KeyboardEvent): void {
    const activeCanvasId =
      (window as Window & { __principiaFocusedSimulationCanvasId?: string })
        .__principiaFocusedSimulationCanvasId;
    if (
      activeCanvasId !== this.canvasId ||
      event.code !== 'Space' ||
      this.stateSubject.value.status !== 'running'
    ) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest('button, input, textarea, select, a, [role="button"]'))
    ) {
      return;
    }

    event.preventDefault();
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
