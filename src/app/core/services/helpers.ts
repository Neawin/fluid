export function setTexcoords(gl: WebGL2RenderingContext) {
  const texcoord = [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoord), gl.STATIC_DRAW);
}

export function setPosition(gl: WebGL2RenderingContext) {
  const positions = new Float32Array([-1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, -1]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}
