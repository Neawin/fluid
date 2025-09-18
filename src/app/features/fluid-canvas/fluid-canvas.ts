import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { CanvasManager } from '@app/core/services/canvas-manager';
import { FluidBackground } from '@app/features/fluid-canvas/components/fluid-background/fluid-background';

@Component({
  selector: 'app-fluid-canvas',
  imports: [FluidBackground],
  templateUrl: './fluid-canvas.html',
  styleUrl: './fluid-canvas.scss',
})
export class FluidCanvas {
  cvs = viewChild<ElementRef<HTMLCanvasElement>>('fluidCanvas');
  private readonly cvsManager = inject(CanvasManager);

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  initCanvas() {
    const canvas = this.cvs()?.nativeElement;
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }
    this.cvsManager.init(canvas);
  }
}
