'use client'

import type * as ThreeType from 'three'
import { useEffect, useRef } from 'react'

interface Props {
  intensity?: number  // 0–1, controls morph amplitude (0.1 idle → 0.55 speaking)
}

const SIZE = 200

export function MorphingSphere({ intensity = 0.5 }: Props) {
  const mountRef  = useRef<HTMLDivElement>(null)
  const intensRef = useRef(intensity)

  /* Keep intensRef in sync without restarting Three.js */
  useEffect(() => { intensRef.current = intensity }, [intensity])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let animId = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderer: any

    async function init() {
      if (!container) return          // re-check after await
      const THREE = await import('three')

      /* ── Scene + Camera ───────────────────────────────────────── */
      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
      camera.position.z = 2.8

      /* ── Renderer ─────────────────────────────────────────────── */
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(SIZE, SIZE)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)

      /* ── Geometry ─────────────────────────────────────────────── */
      const geomWire  = new THREE.IcosahedronGeometry(1, 6)
      const geomSolid = new THREE.IcosahedronGeometry(1, 6)

      // Capture originals before any displacement
      const origWire  = Float32Array.from(geomWire.attributes.position.array)
      const origSolid = Float32Array.from(geomSolid.attributes.position.array)

      /* ── Materials ────────────────────────────────────────────── */
      const wireMat = new THREE.MeshPhongMaterial({
        color:       0x7C3AED,
        wireframe:   true,
        transparent: true,
        opacity:     0.82,
      })
      const solidMat = new THREE.MeshPhongMaterial({
        color:       0x312E81,
        transparent: true,
        opacity:     0.22,
        side:        THREE.FrontSide,
      })

      const wireMesh  = new THREE.Mesh(geomWire,  wireMat)
      const solidMesh = new THREE.Mesh(geomSolid, solidMat)
      scene.add(solidMesh)
      scene.add(wireMesh)

      /* ── Lights ───────────────────────────────────────────────── */
      const dir1 = new THREE.DirectionalLight(0xA78BFA, 1.3)
      dir1.position.set(2, 2, 2)
      scene.add(dir1)

      const dir2 = new THREE.DirectionalLight(0xF0ABFC, 0.65)
      dir2.position.set(-2, -1, 1)
      scene.add(dir2)

      scene.add(new THREE.AmbientLight(0x6366F1, 0.45))

      /* ── Animation loop ───────────────────────────────────────── */
      let time = 0

      function displaceGeom(
        geom: ThreeType.BufferGeometry,
        orig: Float32Array,
        morph: number,
      ) {
        const pos = geom.attributes.position as ThreeType.BufferAttribute
        for (let i = 0; i < pos.count; i++) {
          const ox = orig[i * 3]
          const oy = orig[i * 3 + 1]
          const oz = orig[i * 3 + 2]
          const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1
          const nx = ox / len, ny = oy / len, nz = oz / len

          const d = (
            Math.sin(nx * 3.5 + time) *
            Math.cos(ny * 3.5 + time * 0.7) *
            Math.sin(nz * 2.8 + time * 1.3)
          ) * morph

          pos.setXYZ(i, ox + nx * d, oy + ny * d, oz + nz * d)
        }
        pos.needsUpdate = true
      }

      function animate() {
        animId = requestAnimationFrame(animate)
        time += 0.012

        const morph = 0.10 + intensRef.current * 0.30   // 0.10 idle → 0.40 at full

        displaceGeom(geomWire,  origWire,  morph)
        displaceGeom(geomSolid, origSolid, morph * 0.6)

        /* Slow Y + tiny X rotation */
        wireMesh.rotation.y  += 0.006
        wireMesh.rotation.x  += 0.002
        solidMesh.rotation.y  = wireMesh.rotation.y
        solidMesh.rotation.x  = wireMesh.rotation.x

        renderer.render(scene, camera)
      }

      animate()
    }

    init().catch(console.error)

    return () => {
      cancelAnimationFrame(animId)
      try {
        renderer?.dispose()
        if (container.firstChild) container.removeChild(container.firstChild)
      } catch {}
    }
  }, [])  // run once — intensity updates flow via ref

  return (
    <div
      ref={mountRef}
      style={{ width: SIZE, height: SIZE, flexShrink: 0 }}
    />
  )
}
