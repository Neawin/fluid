    #version 300 es

in vec2 a_position;
in vec2 a_texcoord;
uniform vec2 u_mouse;
uniform vec2 u_resolution;

out vec2 v_position;
out vec2 v_mouse_position;
out vec2 v_texcoord;

void main() {
  gl_Position = vec4(a_position, 0, 1);
  v_position = (a_position * 0.5f) + 0.5f;

  v_mouse_position = vec2(u_mouse.x, u_resolution.y - u_mouse.y) / u_resolution;
  v_texcoord = a_texcoord;
}