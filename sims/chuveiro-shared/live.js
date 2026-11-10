// Placa de pressão para chuveiro, ao vivo: o box em 3D (placa em camadas, válvula e controlador dentro da parede,
// botão de parede), os controles, as leituras e a economia. A lógica da válvula e os litros saem de model.js, a
// mesma conta que alimenta o painel de economia, então o que a cena mostra e o que o painel diz não divergem.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {DEF, PERSON_KG, PLATE, money, phases} from './model.js';

const ACC = new THREE.Color('#0a9fb5');
const BG = '#e9f0f2';
const el = (tag, cls, html, parent) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  parent?.appendChild(e);
  return e;
};
const num = (v, d = 0) => v.toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d});
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.75, metalness: 0, ...o});

// azulejo: n x n peças com rejunte, uma repetição cobre 1,2 m (peças de 30 cm)
function tiles(face, grout, dots = false) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = dots ? face : grout;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = dots ? grout : face;
  if (dots) for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) g.fillRect(i * 32 + 11, j * 32 + 11, 10, 10);
  else for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * 64 + 1.5, j * 64 + 1.5, 61, 61);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const VIEWS = {
  geral: {p: [3.3, 1.9, 4.0], t: [0.05, 1.0, -0.15], ex: 0, xr: 0},
  placa: {p: [1.55, 1.05, 1.85], t: [0.05, 0.2, 0], ex: 1, xr: 0},
  parede: {p: [1.35, 1.5, 1.75], t: [0.12, 1.2, -0.5], ex: 0, xr: 1},
};
const SPOT = {fora: [1.5, 0.35], placa: [0, -0.02], lado: [0.92, -0.18]};
const INPUTS = [
  ['Q', 'Vazão do chuveiro', 'L/min', 6, 20, 1, 0],
  ['T', 'Duração do banho', 'min', 3, 15, 0.5, 1],
  ['soap', 'Tempo ensaboando, fora da água', '%', 10, 70, 5, 0],
  ['delay', 'Atraso de corte ao sair da placa', 's', 0, 6, 0.5, 1],
  ['baths', 'Banhos por chuveiro por dia', '', 5, 120, 5, 0],
  ['showers', 'Chuveiros com placa', '', 1, 40, 1, 0],
  ['days', 'Dias de funcionamento por mês', '', 20, 31, 1, 0],
  ['agua', 'Tarifa de água comercial', 'R$/m³', 3, 25, 0.01, 2],
  ['esgoto', 'Esgoto cobrado sobre a água', '%', 0, 100, 5, 0],
  ['price', 'Investimento por ponto (exemplo)', 'R$', 300, 5000, 50, 0],
];

export function runLive() {
  document.title = 'Placa de pressão para chuveiro';
  document.documentElement.lang = 'pt-BR';
  const app = document.getElementById('app');
  const stage = el('div', 'stage', null, app);
  const canvas = el('canvas', '', null, stage);
  canvas.id = 'gl';

  // ---------- estado ----------
  const S = {mode: 'placa', pos: 'fora', auto: true, speed: 10, outage: false, latch: false, sinceLeave: 1e9, open: false,
    lPlaca: 0, lComum: 0, clock: 0, phase: -1, left: 0, rest: 0.8, view: 'geral', tour: true, tourT: 0, p: {...DEF}};
  let PH = phases(S.p);
  let E = money(S.p);
  const hist = [{t: -1e9, open: false}]; // quando a válvula abriu e fechou: cada gota nasce ou não conforme a hora em que saiu
  let press = 0;

  // ---------- cena ----------
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 7, 15);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);
  camera.position.set(...VIEWS.geral.p);
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(...VIEWS.geral.t);
  Object.assign(orbit, {enableDamping: true, enablePan: false, maxPolarAngle: Math.PI * 0.49, minDistance: 0.8, maxDistance: 8});
  scene.add(new THREE.HemisphereLight('#ffffff', '#aebdc3', 1.9));
  const sun = new THREE.DirectionalLight('#ffffff', 2.6);
  sun.position.set(2.5, 4.5, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -2.6, right: 2.6, top: 3, bottom: -1.5, near: 0.5, far: 12});
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  // tubo reto por trechos, com uma esfera em cada junta
  const UP = new THREE.Vector3(0, 1, 0);
  const pipe = (pts, r, mat) => {
    const v = pts.map((p) => new THREE.Vector3(...p));
    for (let i = 0; i < v.length - 1; i++) {
      const d = v[i + 1].clone().sub(v[i]);
      const m = add(new THREE.CylinderGeometry(r, r, d.length(), 14), mat);
      m.position.copy(v[i]).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
      if (i) add(new THREE.SphereGeometry(r, 14, 10), mat, v[i].x, v[i].y, v[i].z);
    }
  };

  // piso e paredes
  const floorTex = tiles('#e2e9ec', '#c5d1d6');
  floorTex.repeat.set(15, 15);
  const floor = add(new THREE.CircleGeometry(9, 48), std('#ffffff', {map: floorTex}));
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  const wallTex = tiles('#f1f5f6', '#cfdade');
  wallTex.repeat.set(2, 2);
  const wallMat = std('#ffffff', {map: wallTex, transparent: true});
  add(new THREE.BoxGeometry(2.4, 2.4, 0.12), wallMat, 0, 1.2, -0.56).castShadow = false;
  add(new THREE.BoxGeometry(0.03, 2.0, 1.25), std('#bfe3ea', {transparent: true, opacity: 0.28, roughness: 0.2}), -0.72, 1.0, 0.125).castShadow = false;
  const coverMat = std('#dbe4e7', {transparent: true});
  add(new THREE.PlaneGeometry(0.62, 0.3), coverMat, 0.16, 1.35, -0.4985).castShadow = false;

  // hidráulica: entrada, válvula solenoide normalmente fechada, saída, braço e ducha
  const pipeMat = std('#98a6ab');
  const downMat = std('#98a6ab');
  const chrome = std('#cdd6d9', {roughness: 0.35, metalness: 0.15});
  pipe([[0, 0.02, -0.56], [0, 1.31, -0.56]], 0.014, pipeMat);
  pipe([[0, 1.39, -0.56], [0, 2.1, -0.56], [0, 2.1, -0.5]], 0.014, downMat);
  pipe([[0, 2.1, -0.5], [0, 2.085, -0.14], [0, 2.045, -0.14]], 0.013, chrome);
  add(new THREE.CylinderGeometry(0.09, 0.05, 0.03, 36), chrome, 0, 2.03, -0.14);
  const HEAD = new THREE.Vector3(0, 2.012, -0.14);
  add(new THREE.BoxGeometry(0.06, 0.08, 0.06), std('#b39256', {roughness: 0.5, metalness: 0.3}), 0, 1.35, -0.56);
  const coilMat = std('#4a5c64');
  add(new THREE.CylinderGeometry(0.027, 0.027, 0.06, 20), coilMat, 0.06, 1.35, -0.56).rotation.z = Math.PI / 2;

  // elétrica em 12 V: controlador selado, fio até a bobina, fio do botão, cabo vedado até a placa
  const dark = std('#2f3d44');
  add(new THREE.BoxGeometry(0.18, 0.12, 0.05), dark, 0.3, 1.35, -0.56);
  const led = add(new THREE.SphereGeometry(0.009, 12, 8), new THREE.MeshBasicMaterial({color: ACC}), 0.24, 1.385, -0.532);
  pipe([[0.21, 1.35, -0.56], [0.09, 1.35, -0.56]], 0.004, dark);
  pipe([[0.28, 1.0, -0.55], [0.28, 1.29, -0.55]], 0.004, dark);
  pipe([[0.36, 1.29, -0.56], [0.36, 0.03, -0.56], [0.36, 0.008, -0.5], [0.36, 0.008, -0.425]], 0.006, dark);

  // botão de parede a 1,00 m do piso: um toque liga, outro desliga
  const button = new THREE.Group();
  button.position.set(0.28, 1.0, -0.5);
  scene.add(button);
  add(new THREE.CylinderGeometry(0.064, 0.064, 0.012, 40), std('#d9e1e4'), 0, 0, 0.006, button).rotation.x = Math.PI / 2;
  const domeMat = std('#f3f6f7', {roughness: 0.4});
  const dome = add(new THREE.SphereGeometry(0.05, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, 0, 0, 0.012, button);
  dome.rotation.x = Math.PI / 2;
  dome.scale.y = 0.4;
  const ringMat = new THREE.MeshBasicMaterial({color: '#9fb0b6'});
  add(new THREE.TorusGeometry(0.056, 0.004, 8, 40), ringMat, 0, 0, 0.013, button);

  // a placa: quadro com borda em rampa, 4 células de carga, membrana de vedação, tampo antiderrapante
  const plate = new THREE.Group();
  scene.add(plate);
  const R2 = Math.SQRT2;
  const frame = add(new THREE.CylinderGeometry((PLATE.size / 2) * R2, (PLATE.size / 2 + PLATE.ramp) * R2, PLATE.frameH, 4), std('#8c9ba1', {flatShading: true}), 0, PLATE.frameH / 2, 0, plate);
  frame.rotation.y = Math.PI / 4;
  const cells = new THREE.Group();
  plate.add(cells);
  const cellMat = std('#3d4f57');
  for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) add(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 24), cellMat, x, 0, z, cells);
  for (const z of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.6, 0.003, 0.012), dark, 0, 0, z, cells);
  add(new THREE.BoxGeometry(0.012, 0.003, 0.6), dark, 0.3, 0, 0, cells);
  add(new THREE.BoxGeometry(0.07, 0.008, 0.045), dark, 0.33, 0, -0.35, cells);
  const membrane = add(new THREE.BoxGeometry(0.76, 0.002, 0.76), std(ACC, {transparent: true, opacity: 0.32, roughness: 0.3}), 0, 0, 0, plate);
  membrane.castShadow = false;
  const topTex = tiles('#eef3f4', '#c3ced3', true);
  topTex.repeat.set(5, 5);
  const topMat = std('#ffffff', {map: topTex, roughness: 0.9});
  const top = add(new THREE.BoxGeometry(PLATE.top, 0.004, PLATE.top), topMat, 0, 0, 0, plate);

  // a pessoa: um manequim de 1,73 m
  const person = new THREE.Group();
  person.position.set(SPOT.fora[0], 0, SPOT.fora[1]);
  scene.add(person);
  const skin = std('#6b838d', {roughness: 0.85});
  const cap = (r, len, x, y, rz = 0) => (add(new THREE.CapsuleGeometry(r, len, 6, 16), skin, x, y, 0, person).rotation.z = rz);
  cap(0.075, 0.68, -0.1, 0.415);
  cap(0.075, 0.68, 0.1, 0.415);
  cap(0.17, 0.36, 0, 1.15);
  cap(0.05, 0.5, -0.25, 1.13, -0.12);
  cap(0.05, 0.5, 0.25, 1.13, 0.12);
  add(new THREE.SphereGeometry(0.105, 24, 16), skin, 0, 1.63, 0, person);

  // a água: riscos que caem da ducha em 0,5 s; cada um existe só se a válvula estava aberta quando ele saiu
  const N = 420;
  const TF = 0.5;
  const dpos = new Float32Array(N * 6);
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const drops = new THREE.LineSegments(dgeo, new THREE.LineBasicMaterial({color: ACC, transparent: true, opacity: 0.8}));
  drops.frustumCulled = false;
  scene.add(drops);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const D = Array.from({length: N}, () => ({a: rnd() * Math.PI * 2, u: Math.sqrt(rnd()), ph: rnd()}));
  const openAt = (t) => {
    for (let i = hist.length - 1; i >= 0; i--) if (hist[i].t <= t) return hist[i].open;
    return false;
  };

  // ---------- rótulos presos às peças ----------
  const labels = [
    ['geral', 'r', [0.42, 0.02, 0.42], 'Placa de piso', 'água só com alguém em cima'],
    ['geral', 'r', [0.35, 1.0, -0.49], 'Botão de parede', 'um toque liga, outro desliga'],
    ['placa', 'r', [0.37, 0.4, 0.37], 'Tampo antiderrapante', 'liso, lavável; curso de 2 mm'],
    ['placa', 'r', [0.38, 0.265, 0.38], 'Membrana de vedação', 'eletrônica isolada da água'],
    ['placa', 'r', [0.33, 0.14, 0.3], '4 células de carga em 12 V', `acionam a partir de ${PLATE.threshold} kg`],
    ['placa', 'r', [0.43, 0.005, 0.43], 'Quadro com borda em rampa 1:2', '18 mm de altura: passa cadeira de rodas'],
    ['parede', 'l', [-0.04, 1.36, -0.5], 'Válvula solenoide normalmente fechada', 'sem energia ou com defeito, a água fecha'],
    ['parede', 'r', [0.4, 1.36, -0.5], 'Controlador selado, 12 V', 'atraso de corte ajustável; registra o tempo de água'],
    ['parede', 'r', [0.35, 1.0, -0.49], 'Botão de parede', 'pouca força: mão fechada ou cotovelo'],
    ['parede', 'r', [0.37, 0.45, -0.5], 'Cabo vedado até a placa', 'peças trocáveis pela tampa, sem quebrar parede'],
  ].map(([view, side, at, title, sub]) => ({view, at, node: el('div', `lab ${side}`, `${title}<small>${sub}</small>`, stage)}));
  el('div', 'hint', 'Arraste para girar · role para aproximar · clique na placa ou no botão', stage);

  // ---------- painéis ----------
  const L = el('div', 'col l', null, app);
  el('div', 'card', `<div class="eyebrow">Demonstração de engenharia · conceito</div><h1>Placa de pressão para chuveiro</h1>
    <p>A água só corre enquanto há alguém sobre a placa. Projeto escolar: nenhum número aqui foi medido.</p>`, L);
  const seg = (k, opts) => `<div class="seg" data-k="${k}">${opts.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join('')}</div>`;
  el('div', 'card', `<h2>Acionamento</h2>${seg('mode', [['placa', 'Placa de piso'], ['botao', 'Botão de parede']])}
    <h2>Onde está a pessoa</h2>${seg('pos', [['fora', 'Fora'], ['placa', 'Na placa'], ['lado', 'Ensaboando']])}
    <div class="rowb"><button data-a="auto">Banho automático</button><button data-a="btn">Apertar botão</button><button data-a="out" class="warn">Falta de energia</button></div>
    <h2>Velocidade do tempo</h2>${seg('speed', [[1, '1×'], [10, '10×'], [30, '30×']])}
    <h2>Vista</h2>${seg('view', [['geral', 'Geral'], ['placa', 'Placa aberta'], ['parede', 'Dentro da parede']])}`, L);
  const live = el('div', 'card', `<h2>Leituras ao vivo</h2><div class="kv">
    <span>Fase do banho</span><b id="rPh"></b><span>Relógio do banho</span><b id="rCl"></b>
    <span>Carga na placa</span><b id="rKg"></b><span>Sensor</span><b id="rSe"></b>
    <span>Válvula</span><b id="rVa"></b><span>Vazão agora</span><b id="rQ"></b></div>
    <div class="bar a"><div><span id="rLa"></span><b id="rLp"></b></div><i id="bP"></i></div>
    <div class="bar"><div><span>Registro comum, aberto o banho todo</span><b id="rLc"></b></div><i id="bC"></i></div>`, L);
  const Rc = el('div', 'col r', null, app);
  const eco = el('div', 'card', `<div class="eyebrow">Economia · tarifa comercial de Cuiabá, MT</div>
    <div class="big"><b id="eMes"></b><span>por mês</span></div>
    <div class="kv"><span>Litros por banho</span><b id="eL"></b><span>Água poupada</span><b id="eM3"></b>
    <span>Água + esgoto</span><b id="eT"></b><span>Por ano</span><b id="eAno"></b><span>Retorno do investimento</span><b id="ePb" class="a"></b></div>
    ${INPUTS.map(([k, name, , min, max, step]) => `<div class="sl"><div><span>${name}</span><b id="v_${k}"></b></div><input type="range" data-p="${k}" min="${min}" max="${max}" step="${step}" value="${DEF[k]}" aria-label="${name}"></div>`).join('')}
    <p class="note">Mato Grosso não tem tarifa estadual única: cada município tem sua concessionária. A referência é Cuiabá
    (Águas Cuiabá, regulada pela Cuiabá Regula), categoria comercial, R$ 7,66 por m³ conforme a imprensa em fev/2026.
    Reajustes de 4,16% e de 11,93% foram noticiados em 2026; a parcela de esgoto e o investimento por ponto são premissas.
    Confira a fatura e ajuste os campos. Conta: litros poupados por banho × banhos × chuveiros × dias × (água + esgoto).</p>`, Rc);
  const $ = (id) => document.getElementById(id);

  const econ = () => {
    E = money(S.p);
    for (const [k, , unit, , , , d] of INPUTS) $(`v_${k}`).textContent = `${num(S.p[k], d)}${unit ? ' ' + unit : ''}`;
    $('eMes').textContent = `R$ ${num(E.mes)}`;
    $('eL').textContent = `${num(E.comum)} → ${num(E.placa, 1)} L (−${num(E.pct * 100)}%)`;
    $('eM3').textContent = `${num(E.m3)} m³/mês`;
    $('eT').textContent = `R$ ${num(E.rsM3, 2)}/m³`;
    $('eAno').textContent = `R$ ${num(E.ano)}`;
    $('ePb').textContent = isFinite(E.payback) ? `${num(E.payback, 1)} meses` : 'sem retorno';
  };
  eco.addEventListener('input', (e) => {
    const k = e.target.dataset.p;
    if (!k) return;
    S.p[k] = +e.target.value;
    econ();
  });
  econ();

  // ---------- lógica ----------
  const setPos = (pos) => {
    if (pos === S.pos) return;
    if (S.pos === 'placa') S.sinceLeave = 0;
    if (S.pos === 'fora') S.lPlaca = S.lComum = S.clock = 0;
    S.pos = pos;
  };
  const pushButton = () => {
    press = 1;
    if (!S.outage) S.latch = !S.latch;
  };
  let cam = null;
  const setView = (v) => {
    S.view = v;
    cam = {k: 0, p0: camera.position.clone(), t0: orbit.target.clone(), p1: new THREE.Vector3(...VIEWS[v].p), t1: new THREE.Vector3(...VIEWS[v].t)};
  };
  const enter = (i) => {
    const f = PH[i];
    S.phase = f ? i : -1;
    if (!f) {
      S.rest = 3;
      setPos('fora');
      if (S.mode === 'botao' && S.latch) pushButton();
      return;
    }
    S.left += f.dur;
    setPos(f.on ? 'placa' : 'lado');
    if (S.mode === 'botao' && S.latch !== f.on) pushButton();
  };
  const manual = () => {
    S.auto = false;
    S.phase = -1;
    S.speed = 1;
  };
  L.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.parentNode.dataset.k;
    const v = b.dataset.v;
    if (k === 'mode') {
      S.mode = v;
      S.latch = S.auto && S.pos === 'placa';
    } else if (k === 'pos') {
      manual();
      setPos(v);
    } else if (k === 'speed') S.speed = +v;
    else if (k === 'view') {
      S.tour = false;
      setView(v);
    } else if (b.dataset.a === 'auto') {
      S.auto = !S.auto;
      S.phase = -1;
      S.rest = 0.4;
      S.speed = S.auto ? 10 : 1;
      if (S.auto) setPos('fora');
    } else if (b.dataset.a === 'btn') {
      S.mode = 'botao';
      pushButton();
    } else if (b.dataset.a === 'out') {
      S.outage = !S.outage;
      if (S.outage) S.latch = false;
    }
  });

  // clique na cena: a placa alterna a pessoa, o botão aciona
  const ray = new THREE.Raycaster();
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = [e.clientX, e.clientY];
    cam = null;
    S.tour = false;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects([...button.children, top, frame])[0]?.object;
    if (!hit) return;
    if (hit === top || hit === frame) {
      manual();
      setPos(S.pos === 'placa' ? 'lado' : 'placa');
    } else {
      S.mode = 'botao';
      pushButton();
    }
  });

  let W = 0;
  let H = 0;
  const fit = () => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // os painéis cobrem 2 x 340 px nas telas largas: o box cabe na faixa livre do meio
    camera.zoom = Math.min(1.1, Math.max(0.45, (innerWidth > 1080 ? W - 700 : W) / H));
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(stage);
  fit();

  // ---------- quadro ----------
  let last = performance.now();
  let load = 0;
  let ex = 0;
  let xr = 0;
  let glow = 0;
  const v3 = new THREE.Vector3();
  const grey = new THREE.Color('#98a6ab');
  const white = new THREE.Color('#ffffff');
  const tint = new THREE.Color('#9fdfea');
  const frameFn = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const dtB = dt * S.speed;

    if (S.auto) {
      if (S.phase < 0) {
        S.rest -= dt;
        if (S.rest <= 0 && !S.open) {
          PH = phases(S.p);
          S.left = 0;
          enter(0);
        }
      } else if ((S.left -= dtB) <= 0) enter(S.phase + 1);
    }
    if (S.tour && (S.tourT += dt) > 9) {
      S.tourT = 0;
      setView({geral: 'placa', placa: 'parede', parede: 'geral'}[S.view]);
    }
    const on = S.pos === 'placa';
    if (!on) S.sinceLeave += dtB;
    const cut = Math.max(0, S.p.delay - S.sinceLeave);
    const open = !S.outage && (S.mode === 'placa' ? on || cut > 0 : S.latch);
    if (open !== S.open) {
      S.open = open;
      hist.push({t, open});
      if (hist.length > 16) hist.shift();
    }
    if (open) S.lPlaca += (S.p.Q / 60) * dtB;
    if (S.pos !== 'fora') {
      S.lComum += (S.p.Q / 60) * dtB;
      S.clock += dtB;
    }

    // pose
    const k = 1 - Math.exp(-dt * 7);
    const V = VIEWS[S.view];
    load += ((on ? 1 : 0) - load) * k;
    ex += (V.ex - ex) * k * 0.6;
    xr += (V.xr - xr) * k * 0.6;
    glow += ((open ? 1 : 0) - glow) * k;
    press = Math.max(0, press - dt * 4);
    const [sx, sz] = SPOT[S.pos];
    person.position.x += (sx - person.position.x) * k;
    person.position.z += (sz - person.position.z) * k;
    const over = Math.abs(person.position.x) < 0.4 && Math.abs(person.position.z) < 0.4;
    person.position.y = over ? PLATE.topH - PLATE.travel * load : 0;
    person.visible = ex < 0.05;
    top.position.y = PLATE.topH - 0.002 - PLATE.travel * load + 0.38 * ex;
    membrane.position.y = 0.0125 + 0.25 * ex;
    cells.position.y = 0.007 + 0.13 * ex;
    membrane.visible = cells.visible = ex > 0.01;
    topMat.color.lerpColors(white, tint, load);
    cellMat.color.set('#3d4f57').lerp(ACC, load);
    wallMat.opacity = 1 - 0.8 * xr;
    wallMat.depthWrite = xr < 0.5;
    coverMat.opacity = 1 - xr;
    downMat.color.lerpColors(grey, ACC, glow);
    coilMat.color.set('#4a5c64').lerp(ACC, glow);
    led.material.color.set(S.outage ? '#b4483a' : ACC).multiplyScalar(S.outage ? 1 : 0.75 + 0.25 * Math.sin(t * 3));
    const lit = S.mode === 'botao' && S.latch;
    ringMat.color.set(lit ? ACC : '#9fb0b6');
    domeMat.color.set(lit ? '#c9eef4' : '#f3f6f7');
    dome.position.z = 0.012 - 0.007 * press;

    // água
    const shown = N * Math.min(1, S.p.Q / 20);
    for (let i = 0; i < N; i++) {
      const d = D[i];
      const tau = ((t / TF + d.ph) % 1) * TF;
      let vis = i < shown && openAt(t - tau);
      const px = (j, tt) => {
        const r = 0.078 * d.u + 0.42 * d.u * tt;
        const x = HEAD.x + r * Math.cos(d.a);
        const y = HEAD.y - (1.6 * tt + 4.9 * tt * tt);
        const z = HEAD.z + r * Math.sin(d.a);
        if (!j && person.visible) {
          const dist = Math.hypot(x - person.position.x, z - person.position.z);
          if ((dist < 0.2 && y < 1.5) || (dist < 0.115 && y < 1.75)) vis = false;
        }
        dpos.set([x, y, z], i * 6 + j * 3);
      };
      px(0, tau);
      px(1, Math.max(0, tau - 0.022));
      if (!vis) dpos.copyWithin(i * 6 + 3, i * 6, i * 6 + 3);
    }
    dgeo.attributes.position.needsUpdate = true;

    // câmera e desenho
    if (cam) {
      cam.k = Math.min(1, cam.k + dt / 1.2);
      camera.position.lerpVectors(cam.p0, cam.p1, ease(cam.k));
      orbit.target.lerpVectors(cam.t0, cam.t1, ease(cam.k));
      if (cam.k >= 1) cam = null;
    }
    orbit.update();
    renderer.render(scene, camera);

    for (const lb of labels) {
      v3.set(...lb.at).project(camera);
      const gate = lb.view === 'placa' ? ex > 0.85 : lb.view === 'parede' ? xr > 0.85 : ex < 0.1 && xr < 0.1;
      const show = lb.view === S.view && gate && v3.z < 1;
      lb.node.style.opacity = show ? 1 : 0;
      if (show) {
        lb.node.style.left = `${(v3.x * 0.5 + 0.5) * W}px`;
        lb.node.style.top = `${(-v3.y * 0.5 + 0.5) * H}px`;
      }
    }

    // leituras
    for (const b of L.querySelectorAll('button')) {
      const kk = b.parentNode.dataset.k;
      const a = b.dataset.a;
      b.classList.toggle('on', kk ? String(S[kk]) === b.dataset.v : a === 'auto' ? S.auto : a === 'out' ? S.outage : lit);
    }
    $('rPh').textContent = S.pos === 'fora' ? 'Box vazio' : S.auto && PH[S.phase] ? PH[S.phase].name : on ? 'Sob a água' : 'Fora da placa';
    $('rCl').textContent = mmss(S.clock);
    $('rKg').textContent = `${num(PERSON_KG * load)} kg`;
    $('rSe').textContent = S.mode === 'botao' ? 'não usado' : on ? 'presença' : cut > 0 ? `corta em ${num(cut, 1)} s` : 'livre';
    $('rVa').textContent = S.outage ? 'fechada, sem energia' : open ? 'aberta, 12 V' : 'fechada';
    $('rVa').className = open ? 'a' : '';
    $('rQ').textContent = `${num(open ? S.p.Q : 0)} L/min`;
    $('rLa').textContent = S.mode === 'placa' ? 'Com a placa de piso' : 'Com o botão de parede';
    $('rLp').textContent = `${num(S.lPlaca, 1)} L`;
    $('rLc').textContent = `${num(S.lComum, 1)} L`;
    $('bP').style.width = `${Math.min(100, (S.lPlaca / E.comum) * 100)}%`;
    $('bC').style.width = `${Math.min(100, (S.lComum / E.comum) * 100)}%`;
    requestAnimationFrame(frameFn);
  };
  requestAnimationFrame(frameFn);
  window.SIM_STATE = S;
}
