import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FluidCanvas } from './fluid-canvas';

describe('FluidCanvas', () => {
  let component: FluidCanvas;
  let fixture: ComponentFixture<FluidCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FluidCanvas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FluidCanvas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
