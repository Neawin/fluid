export function clamp01(input: number) {
  return Math.min(Math.max(input, 0), 1);
}

export function normalizeTexture(texture: any, width: number, height: number) {
  let result = new Uint8Array(texture.length);
  let id = 0;
  for (let i = height - 1; i >= 0; i--) {
    for (let j = 0; j < width; j++) {
      let nid = i * width * 4 + j * 4;
      result[nid + 0] = clamp01(texture[id + 0]) * 255;
      result[nid + 1] = clamp01(texture[id + 1]) * 255;
      result[nid + 2] = clamp01(texture[id + 2]) * 255;
      result[nid + 3] = clamp01(texture[id + 3]) * 255;
      id += 4;
    }
  }
  return result;
}

export function textureToCanvas(texture: any, width: number, height: number) {
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Context 2d not initialized');
  }
  canvas.width = width;
  canvas.height = height;

  let imageData = ctx.createImageData(width, height);
  imageData.data.set(texture);
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

export class Material {
  programs: WebGLProgram[] = [];
  activeProgram: WebGLProgram | null = null;
  uniforms: Map<string, WebGLUniformLocation | null> = new Map();
  constructor(
    private gl: WebGL2RenderingContext,
    private vertexShader: WebGLShader,
    private fragmentShaderSource: string
  ) {}

  setKeywords(keywords: string[]) {
    let hash = 0;
    for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);

    let program = this.programs[hash];

    if (program == null) {
      let fragmentShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
      program = createProgram(this.gl, this.vertexShader, fragmentShader);
      this.programs[hash] = program;
    }

    if (program == this.activeProgram) return;

    this.uniforms = getUniforms(this.gl, program);
    this.activeProgram = program;
  }

  bind() {
    this.gl.useProgram(this.activeProgram);
  }
}

export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.trace(gl.getProgramInfoLog(program));

  return program;
}

export function getUniforms(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    let info = gl.getActiveUniform(program, i);
    if (!info) {
      throw new Error('Uniform info error');
    }
    let name = info.name;
    uniforms.set(name, gl.getUniformLocation(program, name));
  }
  return uniforms;
}

export function compileShader(gl: WebGL2RenderingContext, type: number, source: string, keywords?: string[]) {
  if (keywords) {
    source = addKeywords(source, keywords);
  }

  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Shader compilation error');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(shader));

  return shader;
}

export function addKeywords(source: string, keywords: string[]): string {
  if (!keywords || keywords.length === 0) return source;

  const defines = keywords.map((k) => `#define ${k}\n`).join('');

  if (source.startsWith('#version')) {
    const endOfLine = source.indexOf('\n');
    return source.substring(0, endOfLine + 1) + defines + source.substring(endOfLine + 1);
  }

  return defines + source;
}

export function updatePointerUpData(pointer: any) {
  pointer.down = false;
}

export function correctDeltaX(gl: WebGL2RenderingContext, delta: number) {
  let aspectRatio = gl.canvas.width / gl.canvas.height;
  if (aspectRatio < 1) delta *= aspectRatio;
  return delta;
}

export function correctDeltaY(gl: WebGL2RenderingContext, delta: number) {
  let aspectRatio = gl.canvas.width / gl.canvas.height;
  if (aspectRatio > 1) delta /= aspectRatio;
  return delta;
}

export function generateColor() {
  return { r: 1, g: 1, b: 1 };
  // let c = HSVtoRGB(Math.random(), 1.0, 1.0);
  // c.r *= 0.15;
  // c.g *= 0.15;
  // c.b *= 0.15;
  // return c;
}

export function HSVtoRGB(h: any, s: any, v: any) {
  let r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }

  return {
    r,
    g,
    b,
  };
}

export function normalizeColor(input: any) {
  let output = {
    r: input.r / 255,
    g: input.g / 255,
    b: input.b / 255,
  };
  return output;
}

export function wrap(value: number, min: number, max: number) {
  let range = max - min;
  if (range == 0) return min;
  return ((value - min) % range) + min;
}

export function getResolution(gl: WebGL2RenderingContext, resolution: number) {
  let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

  let min = Math.round(resolution);
  let max = Math.round(resolution * aspectRatio);

  if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
  else return { width: min, height: max };
}

export function getTextureScale(texture: any, width: number, height: number) {
  return {
    x: width / texture.width,
    y: height / texture.height,
  };
}

export function scaleByPixelRatio(input: number) {
  let pixelRatio = window.devicePixelRatio || 1;
  return Math.floor(input * pixelRatio);
}

export function hashCode(s: string) {
  if (s.length == 0) return 0;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function createBlit(gl: WebGL2RenderingContext) {
  // setup once with this gl
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  // return the draw function bound to this gl
  return (target: any, clear = false) => {
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }

    if (clear) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
}

export function createTextureAsync(gl: WebGL2RenderingContext, url: string) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

  let obj = {
    texture,
    width: 1,
    height: 1,
    attach(id: number) {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    },
  };

  let image = new Image();
  image.onload = () => {
    obj.width = image.width;
    obj.height = image.height;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  };
  image.src = url;

  return obj;
}

export function calcDeltaTime(lastUpdateTime: number) {
  let now = Date.now();
  let dt = (now - lastUpdateTime) / 1000;
  dt = Math.min(dt, 0.016666);
  return { dt, now };
}
