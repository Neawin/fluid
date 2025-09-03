#version 300 es
precision highp float;

in vec2 v_texcoord;
out vec4 outColor;

uniform sampler2D u_texture;
uniform vec2 u_mouse;
uniform float u_radius;
uniform vec3 u_color;

void main() {
    float fade = 0.92f;
    vec3 faded = texture(u_texture, v_texcoord).rgb * fade;

    float d = distance(v_texcoord, u_mouse);

    outColor = vec4(faded, 1);
    if(d <= 0.01f) {
        outColor = vec4(1, 0, 0, 1);
    }
}