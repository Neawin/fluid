export function setPosition(gl: WebGL2RenderingContext) {
  const positions = new Float32Array([-1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, -1]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

export function setTexcoords(gl: WebGL2RenderingContext) {
  const texcoords = new Float32Array([
    0,
    1, // top-left     (-1,  1)
    1,
    1, // top-right    ( 1,  1)
    1,
    0, // bottom-right ( 1, -1)

    0,
    1, // top-left     (-1,  1)
    1,
    0, // bottom-right ( 1, -1)
    0,
    0, // bottom-left  (-1, -1)
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
}
