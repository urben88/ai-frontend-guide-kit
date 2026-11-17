// Panel solar 3D. Built from ai-frontend-output/SCENE-SPEC.md and its starter (scene-starter.js).
// Keeps the starter's rules: the poster <img> is the fallback, Three.js loads lazily, reduced motion
// rests on one frame, and destroy() releases everything. Colours are the tokens of DESIGN.md.

const POSTER = '/panel-poster.svg';
const TARGET_FPS = 30;
const IDLE_SPIN = 0.15; // radians per second, from the spec

// Token values (design-tokens.json): primary-900, accent-400, primary-500, primary-950.
const COLOR = {
  main: 0x1f2a3a,
  highlight: 0xf5a524,
  frame: 0x8390a4,
  inverter: 0x161b22,
};

/**
 * Mounts the panel in `container`.
 * Returns { setPart(name), destroy() }. name: 'cells' | 'frame' | 'inverter' | null.
 * Without WebGL the poster stays and both calls are no-ops.
 */
export async function mountPanel(container) {
  let poster = container.querySelector('img');
  if (!poster) {
    poster = document.createElement('img');
    poster.src = POSTER;
    poster.alt = 'Ilustración de un panel solar con su caja de inversor; el texto de cada tramo describe la parte activa.';
    poster.width = 800;
    poster.height = 600;
    container.prepend(poster);
  }

  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2')) return { setPart() {}, destroy() {} };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const THREE = await import('three'); // lazy: not in the first load

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  // Block display: an inline canvas leaves a line-box gap that moves the page when the scene appears.
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 1.4, 5.2);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);

  const group = new THREE.Group();
  group.rotation.x = -0.12;
  scene.add(group);

  // Materials: one per highlightable part.
  const mats = {
    cells: new THREE.MeshStandardMaterial({ color: COLOR.main, roughness: 0.35, metalness: 0.25 }),
    frame: new THREE.MeshStandardMaterial({ color: COLOR.frame, roughness: 0.4, metalness: 0.6 }),
    inverter: new THREE.MeshStandardMaterial({ color: COLOR.inverter, roughness: 0.5, metalness: 0.2 }),
  };
  const highlight = new THREE.MeshStandardMaterial({ color: COLOR.highlight, roughness: 0.4, metalness: 0.1 });

  // Cells: one InstancedMesh (one draw call) on a 6 x 4 grid.
  const cols = 6;
  const rows = 4;
  const cellW = 0.26;
  const cellH = 0.22;
  const gap = 0.04;
  const cellGeo = new THREE.BoxGeometry(cellW, cellH, 0.03);
  const cells = new THREE.InstancedMesh(cellGeo, mats.cells, cols * rows);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * (cellW + gap);
      const y = (r - (rows - 1) / 2) * (cellH + gap);
      m.makeTranslation(x, y, 0.05);
      cells.setMatrixAt(i++, m);
    }
  }
  group.add(cells);

  // Frame: a thin metal box behind the cells.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.06), mats.frame);
  frame.position.z = 0;
  group.add(frame);

  // Inverter: a small box behind the lower right corner.
  const inverter = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.22), mats.inverter);
  inverter.position.set(0.72, -0.95, -0.12);
  group.add(inverter);

  const triangles = [cells, frame, inverter].reduce((n, o) => {
    const g = o.geometry;
    const count = g.index ? g.index.count : g.attributes.position.count;
    return n + (count / 3) * (o.isInstancedMesh ? o.count : 1);
  }, 0);
  if (triangles > 6000) console.warn(`panel: ${triangles} triangles is over the budget of 6000`);

  let activePart = null;
  const applyPart = () => {
    cells.material = activePart === 'cells' ? highlight : mats.cells;
    frame.material = activePart === 'frame' ? highlight : mats.frame;
    inverter.material = activePart === 'inverter' ? highlight : mats.inverter;
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    // updateStyle = true: the CSS size follows the container; otherwise the canvas shows at pixel-ratio size.
    renderer.setSize(w, h, true);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw();
  };
  const draw = () => renderer.render(scene, camera);

  let raf = 0;
  let last = performance.now();
  const frameInterval = 1000 / TARGET_FPS;
  let acc = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = (now - last) / 1000;
    last = now;
    acc += now - (loop.prev ?? now);
    loop.prev = now;
    if (acc < frameInterval) return;
    acc = 0;
    group.rotation.y += IDLE_SPIN * dt;
    draw();
  };

  // First frame shows at once; the poster is hidden only when the scene has drawn.
  resize();
  poster.style.display = 'none';
  window.addEventListener('resize', resize);
  if (!reduce) raf = requestAnimationFrame(loop);

  return {
    setPart(name) {
      activePart = name;
      applyPart();
      draw();
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      [cellGeo, frame.geometry, inverter.geometry].forEach((g) => g.dispose());
      Object.values(mats).forEach((x) => x.dispose());
      highlight.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      poster.style.display = '';
    },
  };
}
