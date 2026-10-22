// Three.js solar system: bodies, orbits, camera transitions, zoom/rotate, picking, labels and cleanup.
// Loaded on demand (dynamic import) so the information panels work before, and without, 3D.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sceneRadius, orbitRadius, orbitAngularSpeed, spinAngularSpeed, axisTiltDegrees } from '../utils/scale.js';
import { appearanceFor } from './appearance.js';
import { createSurfaceTexture, createRingTexture, createGlowTexture, mulberry32 } from './proceduralTextures.js';
import { placeLabels, pickAt, isTap } from '../utils/labelLayout.js';

const OVERVIEW_POSITION = new THREE.Vector3(0, 58, 96);
const OVERVIEW_LIMITS = { min: 12, max: 220 };
const TRANSITION_SECONDS = 1.4;
const MAX_FRAME_SECONDS = 0.1;

const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createSolarSystemScene({ canvas, labelLayer, bodies, earth, quality, reducedMotion = false, paused = false, onPick, onContextLost }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.antialias, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#04060d');
  const camera = new THREE.PerspectiveCamera(45, 1, 0.02, 3000);
  camera.position.copy(OVERVIEW_POSITION);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.minDistance = OVERVIEW_LIMITS.min;
  controls.maxDistance = OVERVIEW_LIMITS.max;
  controls.target.set(0, 0, 0);

  // The Sun lights the planets; a soft ambient light keeps night sides readable for learning.
  scene.add(new THREE.PointLight('#fff2dc', 2.6, 0, 0));
  scene.add(new THREE.AmbientLight('#7f8db3', 0.35));

  const disposables = [];
  const track = item => (disposables.push(item), item);

  // Decorative background stars (not real star positions).
  {
    const positions = new Float32Array(quality.starCount * 3);
    const random = mulberry32(7);
    for (let i = 0; i < quality.starCount; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const r = 900 + random() * 400;
      positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)], i * 3);
    }
    const geometry = track(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(geometry, track(new THREE.PointsMaterial({ color: '#c9d4ff', size: 1.3, sizeAttenuation: false }))));
  }

  const entries = new Map();
  const hitTargets = [];
  const segments = quality.sphereSegments;

  bodies.forEach((body, index) => {
    const look = appearanceFor(body.id);
    const radius = sceneRadius(body, earth);
    const group = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.z = -THREE.MathUtils.degToRad(axisTiltDegrees(body));
    group.add(tilt);

    const geometry = track(new THREE.SphereGeometry(radius, segments, Math.round(segments / 2)));
    const material = track(body.kind === 'star'
      ? new THREE.MeshBasicMaterial({ color: look.color })
      : new THREE.MeshStandardMaterial({ color: look.color, roughness: 1, metalness: 0 }));
    const mesh = new THREE.Mesh(geometry, material);
    tilt.add(mesh);

    if (look.ring) {
      const inner = look.ring.inner * radius;
      const outer = look.ring.outer * radius;
      const ringGeometry = track(new THREE.RingGeometry(inner, outer, 128, 1));
      // Map texture u from the inner edge (0) to the outer edge (1).
      const position = ringGeometry.attributes.position;
      const uv = ringGeometry.attributes.uv;
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
      }
      const ringMaterial = track(new THREE.MeshBasicMaterial({
        map: track(createRingTexture(THREE, look)),
        transparent: true,
        opacity: look.ring.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      }));
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      tilt.add(ring);
    }

    if (body.kind === 'star') {
      const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({
        map: track(createGlowTexture(THREE)),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })));
      glow.scale.setScalar(radius * 4.2);
      group.add(glow);
    }

    // Generous invisible hit sphere so small planets are easy to tap.
    const hit = new THREE.Mesh(track(new THREE.SphereGeometry(Math.max(radius * 1.6, 0.9), 12, 8)), track(new THREE.MeshBasicMaterial({ visible: false })));
    hit.userData.bodyId = body.id;
    group.add(hit);
    hitTargets.push(hit);

    const orbit = orbitRadius(body, earth);
    if (orbit > 0) {
      const points = [];
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * orbit, 0, -Math.sin(a) * orbit));
      }
      const orbitGeometry = track(new THREE.BufferGeometry().setFromPoints(points));
      scene.add(new THREE.LineLoop(orbitGeometry, track(new THREE.LineBasicMaterial({ color: '#33467a', transparent: true, opacity: 0.55 }))));
    }

    scene.add(group);

    // Floating name. Taps and drags pass through it to the canvas, which decides what a tap means (see pickAt),
    // so overlapping names can't catch each other's taps and a drag that starts on a name still turns the view.
    // While shown it is a real button, so keyboard and screen-reader users can choose the world with it too.
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'scene-label';
    label.dataset.body = body.id;
    label.setAttribute('aria-label', `Fly to ${body.name}`);
    const labelText = document.createElement('span');
    labelText.className = 'scene-label__text';
    labelText.dataset.body = body.id;
    labelText.textContent = body.name;
    label.append(labelText);
    label.addEventListener('click', () => onPick?.(body.id, { fromLabel: true }));
    labelLayer.append(label);

    entries.set(body.id, {
      body,
      look,
      group,
      mesh,
      material,
      label,
      labelText,
      radius,
      orbit,
      angle: index * 2.399, // spread planets around their orbits (illustrative, not real positions)
      orbitSpeed: orbitAngularSpeed(body, earth),
      spinSpeed: spinAngularSpeed(body, earth),
      texture: null,
    });
  });

  // ----- State -----
  let isPaused = paused;
  let isReducedMotion = reducedMotion;
  let focusId = null;
  let transition = null;
  let labelsVisible = true;
  let needsRender = true;
  let frame = 0;
  let lastTime = performance.now();
  let disposed = false;
  const previousFocusPosition = new THREE.Vector3();
  const scratch = new THREE.Vector3();
  const projected = new THREE.Vector3();

  function updateBodyPositions() {
    for (const entry of entries.values()) {
      entry.group.position.set(Math.cos(entry.angle) * entry.orbit, 0, -Math.sin(entry.angle) * entry.orbit);
    }
  }
  updateBodyPositions();

  function focusDistance(entry) {
    if (entry.body.kind === 'star') return entry.radius * 4.2;
    const extent = entry.look.ring ? entry.radius * entry.look.ring.outer : entry.radius;
    return Math.max(extent * 3.6, 1.2);
  }

  function destinationFor(id) {
    if (id === null) return { target: new THREE.Vector3(), position: OVERVIEW_POSITION.clone(), limits: OVERVIEW_LIMITS };
    const entry = entries.get(id);
    const target = entry.group.position.clone();
    // Look at the sunlit side, slightly from above.
    const towardSun = target.lengthSq() > 0 ? target.clone().negate().normalize() : new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3().crossVectors(towardSun, new THREE.Vector3(0, 1, 0)).normalize();
    const direction = towardSun.multiplyScalar(0.75).add(side.multiplyScalar(0.55)).add(new THREE.Vector3(0, 0.38, 0)).normalize();
    if (entry.body.kind === 'star') direction.set(0, 0.32, 1).normalize();
    const distance = focusDistance(entry);
    return {
      target,
      position: target.clone().add(direction.multiplyScalar(distance)),
      limits: { min: entry.radius * 1.35, max: Math.max(distance * 8, 14) },
    };
  }

  function applyLimits(limits) {
    controls.minDistance = limits.min;
    controls.maxDistance = limits.max;
  }

  function focus(id, { instant = false } = {}) {
    if (id !== null && !entries.has(id)) return;
    focusId = id;
    canvas.parentElement.dataset.focus = id ?? 'overview';
    const destination = destinationFor(id);
    if (id !== null) previousFocusPosition.copy(entries.get(id).group.position);
    if (instant || isReducedMotion) {
      transition = null;
      controls.enabled = true;
      applyLimits(destination.limits);
      controls.target.copy(destination.target);
      camera.position.copy(destination.position);
      canvas.parentElement.dataset.transition = 'idle';
    } else {
      transition = {
        start: performance.now(),
        fromTarget: controls.target.clone(),
        fromPosition: camera.position.clone(),
        offset: destination.position.clone().sub(destination.target),
        limits: destination.limits,
      };
      controls.enabled = false;
      // Allow the camera to pass through the old limits while flying.
      controls.minDistance = 0;
      controls.maxDistance = Infinity;
      canvas.parentElement.dataset.transition = 'flying';
    }
    needsRender = true;
  }

  function stepTransition(now) {
    const entry = focusId === null ? null : entries.get(focusId);
    const liveTarget = entry ? entry.group.position : new THREE.Vector3();
    const t = Math.min(1, (now - transition.start) / (TRANSITION_SECONDS * 1000));
    const e = easeInOutCubic(t);
    controls.target.lerpVectors(transition.fromTarget, liveTarget, e);
    camera.position.lerpVectors(transition.fromPosition, scratch.copy(liveTarget).add(transition.offset), e);
    if (t >= 1) {
      applyLimits(transition.limits);
      transition = null;
      controls.enabled = true;
      canvas.parentElement.dataset.transition = 'idle';
      if (entry) previousFocusPosition.copy(entry.group.position);
    }
  }

  function cameraCommand(command) {
    const offset = camera.position.clone().sub(controls.target);
    if (command === 'zoomIn' || command === 'zoomOut') {
      const length = THREE.MathUtils.clamp(offset.length() * (command === 'zoomIn' ? 0.8 : 1.25), controls.minDistance, controls.maxDistance);
      offset.setLength(length);
    } else if (command === 'rotateLeft' || command === 'rotateRight') {
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), command === 'rotateLeft' ? -0.35 : 0.35);
    } else {
      return;
    }
    camera.position.copy(controls.target).add(offset);
    needsRender = true;
  }

  // Sizes of the visible names, kept up to date by a ResizeObserver (text size can change at any time).
  const labelSizes = new Map();
  const labelObserver = new ResizeObserver(records => {
    for (const record of records) {
      const box = record.borderBoxSize?.[0];
      const width = box ? box.inlineSize : record.target.offsetWidth;
      const height = box ? box.blockSize : record.target.offsetHeight;
      if (width && height) labelSizes.set(record.target.dataset.body, { width, height });
    }
    needsRender = true;
  });
  for (const entry of entries.values()) labelObserver.observe(entry.labelText);
  let placements = new Map();

  function updateLabels() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const items = [];
    if (labelsVisible && focusId === null && transition === null) {
      for (const entry of entries.values()) {
        const size = labelSizes.get(entry.body.id);
        projected.copy(entry.group.position).project(camera);
        if (!size || projected.z >= 1) continue;
        const x = ((projected.x + 1) / 2) * width;
        const y = ((1 - projected.y) / 2) * height;
        scratch.copy(entry.group.position);
        scratch.y += entry.radius * 1.3;
        scratch.project(camera);
        items.push({ id: entry.body.id, x, y, radius: Math.abs(((1 - scratch.y) / 2) * height - y), ...size });
      }
      // A label with keyboard focus is placed first, so it can't vanish from under the keyboard.
      const focused = labelLayer.contains(document.activeElement) ? document.activeElement.dataset.body : null;
      items.sort((a, b) => (b.id === focused) - (a.id === focused));
    }
    placements = placeLabels(items, { width, height });
    for (const entry of entries.values()) {
      const placement = placements.get(entry.body.id);
      // A label without a place is hidden, so it can't be seen, tapped or focused. Until its size is known it
      // stays laid out but invisible, so it can be measured.
      entry.label.hidden = !placement && labelSizes.has(entry.body.id);
      entry.label.style.visibility = placement ? '' : 'hidden';
      if (placement) {
        entry.label.dataset.side = placement.side;
        // Whole pixels keep the text crisp and the tap area exactly its CSS size.
        entry.label.style.transform = `translate(${Math.round(placement.target.left)}px, ${Math.round(placement.target.top)}px)`;
      }
    }
  }

  function render(now) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    const dt = Math.min(MAX_FRAME_SECONDS, (now - lastTime) / 1000);
    lastTime = now;

    if (!isPaused) {
      for (const entry of entries.values()) {
        entry.angle += entry.orbitSpeed * dt;
        entry.mesh.rotation.y += entry.spinSpeed * dt;
      }
      updateBodyPositions();
      needsRender = true;
    }

    if (transition) {
      stepTransition(now);
      needsRender = true;
    } else if (focusId !== null) {
      // Follow the focused world as it moves along its orbit.
      const position = entries.get(focusId).group.position;
      scratch.copy(position).sub(previousFocusPosition);
      if (scratch.lengthSq() > 0) {
        camera.position.add(scratch);
        controls.target.add(scratch);
      }
      previousFocusPosition.copy(position);
    }

    if (controls.update()) needsRender = true;
    if (!needsRender) return;
    needsRender = false;
    renderer.render(scene, camera);
    updateLabels();
    if (canvas.parentElement.dataset.sceneState !== 'ready') canvas.parentElement.dataset.sceneState = 'ready';
  }

  // Space covered by the facts card (CSS pixels from the right and bottom edges). The picture is shifted so the
  // focused world sits in the middle of the uncovered part, rather than behind the card.
  let inset = { right: 0, bottom: 0 };
  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const right = Math.min(inset.right, width * 0.6);
    const bottom = Math.min(inset.bottom, height * 0.6);
    camera.aspect = (width + right) / (height + bottom);
    if (right || bottom) camera.setViewOffset(width + right, height + bottom, right, bottom, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  // ----- Picking: a short one-finger tap or click that didn't drag selects a world -----
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const activePointers = new Set();
  let gesture = null;
  function bodyAt(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitTargets, false)[0];
    return hit ? hit.object.userData.bodyId : null;
  }
  function pickFor(event) {
    const rect = canvas.getBoundingClientRect();
    return pickAt({ x: event.clientX - rect.left, y: event.clientY - rect.top }, placements, bodyAt(event));
  }
  const onPointerDown = event => {
    activePointers.add(event.pointerId);
    if (activePointers.size === 1) gesture = { x: event.clientX, y: event.clientY, time: performance.now(), pointers: 1 };
    else if (gesture) gesture.pointers = Math.max(gesture.pointers, activePointers.size); // a pinch is never a tap
  };
  const onPointerUp = event => {
    activePointers.delete(event.pointerId);
    if (!gesture || activePointers.size > 0) return; // wait until every finger has lifted
    const tap = isTap({
      moved: Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y),
      durationMs: performance.now() - gesture.time,
      pointers: gesture.pointers,
    });
    gesture = null;
    if (!tap) return;
    const id = pickFor(event);
    if (id) onPick?.(id);
  };
  const onPointerCancel = event => {
    activePointers.delete(event.pointerId);
    gesture = null;
  };
  let hoverQueued = false;
  const onPointerMove = event => {
    if (event.buttons || hoverQueued || event.pointerType === 'touch') return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      canvas.style.cursor = pickFor(event) ? 'pointer' : 'grab';
    });
  };
  const onControlsChange = () => { needsRender = true; };
  const onContextLostEvent = event => {
    event.preventDefault();
    onContextLost?.();
  };
  const onVisibility = () => {
    // Always cancel first: browsers can report "visible" more than once, which must not start a second loop.
    cancelAnimationFrame(frame);
    if (!document.hidden && !disposed) {
      lastTime = performance.now();
      needsRender = true;
      frame = requestAnimationFrame(render);
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('webglcontextlost', onContextLostEvent);
  controls.addEventListener('change', onControlsChange);
  document.addEventListener('visibilitychange', onVisibility);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  canvas.parentElement.dataset.focus = 'overview';
  canvas.parentElement.dataset.transition = 'idle';
  frame = requestAnimationFrame(render);

  // ----- Optional surface textures, generated a few at a time to avoid a long pause -----
  let texturesWanted = false;
  let textureJob = null;
  async function setTexturesEnabled(enabled) {
    texturesWanted = enabled;
    if (enabled && !textureJob) {
      textureJob = (async () => {
        for (const entry of entries.values()) {
          if (disposed) return;
          if (!entry.texture) entry.texture = track(createSurfaceTexture(THREE, entry.look, quality.textureWidth));
          if (texturesWanted) applyTexture(entry, true);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      })();
    }
    if (textureJob) await textureJob;
    for (const entry of entries.values()) applyTexture(entry, texturesWanted);
    needsRender = true;
  }
  function applyTexture(entry, on) {
    const map = on ? entry.texture : null;
    if (entry.material.map === map) return;
    entry.material.map = map;
    entry.material.color.set(map ? '#ffffff' : entry.look.color);
    entry.material.needsUpdate = true;
    needsRender = true;
  }

  return {
    focus,
    cameraCommand,
    setTexturesEnabled,
    setPaused(value) {
      isPaused = value;
      canvas.parentElement.dataset.paused = String(value);
      needsRender = true;
    },
    setReducedMotion(value) {
      isReducedMotion = value;
      controls.enableDamping = !value;
    },
    setFrameInset({ right = 0, bottom = 0 } = {}) {
      if (right === inset.right && bottom === inset.bottom) return;
      inset = { right, bottom };
      resize();
    },
    setLabelsVisible(value) {
      labelsVisible = value;
      needsRender = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      labelObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('webglcontextlost', onContextLostEvent);
      controls.removeEventListener('change', onControlsChange);
      document.removeEventListener('visibilitychange', onVisibility);
      controls.dispose();
      for (const entry of entries.values()) entry.label.remove();
      for (const item of disposables) item.dispose();
      renderer.dispose();
    },
  };
}

