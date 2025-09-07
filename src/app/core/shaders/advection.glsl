#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;

out vec4 outColor;

vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5f;

  vec2 iuv = floor(st);
  vec2 fuv = fract(st);

  vec4 a = texture(sam, (iuv + vec2(0.5f, 0.5f)) * tsize);
  vec4 b = texture(sam, (iuv + vec2(1.5f, 0.5f)) * tsize);
  vec4 c = texture(sam, (iuv + vec2(0.5f, 1.5f)) * tsize);
  vec4 d = texture(sam, (iuv + vec2(1.5f, 1.5f)) * tsize);

  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main() {
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  vec4 result = texture(uSource, coord);
#endif
  float decay = 1.0f + dissipation * dt;
  outColor = result / decay;
}