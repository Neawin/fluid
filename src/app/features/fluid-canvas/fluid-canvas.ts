import { Component, ElementRef, inject, ViewChild, viewChild } from '@angular/core';
import { CanvasManager } from '@app/core/services/canvas-manager';

@Component({
  selector: 'app-fluid-canvas',
  imports: [],
  templateUrl: './fluid-canvas.html',
  styleUrl: './fluid-canvas.scss',
})
export class FluidCanvas {
  cvs = viewChild<ElementRef>('fluidCanvas');
  cvsManager = inject(CanvasManager);
  ngAfterViewInit(): void {
    this.cvsManager.init(this.cvs()?.nativeElement);
  }
}
