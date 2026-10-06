import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  it('presents the product and public sign-in and sign-up links', async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Entendé la física.');
    expect(element.querySelector('a[routerLink="/login"]')).not.toBeNull();
    expect(element.querySelector('a[routerLink="/registro"]')).not.toBeNull();
    expect(element.querySelector('#beneficios')).not.toBeNull();
    expect(element.querySelector('#preguntas')).not.toBeNull();
  });

  it('aligns the projectile annotations with the trajectory and axes', async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.trajectory-path')?.getAttribute('d')).toBe(
      'M58 260 Q260 -100 462 260',
    );
    expect(element.querySelector('.point-peak')?.getAttribute('cx')).toBe('260');
    expect(element.querySelector('.point-peak')?.getAttribute('cy')).toBe('80');

    const vector = element.querySelector('.vector');
    expect(vector?.getAttribute('x1')).toBe('58');
    expect(vector?.getAttribute('y1')).toBe('260');

    const horizontalAxis = element.querySelector('.trajectory-axis');
    expect(element.querySelector('.axis-label')?.getAttribute('x')).toBe('484');
    expect(horizontalAxis?.getAttribute('x2')).toBe('480');
  });
});
