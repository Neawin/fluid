import { Injectable } from '@angular/core';
import { createShader } from '@app/core/shaders/helpers';
import fragShaderSource from '@app/core/shaders/fragment.shader';
import vertShaderSource from '@app/core/shaders/vertex.shader';

@Injectable({
  providedIn: 'root',
})
export class CanvasManager {
  constructor() {}

  init(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error("Browser doesn't support webgl2");
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);
  }
}
