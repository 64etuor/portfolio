// WebGL2 풀스크린 쿼드 후처리 셰이더(단일 패스).
// 곡률·색수차·스캔라인·그레인·비네팅·값싼 글로우 근사.

export const VERT_SRC = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAG_SRC = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2  uResolution; // device px
uniform float uTime;       // sec
uniform float uCurvature;
uniform float uAberration; // px
uniform float uBloom;
uniform float uScanline;
uniform float uGrain;
uniform float uVignette;
uniform vec3  uTint;

// 값싼 해시 노이즈.
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// barrel 곡률로 UV 를 안쪽으로 휘게. curvature=0 이면 항등.
vec2 curve(vec2 uv, float amt) {
  if (amt <= 0.0) return uv;
  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + amt * dot(c, c);
  return c * 0.5 + 0.5;
}

void main() {
  vec2 uv = curve(vUv, uCurvature);

  // 곡률로 화면 밖으로 나간 영역은 검정.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // 색수차 — 화면 중심에서 멀수록 RGB 분리.
  vec2 px = uAberration / uResolution;
  vec2 dir = (uv - 0.5);
  float r = texture(uTex, uv + dir * px.x).r;
  float g = texture(uTex, uv).g;
  float b = texture(uTex, uv - dir * px.x).b;
  vec3 col = vec3(r, g, b);

  // 값싼 글로우 근사 — 이웃 4탭 평균 중 "밝은 부분만" 가산(threshold).
  // 무차별 가산은 밝은 씬을 워시아웃시키므로, 임계값(0.6) 초과분만 블룸한다.
  if (uBloom > 0.0) {
    vec2 o = 1.5 / uResolution;
    vec3 sum = texture(uTex, uv + vec2(o.x, 0.0)).rgb
             + texture(uTex, uv - vec2(o.x, 0.0)).rgb
             + texture(uTex, uv + vec2(0.0, o.y)).rgb
             + texture(uTex, uv - vec2(0.0, o.y)).rgb;
    vec3 bright = max(sum * 0.25 - vec3(0.6), 0.0);
    col += bright * uBloom;
  }

  // 스캔라인 — 세로 방향 명암 변조(시간에 따라 미세 스크롤).
  if (uScanline > 0.0) {
    float line = sin((uv.y * uResolution.y * 3.14159) + uTime * 2.0);
    col *= 1.0 - uScanline * (0.5 + 0.5 * line) * 0.5;
  }

  // 필름 그레인.
  if (uGrain > 0.0) {
    float n = hash(uv * uResolution + uTime * 60.0) - 0.5;
    col += n * uGrain;
  }

  // 비네팅.
  if (uVignette > 0.0) {
    float d = distance(uv, vec2(0.5));
    col *= 1.0 - uVignette * smoothstep(0.4, 0.85, d);
  }

  col *= uTint;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
