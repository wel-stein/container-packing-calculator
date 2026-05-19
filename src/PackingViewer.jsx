import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { colorFor } from './colors';

export default function PackingViewer({ container, placed, visibleCount }) {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const groupRef = useRef(null);
  const rotationRef = useRef({ x: 0.5, y: 0.7 });
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.7);
    d1.position.set(1, 2, 1); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x66ccff, 0.25);
    d2.position.set(-1, -1, -1); scene.add(d2);

    const group = new THREE.Group();
    scene.add(group);
    cameraRef.current = camera;
    groupRef.current = group;

    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    const pointers = new Map();
    let pinchDist = 0;

    const onDown = (e) => {
      dom.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        draggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.size === 2) {
        draggingRef.current = false;
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1 && draggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        rotationRef.current.y += dx * 0.01;
        rotationRef.current.x += dy * 0.01;
        rotationRef.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationRef.current.x));
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && dist > 0) {
          const f = pinchDist / dist;
          camera.position.multiplyScalar(f);
        }
        pinchDist = dist;
      }
    };
    const onUp = (e) => {
      dom.releasePointerCapture?.(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) draggingRef.current = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 1.1 : 0.9;
      camera.position.multiplyScalar(f);
    };
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);
    dom.addEventListener('pointerleave', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (groupRef.current) {
        groupRef.current.rotation.x = rotationRef.current.x;
        groupRef.current.rotation.y = rotationRef.current.y;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
      dom.removeEventListener('pointerleave', onUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    const camera = cameraRef.current;
    if (!group || !camera) return;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    const { L, W, H } = container;
    if (!L || !W || !H) return;

    const cx = L / 2, cy = W / 2, cz = H / 2;

    const containerGeo = new THREE.BoxGeometry(L, H, W);
    const containerEdges = new THREE.EdgesGeometry(containerGeo);
    const containerLine = new THREE.LineSegments(
      containerEdges,
      new THREE.LineBasicMaterial({ color: 0x4dd0e1 })
    );
    group.add(containerLine);
    containerGeo.dispose();

    const floorGeo = new THREE.PlaneGeometry(L, W);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x1a2238, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -H / 2;
    group.add(floor);

    const visible = placed.slice(0, visibleCount);
    visible.forEach((p) => {
      const geo = new THREE.BoxGeometry(p.l, p.h, p.w);
      const c = colorFor(p.typeId);
      const mat = new THREE.MeshPhongMaterial({
        color: c.hex, transparent: true, opacity: 0.85, shininess: 25,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        p.x + p.l / 2 - cx,
        p.z + p.h / 2 - cz,
        p.y + p.w / 2 - cy
      );
      group.add(mesh);

      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.35, transparent: true })
      );
      line.position.copy(mesh.position);
      group.add(line);
    });

    const maxDim = Math.max(L, W, H);
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, 0, 0);
  }, [container, placed, visibleCount]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
      onMouseDown={(e) => { e.currentTarget.style.cursor = 'grabbing'; }}
      onMouseUp={(e) => { e.currentTarget.style.cursor = 'grab'; }}
    />
  );
}
