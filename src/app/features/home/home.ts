import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { CanvasManager } from '@app/core/services/canvas-manager';
import { FluidCanvas } from '@app/features/fluid-canvas/fluid-canvas';

@Component({
  selector: 'app-home',
  imports: [FluidCanvas],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit {
  target = viewChild<ElementRef<HTMLDivElement>>('target');
  private fired = false;
  private readonly cvsManager = inject(CanvasManager);

  ngAfterViewInit(): void {
    window.addEventListener('scroll', () => this.onScroll());
  }

  private onScroll() {
    if (this.fired) {
      return;
    }
    const target = this.target()?.nativeElement;
    if (!target) return;
    this.cvsManager.onScroll();
    this.fired = true;

    target.scrollIntoView({ behavior: 'smooth' });
    this.fired = true;
  }
}
