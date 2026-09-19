import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TEX } from './earth-textures';

const EarthBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !mountRef.current) return;

    const deg = Math.PI / 180;
    const canvas = canvasRef.current;
    
    // Fix: Disable FLIP_Y and PREMULTIPLY_ALPHA before Three.js creates its internal 3D LUT textures.
    // WebGL2 forbids these flags on texImage3D; Three.js v0.186 triggers this during renderer init.
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (gl) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl || undefined, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    // We will make the scene transparent so the CSS background shows through, or just use the color
    // scene.background = new THREE.Color(0x02040a); 
    // Actually, setting alpha: true and no background allows blending if needed, but 0x02040a is fine.
    
    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* lat/lon -> local position. lon 0 sits on +x (centre of an equirectangular map on a three.js sphere). */
    function ll(lat: number, lon: number, r?: number) {
      const la = lat * deg, lo = lon * deg;
      return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(r === undefined ? 1 : r);
    }
    const easeInOut = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    // Place sun behind and slightly to the side/top to create a night-time scene with a rim light
    const sunDir = new THREE.Vector3(-0.5, 0.3, -0.8).normalize();

    /* ---------- glow texture ---------- */
    function glowTexture() {
      const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
      const g = c.getContext('2d');
      if (!g) return new THREE.CanvasTexture(c);
      const gr = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
      gr.addColorStop(0, 'rgba(255,240,200,1)');
      gr.addColorStop(.18, 'rgba(255,205,110,.7)');
      gr.addColorStop(.5, 'rgba(255,170,50,.16)');
      gr.addColorStop(1, 'rgba(255,150,30,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return new THREE.CanvasTexture(c);
    }
    const glowTex = glowTexture();

    /* ---------- stars ---------- */
    const starsGeo = new THREE.BufferGeometry();
    const starsMat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: .9, depthWrite: false });
    const starsPts = new THREE.Points(starsGeo, starsMat);
    (function stars() {
      const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), R = 80;
        pos.set([R * r * Math.cos(a), R * u, R * r * Math.sin(a)], i * 3);
        const b = Math.pow(Math.random(), 3) * .85 + .15, warm = Math.random();
        col.set([b, b * (.9 + .1 * warm), b * (.85 + .15 * (1 - warm))], i * 3);
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      starsGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      starsPts.frustumCulled = false; scene.add(starsPts);
    })();

    /* ---------- globe ---------- */
    const globe = new THREE.Group();
    globe.rotation.order = 'XYZ';
    const GLOBE_SCALE = 6.0;
    globe.scale.setScalar(GLOBE_SCALE);
    scene.add(globe);

    const loader = new THREE.TextureLoader();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    function tex(url: string) { const t = loader.load(url); t.anisotropy = Math.min(8, maxAniso); return t; }
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
    const earthGeo = new THREE.SphereGeometry(1, 128, 96);
    const earth = new THREE.Mesh(earthGeo, earthMat);
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
    const cloudGeo = new THREE.SphereGeometry(1.009, 96, 72);
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
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
    const atmoGeo = new THREE.SphereGeometry(1.06, 96, 72);
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    atmo.scale.setScalar(GLOBE_SCALE);
    scene.add(atmo);

    /* ---------- network model ---------- */
    const H: any = {
      na:   { ll: [39.0, -96.5], big: 1 },
      gulf: { ll: [28.5, -92.0], big: 1 },
      sf:   { ll: [37.5, -122.0] },
      ny:   { ll: [41.0, -74.0] }, mia: { ll: [25.8, -80.2] }, mex: { ll: [19.4, -99.0] },
      sp:   { ll: [-23.5, -46.6] }, bog: { ll: [4.7, -74.0] },
      lon:  { ll: [51.5, -0.1], big: 1 },
      fra:  { ll: [50.0, 8.7] }, mad: { ll: [40.4, -3.7] }, ist: { ll: [41.0, 29.0] },
      cai:  { ll: [30.0, 31.2] }, lag: { ll: [6.5, 3.4] }, jnb: { ll: [-26.2, 28.0] }, nbo: { ll: [-1.3, 36.8] },
      dxb:  { ll: [25.2, 55.3] }, bom: { ll: [19.0, 72.9] },
      sin:  { ll: [1.35, 103.8], big: 1 },
      hkg:  { ll: [22.3, 114.2] }, sel: { ll: [37.5, 127.0] }, syd: { ll: [-33.9, 151.2] },
      tyo:  { ll: [35.7, 139.7], big: 1 }
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

    const nodes: any = {};
    const nodeMatBase = new THREE.MeshBasicMaterial({ color: 0xffc85a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ringGeo = new THREE.RingGeometry(0.86, 1, 56);
    const thinRingGeo = new THREE.RingGeometry(0.5, 0.56, 56);
    const dotGeo = new THREE.CircleGeometry(0.24, 20);
    const zAxis = new THREE.Vector3(0, 0, 1);

    function makeNode(key: string, latlon: number[], big: boolean, isGrid: boolean) {
      const r = big ? 0.026 : 0.0115;
      const p = ll(latlon[0], latlon[1], 1.004);
      const g = new THREE.Group();
      g.position.copy(p);
      g.quaternion.setFromUnitVectors(zAxis, p.clone().normalize());
      const dot = new THREE.Mesh(dotGeo, nodeMatBase.clone()); dot.scale.setScalar(r);
      const thin = new THREE.Mesh(thinRingGeo, nodeMatBase.clone()); thin.scale.setScalar(r); thin.material.opacity = .8;
      const pulses = [0, 1].map(() => {
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
    SEARCH.forEach(s => makeNode(s.key, s.ll, !!s.big, true));

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
    const arcs: any[] = [];
    function makeArc(a: string, b: string, isQuery: boolean) {
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
      const arc = { a: na, b: nb, mesh, mat, pts, geo, ang, started: false, t0: 0, dur: 1.5 + ang * 1.5, prog: 0, packets: [] as any[], isQuery: !!isQuery };
      for (let i = 0; i < n; i++) arc.packets.push({ off: Math.random(), speed: 0.09 + Math.random() * 0.1 / (0.5 + ang) });
      arcs.push(arc);
      return arc;
    }
    LINKS.forEach(l => makeArc(l[0], l[1], false));
    QUERY_LINKS.forEach(l => makeArc(l[0], l[1], true));

    /* packets (moving bright points) */
    let packetCount = 0;
    arcs.forEach(a => a.packets.forEach((p: any) => { p.idx = packetCount++; }));
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
    let gridLinesGeo: THREE.BufferGeometry;
    let gridLinesMat: THREE.ShaderMaterial;
    let gridCellGeo: THREE.BufferGeometry;
    let gridCellMat: THREE.ShaderMaterial;
    
    (function buildGrid() {
      const R = 1.004, sub = 22;
      const pos: number[] = [], uv: number[] = [], edge: number[] = [];
      function line(f: (t:number)=>any) {
        for (let i = 0; i < sub; i++) {
          const p0 = f(i / sub), p1 = f((i + 1) / sub);
          pos.push(p0.p.x, p0.p.y, p0.p.z, p1.p.x, p1.p.y, p1.p.z);
          uv.push(p0.u, p0.v, p1.u, p1.v);
          edge.push(p0.e, p1.e);
        }
      }
      const latAt = (j:number) => G.lat0 + (G.lat1 - G.lat0) * j / G.rows;
      const lonAt = (i:number) => G.lon0 + (G.lon1 - G.lon0) * i / G.cols;
      for (let j = 0; j <= G.rows; j++) {
        const e = (j === 0 || j === G.rows) ? 1 : 0;
        line(t => ({ p: ll(latAt(j), G.lon0 + (G.lon1 - G.lon0) * t, R), u: t, v: j / G.rows, e }));
      }
      for (let i = 0; i <= G.cols; i++) {
        const e = (i === 0 || i === G.cols) ? 1 : 0;
        line(t => ({ p: ll(G.lat0 + (G.lat1 - G.lat0) * t, lonAt(i), R), u: i / G.cols, v: t, e }));
      }
      gridLinesGeo = new THREE.BufferGeometry();
      gridLinesGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      gridLinesGeo.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2));
      gridLinesGeo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
      gridLinesMat = new THREE.ShaderMaterial({
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
      const ls = new THREE.LineSegments(gridLinesGeo, gridLinesMat); ls.frustumCulled = false; gridGroup.add(ls);

      /* highlighted cells */
      const cells = [[1,1],[2,4],[4,2],[5,6],[3,8],[6,3],[1,7],[5,9]];
      const cp: number[] = [], cph: number[] = [];
      cells.forEach((c) => {
        const j = c[0], i = c[1], N = 4, phase = Math.random() * 6.28;
        const la0 = latAt(j), la1 = latAt(j + 1), lo0 = lonAt(i), lo1 = lonAt(i + 1);
        const P = (a:number, b:number) => ll(la0 + (la1 - la0) * a, lo0 + (lo1 - lo0) * b, 1.0035);
        for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
          const A = P(x / N, y / N), B = P((x + 1) / N, y / N), C = P((x + 1) / N, (y + 1) / N), D = P(x / N, (y + 1) / N);
          [A, B, C, A, C, D].forEach(v => { cp.push(v.x, v.y, v.z); cph.push(phase); });
        }
      });
      gridCellGeo = new THREE.BufferGeometry();
      gridCellGeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      gridCellGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(cph, 1));
      gridCellMat = new THREE.ShaderMaterial({
        uniforms: gridUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `attribute float aPhase; varying float vP; void main() { vP = aPhase; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float uTime, uFade; varying float vP;
          void main() { float a = (0.05 + 0.13 * (0.5 + 0.5 * sin(uTime * 1.4 + vP))) * uFade; gl_FragColor = vec4(vec3(1.0, 0.72, 0.28) * a, a); }`
      });
      const cellMesh = new THREE.Mesh(gridCellGeo, gridCellMat); cellMesh.frustumCulled = false; gridGroup.add(cellMesh);
    })();
    const gridCentre = ll((G.lat0 + G.lat1) / 2, (G.lon0 + G.lon1) / 2, 1.004);
    const gridState = { started: false, t0: 0 };

    /* ---------- interaction ---------- */
    // Instead of tour, we just use auto rotation and mouse parallax
    // We want the Earth to appear lower in the viewport so it feels enormous and only the top hemisphere is visible.
    // The user states: "Earth center vertically: roughly 75–90% of the hero height"
    // "Globe diameter: roughly 120–160% of the hero viewport width"
    // We can achieve this by pushing the camera UP or the globe DOWN, and zooming IN.
    
    // We'll set a base tilt and base rotation.
    const BASE_TILT = 0.4;
    globe.rotation.x = BASE_TILT;
    
    let autoRotY = -Math.PI / 2 - 20 * deg; // starting lon
    let mouseShiftY = 0;
    let mouseShiftX = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (reduceMotion) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const nx = (e.clientX - cx) / cx;
      const ny = (e.clientY - cy) / cy;
      
      mouseShiftY = nx * 0.4; // 0.4 rad max shift
      mouseShiftX = ny * 0.2; // 0.2 rad max tilt
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; 
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); 
    resize();

    /* ---------- loop ---------- */
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3(), camN = new THREE.Vector3();
    let lastT = 0;
    let rafId: number;

    function facing(localPos: THREE.Vector3) {
      tmp.copy(localPos).applyQuaternion(globe.quaternion).normalize();
      camN.copy(camera.position).normalize();
      return tmp.dot(camN);
    }

    function frame() {
      rafId = requestAnimationFrame(frame);
      clock.getDelta(); const t = clock.elapsedTime, dt = Math.min(0.05, t - lastT); lastT = t;

      /* camera setup to compose the large bottom-heavy Earth */
      const aspect = camera.aspect;
      // We scaled the Earth by 6, so its radius is 6.
      // We want the horizon (y=6) to sit exactly in the vertical middle of the screen (below "Simplicity").
      // By placing the camera exactly at yOffset=6.0, the horizon aligns perfectly with the center.
      const z = 4.0 * (aspect < 1 ? Math.pow(1 / aspect, 0.5) : 1);
      
      const yOffset = 6.0; // Moves camera to y=6.0, aligning the top of the Earth with the vertical center
      
      camera.position.set(0, yOffset, z); 
      camera.lookAt(0, yOffset, 0);

      /* rotation */
      if (!reduceMotion) {
        autoRotY += dt * 0.035; // slow automatic rotation
      }
      const targetY = autoRotY + mouseShiftY;
      const targetX = BASE_TILT + mouseShiftX;

      globe.rotation.y += (targetY - globe.rotation.y) * (1 - Math.exp(-dt * 3.0));
      globe.rotation.x += (targetX - globe.rotation.x) * (1 - Math.exp(-dt * 3.0));
      clouds.rotation.y += dt * 0.0022;

      /* nodes reveal + pulses */
      Object.values(nodes).forEach((n: any) => {
        if (n.t0 < 0 && facing(n.pos) > 0.12) { n.t0 = t + Math.random() * 0.5; }
        if (n.t0 >= 0 && t >= n.t0) {
          n.group.visible = true;
          const k = easeInOut(clamp01((t - n.t0) / 0.9));
          n.group.scale.setScalar(Math.max(0.0001, k));
          n.pulses.forEach((m: any, i: number) => {
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
        a.packets.forEach((p: any) => {
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
      const gTarget = (gridState.started) ? easeInOut(clamp01((t - gridState.t0) / 1.6)) : 0;
      gridUniforms.uFade.value += (gTarget - gridUniforms.uFade.value) * (1 - Math.exp(-dt * 6));
      gridUniforms.uTime.value = t;
      const scan = (t * 0.11) % 1;
      gridUniforms.uScan.value = scan;
      gridGroup.visible = gridUniforms.uFade.value > 0.002;

      renderer.render(scene, camera);
    }
    frame();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      
      // Cleanup Three.js resources
      renderer.dispose();
      
      earthGeo.dispose();
      earthMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      packetGeo.dispose();
      packetPts.material.dispose();
      
      if (gridLinesGeo) gridLinesGeo.dispose();
      if (gridLinesMat) gridLinesMat.dispose();
      if (gridCellGeo) gridCellGeo.dispose();
      if (gridCellMat) gridCellMat.dispose();
      
      ringGeo.dispose();
      thinRingGeo.dispose();
      dotGeo.dispose();
      nodeMatBase.dispose();
      glowTex.dispose();
      dayTex.dispose();
      lightsTex.dispose();
      specTex.dispose();
      cloudTex.dispose();
      
      arcs.forEach(a => {
        if(a.geo) a.geo.dispose();
        if(a.mat) a.mat.dispose();
      });
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -10,
        overflow: 'hidden',
        background: '#020408',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      
      {/* Deep space vignette — radial dark edges, stronger at corners */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(2,4,8,0.55) 70%, rgba(2,4,8,0.92) 100%)',
        }}
      />

      {/* Bottom fade — keeps login text highly readable */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background:
            'linear-gradient(to bottom, transparent, rgba(2,4,8,0.7) 60%, rgba(2,4,8,0.95) 100%)',
        }}
      />

      {/* Subtle cyan atmospheric rim at horizon */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 40% at 50% 62%, rgba(6,182,212,0.06) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

export default EarthBackground;
