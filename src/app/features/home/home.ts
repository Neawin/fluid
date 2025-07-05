import { Component } from '@angular/core';
import { FluidCanvas } from '@app/features/fluid-canvas/fluid-canvas';

@Component({
  selector: 'app-home',
  imports: [FluidCanvas],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
