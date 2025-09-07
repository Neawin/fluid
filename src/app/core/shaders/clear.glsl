#version 300 es
precision mediump float;

in vec2 vUv;

uniform sampler2D uTexture;
uniform float value;

out vec4 outColor;

void main() {
  outColor = value * texture(uTexture, vUv);
}