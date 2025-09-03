import { Injectable } from '@angular/core';
import { createProgram, getWebGLContext, resizeCanvasToDisplaySize } from '@app/core/utils/webglUtils';
import vertShaderSource from '@app/core/shaders/vertex.glsl';
import splatFrag from '@app/core/shaders/splat-frag.glsl';
import displayFrag from '@app/core/shaders/display-frag.glsl';
import { setPosition } from '@app/core/services/helpers';

@Injectable({ providedIn: 'root' })
export class CanvasManager {
  private gl!: WebGL2RenderingContext;

  private splatProgram!: WebGLProgram;
  private displayProgram!: WebGLProgram;
  private displayVAO!: WebGLVertexArrayObject;
  private splatVAO!: WebGLVertexArrayObject;
  private displayQuadBuffer!: WebGLBuffer;
  private displayTexCoordsBuffer!: WebGLBuffer;
  private splatQuadBuffer!: WebGLBuffer;
  private splatTexCoordsBuffer!: WebGLBuffer;
  private mouseULocation!: WebGLUniformLocation;
  private dTexULocation!: WebGLUniformLocation;
  private sTexULocation!: WebGLUniformLocation;
  private fbos: WebGLFramebuffer[] = [];
  private textures: WebGLTexture[] = [];
  private readIndex = 0;
  private writeIndex = 1;
  private position = {
    x: 0.5,
    y: 0.5,
  };

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    const gl = getWebGLContext(canvas);
    this.gl = gl;

    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.splatProgram = createProgram(gl, [vertShaderSource, splatFrag])!;
    this.displayProgram = createProgram(gl, [vertShaderSource, displayFrag])!;

    this.displayVAO = gl.createVertexArray();

    for (let i = 0; i < 2; i++) {
      const fbo = gl.createFramebuffer();
      const tex = this.createTexture(gl);
      this.bindTexture(fbo, tex);
      this.fbos.push(fbo);
      this.textures.push(tex);
    }

    this.mouseULocation = gl.getUniformLocation(this.splatProgram, 'u_mouse')!;
    this.dTexULocation = gl.getUniformLocation(this.displayProgram, 'u_texture')!;
    this.sTexULocation = gl.getUniformLocation(this.splatProgram, 'u_texture')!;

    this.displayVAO = gl.createVertexArray();
    gl.bindVertexArray(this.displayVAO);
    this.displayQuadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.displayQuadBuffer);
    setPosition(gl);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.splatVAO = gl.createVertexArray();
    gl.bindVertexArray(this.splatVAO);
    this.splatQuadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.splatQuadBuffer);
    setPosition(gl);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    document.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.position.x = (e.clientX - rect.left) / rect.width;
      this.position.y = 1.0 - (e.clientY - rect.top) / rect.height;
    });
    this.drawScene();
  }

  bindTexture(fbo: WebGLFramebuffer, tex: WebGLTexture) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, tex, 0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  drawSplat() {
    const gl = this.gl;

    // write to write fbo
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[this.writeIndex]);
    gl.useProgram(this.splatProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.readIndex]);
    gl.uniform1i(this.sTexULocation, 0);

    gl.uniform2f(this.mouseULocation, this.position.x, this.position.y);

    gl.bindVertexArray(this.splatVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    [this.readIndex, this.writeIndex] = [this.writeIndex, this.readIndex];
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
    this.drawSplat();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.displayProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.readIndex]);
    gl.uniform1i(this.dTexULocation, 0);

    gl.bindVertexArray(this.displayVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    requestAnimationFrame(() => this.drawScene());
  }
}
