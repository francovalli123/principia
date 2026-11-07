import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Simulation } from '../../../models/simulation';
import { ApiResponse, SimulationApiService } from '../../services/simulation-api';
import {Router} from "@angular/router";
import {
  getSimulationFormAdapter,
  SimulationFormAdapter,
} from './simulation-form.adapter';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-simulation-form',
  styleUrl: './simulation-form.css',
  templateUrl: './simulation-form.html',
})
export class SimulationForm implements OnInit {
  @Output() readonly simulationCreated = new EventEmitter<Simulation>();

  readonly form = new FormGroup({
    phenomenonType: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    visibility: new FormControl<'public' | 'hidden' | 'private'>('public', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  parametersForm = new FormGroup<Record<string, FormControl<number>>>({});

  phenomena: string[] = [];
  selectedAdapter?: SimulationFormAdapter;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly simulationApi: SimulationApiService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.simulationApi.getPhenomena().subscribe({
      next: (response: ApiResponse<string[]> | string[]) => {
        this.phenomena = Array.isArray(response) ? response : response.data ?? [];
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'No pudimos cargar los fenómenos disponibles.';
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  selectPhenomenon(phenomenonType: string): void {
    this.form.controls.phenomenonType.setValue(phenomenonType);
    this.selectedAdapter = getSimulationFormAdapter(phenomenonType);
    this.parametersForm = new FormGroup<Record<string, FormControl<number>>>({});
    this.errorMessage = '';
    this.successMessage = '';

    for (const field of this.selectedAdapter?.fields ?? []) {
      const validators = [Validators.required, Validators.min(field.min)];
      if (field.max !== undefined) validators.push(Validators.max(field.max));
      this.parametersForm.addControl(
        field.name,
        new FormControl(field.defaultValue, {
          nonNullable: true,
          validators,
        }),
      );
    }
  }

  submit(): void {
    const adapter = this.selectedAdapter;
    if (!adapter || this.form.invalid || this.parametersForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const parameters = adapter.toParameters(this.parametersForm.getRawValue());

    this.simulationApi
      .createSimulation(
        adapter.phenomenonType,
        this.form.controls.visibility.value,
        parameters,
      )
      .subscribe({
        next: (response: ApiResponse<Simulation>) => {
          this.simulationCreated.emit(response.data);
          this.successMessage = 'Simulación creada correctamente.';
          this.isSubmitting = false;
          this.form.reset({ phenomenonType: '', visibility: 'public' });
          this.router.navigateByUrl('/inicio');
        },
        error: () => {
          this.errorMessage = 'No pudimos crear la simulación. Revisá los valores e intentá nuevamente.';
          this.isSubmitting = false;
          this.form.reset({ phenomenonType: '', visibility: 'public' });
        },
      });
  }
}
