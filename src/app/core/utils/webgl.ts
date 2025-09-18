import { scaleByPixelRatio } from '@app/core/services/helpers';

export interface WebGLTextureFormat {
  internalFormat: number;
  format: number;
  type: number;
}

export interface WebGLContextInfo {
  gl: WebGL2RenderingContext;
  ext: {
    formatRGBA: WebGLTextureFormat | null;
    formatRG: WebGLTextureFormat | null;
    formatR: WebGLTextureFormat | null;
    halfFloatTexType: number;
    supportLinearFiltering: any;
  };
}

export function getWebGLContext(canvas: HTMLCanvasElement): WebGLContextInfo {
  const params: WebGLContextAttributes = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  };

  const gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null;

  if (!gl) {
    throw new Error('WebGL2 is not supported in this browser.');
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // WebGL2 extensions
  gl.getExtension('EXT_color_buffer_float');
  const supportLinearFiltering = gl.getExtension('OES_texture_float_linear');

  const halfFloatTexType = gl.HALF_FLOAT;

  const formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
  const formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
  const formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);

  return {
    gl,
    ext: {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering,
    },
  };
}

export function resizeCanvas(canvas: HTMLCanvasElement) {
  let width = scaleByPixelRatio(canvas.clientWidth);
  let height = scaleByPixelRatio(canvas.clientHeight);
  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

function getSupportedFormat(gl: WebGL2RenderingContext, internalFormat: number, format: number, type: number): WebGLTextureFormat | null {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 1, 1, 0, format, type, null);
    const err = gl.getError();
    if (err !== gl.NO_ERROR) {
      return null;
    }
    return { internalFormat, format, type };
  } catch (e) {
    return null;
  } finally {
    gl.deleteTexture(texture);
  }
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
