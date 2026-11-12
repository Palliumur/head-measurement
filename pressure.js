import * as THREE from 'three';
import data from './pressure-data.js?v=pressure-1';

const layers = {
  head: { name: '全头', light: '#dfedf9', middle: '#82afd6', dark: '#183b74' },
  ear: { name: '右耳周', light: '#f0e4fb', middle: '#b088cc', dark: '#512c78' },
};
const neutral = new THREE.Color('#e8e9ec');
const samples = Object.keys(layers).flatMap(layer => data[layer].map(([id, name, coordinates, pdt]) => {
  const position = new THREE.Vector3(...coordinates);
  const displayPosition = position.clone();
  if (layer === 'ear') displayPosition.x -= 1.35;
  return { key: `${layer}:${id}`, id, name, position, displayPosition, pdt, layer };
}));
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

function interpolateHead(x, y, z) {
  let weighted = 0, weightSum = 0, closest = Infinity;
  for (const [, , position, pdt] of data.head) {
    const dx = x - position[0];
    const dy = y - position[1], dz = z - position[2];
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < 0.001) return pdt;
    closest = Math.min(closest, distance);
    const weight = 1 / (distance + 81) ** 2;
    weighted += weight * pdt;
    weightSum += weight;
  }
  return closest > 76 ** 2 ? null : weighted / weightSum;
}

export function makeHeadPressureColors(positions) {
  const colors = new Float32Array(positions.length);
  const headColor = new THREE.Color();
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    const headValue = y < 94 || onAuricle(x, y, z) ? null : interpolateHead(x, y, z);
    if (headValue === null) headColor.copy(neutral);
    else colorFor(headValue, scales.head, headColor);
    headColor.toArray(colors, i);
  }
  return colors;
}

function circleTexture() {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4).fill(255);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot(x + .5 - size / 2, y + .5 - size / 2);
      pixels[(y * size + x) * 4 + 3] = Math.round(255 * THREE.MathUtils.clamp(size / 2 - radius, 0, 1));
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function pointSprites(points, { texture, size, ring, outline, color }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(p => p.displayPosition.toArray()), 3));
  if (!color) {
    const shade = new THREE.Color();
    const colors = points.flatMap(p => colorFor(p.pdt, scales[p.layer], shade).toArray());
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  const common = { map: texture, transparent: true, alphaTest: .12, sizeAttenuation: false, depthWrite: false, toneMapped: false };
  const group = new THREE.Group();
  const edge = new THREE.Points(geometry, new THREE.PointsMaterial({ ...common, size: size + ring, color: outline }));
  const fill = new THREE.Points(geometry, new THREE.PointsMaterial({ ...common, size, color: color ?? '#ffffff', vertexColors: !color }));
  edge.renderOrder = 3;
  fill.renderOrder = 4;
  group.add(edge, fill);
  group.visible = false;
  return group;
}

export function setupPressure({ scene, mesh, camera, host, onChange, showView }) {
  const element = id => document.getElementById(id);
  const select = element('pressure-sample');
  const card = element('pressure-value');
  const showPoints = element('pressure-show-points');
  const headPointsControl = element('pressure-head-points');
  const labelLayer = element('pressure-ear-labels');
  const originalMaterial = mesh.material;
  const material = originalMaterial.clone();
  material.color.set(0xffffff);
  material.vertexColors = true;
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const projected = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const texture = circleTexture();
  const marker = pointSprites([{displayPosition: new THREE.Vector3()}], {texture, size: 11, ring: 7, outline: '#354565', color: '#fff'});
  marker.children[0].renderOrder = 5;
  marker.children[1].renderOrder = 6;
  scene.add(marker);
  let enabled = false, selected = null, visibleLayer = 'combined', headColors;
  const dots = {};
  const earLabels = [];
  const outward = new THREE.Vector3();
  const center = new THREE.Vector3(0, 224, -1);

  // Lift the display glyph slightly off the surface. Keep the registered position for picking.
  for (const point of samples) {
    if (point.layer === 'head') {
      outward.copy(point.position).sub(center).normalize();
      point.displayPosition.copy(point.position).addScaledVector(outward, 1.25);
    }
  }

  for (const [layer, info] of Object.entries(layers)) {
    const group = document.createElement('optgroup');
    group.label = info.name;
    const layerPoints = samples.filter(point => point.layer === layer);
    for (const point of layerPoints) {
      const option = document.createElement('option');
      option.value = point.key;
      option.textContent = `${point.id} · ${point.name}`;
      group.append(option);
      if (layer === 'ear') {
        const label = document.createElement('span');
        label.textContent = point.id;
        label.className = 'pressure-ear-label';
        labelLayer.append(label);
        earLabels.push({ point, label });
      }
    }
    const style = layer === 'ear'
      ? {size: 11, ring: 4, outline: '#625272'}
      : {size: 5, ring: 3, outline: '#fff', color: '#27436b'};
    dots[layer] = pointSprites(layerPoints, {texture, ...style});
    scene.add(dots[layer]);
    select.append(group);
    const scale = scales[layer];
    const digits = layer === 'ear' ? 2 : 0;
    element(`pressure-${layer}-range`).textContent = `${scale.min.toFixed(digits)} – ${scale.max.toFixed(digits)} kPa`;
  }

  function inLayer(point) {
    return visibleLayer === 'combined' || visibleLayer === point.layer;
  }

  function updateDots() {
    dots.head.visible = enabled && visibleLayer !== 'ear' && showPoints.checked;
    dots.ear.visible = enabled && visibleLayer !== 'head';
    headPointsControl.hidden = visibleLayer === 'ear';
    if (!dots.ear.visible) labelLayer.hidden = true;
  }

  function paint() {
    if (!enabled) return;
    if (visibleLayer === 'ear') {
      mesh.material = originalMaterial;
      return;
    }
    if (!headColors) {
      headColors = new THREE.BufferAttribute(makeHeadPressureColors(mesh.geometry.getAttribute('position').array), 3);
      mesh.geometry.setAttribute('color', headColors);
    }
    mesh.material = material;
  }

  function choose(point) {
    selected = point;
    select.value = point?.key ?? '';
    card.hidden = !point;
    marker.visible = Boolean(enabled && point);
    if (point) {
      marker.position.copy(point.displayPosition);
      colorFor(point.pdt, scales[point.layer], marker.children[1].material.color);
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
    layout(width, height, moving) {
      // The right-side close-up aligns the labels with the original grid.
      camera.getWorldDirection(direction);
      const gridSpacing = 20 * height * camera.zoom / (camera.top - camera.bottom);
      labelLayer.hidden = !dots.ear.visible || moving || direction.x < .997 || gridSpacing < 31;
      if (labelLayer.hidden) return;
      for (const {point, label} of earLabels) {
        projected.copy(point.displayPosition).project(camera);
        label.hidden = Math.abs(projected.x) > .97 || Math.abs(projected.y) > .93;
        label.style.left = `${(projected.x + 1) * width / 2}px`;
        label.style.top = `${(1 - projected.y) * height / 2}px`;
        label.classList.toggle('is-selected', point === selected);
      }
    },
    pick(event) {
      const box = host.getBoundingClientRect();
      const x = event.clientX - box.left, y = event.clientY - box.top;
      const candidates = [];
      for (const point of samples) {
        if (!inLayer(point)) continue;
        projected.copy(point.displayPosition).project(camera);
        const dx = (projected.x + 1) * box.width / 2 - x;
        const dy = (1 - projected.y) * box.height / 2 - y;
        const distance = Math.hypot(dx, dy);
        if (distance <= (event.pointerType === 'touch' ? 24 : 18)) {
          const onEarDot = point.layer === 'ear' && distance <= 10;
          candidates.push({ point, distance, onEarDot });
        }
      }
      candidates.sort((a, b) => Number(b.onEarDot) - Number(a.onEarDot) || a.distance - b.distance);
      for (const candidate of candidates) {
        const point = candidate.point;
        projected.copy(point.position).project(camera);
        pointer.set(projected.x, projected.y);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(mesh, false).find(result => result.point.y >= 94);
        if (!hit || hit.point.distanceTo(candidate.point.position) > 4) continue;
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
