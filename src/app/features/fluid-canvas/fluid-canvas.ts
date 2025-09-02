import { Component, DestroyRef, ElementRef, inject, ViewChild, viewChild } from '@angular/core';
import { CanvasManager } from '@app/core/services/canvas-manager';
import { combineLatest, fromEvent, mergeMap, Observable, switchMap, takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-fluid-canvas',
  imports: [],
  templateUrl: './fluid-canvas.html',
  styleUrl: './fluid-canvas.scss',
})
export class FluidCanvas {
  cvs = viewChild<ElementRef<HTMLCanvasElement>>('fluidCanvas');
  cvsManager = inject(CanvasManager);
  destroyRef = inject(DestroyRef);
  ngAfterViewInit(): void {
    const canvas = this.cvs()?.nativeElement;
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }
    this.cvsManager.init(canvas);
  }
}
