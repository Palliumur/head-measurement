import * as THREE from 'three';
import data from './pressure-data.js?v=pressure-1';

const layers = {
  head: { name: '全头', light: '#dfedf9', middle: '#82afd6', dark: '#183b74' },
  ear: { name: '右耳周', light: '#f0e4fb', middle: '#b088cc', dark: '#512c78' },
};
const neutral = new THREE.Color('#e8e9ec');
const samples = Object.entries(layers).flatMap(([layer, info]) =>
  data[layer].map(([id, name, position, pdt]) => ({
    key: `${layer}:${id}`, id, name, position: new THREE.Vector3(...position), pdt, layer, info,
  })));
const pointsByKey = new Map(samples.map(point => [point.key, point]));

function palette(layer) {
  const { light, middle, dark } = layers[layer];
  const values = data[layer].map(point => point[3]);
  return { min: Math.min(...values), max: Math.max(...values), colors: [light, middle, dark].map(c => new THREE.Color(c)) };
}
const scales = { head: palette('head'), ear: palette('ear') };
// Side silhouette of the pinna on this mesh, sampled as [height, rear, front].
const auricle = [
  [170, -5, 3], [178, -12, 8], [186, -17, 11], [197, -21, 15],
  [209, -23, 16], [220, -19, 14], [228, -12, 10], [232, -5, 4],
];

function colorFor(value, scale, output) {
  const t = THREE.MathUtils.clamp((value - scale.min) / (scale.max - scale.min), 0, 1) * 2;
  const index = t >= 1 ? 1 : 0;
  return output.copy(scale.colors[index]).lerp(scale.colors[index + 1], t - index);
}

function onAuricle(x, y, z) {
  if (Math.abs(x) < 68 || y < auricle[0][0] || y > auricle.at(-1)[0]) return false;
  for (let i = 1; i < auricle.length; i++) {
    const [high, rear, front] = auricle[i];
    if (y > high) continue;
    const [low, rearLow, frontLow] = auricle[i-1];
    const t = (y - low) / (high - low);
    return z >= THREE.MathUtils.lerp(rearLow, rear, t) && z <= THREE.MathUtils.lerp(frontLow, front, t);
  }
  return false;
}

function withinEarGrid(x, y, z) {
  const { center: [cy, cz], step } = data.earGrid;
  const row = (y - cy) / step;
  const column = (z - cz) / step;
  if (x > -38 || row > 1.01 || column < -3.01 || column > 2.01) return false;
  // Lower central cells are absent from Fig. 2, where the pinna interrupts the grid.
  const bottom = column < -1 ? Math.max(-1, column + 1) : Math.max(-1, -Math.max(0, column));
  return row >= bottom - 0.01;
}

function interpolate(points, x, y, z, local) {
  let weighted = 0, weightSum = 0, closest = Infinity;
  const softening = local ? 16 : 81;
  for (const [, , position, pdt] of points) {
    const dx = local ? 0 : x - position[0];
    const dy = y - position[1], dz = z - position[2];
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < 0.001) return pdt;
    closest = Math.min(closest, distance);
    const weight = 1 / (distance + softening) ** 2;
    weighted += weight * pdt;
    weightSum += weight;
  }
  return !local && closest > 76 ** 2 ? null : weighted / weightSum;
}

export function makePressureColors(positions) {
  const combined = new Float32Array(positions.length);
  const headOnly = new Float32Array(positions.length);
  const earOnly = new Float32Array(positions.length);
  const headColor = new THREE.Color(), earColor = new THREE.Color();
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    const skip = y < 94 || onAuricle(x, y, z);
    const headValue = skip ? null : interpolate(data.head, x, y, z, false);
    const earValue = !skip && withinEarGrid(x, y, z) ? interpolate(data.ear, x, y, z, true) : null;
    if (headValue === null) headColor.copy(neutral);
    else colorFor(headValue, scales.head, headColor);
    if (earValue === null) earColor.copy(neutral);
    else colorFor(earValue, scales.ear, earColor);
    headColor.toArray(headOnly, i);
    earColor.toArray(earOnly, i);
    (earValue === null ? headColor : earColor).toArray(combined, i);
  }
  return { combined, head: headOnly, ear: earOnly };
}

export function setupPressure({ scene, mesh, camera, host, onChange, showView }) {
  const element = id => document.getElementById(id);
  const select = element('pressure-sample');
  const card = element('pressure-value');
  const showPoints = element('pressure-show-points');
  const originalMaterial = mesh.material;
  const material = originalMaterial.clone();
  material.color.set(0xffffff);
  material.vertexColors = true;
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const projected = new THREE.Vector3();
  const marker = new THREE.Mesh(new THREE.SphereGeometry(2, 18, 12), new THREE.MeshBasicMaterial({ color: '#25324b', toneMapped: false }));
  marker.visible = false;
  scene.add(marker);
  let enabled = false, selected = null, visibleLayer = 'combined', fields;
  const dots = {};
  const dotGeometry = new THREE.SphereGeometry(1.05, 10, 8);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: '#31415b', toneMapped: false });
  const translation = new THREE.Matrix4();

  for (const [layer, info] of Object.entries(layers)) {
    const group = document.createElement('optgroup');
    group.label = info.name;
    const layerPoints = samples.filter(point => point.layer === layer);
    const meshDots = new THREE.InstancedMesh(dotGeometry, dotMaterial, layerPoints.length);
    for (const [index, point] of layerPoints.entries()) {
      const option = document.createElement('option');
      option.value = point.key;
      option.textContent = `${point.id} · ${point.name}`;
      group.append(option);
      meshDots.setMatrixAt(index, translation.makeTranslation(...point.position.toArray()));
    }
    meshDots.visible = false;
    scene.add(meshDots);
    dots[layer] = meshDots;
    select.append(group);
    const scale = scales[layer];
    const digits = layer === 'ear' ? 2 : 0;
    element(`pressure-${layer}-range`).textContent = `${scale.min.toFixed(digits)} – ${scale.max.toFixed(digits)} kPa`;
  }

  function inLayer(point) {
    return visibleLayer === 'combined' || visibleLayer === point.layer;
  }

  function updateDots() {
    for (const [layer, meshDots] of Object.entries(dots)) {
      meshDots.visible = enabled && showPoints.checked && (visibleLayer === 'combined' || visibleLayer === layer);
    }
  }

  function paint() {
    if (!enabled) return;
    if (!fields) {
      const colors = makePressureColors(mesh.geometry.getAttribute('position').array);
      fields = Object.fromEntries(Object.entries(colors).map(([layer, values]) =>
        [layer, new THREE.BufferAttribute(values, 3)]));
    }
    mesh.geometry.setAttribute('color', fields[visibleLayer]);
    mesh.material = material;
  }

  function choose(point) {
    selected = point;
    select.value = point?.key ?? '';
    card.hidden = !point;
    marker.visible = Boolean(enabled && point);
    if (point) {
      marker.position.copy(point.position);
      element('pressure-point-name').textContent = `${point.name} · ${point.id}`;
      element('pressure-point-mean').textContent = `${point.pdt.toFixed(point.layer === 'ear' ? 2 : 1)} kPa`;
      element('pressure-point-source').textContent = point.layer === 'head' ? '全头研究 · 样本平均' : '右耳周研究 · 样本平均';
    }
    onChange();
  }

  function setLayer(layer) {
    visibleLayer = layer;
    for (const button of document.querySelectorAll('[data-pressure-layer]')) {
      button.setAttribute('aria-pressed', String(button.dataset.pressureLayer === layer));
    }
    for (const legend of document.querySelectorAll('[data-pressure-legend]')) {
      legend.hidden = layer !== 'combined' && layer !== legend.dataset.pressureLegend;
    }
    for (const group of select.querySelectorAll('optgroup')) {
      group.disabled = layer !== 'combined' && group.label !== layers[layer].name;
    }
    if (selected && !inLayer(selected)) choose(null);
    paint();
    updateDots();
    onChange();
  }

  for (const button of document.querySelectorAll('[data-pressure-layer]')) {
    button.addEventListener('click', () => {
      const layer = button.dataset.pressureLayer;
      setLayer(layer);
      if (layer === 'ear') showView('pressureEar');
      if (layer === 'head') showView('pressureOverview');
    });
  }
  for (const button of document.querySelectorAll('[data-pressure-view]')) {
    button.addEventListener('click', () => {
      if (visibleLayer === 'head') setLayer('combined');
      showView(button.dataset.pressureView);
    });
  }
  select.addEventListener('change', () => {
    const point = pointsByKey.get(select.value);
    choose(point);
    if (point?.layer === 'ear') showView('pressureEar');
    if (point?.layer === 'head') showView('pressurePoint', point.position);
  });
  showPoints.addEventListener('change', () => {
    updateDots();
    onChange();
  });

  return {
    setActive(active) {
      if (active === enabled) return;
      enabled = active;
      if (active) paint();
      else mesh.material = originalMaterial;
      marker.visible = Boolean(active && selected);
      updateDots();
    },
    pick(event) {
      const box = host.getBoundingClientRect();
      const x = event.clientX - box.left, y = event.clientY - box.top;
      const candidates = [];
      for (const point of samples) {
        if (!inLayer(point)) continue;
        projected.copy(point.position).project(camera);
        const dx = (projected.x + 1) * box.width / 2 - x;
        const dy = (1 - projected.y) * box.height / 2 - y;
        const distance = Math.hypot(dx, dy);
        if (distance <= (event.pointerType === 'touch' ? 24 : 18)) {
          candidates.push({ point, distance, x: projected.x, y: projected.y });
        }
      }
      candidates.sort((a, b) => a.distance - b.distance || Number(b.point.layer === 'ear') - Number(a.point.layer === 'ear'));
      for (const candidate of candidates) {
        pointer.set(candidate.x, candidate.y);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(mesh, false).find(result => result.point.y >= 94);
        if (!hit || hit.point.distanceTo(candidate.point.position) > 4) continue;
        const point = candidate.point;
        // Where both papers use the same attachment landmark, pick the visible layer.
        const ear = point.layer === 'head' && visibleLayer === 'combined'
          ? candidates.find(other => other.point.layer === 'ear' && other.point.position.distanceTo(point.position) < 1)?.point : null;
        choose(ear ?? point);
        return;
      }
      choose(null);
    },
  };
}
