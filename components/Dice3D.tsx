/**
 * Dice3D — gerçek 3B zarlar (three.js + expo-gl, Expo Go'da çalışır).
 *
 * Geometriler prosedürel: D4 tetrahedron, D6 küp, D8 oktahedron,
 * D10/D% beşgen trapezohedron, D12 dodekahedron, D20 ikosahedron.
 * Rakamlar yüzlere decal (saydam PNG) olarak yapıştırılır; zar düşerken
 * atılan değerin yüzü kameraya dönecek şekilde yönlenir — sonuç GERÇEKTEN
 * zarın üstünde okunur. D% bir çift olarak atılır (onlar + birler).
 */
import { useEffect, useRef } from 'react';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer, loadAsync } from 'expo-three';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Rakam dokuları (assets/dice3d — build sırasında üretildi)          */
/* ------------------------------------------------------------------ */
const TEX: Record<string, any> = {
  n1: require('../assets/dice3d/n1.png'),
  n2: require('../assets/dice3d/n2.png'),
  n3: require('../assets/dice3d/n3.png'),
  n4: require('../assets/dice3d/n4.png'),
  n5: require('../assets/dice3d/n5.png'),
  n6: require('../assets/dice3d/n6.png'),
  n7: require('../assets/dice3d/n7.png'),
  n8: require('../assets/dice3d/n8.png'),
  n9: require('../assets/dice3d/n9.png'),
  n10: require('../assets/dice3d/n10.png'),
  n11: require('../assets/dice3d/n11.png'),
  n12: require('../assets/dice3d/n12.png'),
  n13: require('../assets/dice3d/n13.png'),
  n14: require('../assets/dice3d/n14.png'),
  n15: require('../assets/dice3d/n15.png'),
  n16: require('../assets/dice3d/n16.png'),
  n17: require('../assets/dice3d/n17.png'),
  n18: require('../assets/dice3d/n18.png'),
  n19: require('../assets/dice3d/n19.png'),
  n20: require('../assets/dice3d/n20.png'),
  t00: require('../assets/dice3d/t00.png'),
  t10: require('../assets/dice3d/t10.png'),
  t20: require('../assets/dice3d/t20.png'),
  t30: require('../assets/dice3d/t30.png'),
  t40: require('../assets/dice3d/t40.png'),
  t50: require('../assets/dice3d/t50.png'),
  t60: require('../assets/dice3d/t60.png'),
  t70: require('../assets/dice3d/t70.png'),
  t80: require('../assets/dice3d/t80.png'),
  t90: require('../assets/dice3d/t90.png'),
  u0: require('../assets/dice3d/u0.png'),
  u1: require('../assets/dice3d/u1.png'),
  u2: require('../assets/dice3d/u2.png'),
  u3: require('../assets/dice3d/u3.png'),
  u4: require('../assets/dice3d/u4.png'),
  u5: require('../assets/dice3d/u5.png'),
  u6: require('../assets/dice3d/u6.png'),
  u7: require('../assets/dice3d/u7.png'),
  u8: require('../assets/dice3d/u8.png'),
  u9: require('../assets/dice3d/u9.png'),
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/* ------------------------------------------------------------------ */
/*  Geometriler                                                        */
/* ------------------------------------------------------------------ */
/** D10: beşgen trapezohedron (10 uçurtma yüz). */
function trapezohedronGeometry(R = 1.15, apex = 1.35): THREE.BufferGeometry {
  const h = 0.24;
  const belt: THREE.Vector3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    belt.push(
      new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, i % 2 ? h : -h)
    );
  }
  const T = new THREE.Vector3(0, 0, apex);
  const B = new THREE.Vector3(0, 0, -apex);
  const tris: THREE.Vector3[][] = [];
  for (let i = 0; i < 5; i++) {
    // üst uçurtma: T, u1, mid, u2
    const u1 = belt[(2 * i + 1) % 10];
    const mid = belt[(2 * i + 2) % 10];
    const u2 = belt[(2 * i + 3) % 10];
    tris.push([T, u1, mid], [T, mid, u2]);
    // alt uçurtma
    const l1 = belt[(2 * i) % 10];
    const mu = belt[(2 * i + 1) % 10];
    const l2 = belt[(2 * i + 2) % 10];
    tris.push([B, l2, mu], [B, mu, l1]);
  }
  const positions: number[] = [];
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  for (const [a, b, c] of tris) {
    const n = v1.subVectors(b, a).cross(v2.subVectors(c, a));
    const centroid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    if (n.dot(centroid) < 0) {
      positions.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    } else {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function makeGeometry(sides: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  switch (sides) {
    case 4:
      g = new THREE.TetrahedronGeometry(1.35);
      break;
    case 6:
      g = new THREE.BoxGeometry(1.62, 1.62, 1.62);
      break;
    case 8:
      g = new THREE.OctahedronGeometry(1.28);
      break;
    case 10:
      g = trapezohedronGeometry();
      break;
    case 12:
      g = new THREE.DodecahedronGeometry(1.22);
      break;
    default:
      g = new THREE.IcosahedronGeometry(1.28);
  }
  return g.index ? g.toNonIndexed() : g;
}

/** Üçgenleri normale göre kümeleyip mantıksal yüzleri çıkarır. */
function extractFaces(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute('position');
  const groups: { normal: THREE.Vector3; center: THREE.Vector3; area: number }[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const n = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a));
    const area = n.length() / 2;
    n.normalize();
    const centroid = new THREE.Vector3()
      .add(a)
      .add(b)
      .add(c)
      .multiplyScalar(area / 3);
    const g = groups.find((g) => g.normal.dot(n) > 0.97);
    if (g) {
      g.center.add(centroid);
      g.area += area;
    } else {
      groups.push({ normal: n, center: centroid, area });
    }
  }
  return groups.map((g) => ({
    normal: g.normal,
    center: g.center.divideScalar(g.area),
    area: g.area,
  }));
}

/* ------------------------------------------------------------------ */
/*  Tipler                                                             */
/* ------------------------------------------------------------------ */
interface FaceInfo {
  normal: THREE.Vector3;
  up: THREE.Vector3;
  value: number;
}
interface DieObj {
  group: THREE.Group;
  faces: FaceInfo[];
  angVel: THREE.Vector3;
  bouncePhase: number;
  home: THREE.Vector3;
  from: THREE.Quaternion;
  to: THREE.Quaternion;
  t: number;
}
type Phase = 'idle' | 'tumble' | 'settleInit' | 'settle' | 'rest';
interface SceneState {
  phase: Phase;
  sides: number;
  count: number;
  results: number[] | null;
  rebuild: boolean;
}

interface Props {
  sides: number;
  count: number;
  tumbling: boolean;
  /** Yalnızca zarlar düştüğünde dolu gelir. */
  results: number[] | null;
  height: number;
}

/* ------------------------------------------------------------------ */
/*  Bileşen                                                            */
/* ------------------------------------------------------------------ */
export default function Dice3D({ sides, count, tumbling, results, height }: Props) {
  const st = useRef<SceneState>({
    phase: 'idle',
    sides,
    count,
    results: null,
    rebuild: true,
  }).current;
  const disposedRef = useRef(false);

  useEffect(() => {
    st.sides = sides;
    st.count = count;
    st.results = null;
    st.rebuild = true;
    st.phase = 'idle';
  }, [sides, count, st]);

  useEffect(() => {
    if (tumbling) {
      st.phase = 'tumble';
    } else if (results && results.length) {
      st.results = results;
      st.phase = 'settleInit';
    }
  }, [tumbling, results, st]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const renderer = new Renderer({ gl });
    renderer.setSize(w, h);
    renderer.setClearColor(0xfcfbf7, 1); // tepsi yüzeyi rengi

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const dir = new THREE.DirectionalLight(0xffffff, 2.6);
    dir.position.set(3, 6, 7);
    scene.add(dir);
    const green = new THREE.PointLight(0x57e025, 24, 16, 2);
    green.position.set(0, -2.5, 4.5);
    scene.add(green);

    // Dokuları yükle
    const texCache: Record<string, THREE.Texture> = {};
    await Promise.all(
      Object.entries(TEX).map(async ([k, mod]) => {
        const t = (await loadAsync(mod)) as THREE.Texture;
        t.colorSpace = THREE.SRGBColorSpace;
        texCache[k] = t;
      })
    );

    let dice: DieObj[] = [];

    const buildDie = (dieSides: number, keys: string[], values: number[]): DieObj => {
      const geo = makeGeometry(dieSides);
      const body = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: 0x333d33,
          roughness: 0.5,
          metalness: 0.45,
          flatShading: true,
          emissive: 0x0c120c,
        })
      );
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 12),
        new THREE.LineBasicMaterial({ color: 0x7d8e72 })
      );
      const group = new THREE.Group();
      group.add(body, edges);

      const faces: FaceInfo[] = [];
      extractFaces(geo).forEach((f, idx) => {
        if (idx >= keys.length) return;
        const n = f.normal.clone();
        const upWorld =
          Math.abs(n.y) < 0.9
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(0, 0, 1);
        const up = upWorld
          .clone()
          .sub(n.clone().multiplyScalar(upWorld.dot(n)))
          .normalize();
        const r = new THREE.Vector3().crossVectors(up, n).normalize();
        const size = clamp(Math.sqrt(f.area) * 0.78, 0.5, 1.15);
        const decal = new THREE.Mesh(
          new THREE.PlaneGeometry(size, size),
          new THREE.MeshBasicMaterial({
            map: texCache[keys[idx]],
            transparent: true,
            depthWrite: false,
          })
        );
        decal.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(r, up, n)
        );
        decal.position.copy(f.center).addScaledVector(n, 0.03);
        group.add(decal);
        faces.push({ normal: n, up, value: values[idx] });
      });

      return {
        group,
        faces,
        angVel: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1))
          .normalize()
          .multiplyScalar(rand(9, 13)),
        bouncePhase: rand(0, Math.PI * 2),
        home: new THREE.Vector3(),
        from: new THREE.Quaternion(),
        to: new THREE.Quaternion(),
        t: 0,
      };
    };

    const buildAll = () => {
      dice.forEach((d) => scene.remove(d.group));
      dice = [];
      const specs: { sides: number; keys: string[]; values: number[] }[] = [];
      if (st.sides === 100) {
        // D% = onlar + birler zar çifti
        const tensKeys = Array.from({ length: 10 }, (_, i) => `t${i}0`);
        const unitKeys = Array.from({ length: 10 }, (_, i) => `u${i}`);
        const digits = Array.from({ length: 10 }, (_, i) => i);
        for (let i = 0; i < st.count; i++) {
          specs.push({ sides: 10, keys: tensKeys, values: digits });
          specs.push({ sides: 10, keys: unitKeys, values: digits });
        }
      } else {
        const keys = Array.from({ length: st.sides }, (_, i) => `n${i + 1}`);
        const values = Array.from({ length: st.sides }, (_, i) => i + 1);
        for (let i = 0; i < st.count; i++) specs.push({ sides: st.sides, keys, values });
      }

      const n = specs.length;
      const cols = Math.min(3, n);
      const rows = Math.ceil(n / 3);
      specs.forEach((spec, i) => {
        const die = buildDie(spec.sides, spec.keys, spec.values);
        const row = Math.floor(i / 3);
        const colsInRow = Math.min(3, n - row * 3);
        const col = i % 3;
        die.home.set(
          (col - (colsInRow - 1) / 2) * 2.55,
          ((rows - 1) / 2 - row) * 2.75,
          0
        );
        die.group.position.copy(die.home);
        die.group.quaternion.setFromEuler(
          new THREE.Euler(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28))
        );
        scene.add(die.group);
        dice.push(die);
      });

      camera.position.set(
        0,
        1.0,
        Math.max(5.0, cols * 2.55 * 1.15 + 1.4, rows * 2.75 * 1.5 + 1.6)
      );
      camera.lookAt(0, 0, 0);
    };

    /** Değerin yüzü kameraya (+Z) ve rakam dik gelecek şekilde hedef dönüş. */
    const orientTo = (die: DieObj, value: number) => {
      const f = die.faces.find((x) => x.value === value) ?? die.faces[0];
      const r = new THREE.Vector3().crossVectors(f.up, f.normal).normalize();
      const m = new THREE.Matrix4().makeBasis(r, f.up, f.normal).transpose();
      return new THREE.Quaternion().setFromRotationMatrix(m);
    };

    const tmpQ = new THREE.Quaternion();
    const axis = new THREE.Vector3();
    let last = 0;

    const render = (now: number) => {
      if (disposedRef.current) return;
      requestAnimationFrame(render);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;

      if (st.rebuild) {
        buildAll();
        st.rebuild = false;
      }

      if (st.phase === 'idle') {
        // hafif vitrin dönüşü
        for (const d of dice) {
          axis.set(0.35, 1, 0.25).normalize();
          tmpQ.setFromAxisAngle(axis, 0.5 * dt);
          d.group.quaternion.premultiply(tmpQ);
        }
      } else if (st.phase === 'tumble') {
        for (const d of dice) {
          axis.copy(d.angVel).normalize();
          tmpQ.setFromAxisAngle(axis, d.angVel.length() * dt);
          d.group.quaternion.premultiply(tmpQ);
          // açısal hızda rastgele sapma (organik takla)
          d.angVel.x += rand(-1, 1) * dt * 9;
          d.angVel.y += rand(-1, 1) * dt * 9;
          d.angVel.z += rand(-1, 1) * dt * 9;
          const len = clamp(d.angVel.length(), 8, 15);
          d.angVel.normalize().multiplyScalar(len);
          // zıplama
          d.bouncePhase += dt * 7.5;
          d.group.position.y =
            d.home.y + Math.abs(Math.sin(d.bouncePhase)) * 0.42;
        }
      } else if (st.phase === 'settleInit' && st.results) {
        dice.forEach((d, idx) => {
          let value: number;
          if (st.sides === 100) {
            const slot = Math.floor(idx / 2);
            const v = st.results![slot] ?? 1;
            value = idx % 2 === 0 ? Math.floor((v % 100) / 10) : v % 10;
          } else {
            value = st.results![idx] ?? 1;
          }
          d.from.copy(d.group.quaternion);
          d.to.copy(orientTo(d, value));
          d.t = 0;
        });
        st.phase = 'settle';
      } else if (st.phase === 'settle') {
        let done = true;
        for (const d of dice) {
          d.t = Math.min(1, d.t + dt / 0.55);
          const k = easeOutCubic(d.t);
          d.group.quaternion.slerpQuaternions(d.from, d.to, k);
          d.group.position.y =
            d.home.y + (d.group.position.y - d.home.y) * (1 - Math.min(1, d.t * 2.2));
          if (d.t < 1) done = false;
        }
        if (done) st.phase = 'rest';
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    requestAnimationFrame(render);
  };

  return (
    <GLView
      key={height}
      style={{ width: '100%', height, borderRadius: 16, overflow: 'hidden' }}
      onContextCreate={onContextCreate}
    />
  );
}
