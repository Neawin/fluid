import { Injectable } from '@angular/core';
import { createProgram, getWebGLContext, resizeCanvasToDisplaySize } from '@app/core/utils/webglUtils';
import fragShaderSource from '@app/core/shaders/fragment.glsl';
import vertShaderSource from '@app/core/shaders/vertex.glsl';

@Injectable({
  providedIn: 'root',
})
export class CanvasManager {
  private gl!: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private positionBuffer!: WebGLBuffer;
  private vao!: WebGLVertexArrayObject;
  private _position = [0, 0];
  private colorULocation: WebGLUniformLocation | null = null;
  private resolutionULocation: WebGLUniformLocation | null = null;
  private positionAttrLocation!: number;

  constructor() {}

  set position(e: MouseEvent) {
    this._position = [e.clientX, e.clientY];
  }

  init(canvas: HTMLCanvasElement) {
    const gl = getWebGLContext(canvas);

    this.gl = gl;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const program = createProgram(gl, [vertShaderSource, fragShaderSource]);
    if (!program) {
      throw new Error('Program initialization failure');
    }

    gl.useProgram(program);

    this.positionAttrLocation = gl.getAttribLocation(program, 'a_position');
    this.colorULocation = gl.getUniformLocation(program, 'u_color');
    this.resolutionULocation = gl.getUniformLocation(program, 'u_resolution');

    gl.uniform2f(this.resolutionULocation, canvas.width, canvas.height);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

    const vao = gl.createVertexArray();
    this.vao = vao;

    this.drawScene();
  }

  drawScene() {
    const gl = this.gl;
    const vao = this.vao;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const bufferData = new Float32Array(this._position);
    gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);

    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(this.positionAttrLocation);

    gl.vertexAttribPointer(this.positionAttrLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, 1);
    requestAnimationFrame(() => this.drawScene());
  }
}
