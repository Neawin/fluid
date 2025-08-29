#version 300 es

precision highp float;

out vec4 outColor;

in vec2 v_texcoord;
in vec2 v_position;
in vec2 v_mouse_position;

uniform sampler2D u_texture;

void main() {
    outColor = vec4(0, 0, 0, 1);

    float dist = distance(v_position, v_mouse_position);

    if(dist < 0.01f) {
        outColor = texture(u_texture, v_texcoord);
    }
}