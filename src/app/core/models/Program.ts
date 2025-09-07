import { createProgram, getUniforms } from '@app/core/services/helpers';

export class Program {
  uniforms: any = {};
  program!: WebGLProgram | null;
  constructor(private gl: WebGL2RenderingContext, private vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    this.program = createProgram(this.gl, vertexShader, fragmentShader);
    if (this.program) {
      this.uniforms = getUniforms(this.gl, this.program);
    }
  }

  bind() {
    this.gl.useProgram(this.program);
  }
}
