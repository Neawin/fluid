import { Injectable } from '@angular/core';
import { createProgram, getWebGLContext, resizeCanvasToDisplaySize } from '@app/core/utils/webglUtils';
import vertShaderSource from '@app/core/shaders/vertex.glsl';
import splatFrag from '@app/core/shaders/splat-frag.glsl';
import displayFrag from '@app/core/shaders/display-frag.glsl';
import { setPosition, setTexcoords } from '@app/core/services/helpers';

@Injectable({ providedIn: 'root' })
export class CanvasManager {
  private gl!: WebGL2RenderingContext;

  private splatProgram!: WebGLProgram;
  private quadProgram!: WebGLProgram;

  private quadVAO!: WebGLVertexArrayObject;
  private quadBuffer!: WebGLBuffer;
  private texcoordBuffer!: WebGLBuffer;
  private mouseULocation!: WebGLUniformLocation;
  private fbo!: WebGLFramebuffer;
  private tex!: WebGLTexture;
  private position = {
    x: 0,
    y: 0,
  };

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    const gl = getWebGLContext(canvas);
    this.gl = gl;

    resizeCanvasToDisplaySize(canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.splatProgram = createProgram(gl, [vertShaderSource, splatFrag])!;
    this.quadProgram = createProgram(gl, [vertShaderSource, displayFrag])!;
    this.fbo = gl.createFramebuffer();

    this.mouseULocation = gl.getUniformLocation(this.splatProgram, 'u_mouse')!;

    this.createQuadBuffer(gl);
    this.createTextureCoordsBuffer(gl);
    this.tex = this.createTexture(gl);
    this.initFBO();

    document.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.position.x = (e.clientX - rect.left) / rect.width;
      this.position.y = 1.0 - (e.clientY - rect.top) / rect.height;
      this.drawSplat(gl);
    });

    this.drawScene();
  }

  initFBO() {
    this.fbo = this.gl.createFramebuffer()!;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.tex, 0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  drawSplat(gl: WebGL2RenderingContext) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.splatProgram);
    gl.uniform2f(this.mouseULocation, this.position.x, this.position.y);
    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  createQuadBuffer(gl: WebGL2RenderingContext) {
    this.quadVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.quadVAO);

    this.quadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    setPosition(gl);
    const posLoc = gl.getAttribLocation(this.quadProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  createTextureCoordsBuffer(gl: WebGL2RenderingContext) {
    gl.bindVertexArray(this.quadVAO);
    this.texcoordBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    setTexcoords(gl);
    const texLoc = gl.getAttribLocation(this.quadProgram, 'a_texcoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  createTexture(gl: WebGL2RenderingContext) {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private drawScene() {
    const gl = this.gl;

    this.drawSplat(gl);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.quadProgram);

    // Bind the texture for the display shader:
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    const texLocation = gl.getUniformLocation(this.quadProgram, 'u_texture');
    gl.uniform1i(texLocation, 0);

    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    requestAnimationFrame(() => this.drawScene());
  }
}
