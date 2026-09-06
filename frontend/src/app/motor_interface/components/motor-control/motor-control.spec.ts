import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MotorControl } from './motor-control';

describe('MotorControl', () => {
  let component: MotorControl;
  let fixture: ComponentFixture<MotorControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotorControl],
    }).compileComponents();

    fixture = TestBed.createComponent(MotorControl);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
