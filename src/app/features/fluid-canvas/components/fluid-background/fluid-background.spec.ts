import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FluidBackground } from './fluid-fluid-background';

describe('FluidBackground', () => {
  let component: FluidBackground;
  let fixture: ComponentFixture<FluidBackground>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FluidBackground]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FluidBackground);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
