
(function () {
'use strict';



const deg = Math.PI / 180;
const canvas = document.getElementById('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  document.getElementById('msg').style.display = 'flex';
  return;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { tour: !reduceMotion, labels: true, grid: true, zoom: 2.5, tilt: 0.44 };

/* lat/lon -> local position. lon 0 sits on +x (centre of an equirectangular map on a three.js sphere). */
function ll(lat, lon, r) {
  const la = lat * deg, lo = lon * deg;
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(r === undefined ? 1 : r);
}
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = x => Math.max(0, Math.min(1, x));

const sunDir = new THREE.Vector3(0.62, 0.38, 0.72).normalize();

/* ---------- glow texture ---------- */
function glowTexture() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), gr = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  gr.addColorStop(0, 'rgba(255,240,200,1)');
  gr.addColorStop(.18, 'rgba(255,205,110,.7)');
  gr.addColorStop(.5, 'rgba(255,170,50,.16)');
  gr.addColorStop(1, 'rgba(255,150,30,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}
const glowTex = glowTexture();

/* ---------- stars ---------- */
(function stars() {
  const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), R = 80;
    pos.set([R * r * Math.cos(a), R * u, R * r * Math.sin(a)], i * 3);
    const b = Math.pow(Math.random(), 3) * .85 + .15, warm = Math.random();
    col.set([b, b * (.9 + .1 * warm), b * (.85 + .15 * (1 - warm))], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: .9, depthWrite: false });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p);
})();

/* ---------- globe ---------- */
const globe = new THREE.Group();
globe.rotation.order = 'XYZ';
scene.add(globe);

const loader = new THREE.TextureLoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function tex(url) { const t = loader.load(url); t.anisotropy = Math.min(8, maxAniso); return t; }
const dayTex = tex(TEX.day), lightsTex = tex(TEX.lights), specTex = tex(TEX.spec), cloudTex = tex(TEX.clouds);

const earthMat = new THREE.ShaderMaterial({
  uniforms: { dayMap: { value: dayTex }, nightMap: { value: lightsTex }, specMap: { value: specTex }, sunDir: { value: sunDir } },
  vertexShader: `
    varying vec2 vUv; varying vec3 vN; varying vec3 vView;
    void main() {
      vUv = uv;
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vView = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform sampler2D dayMap, nightMap, specMap; uniform vec3 sunDir;
    varying vec2 vUv; varying vec3 vN; varying vec3 vView;
    void main() {
      vec3 n = normalize(vN), v = normalize(vView);
      float ndl = dot(n, sunDir);
      float d = smoothstep(-0.14, 0.30, ndl);
      vec3 day = pow(texture2D(dayMap, vUv).rgb, vec3(1.18)) * 0.92;
      vec3 lit = day * (0.05 + 0.95 * pow(max(ndl, 0.0), 0.85));
      float tw = smoothstep(-0.18, 0.02, ndl) * (1.0 - smoothstep(0.02, 0.34, ndl));
      lit += vec3(0.95, 0.4, 0.12) * tw * 0.10;
      vec3 nightBase = day * vec3(0.03, 0.05, 0.095);
      float l = dot(texture2D(nightMap, vUv).rgb, vec3(0.3333));
      vec3 city = vec3(1.0, 0.72, 0.30) * pow(l, 0.75);
      vec3 nightC = nightBase + city * 1.55;
      vec3 col = mix(nightC, lit + city * 0.42, d);
      float spec = texture2D(specMap, vUv).r;
      vec3 h = normalize(sunDir + v);
      col += vec3(0.75, 0.88, 1.0) * pow(max(dot(n, h), 0.0), 55.0) * spec * d * 0.42;
      col += vec3(0.02, 0.06, 0.15) * spec * (0.35 + 0.65 * d);
      float f = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      col += vec3(0.20, 0.44, 1.0) * f * 0.55 * (0.25 + 0.75 * d);
      gl_FragColor = vec4(col, 1.0);
    }`
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), earthMat);
globe.add(earth);

const cloudMat = new THREE.ShaderMaterial({
  uniforms: { cloudMap: { value: cloudTex }, sunDir: { value: sunDir } },
  transparent: true, depthWrite: false,
  vertexShader: `
    varying vec2 vUv; varying vec3 vN;
    void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D cloudMap; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vN;
    void main() {
      float ndl = dot(normalize(vN), sunDir);
      float d = smoothstep(-0.12, 0.3, ndl);
      vec3 c = mix(vec3(0.03, 0.04, 0.07), vec3(1.0, 0.98, 0.95), d) * (0.35 + 0.75 * max(ndl, 0.0) + 0.25 * d);
      float a = texture2D(cloudMap, vUv).a * 0.8;
      gl_FragColor = vec4(c, a);
    }`
});
const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.009, 96, 72), cloudMat);
globe.add(clouds);

const atmoMat = new THREE.ShaderMaterial({
  transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { sunDir: { value: sunDir } },
  vertexShader: `
    varying vec3 vN; varying vec3 vView;
    void main() {
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vView = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform vec3 sunDir; varying vec3 vN; varying vec3 vView;
    void main() {
      float d = dot(normalize(vN), normalize(vView));
      float i = pow(clamp(-d / 0.34, 0.0, 1.0), 1.7);
      i *= smoothstep(0.0, 0.08, -d);
      float lit = 0.35 + 0.65 * smoothstep(-0.4, 0.5, dot(normalize(vN), sunDir));
      gl_FragColor = vec4(vec3(0.24, 0.5, 1.0) * i * 0.95 * lit, i);
    }`
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 72), atmoMat));

/* ---------- network model ---------- */
const H = {
  na:   { ll: [39.0, -96.5], big: 1, tag: 'User_DB_01', off: [-46, -52] },
  gulf: { ll: [28.5, -92.0], big: 1, tag: 'Cloud_Sys_X', off: [40, 44] },
  sf:   { ll: [37.5, -122.0], tag: 'User_DB_02', off: [-40, -44] },
  ny:   { ll: [41.0, -74.0] }, mia: { ll: [25.8, -80.2] }, mex: { ll: [19.4, -99.0] },
  sp:   { ll: [-23.5, -46.6] }, bog: { ll: [4.7, -74.0] },
  lon:  { ll: [51.5, -0.1], big: 1, tag: 'Edge_Node_EU', off: [-40, -48] },
  fra:  { ll: [50.0, 8.7] }, mad: { ll: [40.4, -3.7] }, ist: { ll: [41.0, 29.0] },
  cai:  { ll: [30.0, 31.2] }, lag: { ll: [6.5, 3.4] }, jnb: { ll: [-26.2, 28.0] }, nbo: { ll: [-1.3, 36.8] },
  dxb:  { ll: [25.2, 55.3] }, bom: { ll: [19.0, 72.9] },
  sin:  { ll: [1.35, 103.8], big: 1, tag: 'Cloud_Sys_Y', off: [42, 40] },
  hkg:  { ll: [22.3, 114.2] }, sel: { ll: [37.5, 127.0] }, syd: { ll: [-33.9, 151.2] },
  tyo:  { ll: [35.7, 139.7], big: 1, tag: 'Index_Node_JP', off: [-44, -46] }
};
const LINKS = [
  ['na','sf'],['na','ny'],['na','gulf'],['na','mia'],['na','mex'],['na','sp'],['na','lon'],['na','fra'],['na','tyo'],['na','bog'],
  ['gulf','mia'],['gulf','sp'],['gulf','lon'],['ny','lon'],['sf','tyo'],['sf','syd'],
  ['lon','fra'],['lon','mad'],['lon','ist'],['fra','ist'],['fra','dxb'],['lon','cai'],['lon','lag'],['mad','lag'],
  ['cai','nbo'],['lag','jnb'],['nbo','jnb'],['dxb','bom'],['bom','sin'],['sin','hkg'],['hkg','tyo'],['tyo','sel'],
  ['sin','syd'],['dxb','sin'],['ist','bom'],['sp','lag'],['mex','bog'],['sel','hkg'],['cai','dxb']
];

/* retrieval grid patch (Pacific) */
const G = { lat0: 2, lat1: 28, lon0: -164, lon1: -122, rows: 7, cols: 10 };
const SEARCH = [
  { key: 'gridMain', ll: [14, -142], big: 1 },
  { key: 's1', ll: [6, -156] }, { key: 's2', ll: [22, -130] }, { key: 's3', ll: [9, -128] }, { key: 's4', ll: [24, -158] }
];
const QUERY_LINKS = [['sf','gridMain'],['gulf','gridMain'],['na','gridMain'],['tyo','gridMain'],['gridMain','s1'],['gridMain','s2'],['gridMain','s3'],['gridMain','s4']];

const network = new THREE.Group();
globe.add(network);

const nodes = {};
const nodeMatBase = new THREE.MeshBasicMaterial({ color: 0xffc85a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const ringGeo = new THREE.RingGeometry(0.86, 1, 56);
const thinRingGeo = new THREE.RingGeometry(0.5, 0.56, 56);
const dotGeo = new THREE.CircleGeometry(0.24, 20);
const zAxis = new THREE.Vector3(0, 0, 1);

function makeNode(key, latlon, big, isGrid) {
  const r = big ? 0.026 : 0.0115;
  const p = ll(latlon[0], latlon[1], 1.004);
  const g = new THREE.Group();
  g.position.copy(p);
  g.quaternion.setFromUnitVectors(zAxis, p.clone().normalize());
  const dot = new THREE.Mesh(dotGeo, nodeMatBase.clone()); dot.scale.setScalar(r);
  const thin = new THREE.Mesh(thinRingGeo, nodeMatBase.clone()); thin.scale.setScalar(r); thin.material.opacity = .8;
  const pulses = [0, 1].map(i => {
    const m = new THREE.Mesh(ringGeo, nodeMatBase.clone()); g.add(m); return m;
  });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 }));
  glow.scale.setScalar(r * 6.5);
  g.add(dot, thin, glow);
  g.scale.setScalar(0.0001);
  g.visible = false;
  network.add(g);
  nodes[key] = { key, pos: p, group: g, r, pulses, dot, thin, glow, t0: -1, seed: Math.random(), isGrid: !!isGrid, shown: false };
  return nodes[key];
}
Object.keys(H).forEach(k => makeNode(k, H[k].ll, H[k].big, false));
SEARCH.forEach(s => makeNode(s.key, s.ll, s.big, true));

/* arcs */
const arcVert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const arcFrag = `
  uniform float uProg, uTime, uSeed, uAlpha; varying vec2 vUv;
  void main() {
    if (vUv.x > uProg) discard;
    float travel = pow(max(0.0, sin((vUv.x * 2.6 - uTime * 0.32 + uSeed) * 6.2831853)), 10.0);
    float tip = exp(-pow((uProg - vUv.x) * 26.0, 2.0)) * step(uProg, 0.995);
    float a = (0.34 + 0.75 * travel + 1.0 * tip) * uAlpha;
    gl_FragColor = vec4(vec3(1.0, 0.72, 0.26) * a, a);
  }`;
const arcs = [];
const packetPos = [];
function makeArc(a, b, isQuery) {
  const na = nodes[a], nb = nodes[b];
  const va = na.pos.clone().normalize(), vb = nb.pos.clone().normalize();
  const ang = va.angleTo(vb);
  const h = 0.018 + ang * 0.15;
  const c1 = va.clone().lerp(vb, 0.33).normalize().multiplyScalar(1 + h * 1.35);
  const c2 = va.clone().lerp(vb, 0.66).normalize().multiplyScalar(1 + h * 1.35);
  const curve = new THREE.CubicBezierCurve3(na.pos.clone(), c1, c2, nb.pos.clone());
  const geo = new THREE.TubeGeometry(curve, Math.max(40, Math.round(ang * 90)), isQuery ? 0.0014 : 0.0017, 5, false);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uProg: { value: 0 }, uTime: { value: 0 }, uSeed: { value: Math.random() }, uAlpha: { value: 1 } },
    vertexShader: arcVert, fragmentShader: arcFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  network.add(mesh);
  const pts = curve.getPoints(120);
  const n = 1 + (ang > 0.9 ? 1 : 0);
  const arc = { a: na, b: nb, mesh, mat, pts, ang, started: false, t0: 0, dur: 1.5 + ang * 1.5, prog: 0, packets: [], isQuery: !!isQuery };
  for (let i = 0; i < n; i++) arc.packets.push({ off: Math.random(), speed: 0.09 + Math.random() * 0.1 / (0.5 + ang) });
  arcs.push(arc);
  return arc;
}
LINKS.forEach(l => makeArc(l[0], l[1], false));
QUERY_LINKS.forEach(l => makeArc(l[0], l[1], true));

/* packets (moving bright points) */
let packetCount = 0;
arcs.forEach(a => a.packets.forEach(p => { p.idx = packetCount++; }));
const packetGeo = new THREE.BufferGeometry();
const packetArr = new Float32Array(packetCount * 3);
packetGeo.setAttribute('position', new THREE.BufferAttribute(packetArr, 3));
const packetPts = new THREE.Points(packetGeo, new THREE.PointsMaterial({
  map: glowTex, size: 0.03, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2a0
}));
packetPts.frustumCulled = false;
network.add(packetPts);

/* retrieval grid */
const gridGroup = new THREE.Group(); network.add(gridGroup);
const gridUniforms = { uTime: { value: 0 }, uScan: { value: 0 }, uFade: { value: 0 } };
(function buildGrid() {
  const R = 1.004, sub = 22;
  const pos = [], uv = [], edge = [];
  function line(f) {
    for (let i = 0; i < sub; i++) {
      const p0 = f(i / sub), p1 = f((i + 1) / sub);
      pos.push(p0.p.x, p0.p.y, p0.p.z, p1.p.x, p1.p.y, p1.p.z);
      uv.push(p0.u, p0.v, p1.u, p1.v);
      edge.push(p0.e, p1.e);
    }
  }
  const latAt = j => G.lat0 + (G.lat1 - G.lat0) * j / G.rows;
  const lonAt = i => G.lon0 + (G.lon1 - G.lon0) * i / G.cols;
  for (let j = 0; j <= G.rows; j++) {
    const e = (j === 0 || j === G.rows) ? 1 : 0;
    line(t => ({ p: ll(latAt(j), G.lon0 + (G.lon1 - G.lon0) * t, R), u: t, v: j / G.rows, e }));
  }
  for (let i = 0; i <= G.cols; i++) {
    const e = (i === 0 || i === G.cols) ? 1 : 0;
    line(t => ({ p: ll(G.lat0 + (G.lat1 - G.lat0) * t, lonAt(i), R), u: i / G.cols, v: t, e }));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: gridUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 aUV; attribute float aEdge; varying vec2 vUv; varying float vE;
      void main() { vUv = aUV; vE = aEdge; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uScan, uFade; varying vec2 vUv; varying float vE;
      void main() {
        float d = vUv.x - uScan;
        float scan = exp(-pow(d * 9.0, 2.0)) + 0.35 * exp(-pow((d + 0.12) * 5.0, 2.0)) * step(d, 0.0);
        float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        float a = (0.42 + 0.5 * vE + 0.9 * scan) * uFade * (0.55 + 0.45 * edgeFade);
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.34) * a, a);
      }`
  });
  const ls = new THREE.LineSegments(geo, mat); ls.frustumCulled = false; gridGroup.add(ls);

  /* highlighted cells */
  const cells = [[1,1],[2,4],[4,2],[5,6],[3,8],[6,3],[1,7],[5,9]];
  const cp = [], cph = [];
  cells.forEach((c, ci) => {
    const j = c[0], i = c[1], N = 4, phase = Math.random() * 6.28;
    const la0 = latAt(j), la1 = latAt(j + 1), lo0 = lonAt(i), lo1 = lonAt(i + 1);
    const P = (a, b) => ll(la0 + (la1 - la0) * a, lo0 + (lo1 - lo0) * b, 1.0035);
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const A = P(x / N, y / N), B = P((x + 1) / N, y / N), C = P((x + 1) / N, (y + 1) / N), D = P(x / N, (y + 1) / N);
      [A, B, C, A, C, D].forEach(v => { cp.push(v.x, v.y, v.z); cph.push(phase); });
    }
  });
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  cg.setAttribute('aPhase', new THREE.Float32BufferAttribute(cph, 1));
  const cm = new THREE.ShaderMaterial({
    uniforms: gridUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute float aPhase; varying float vP; void main() { vP = aPhase; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime, uFade; varying float vP;
      void main() { float a = (0.05 + 0.13 * (0.5 + 0.5 * sin(uTime * 1.4 + vP))) * uFade; gl_FragColor = vec4(vec3(1.0, 0.72, 0.28) * a, a); }`
  });
  const cellMesh = new THREE.Mesh(cg, cm); cellMesh.frustumCulled = false; gridGroup.add(cellMesh);
})();
const gridCentre = ll((G.lat0 + G.lat1) / 2, (G.lon0 + G.lon1) / 2, 1.004);
const gridTop = ll(G.lat1, (G.lon0 + G.lon1) / 2, 1.004);
const gridState = { started: false, t0: 0 };

/* ---------- labels ---------- */
const labelHost = document.getElementById('labels');
const labels = [];
function addLabel(o) {
  const el = document.createElement('div');
  el.className = 'tag ' + (o.cls || '');
  const ln = document.createElement('div'); ln.className = 'ln';
  const dot = document.createElement('div'); dot.className = 'dot';
  const box = document.createElement('div'); box.className = 'box'; box.innerHTML = o.html;
  const [ox, oy] = o.off;
  const L = Math.hypot(ox, oy);
  ln.style.width = L + 'px'; ln.style.transform = 'rotate(' + Math.atan2(oy, ox) + 'rad)';
  box.style.left = ox + 'px'; box.style.top = oy + 'px';
  box.style.transform = ox < 0 ? 'translate(-100%,-50%)' : 'translate(0,-50%)';
  el.append(ln, dot, box);
  labelHost.appendChild(el);
  const rec = Object.assign({ el, cur: 0, v: new THREE.Vector3(), needs: null }, o);
  labels.push(rec);
  return rec;
}
Object.keys(H).forEach(k => {
  if (H[k].tag) addLabel({ html: H[k].tag, off: H[k].off, node: nodes[k], anchor: () => nodes[k].pos });
});
const lblGrid = addLabel({
  cls: 'panel', off: [-10, -64], gridLabel: true, anchor: () => gridTop,
  html: 'Retrieval Grid<small id="shard">Scanning shard 01 / 10</small><span class="bar"><i id="shardBar"></i></span>'
});
addLabel({ cls: 'chip', html: 'Search Result', off: [34, 36], node: nodes.gridMain, anchor: () => nodes.gridMain.pos, gridLabel: true });
const pktArc = arcs.find(a => a.a === nodes.ny && a.b === nodes.lon) || arcs[0];
addLabel({ cls: 'chip', html: 'data packets', off: [30, -34], arcFollow: pktArc,
  anchor: () => { const p = pktArc.packets[0]; return new THREE.Vector3(packetArr[p.idx*3], packetArr[p.idx*3+1], packetArr[p.idx*3+2]); } });
const shardEl = document.getElementById('shard'), shardBar = document.getElementById('shardBar');

/* ---------- interaction ---------- */
const lonList = [20, -95, -145, -255];
const tiltList = [0.44, 0.42, 0.2, 0.4];
const tourLon = k => lonList[((k % 4) + 4) % 4] - 360 * Math.floor(k / 4);
const rotForLon = lon => -(Math.PI / 2 + lon * deg);
let wi = 0, wpT = 0;
globe.rotation.y = rotForLon(tourLon(0));
globe.rotation.x = state.tilt;

const bTour = document.getElementById('bTour'), bLabels = document.getElementById('bLabels'),
      bGrid = document.getElementById('bGrid'), bReplay = document.getElementById('bReplay'), hint = document.getElementById('hint');
function setPressed(b, v) { b.setAttribute('aria-pressed', v ? 'true' : 'false'); }
setPressed(bTour, state.tour);

function resumeTour() {
  const lonCur = -(globe.rotation.y / deg) - 90;
  let best = 0, bd = 1e9;
  for (let k = -12; k <= 12; k++) { const d = Math.abs(tourLon(k) - lonCur); if (d < bd) { bd = d; best = k; } }
  wi = best; wpT = clock.elapsedTime;
}
bTour.onclick = () => { state.tour = !state.tour; setPressed(bTour, state.tour); if (state.tour) resumeTour(); };
bLabels.onclick = () => { state.labels = !state.labels; setPressed(bLabels, state.labels); };
bGrid.onclick = () => { state.grid = !state.grid; setPressed(bGrid, state.grid); };
bReplay.onclick = () => {
  Object.values(nodes).forEach(n => { n.t0 = -1; n.shown = false; n.group.visible = false; n.group.scale.setScalar(0.0001); });
  arcs.forEach(a => { a.started = false; a.prog = 0; a.mat.uniforms.uProg.value = 0; });
  gridState.started = false; gridUniforms.uFade.value = 0;
  wi = 0; wpT = clock.elapsedTime; state.tour = true; setPressed(bTour, true);
  globe.rotation.y = rotForLon(tourLon(0) + 40);
};

let dragging = false, lastX = 0, lastY = 0;
const pointers = new Map(); let pinchD = 0;
function userTouched() {
  hint.style.opacity = 0;
  if (state.tour) { state.tour = false; setPressed(bTour, false); }
}
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]);
  dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.classList.add('drag');
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a[0]-b[0], a[1]-b[1]); }
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a[0]-b[0], a[1]-b[1]);
    state.zoom = Math.max(1.75, Math.min(5, state.zoom * (pinchD / d))); pinchD = d; userTouched(); return;
  }
  if (!dragging) return;
  const k = 0.0042 * (state.zoom / 2.5);
  globe.rotation.y += (e.clientX - lastX) * k;
  state.tilt = Math.max(-0.2, Math.min(1.1, state.tilt + (e.clientY - lastY) * k));
  lastX = e.clientX; lastY = e.clientY; userTouched();
});
function endPtr(e) { pointers.delete(e.pointerId); if (!pointers.size) { dragging = false; canvas.classList.remove('drag'); } }
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  state.zoom = Math.max(1.75, Math.min(5, state.zoom * Math.exp(e.deltaY * 0.0012))); userTouched();
}, { passive: false });

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const tmp = new THREE.Vector3(), camN = new THREE.Vector3();
let lastT = 0, autoHint = 0;

function facing(localPos) {
  tmp.copy(localPos).applyQuaternion(globe.quaternion).normalize();
  camN.copy(camera.position).normalize();
  return tmp.dot(camN);
}

function frame() {
  requestAnimationFrame(frame);
  clock.getDelta(); const t = clock.elapsedTime, dt = Math.min(0.05, t - lastT); lastT = t;

  /* camera */
  const aspect = camera.aspect, zoom = state.zoom * (aspect < 1 ? Math.pow(1 / aspect, 0.55) : 1);
  camera.position.set(0, zoom * 0.16, zoom);
  camera.lookAt(0, zoom * 0.1, 0);

  /* tour */
  if (state.tour) {
    const target = rotForLon(tourLon(wi));
    globe.rotation.y += (target - globe.rotation.y) * (1 - Math.exp(-dt * 0.85));
    state.tilt += (tiltList[((wi % 4) + 4) % 4] - state.tilt) * (1 - Math.exp(-dt * 0.8));
    if (t - wpT > 6.5 && Math.abs(target - globe.rotation.y) < 0.03) { wi++; wpT = t; }
    if (t - wpT > 12) { wi++; wpT = t; }
  }
  globe.rotation.x = state.tilt;
  clouds.rotation.y += dt * 0.0022;

  /* nodes reveal + pulses */
  Object.values(nodes).forEach(n => {
    if (n.t0 < 0 && facing(n.pos) > 0.12) { n.t0 = t + Math.random() * 0.5; }
    if (n.t0 >= 0 && t >= n.t0) {
      n.group.visible = true;
      const k = easeInOut(clamp01((t - n.t0) / 0.9));
      n.group.scale.setScalar(Math.max(0.0001, k));
      n.pulses.forEach((m, i) => {
        const ph = ((t * 0.42 + n.seed + i * 0.5) % 1);
        m.scale.setScalar(n.r * (0.9 + 2.6 * ph));
        m.material.opacity = Math.pow(1 - ph, 1.6) * 0.75;
      });
      n.glow.material.opacity = 0.45 + 0.2 * Math.sin(t * 2 + n.seed * 6);
    }
  });

  /* arcs */
  arcs.forEach(a => {
    if (!a.started) {
      const vis = Math.max(facing(a.a.pos), facing(a.b.pos));
      const ready = a.a.t0 >= 0 && t > a.a.t0 + 0.5;
      const ok = a.isQuery ? (gridState.started && ready && vis > 0.25) : (vis > 0.3 && ready);
      if (ok) { a.started = true; a.t0 = t + Math.random() * 1.2; }
    }
    if (a.started) {
      a.prog = easeInOut(clamp01((t - a.t0) / a.dur));
      a.mat.uniforms.uProg.value = a.prog;
    }
    a.mat.uniforms.uTime.value = t;
    a.packets.forEach(p => {
      const i3 = p.idx * 3;
      if (a.prog >= 0.999) {
        const f = ((t * p.speed + p.off) % 1) * (a.pts.length - 1), i = Math.floor(f), w = f - i;
        const A = a.pts[i], B = a.pts[Math.min(i + 1, a.pts.length - 1)];
        packetArr[i3] = A.x + (B.x - A.x) * w; packetArr[i3+1] = A.y + (B.y - A.y) * w; packetArr[i3+2] = A.z + (B.z - A.z) * w;
      } else { packetArr[i3] = packetArr[i3+1] = packetArr[i3+2] = 0; }
    });
  });
  packetGeo.attributes.position.needsUpdate = true;

  /* grid */
  if (!gridState.started && facing(gridCentre) > 0.3) { gridState.started = true; gridState.t0 = t; }
  const gTarget = (gridState.started && state.grid) ? easeInOut(clamp01((t - gridState.t0) / 1.6)) : 0;
  gridUniforms.uFade.value += (gTarget - gridUniforms.uFade.value) * (1 - Math.exp(-dt * 6));
  gridUniforms.uTime.value = t;
  const scan = (t * 0.11) % 1;
  gridUniforms.uScan.value = scan;
  gridGroup.visible = gridUniforms.uFade.value > 0.002;
  const shard = Math.min(G.cols, Math.floor(scan * G.cols) + 1);
  if (shardEl) { shardEl.textContent = 'Scanning shard ' + String(shard).padStart(2, '0') + ' / ' + G.cols; shardBar.style.width = (scan * 100).toFixed(1) + '%'; }

  renderer.render(scene, camera);

  /* labels */
  const w = window.innerWidth, h = window.innerHeight;
  labels.forEach(L => {
    let want = state.labels ? 1 : 0;
    const local = L.anchor();
    L.v.copy(local);
    const f = facing(local);
    if (f < 0.16) want = 0;
    if (L.node && !(L.node.group.visible && L.node.group.scale.x > 0.6)) want = 0;
    if (L.gridLabel && gridUniforms.uFade.value < 0.6) want = 0;
    if (L.arcFollow && L.arcFollow.prog < 0.999) want = 0;
    if (want !== L.cur) { L.el.style.opacity = want; L.cur = want; }
    if (want) {
      globe.localToWorld(L.v).project(camera);
      L.el.style.transform = 'translate3d(' + ((L.v.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-L.v.y * 0.5 + 0.5) * h).toFixed(1) + 'px,0)';
    }
  });
}
setTimeout(function () { hint.style.opacity = 0; }, 9000);
frame();
})();
