import { Injectable } from '@angular/core';
import {
  calcDeltaTime,
  compileShader,
  createBlit,
  createTextureAsync,
  generateColor,
  getResolution,
  Material,
  normalizeColor,
  scaleByPixelRatio,
  updatePointerUpData,
  wrap,
} from '@app/core/services/helpers';
import baseVertexSource from '@app/core/shaders/base-vertex.glsl';
import blurVertexSource from '@app/core/shaders/blur-vertex.glsl';
import displaySource from '@app/core/shaders/display.glsl';
import advectionSource from '@app/core/shaders/advection.glsl';
import blurSource from '@app/core/shaders/blur.glsl';
import copySource from '@app/core/shaders/copy.glsl';
import clearSource from '@app/core/shaders/clear.glsl';
import colorSource from '@app/core/shaders/color.glsl';
import checkerboardSource from '@app/core/shaders/checkerboard.glsl';
import splatSource from '@app/core/shaders/splat.glsl';
import divergenceSource from '@app/core/shaders/divergence.glsl';
import curlSource from '@app/core/shaders/curl.glsl';
import vorticitySource from '@app/core/shaders/vorticity.glsl';
import pressureSource from '@app/core/shaders/pressure.glsl';
import gradientSubtractSource from '@app/core/shaders/gradient-subtract.glsl';
import { Program } from '@app/core/models/Program';
import { config } from '@app/core/services/config';
import { Pointer } from '@app/core/models/Pointer';
import { updatePointerDownData, updatePointerMoveData } from '@app/core/utils/pointer';
import { getWebGLContext, resizeCanvas, resizeCanvasToDisplaySize } from '@app/core/utils/webgl';
import * as dat from 'dat.gui';
import { Config } from '@app/core/services/config';

@Injectable({ providedIn: 'root' })
export class CanvasManager {
  private gl!: WebGL2RenderingContext;
  private ext!: any;

  private blurProgram!: Program;
  private copyProgram!: Program;
  private clearProgram!: Program;
  private colorProgram!: Program;
  private checkerboardProgram!: Program;
  private bloomPrefilterProgram!: Program;
  private bloomBlurProgram!: Program;
  private bloomFinalProgram!: Program;
  private sunraysMaskProgram!: Program;
  private sunraysProgram!: Program;
  private splatProgram!: Program;
  private advectionProgram!: Program;
  private divergenceProgram!: Program;
  private curlProgram!: Program;
  private vorticityProgram!: Program;
  private pressureProgram!: Program;
  private gradientSubtractProgram!: Program;

  private blurVertexShader!: WebGLShader;
  private blurShader!: WebGLShader;
  private baseVertexShader!: WebGLShader;
  private copyShader!: WebGLShader;
  private clearShader!: WebGLShader;
  private colorShader!: WebGLShader;
  private checkerboardShader!: WebGLShader;
  private splatShader!: WebGLShader;
  private advectionShader!: WebGLShader;
  private divergenceShader!: WebGLShader;
  private curlShader!: WebGLShader;
  private vorticityShader!: WebGLShader;
  private pressureShader!: WebGLShader;
  private gradientSubtractShader!: WebGLShader;

  private ditheringTexture!: WebGLTexture;
  private displayMaterial!: Material;

  private dye!: any;
  private velocity: any;
  private divergence: any;
  private curl: any;
  private pressure: any;
  private blit: any;

  private lastUpdateTime!: number;
  private colorUpdateTimer: number = 0.0;
  private pointers: Pointer[] = [];
  private splatStack: number[] = [];
  private config: Config = config;
  private textCanvas!: HTMLCanvasElement;
  private fired = false;

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.pointers.push(new Pointer());
    const { gl, ext } = getWebGLContext(canvas);
    this.gl = gl;
    this.ext = ext;

    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.getExtension('EXT_color_buffer_float');

    // this.initGUI();

    this.blit = createBlit(gl);

    this.ditheringTexture = createTextureAsync(this.gl, 'LDR_LLL1_0.png');
    this.initShaders();
    this.initPrograms();
    this.displayMaterial = new Material(this.gl, this.baseVertexShader, displaySource);

    this.updateKeywords();
    this.initFramebuffers();
    this.drawTextToDye('Alicja Łata');
    this.lastUpdateTime = Date.now();

    this.drawScene();
  }

  public onScroll() {
    this.moveText(this.textCanvas);
    this.fired = true;
    this.config.PAUSED = false;
  }

  initGUI() {
    let gui = new dat.GUI({ width: 300 });
    gui.add(this.config, 'DYE_RESOLUTION', { high: 1024, medium: 512, low: 256, 'very low': 128 }).name('quality').onFinishChange(this.initFramebuffers);
    gui.add(this.config, 'SIM_RESOLUTION', { '32': 32, '64': 64, '128': 128, '256': 256 }).name('sim resolution').onFinishChange(this.initFramebuffers);
    gui.add(this.config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
    gui.add(this.config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion');
    gui.add(this.config, 'PRESSURE', 0.0, 1.0).name('pressure');
    gui.add(this.config, 'CURL', 0, 50).name('vorticity').step(1);
    gui.add(this.config, 'SPLAT_RADIUS', 0.01, 0.5).name('splat radius');
    gui.add(this.config, 'PAUSED').name('paused').listen();
  }

  public restart(text: string) {
    this.drawTextToDye(text);
    this.moveText(this.textCanvas);
  }

  private drawTextToDye(text: string) {
    const gl = this.gl;

    const textCanvas = document.createElement('canvas');
    this.textCanvas = textCanvas;
    textCanvas.width = this.dye.width;
    textCanvas.height = this.dye.height;
    const ctx = textCanvas.getContext('2d')!;
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'normal 200px masqualero-stencil';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    this.copyProgram.bind();
    gl.uniform1i(this.copyProgram.uniforms.get('uTexture'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    this.blit(this.dye.write);
    this.dye.swap();

    gl.deleteTexture(tex);
  }

  private moveText(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3];

        if (r === 255 && g === 255 && b === 255 && a === 255) {
          if (Math.random() < 0.01) {
            const u = x / canvas.width;
            const v = 1.0 - y / canvas.height;

            const dx = (Math.random() - 0.5) * 2000;
            const dy = 800 + Math.random() * 800;

            const color = generateColor();
            this.splat(u, v, dx, dy, color);
          }
        }
      }
    }

    setTimeout(() => {
      this.config.DENSITY_DISSIPATION = 1;
    }, 2500);
  }

  private initFramebuffers() {
    const gl = this.gl;
    let simRes = getResolution(gl, this.config.SIM_RESOLUTION);
    let dyeRes = getResolution(gl, this.config.DYE_RESOLUTION);

    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;
    const filtering = this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (this.dye == null) this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else this.dye = this.resizeDoubleFBO(this.dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    if (this.velocity == null) this.velocity = this.createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    else this.velocity = this.resizeDoubleFBO(this.velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    this.divergence = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.curl = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.pressure = this.createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  private createFBO(w: number, h: number, internalFormat: any, format: number, type: number, param: any) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);

    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value) {
        fbo2 = value;
      },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  private resizeFBO(target: ReturnType<CanvasManager['createFBO']>, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
    const gl = this.gl;
    const copyProgram = this.copyProgram;
    const blit = createBlit(gl);

    let newFBO = this.createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.get('uTexture'), target.attach(0));
    blit(newFBO);
    return newFBO;
  }

  private resizeDoubleFBO(target: any, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
    if (target.width === w && target.height === h) return target;
    target.read = this.resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = this.createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  }

  private correctRadius(radius: number) {
    const gl = this.gl;
    let aspectRatio = gl.canvas.width / gl.canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  private splat(x: number, y: number, dx: number, dy: number, color: any) {
    const gl = this.gl;
    this.splatProgram.bind();

    const aspectRatio = gl.canvas.width / gl.canvas.height;
    const radius = this.correctRadius(this.config.SPLAT_RADIUS / 100.0);

    gl.uniform1i(this.splatProgram.uniforms.get('uTarget'), this.velocity.read.attach(0));
    gl.uniform1f(this.splatProgram.uniforms.get('aspectRatio'), aspectRatio);
    gl.uniform2f(this.splatProgram.uniforms.get('point'), x, y);
    gl.uniform1f(this.splatProgram.uniforms.get('radius'), radius);
    gl.uniform3f(this.splatProgram.uniforms.get('color'), dx, dy, 0.0);

    this.blit(this.velocity.write);
    this.velocity.swap();

    gl.uniform1i(this.splatProgram.uniforms.get('uTarget'), this.dye.read.attach(0));
    gl.uniform1f(this.splatProgram.uniforms.get('aspectRatio'), aspectRatio);
    gl.uniform2f(this.splatProgram.uniforms.get('point'), x, y);
    gl.uniform1f(this.splatProgram.uniforms.get('radius'), radius);

    gl.uniform3f(this.splatProgram.uniforms.get('color'), color.r, color.g, color.b);

    this.blit(this.dye.write);
    this.dye.swap();
  }

  private updateColors(dt: number) {
    if (!this.config.COLORFUL) return;

    this.colorUpdateTimer += dt * this.config.COLOR_UPDATE_SPEED;
    if (this.colorUpdateTimer >= 1) {
      this.colorUpdateTimer = wrap(this.colorUpdateTimer, 0, 1);
      this.pointers.forEach((p) => {
        p.color = generateColor();
      });
    }
  }

  private applyInputs() {
    if (this.splatStack.length > 0) {
      // this.multipleSplats(this.splatStack.pop()!);
    }

    this.pointers.forEach((p) => {
      if (p.moved) {
        p.moved = false;
        this.splatPointer(p);
      }
    });
  }

  private splatPointer(pointer: Pointer) {
    let dx = pointer.deltaX * this.config.SPLAT_FORCE;
    let dy = pointer.deltaY * this.config.SPLAT_FORCE;
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  private step(dt: number) {
    const gl = this.gl;

    gl.disable(gl.BLEND);
    const velocity = this.velocity;
    const pressure = this.pressure;
    const divergence = this.divergence;
    const dye = this.dye;
    const curlProgram = this.curlProgram;
    const vorticityProgram = this.vorticityProgram;
    const divergenceProgram = this.divergenceProgram;
    const pressureProgram = this.pressureProgram;
    const clearProgram = this.clearProgram;
    const gradientSubtractProgram = this.gradientSubtractProgram;
    const advectionProgram = this.advectionProgram;
    const blit = this.blit;

    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.get('texelSize'), velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.get('uVelocity'), velocity.read.attach(0));
    this.blit(this.curl);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.get('texelSize'), velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.get('uVelocity'), velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.get('uCurl'), this.curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.get('curl'), this.config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.get('dt'), dt);
    this.blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.get('texelSize'), velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.get('uVelocity'), velocity.read.attach(0));
    this.blit(this.divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.get('uTexture'), this.pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.get('value'), this.config.PRESSURE);
    this.blit(this.pressure.write);
    this.pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.get('texelSize'), velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.get('uDivergence'), divergence.attach(0));
    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.get('uPressure'), pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradientSubtractProgram.bind();
    gl.uniform2f(gradientSubtractProgram.uniforms.get('texelSize'), velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradientSubtractProgram.uniforms.get('uPressure'), pressure.read.attach(0));
    gl.uniform1i(gradientSubtractProgram.uniforms.get('uVelocity'), velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.get('texelSize'), velocity.texelSizeX, velocity.texelSizeY);
    if (!this.ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.get('dyeTexelSize'), velocity.texelSizeX, velocity.texelSizeY);
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.get('uVelocity'), velocityId);
    gl.uniform1i(advectionProgram.uniforms.get('uSource'), velocityId);
    gl.uniform1f(advectionProgram.uniforms.get('dt'), dt);
    gl.uniform1f(advectionProgram.uniforms.get('dissipation'), this.config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    if (!this.ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.get('dyeTexelSize'), dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.get('uVelocity'), velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.get('uSource'), dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.get('dissipation'), this.config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  private drawColor(target: any, color: any) {
    this.colorProgram.bind();
    this.gl.uniform4f(this.colorProgram.uniforms.get('color'), color.r, color.g, color.b, 0);
    this.blit(target);
  }

  private drawCheckerboard(target: any) {
    this.checkerboardProgram.bind();
    this.gl.uniform1f(this.checkerboardProgram.uniforms.get('aspectRatio'), this.gl.canvas.width / this.gl.canvas.height);
    this.blit(target);
  }

  private drawDisplay(target: any) {
    const gl = this.gl;
    const displayMaterial = this.displayMaterial;
    const width = target == null ? gl.drawingBufferWidth : target.width;
    const height = target == null ? gl.drawingBufferHeight : target.height;

    displayMaterial.bind();

    if (this.config.SHADING) {
      const texelSize = displayMaterial.uniforms.get('texelSize');
      if (texelSize) {
        gl.uniform2f(texelSize, 1.0 / width, 1.0 / height);
      }
    }

    const uTexture = displayMaterial.uniforms.get('uTexture');
    if (uTexture) {
      gl.uniform1i(uTexture, this.dye.read.attach(0));
    }

    this.blit(target);
  }

  private render(target: any) {
    const gl = this.gl;
    if (target == null || !this.config.TRANSPARENT) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }

    if (!this.config.TRANSPARENT) {
      this.drawColor(target, normalizeColor(this.config.BACK_COLOR));
    }
    if (target == null && this.config.TRANSPARENT) {
      this.drawCheckerboard(target);
    }
    this.drawDisplay(target);
  }

  initShaders() {
    this.baseVertexShader = compileShader(this.gl, this.gl.VERTEX_SHADER, baseVertexSource);
    this.blurVertexShader = compileShader(this.gl, this.gl.VERTEX_SHADER, blurVertexSource);
    this.blurShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, blurSource);
    this.copyShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, copySource);
    this.clearShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, clearSource);
    this.colorShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, colorSource);
    this.checkerboardShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, checkerboardSource);
    this.splatShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, splatSource);
    this.advectionShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, advectionSource);
    this.divergenceShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, divergenceSource);
    this.curlShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, curlSource);
    this.vorticityShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, vorticitySource);
    this.pressureShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, pressureSource);
    this.gradientSubtractShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, gradientSubtractSource);
  }

  initPrograms() {
    this.blurProgram = new Program(this.gl, this.blurVertexShader, this.blurShader);
    this.copyProgram = new Program(this.gl, this.baseVertexShader, this.copyShader);
    this.clearProgram = new Program(this.gl, this.baseVertexShader, this.clearShader);
    this.colorProgram = new Program(this.gl, this.baseVertexShader, this.colorShader);
    this.checkerboardProgram = new Program(this.gl, this.baseVertexShader, this.checkerboardShader);
    this.splatProgram = new Program(this.gl, this.baseVertexShader, this.splatShader);
    this.advectionProgram = new Program(this.gl, this.baseVertexShader, this.advectionShader);
    this.divergenceProgram = new Program(this.gl, this.baseVertexShader, this.divergenceShader);
    this.curlProgram = new Program(this.gl, this.baseVertexShader, this.curlShader);
    this.vorticityProgram = new Program(this.gl, this.baseVertexShader, this.vorticityShader);
    this.pressureProgram = new Program(this.gl, this.baseVertexShader, this.pressureShader);
    this.gradientSubtractProgram = new Program(this.gl, this.baseVertexShader, this.gradientSubtractShader);
  }

  private updateKeywords() {
    let displayKeywords = [];
    if (this.config.SHADING) displayKeywords.push('SHADING');
    if (this.config.BLOOM) displayKeywords.push('BLOOM');
    if (this.config.SUNRAYS) displayKeywords.push('SUNRAYS');
    this.displayMaterial.setKeywords(displayKeywords);
  }

  private drawScene() {
    const { dt, now } = calcDeltaTime(this.lastUpdateTime);
    this.lastUpdateTime = now;
    const canvas = <HTMLCanvasElement>this.gl.canvas;
    const needsResize = resizeCanvas(canvas);
    if (needsResize) {
      this.initFramebuffers();
    }
    this.updateColors(dt);
    this.applyInputs();
    if (!this.config.PAUSED) {
      this.step(dt);
    }
    this.render(null);
    requestAnimationFrame(() => this.drawScene());
  }
}
