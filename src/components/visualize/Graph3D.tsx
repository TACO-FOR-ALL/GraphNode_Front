import { GraphData } from "@/types/GraphData";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function Graph3D({ data }: { data: GraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null); // hover 이벤트 시 node id 표시

  useEffect(() => {
    const scene = new THREE.Scene(); // 3D 객체들을 담는 컨테이너

    // 사용자 시점 카메라
    const camera = new THREE.PerspectiveCamera(
      75, // fov: 시야각
      window.innerWidth / window.innerHeight, // 화면 종횡비
      0.1, // near: 가까운 평면
      1000 // far: 먼 평면
    );
    camera.position.z = 10; // 카메라 초기 위치

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvasRef.current!, // 렌더링 결과를 그릴 캔버스
    });
    renderer.setSize(window.innerWidth, window.innerHeight); // pixel 해상도 조절
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // HiDPI 환경 성능,품질 조절

    // 사용자 시점 카메라 제어
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 부드러운 움직임 (관성 비슷한 효과)
    controls.enableZoom = true; // 줌 인/아웃 가능
    controls.zoomSpeed = 1.2;
    controls.minDistance = 3; // 줌 인/아웃 최소 거리
    controls.maxDistance = 50; // 줌 인/아웃 최대 거리

    const nodeMap: Record<string, THREE.Mesh> = {};
    const nodeMeshes: THREE.Object3D[] = [];

    // 노드 생성
    data.nodes.forEach((node) => {
      // Mesh = Geometry(물체의 모양) + Material(색상, 반사, 질감, 투명도, 광원 효과 등)
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16), // SphereGeometry(radius, widthSegments, heightSegments) 구체 그외 다양한 기하(Geometry) 클래스가 있음 => segment는 모델의 정밀도 (높을수록 더 완성도 높은 3D 모델)
        new THREE.MeshBasicMaterial({ color: 0x4aa8c0 }) // 단색 메터리얼 (조명 무시)
      );
      sphere.position.set(
        // 노드 위치
        Math.random() * 6 - 3,
        Math.random() * 6 - 3,
        Math.random() * 6 - 3
      );
      sphere.userData.id = node.id;
      scene.add(sphere);
      nodeMap[node.id] = sphere;
      nodeMeshes.push(sphere);
    });

    // 엣지(링크) 생성
    const edges: {
      geometry: THREE.BufferGeometry;
      link: { source: string; target: string };
    }[] = [];
    data.links.forEach((link) => {
      const material = new THREE.LineBasicMaterial({ color: 0xaaaaaa }); // 단색 선 메터리얼
      // setFromPoints(THREE.Vector3[]): 두 노드의 현재 위치를 넘겨서 선분을 정의 (THREE.Vecctor3는  47번 라인 확인)
      const geometry = new THREE.BufferGeometry().setFromPoints([
        nodeMap[link.source].position,
        nodeMap[link.target].position,
      ]);
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      edges.push({ geometry, link });
    });

    // 물리 연산 (노드 간 거리 계산 및 조정)
    function applyForces() {
      data.nodes.forEach((a) => {
        data.nodes.forEach((b) => {
          if (a === b) return;
          const posA = nodeMap[a.id].position;
          const posB = nodeMap[b.id].position;
          const diff = posA.clone().sub(posB); // A - B 백터
          const dist = Math.max(diff.length(), 0.2); // 노드 간 거리 (최소 0.2)
          const repel = 0.01 / dist;
          diff.normalize().multiplyScalar(repel); // normalize(): 백터의 방향만 유지하고 크기를 1로 만듦, multiplyScalar()로 반발력 계수만큼 스케일
          posA.add(diff); // A 노드를 반발력 방향으로 이동
          posB.sub(diff); // B 노드를 A 노드의 반대 방향으로 같은 거리만큼 이동
        });
      });

      data.links.forEach((link) => {
        const a = nodeMap[link.source].position;
        const b = nodeMap[link.target].position;
        const mid = a.clone().add(b).multiplyScalar(0.5); // 두 노드의 중점 계산
        a.lerp(mid, 0.05); // 현재 좌표가 a고, target이 mid, amount가 0.05: 즉 a는 원래 자리에서 중간점 쪽으로 5프로만큼 이동
        b.lerp(mid, 0.05);
      });

      // 수정된 노드 위치를 반영해서, 노드들을 연결하는 선의 기하도(BufferGeometry) 업데이트
      edges.forEach((edge) => {
        edge.geometry.setFromPoints([
          nodeMap[edge.link.source].position,
          nodeMap[edge.link.target].position,
        ]);
        edge.geometry.attributes.position.needsUpdate = true; // 기하도의 위치 정보 업데이트
      });
    }

    const raycaster = new THREE.Raycaster(); // 레이캐스터: 카메라 시점에서 마우스 위치를 통해 3D 객체를 찾는 도구
    const mouse = new THREE.Vector2(); // 마우스 위치를 저장하는 벡터
    let hovered: THREE.Mesh | null = null; // 마우스 오버 시 표시되는 노드

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const isects = raycaster.intersectObjects(nodeMeshes, false);

      if (hovered && (!isects.length || isects[0].object !== hovered)) {
        (hovered.material as THREE.MeshBasicMaterial).color.set(0x4aa8c0);
        hovered = null;
        if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
      }

      if (isects.length) {
        const obj = isects[0].object as THREE.Mesh;
        hovered = obj;
        (obj.material as THREE.MeshBasicMaterial).color.set(0xffcc00);
        if (tooltipRef.current) {
          tooltipRef.current.textContent = obj.userData.id ?? "";
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY + 10}px`;
          tooltipRef.current.style.opacity = "1";
        }
      }
    };
    renderer.domElement.addEventListener("mousemove", onMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      applyForces();
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const isects = raycaster.intersectObjects(nodeMeshes, false);
      if (!isects.length) return;
      const mesh = isects[0].object as THREE.Mesh;
      focusOn(mesh.position, 6);
    };
    renderer.domElement.addEventListener("click", onClick);

    function focusOn(targetPos: THREE.Vector3, distance = 8, ms = 600) {
      const startCam = camera.position.clone();
      const startTarget = controls.target.clone();

      const endTarget = targetPos.clone();
      const dir = camera.position.clone().sub(controls.target).normalize();
      const endCam = endTarget.clone().add(dir.multiplyScalar(distance));

      let t0 = 0;
      const animateFocus = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / ms);
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        const cam = startCam.clone().lerp(endCam, ease);
        const tgt = startTarget.clone().lerp(endTarget, ease);

        camera.position.copy(cam);
        controls.target.copy(tgt);
        controls.update();

        if (p < 1) requestAnimationFrame(animateFocus);
      };
      requestAnimationFrame(animateFocus);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousemove", onMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      scene.clear();
    };
  }, [data]);

  return (
    <>
      <canvas ref={canvasRef} />
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          pointerEvents: "none",
          padding: "4px 8px",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          borderRadius: 6,
          fontSize: 12,
          transform: "translate(-50%,-130%)",
          opacity: 0,
          transition: "opacity 120ms",
          zIndex: 10,
        }}
      />
    </>
  );
}
