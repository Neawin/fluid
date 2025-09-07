import { Injectable } from '@angular/core';
import { getWebGLContext, resizeCanvasToDisplaySize } from '@app/core/utils/webglUtils';
import {
  calcDeltaTime,
  clamp01,
  compileShader,
  createBlit,
  createTextureAsync,
  generateColor,
  getResolution,
  Material,
  normalizeColor,
  scaleByPixelRatio,
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

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.pointers.push(new Pointer());
    const { gl, ext } = getWebGLContext(canvas);
    this.gl = gl;
    this.ext = ext;

    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.getExtension('EXT_color_buffer_float');

    this.blit = createBlit(gl);

    this.ditheringTexture = createTextureAsync(this.gl, 'LDR_LLL1_0.png');
    this.initShaders();
    this.initPrograms();
    this.displayMaterial = new Material(this.gl, this.baseVertexShader, displaySource);

    this.updateKeywords();
    this.initFramebuffers();
    this.multipleSplats(Math.floor(Math.random() * 20) + 5);

    this.lastUpdateTime = Date.now();

    this.drawScene();

    canvas.addEventListener('mousedown', (e) => {
      let posX = scaleByPixelRatio(e.offsetX);
      let posY = scaleByPixelRatio(e.offsetY);
      let pointer = this.pointers.find((p) => p.id == -1);
      if (pointer == null) pointer = new Pointer();
      this.updatePointerDownData(pointer, -1, posX, posY);
    });

    canvas.addEventListener('mousemove', (e) => {
      let pointer = this.pointers[0];
      if (!pointer.down) return;
      let posX = scaleByPixelRatio(e.offsetX);
      let posY = scaleByPixelRatio(e.offsetY);

      this.updatePointerMoveData(pointer, posX, posY);
    });

    window.addEventListener('mouseup', () => {
      this.updatePointerUpData(this.pointers[0]);
    });
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

  private framebufferToTexture(target: any) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    let length = target.width * target.height * 4;
    let texture = new Float32Array(length);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, texture);
    return texture;
  }

  private updateKeywords() {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push('SHADING');
    if (config.BLOOM) displayKeywords.push('BLOOM');
    if (config.SUNRAYS) displayKeywords.push('SUNRAYS');
    this.displayMaterial.setKeywords(displayKeywords);
  }

  private initFramebuffers() {
    const gl = this.gl;
    let simRes = getResolution(gl, config.SIM_RESOLUTION);
    let dyeRes = getResolution(gl, config.DYE_RESOLUTION);

    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;
    const filtering = this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (this.dye == null)
      this.dye = this.createDoubleFBO(
        dyeRes.width,
        dyeRes.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );
    else
      this.dye = this.resizeDoubleFBO(
        this.dye,
        dyeRes.width,
        dyeRes.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );

    if (this.velocity == null)
      this.velocity = this.createDoubleFBO(
        simRes.width,
        simRes.height,
        rg.internalFormat,
        rg.format,
        texType,
        filtering
      );
    else
      this.velocity = this.resizeDoubleFBO(
        this.velocity,
        simRes.width,
        simRes.height,
        rg.internalFormat,
        rg.format,
        texType,
        filtering
      );

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

  private resizeFBO(
    target: ReturnType<CanvasManager['createFBO']>,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ) {
    const gl = this.gl;
    const copyProgram = this.copyProgram;
    const blit = createBlit(gl);

    let newFBO = this.createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.get('uTexture'), target.attach(0));
    blit(newFBO);
    return newFBO;
  }

  private resizeDoubleFBO(
    target: any,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ) {
    if (target.width === w && target.height === h) return target;
    target.read = this.resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = this.createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  }

  private multipleSplats(amount: number) {
    for (let i = 0; i < amount; i++) {
      // Use white here, so subtraction makes it darker on white background
      const color = { r: 1.0, g: 1.0, b: 1.0 };
      const x = Math.random();
      const y = Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      this.splat(x, y, dx, dy, color);
    }
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
    const radius = this.correctRadius(config.SPLAT_RADIUS / 100.0);

    // --- 1. Velocity splat ---
    gl.uniform1i(this.splatProgram.uniforms.get('uTarget'), this.velocity.read.attach(0));
    gl.uniform1f(this.splatProgram.uniforms.get('aspectRatio'), aspectRatio);
    gl.uniform2f(this.splatProgram.uniforms.get('point'), x, y);
    gl.uniform1f(this.splatProgram.uniforms.get('radius'), radius);
    gl.uniform3f(this.splatProgram.uniforms.get('color'), dx, dy, 0.0);

    this.blit(this.velocity.write);
    this.velocity.swap();

    // --- 2. Dye splat ---
    gl.uniform1i(this.splatProgram.uniforms.get('uTarget'), this.dye.read.attach(0));
    gl.uniform1f(this.splatProgram.uniforms.get('aspectRatio'), aspectRatio);
    gl.uniform2f(this.splatProgram.uniforms.get('point'), x, y);
    gl.uniform1f(this.splatProgram.uniforms.get('radius'), radius);

    // Black splat color
    gl.uniform3f(this.splatProgram.uniforms.get('color'), color.r, color.g, color.b);

    this.blit(this.dye.write);
    this.dye.swap();
  }

  private resizeCanvas() {
    const canvas = <HTMLCanvasElement>this.gl.canvas;
    let width = scaleByPixelRatio(canvas.clientWidth);
    let height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width != width || canvas.height != height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  private updateColors(dt: number) {
    if (!config.COLORFUL) return;

    this.colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (this.colorUpdateTimer >= 1) {
      this.colorUpdateTimer = wrap(this.colorUpdateTimer, 0, 1);
      this.pointers.forEach((p) => {
        p.color = generateColor();
      });
    }
  }

  private applyInputs() {
    if (this.splatStack.length > 0) {
      this.multipleSplats(this.splatStack.pop()!);
    }

    this.pointers.forEach((p) => {
      if (p.moved) {
        p.moved = false;
        this.splatPointer(p);
      }
    });
  }

  private splatPointer(pointer: Pointer) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
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
    gl.uniform1f(vorticityProgram.uniforms.get('curl'), config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.get('dt'), dt);
    this.blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.get('texelSize'), velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.get('uVelocity'), velocity.read.attach(0));
    this.blit(this.divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.get('uTexture'), this.pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.get('value'), config.PRESSURE);
    this.blit(this.pressure.write);
    this.pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.get('texelSize'), velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.get('uDivergence'), divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
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
    if (!this.ext.supportLinearFiltering)
      gl.uniform2f(advectionProgram.uniforms.get('dyeTexelSize'), velocity.texelSizeX, velocity.texelSizeY);
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.get('uVelocity'), velocityId);
    gl.uniform1i(advectionProgram.uniforms.get('uSource'), velocityId);
    gl.uniform1f(advectionProgram.uniforms.get('dt'), dt);
    gl.uniform1f(advectionProgram.uniforms.get('dissipation'), config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    if (!this.ext.supportLinearFiltering)
      gl.uniform2f(advectionProgram.uniforms.get('dyeTexelSize'), dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.get('uVelocity'), velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.get('uSource'), dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.get('dissipation'), config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  private drawColor(target: any, color: any) {
    this.colorProgram.bind();
    this.gl.uniform4f(this.colorProgram.uniforms.get('color'), color.r, color.g, color.b, 1);
    this.blit(target);
  }

  private drawCheckerboard(target: any) {
    this.checkerboardProgram.bind();
    this.gl.uniform1f(
      this.checkerboardProgram.uniforms.get('aspectRatio'),
      this.gl.canvas.width / this.gl.canvas.height
    );
    this.blit(target);
  }

  private drawDisplay(target: any) {
    const gl = this.gl;
    const displayMaterial = this.displayMaterial;
    const width = target == null ? gl.drawingBufferWidth : target.width;
    const height = target == null ? gl.drawingBufferHeight : target.height;

    displayMaterial.bind();

    if (config.SHADING) {
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
    if (target == null || !config.TRANSPARENT) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }

    if (!config.TRANSPARENT) {
      this.drawColor(target, normalizeColor(config.BACK_COLOR));
    }
    if (target == null && config.TRANSPARENT) {
      this.drawCheckerboard(target);
    }
    this.drawDisplay(target);
  }

  private updatePointerDownData(pointer: Pointer, id: number, posX: number, posY: number) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / this.gl.canvas.width;
    pointer.texcoordY = 1.0 - posY / this.gl.canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
  }

  private updatePointerMoveData(pointer: Pointer, posX: number, posY: number) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / this.gl.canvas.width;
    pointer.texcoordY = 1.0 - posY / this.gl.canvas.height;
    pointer.deltaX = this.correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = this.correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
  }

  private correctDeltaX(delta: number) {
    let aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  private correctDeltaY(delta: number) {
    let aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  private updatePointerUpData(pointer: Pointer) {
    pointer.down = false;
  }

  private drawScene() {
    const { dt, now } = calcDeltaTime(this.lastUpdateTime);
    this.lastUpdateTime = now;
    if (this.resizeCanvas()) {
      this.initFramebuffers();
    }
    this.updateColors(dt);
    this.applyInputs();
    if (!config.PAUSED) {
      this.step(dt);
    }
    this.render(null);
    requestAnimationFrame(() => this.drawScene());
  }
}
