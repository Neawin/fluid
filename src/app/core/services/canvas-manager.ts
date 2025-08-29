import { Injectable } from '@angular/core';
import { createProgram, getWebGLContext, resizeCanvasToDisplaySize } from '@app/core/utils/webglUtils';
import fragShaderSource from '@app/core/shaders/fragment.glsl';
import vertShaderSource from '@app/core/shaders/vertex.glsl';
import { setPosition, setTexcoords } from '@app/core/services/helpers';

@Injectable({
  providedIn: 'root',
})
export class CanvasManager {
  private gl!: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private positionBuffer!: WebGLBuffer;
  private texcoordBuffer!: WebGLBuffer;
  private colorBuffer!: WebGLBuffer;
  private vao!: WebGLVertexArrayObject;
  private _position = [0, 0];
  private resolutionULocation!: WebGLUniformLocation | null;
  private mouseULocation!: WebGLUniformLocation | null;
  private positionAttrLocation!: number;
  private texcoordAttrLocation!: number;

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
    this.texcoordAttrLocation = gl.getAttribLocation(program, 'a_texcoord');
    this.mouseULocation = gl.getUniformLocation(program, 'u_mouse');
    this.resolutionULocation = gl.getUniformLocation(program, 'u_resolution');

    gl.uniform2f(this.resolutionULocation, canvas.width, canvas.height);

    const vao = gl.createVertexArray();
    this.vao = vao;

    this.texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    setTexcoords(gl);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    setPosition(gl);

    this.drawScene();
  }

  drawScene() {
    const gl = this.gl;
    const vao = this.vao;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform2f(this.mouseULocation, this._position[0], this._position[1]);

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.positionAttrLocation);
    gl.vertexAttribPointer(this.positionAttrLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordAttrLocation);
    gl.enableVertexAttribArray(this.texcoordAttrLocation);
    gl.vertexAttribPointer(this.texcoordAttrLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(() => this.drawScene());
  }
}
