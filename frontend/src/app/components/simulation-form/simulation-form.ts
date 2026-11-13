import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Simulation } from '../../../models/simulation';
import { ApiResponse, SimulationApiService } from '../../services/simulation-api';
import { ActivatedRoute, Router } from '@angular/router';
import { TimeoutError, finalize, take, throwIfEmpty, timeout } from 'rxjs';
import {
  getSimulationFormAdapter,
  SimulationFormAdapter,
} from './simulation-form.adapter';
import { AppHeader } from '../app-header/app-header';

@Component({
  imports: [ReactiveFormsModule, AppHeader],
  selector: 'app-simulation-form',
  styleUrl: './simulation-form.css',
  templateUrl: './simulation-form.html',
})
export class SimulationForm implements OnInit {
  @Output() readonly simulationCreated = new EventEmitter<Simulation>();

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
    }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    phenomenonType: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    visibility: new FormControl<'public' | 'hidden' | 'private'>('public', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    allowCloning: new FormControl(true, { nonNullable: true }),
  });
  parametersForm = new FormGroup<Record<string, FormControl<number>>>({});

  phenomena: string[] = [];
  selectedAdapter?: SimulationFormAdapter;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  isSuccessModalOpen = false;
  createdSimulation?: Simulation;

  get parameterCombinationError(): string {
    if (this.selectedAdapter?.phenomenonType !== 'Oblique Projectile Motion') {
      return '';
    }

    const { angle, initial_height } = this.parametersForm.getRawValue();
    return initial_height === 0 && angle < 15
      ? 'Con altura inicial de 0 m, el ángulo de lanzamiento debe ser de al menos 15°.'
      : '';
  }

  constructor(
    private readonly simulationApi: SimulationApiService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
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
    if (
      !adapter ||
      this.form.invalid ||
      this.parametersForm.invalid ||
      this.isSubmitting ||
      this.parameterCombinationError
    ) {
      this.form.markAllAsTouched();
      this.parametersForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const parameters = adapter.toParameters(this.parametersForm.getRawValue());
    const formValue = this.form.getRawValue();

    this.simulationApi
      .createSimulation(
        formValue.title.trim(),
        formValue.description.trim(),
        adapter.phenomenonType,
        formValue.visibility,
        formValue.allowCloning,
        parameters,
      )
      .pipe(
        timeout(15000),
        take(1),
        throwIfEmpty(() => new Error('La solicitud terminó sin devolver la simulación creada.')),
        finalize(() => {
          this.isSubmitting = false;
          this.changeDetector.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          const simulation = response && 'data' in response ? response.data : response;
          if (!simulation || !Number.isSafeInteger(simulation.id)) {
            this.errorMessage = 'El servidor confirmó la solicitud, pero no devolvió un identificador de simulación válido.';
            this.changeDetector.detectChanges();
            return;
          }
          this.isSubmitting = false;
          this.successMessage = 'Simulación creada correctamente.';
          this.createdSimulation = simulation;
          this.isSuccessModalOpen = true;
          this.changeDetector.detectChanges();
          this.simulationCreated.emit(simulation);
        },
        error: (error: unknown) => {
          console.error('Failed to create simulation', error);
          this.errorMessage = error instanceof TimeoutError
            ? 'El servidor guardó la solicitud pero no respondió a tiempo. Revisá tus simulaciones antes de volver a crearla.'
            : error instanceof Error && error.message === 'La solicitud terminó sin devolver la simulación creada.'
              ? error.message
              : 'No pudimos crear la simulación. Revisá los valores e intentá nuevamente.';
          this.changeDetector.detectChanges();
        },
      });
  }

  cancel(): void {
    const forumId = this.forumPublicationForumId();
    if (forumId !== null) {
      if (this.route.snapshot.queryParamMap.get('returnPage') === 'choice') {
        void this.router.navigate(['/forums', forumId, 'publications', 'crear']);
      } else {
        void this.router.navigate(['/forums', forumId, 'publications', 'crear', 'seleccionar']);
      }
      return;
    }
    void this.router.navigateByUrl('/inicio');
  }

  get isCreatingForForumPublication(): boolean {
    return this.forumPublicationForumId() !== null;
  }

  get successPrimaryLabel(): string {
    return this.isCreatingForForumPublication ? 'Crear publicación' : 'Ir al inicio';
  }

  closeSuccessModal(): void {
    this.isSuccessModalOpen = false;
  }

  goToSuccessPrimaryAction(): void {
    const forumId = this.forumPublicationForumId();
    this.closeSuccessModal();
    if (forumId !== null) {
      void this.router.navigate(
        ['/forums', forumId, 'publications', 'crear', this.createdSimulation?.id],
        { queryParams: { simulationTitle: this.createdSimulation?.title } },
      );
    } else {
      void this.router.navigateByUrl('/inicio');
    }
  }

  goToMySimulations(): void {
    const forumId = this.forumPublicationForumId();
    this.closeSuccessModal();
    if (forumId !== null) {
      void this.router.navigate(['/forums', forumId, 'publications', 'crear', 'seleccionar'], {
        queryParams: { createdSimulation: this.createdSimulation?.id },
      });
    } else {
      void this.router.navigateByUrl('/simulaciones/mis');
    }
  }

  private forumPublicationForumId(): number | null {
    if (this.route.snapshot.queryParamMap.get('returnTo') !== 'forum-publication') return null;
    const forumId = Number(this.route.snapshot.queryParamMap.get('forumId'));
    return Number.isSafeInteger(forumId) && forumId > 0 ? forumId : null;
  }

  get selectedVisibility(): 'public' | 'hidden' | 'private' {
    return this.form.controls.visibility.value;
  }

  get visibilityDescription(): string {
    switch (this.selectedVisibility) {
      case 'private':
        return 'Solo vos podés ver esta simulación. No aparecerá en tu perfil público.';
      case 'hidden':
        return 'No aparecerá en búsquedas ni en el foro.';
      default:
        return 'Será visible en tu perfil y podrá aparecer en el foro.';
    }
  }
}
