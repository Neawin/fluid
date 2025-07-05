import { TestBed } from '@angular/core/testing';

import { CanvasManager } from './canvas-manager';

describe('CanvasManager', () => {
  let service: CanvasManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CanvasManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
