    #version 300 es

in vec2 a_position;

uniform vec2 u_resolution;

void main() {
  gl_Position = vec4(a_position, 0, 1);
  gl_PointSize = 10.0f;

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = a_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0f;

  // convert from 0->2 to -1->+1 (clip space)
  vec2 clipSpace = zeroToTwo - 1.0f;

  clipSpace.y = -clipSpace.y;

  gl_Position = vec4(clipSpace, 0, 1);
}