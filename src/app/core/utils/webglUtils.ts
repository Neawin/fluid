export function createShader(gl: WebGL2RenderingContext, type: GLenum, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Error creating shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  gl.deleteShader(shader);
  return null;
}

export function getWebGLContext(canvas: HTMLCanvasElement) {
  let gl = canvas.getContext('webgl2', { alpha: true });
  if (!gl) {
    throw new Error("Browser doesn't support webgl2");
  }

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  return gl;
}

export function createProgram(gl: WebGL2RenderingContext, shaderSrc: string[]) {
  const program = gl.createProgram();

  const vertShader = createShader(gl, gl.VERTEX_SHADER, shaderSrc[0]);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, shaderSrc[1]);

  if (!vertShader || !fragShader) {
    throw new Error('Shader compilation failed');
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (success) {
    return program;
  }

  gl.deleteProgram(program);
  return null;
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, multiplier = 1): boolean {
  const width = Math.floor(canvas.clientWidth * multiplier);
  const height = Math.floor(canvas.clientHeight * multiplier);

  const needResize = canvas.width !== width || canvas.height !== height;

  if (needResize) {
    canvas.width = width;
    canvas.height = height;
  }

  return needResize;
}

export function randomInt(range: number) {
  return Math.floor(Math.random() * range);
}
