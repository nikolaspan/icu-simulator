import {
  useEffect,
  useRef,
} from 'react'

import * as THREE from 'three'

import {
  OrbitControls,
} from 'three/addons/controls/OrbitControls.js'

export type HotspotId =
  | 'hs_monitor'
  | 'hs_patient'
  | 'hs_ventilator'
  | 'hs_ehr'
  | 'hs_call'

interface ICUSceneProps {
  onHotspotClick: (
    hotspot: HotspotId,
  ) => void

  onHotspotHover: (
    hotspot: HotspotId | null,
  ) => void
}

function ICUScene({
  onHotspotClick,
  onHotspotHover,
}: ICUSceneProps) {
  const mountRef =
    useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container =
      mountRef.current

    if (!container) {
      return
    }

    /*
     * ==========================================
     * SCENE
     * ==========================================
     */

    const scene =
      new THREE.Scene()

    scene.background =
      new THREE.Color(
        '#dce7ea',
      )

    scene.fog =
      new THREE.Fog(
        '#dce7ea',
        14,
        24,
      )

    /*
     * ==========================================
     * CAMERA
     * ==========================================
     */

    const camera =
      new THREE.PerspectiveCamera(
        43,
        container.clientWidth /
          container.clientHeight,
        0.1,
        100,
      )

    camera.position.set(
      8.5,
      5.6,
      9.5,
    )

    /*
     * ==========================================
     * RENDERER
     * ==========================================
     */

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
      })

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2,
      ),
    )

    renderer.setSize(
      container.clientWidth,
      container.clientHeight,
    )

    renderer.shadowMap.enabled =
      true

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap

    renderer.outputColorSpace =
      THREE.SRGBColorSpace

    renderer.domElement.style.touchAction =
      'none'

    container.appendChild(
      renderer.domElement,
    )

    /*
     * ==========================================
     * CAMERA CONTROLS
     * ==========================================
     */

    const controls =
      new OrbitControls(
        camera,
        renderer.domElement,
      )

    controls.target.set(
      0,
      1.5,
      0,
    )

    controls.enableDamping =
      true

    controls.dampingFactor =
      0.06

    controls.enablePan =
      false

    controls.minDistance =
      6

    controls.maxDistance =
      14

    controls.minPolarAngle =
      Math.PI / 5

    controls.maxPolarAngle =
      Math.PI / 2.05

    /*
     * ==========================================
     * LIGHTING
     * ==========================================
     */

    const hemisphereLight =
      new THREE.HemisphereLight(
        '#f8fdff',
        '#71848b',
        2.4,
      )

    scene.add(
      hemisphereLight,
    )

    const mainLight =
      new THREE.DirectionalLight(
        '#ffffff',
        2.8,
      )

    mainLight.position.set(
      4,
      8,
      5,
    )

    mainLight.castShadow =
      true

    mainLight.shadow.mapSize.set(
      2048,
      2048,
    )

    scene.add(mainLight)

    const clinicalLight =
      new THREE.PointLight(
        '#c9eff7',
        12,
        10,
      )

    clinicalLight.position.set(
      -2,
      4.3,
      -1,
    )

    scene.add(
      clinicalLight,
    )

    /*
     * ==========================================
     * INTERACTION STORAGE
     * ==========================================
     */

    const interactiveObjects:
      any[] = []

    const hotspotHelpers =
      new Map<
        HotspotId,
        any
      >()

    /*
     * ==========================================
     * GEOMETRY HELPERS
     * ==========================================
     */

    function createBox(
      width: number,
      height: number,
      depth: number,
      color: string,
    ) {
      const geometry =
        new THREE.BoxGeometry(
          width,
          height,
          depth,
        )

      const material =
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.58,
          metalness: 0.08,
        })

      const mesh =
        new THREE.Mesh(
          geometry,
          material,
        )

      mesh.castShadow = true
      mesh.receiveShadow = true

      return mesh
    }

    function createCylinder(
      radius: number,
      height: number,
      color: string,
    ) {
      const geometry =
        new THREE.CylinderGeometry(
          radius,
          radius,
          height,
          24,
        )

      const material =
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.5,
          metalness: 0.12,
        })

      const mesh =
        new THREE.Mesh(
          geometry,
          material,
        )

      mesh.castShadow = true

      return mesh
    }

    function registerHotspot(
      object: any,
      hotspot: HotspotId,
    ) {
      object.traverse(
        (child: any) => {
          if (!child.isMesh) {
            return
          }

          child.userData.hotspot =
            hotspot

          interactiveObjects.push(
            child,
          )
        },
      )

      const helper =
        new THREE.BoxHelper(
          object,
          new THREE.Color(
            '#48d1dc',
          ),
        )

      helper.visible =
        false

      scene.add(helper)

      hotspotHelpers.set(
        hotspot,
        helper,
      )
    }

    /*
     * ==========================================
     * ICU ROOM
     * ==========================================
     */

    const floor =
      createBox(
        13,
        0.12,
        10,
        '#becdd1',
      )

    floor.position.set(
      0,
      -0.06,
      0,
    )

    scene.add(floor)

    const backWall =
      createBox(
        13,
        5.2,
        0.14,
        '#e7f0f2',
      )

    backWall.position.set(
      0,
      2.6,
      -5,
    )

    scene.add(
      backWall,
    )

    const leftWall =
      createBox(
        0.14,
        5.2,
        10,
        '#dde9ec',
      )

    leftWall.position.set(
      -6.5,
      2.6,
      0,
    )

    scene.add(
      leftWall,
    )

    /*
     * Ceiling light.
     */

    const ceilingPanel =
      createBox(
        3.2,
        0.06,
        1.1,
        '#f5ffff',
      )

    ceilingPanel.position.set(
      -0.5,
      4.9,
      -0.8,
    )

    scene.add(
      ceilingPanel,
    )

    /*
     * Equipment rail.
     */

    const wallRail =
      createBox(
        7,
        0.16,
        0.12,
        '#9babb0',
      )

    wallRail.position.set(
      0,
      2.2,
      -4.85,
    )

    scene.add(
      wallRail,
    )

    /*
     * ==========================================
     * PATIENT + BED
     * ==========================================
     */

    const patientGroup =
      new THREE.Group()

    const bedFrame =
      createBox(
        4.5,
        0.28,
        2,
        '#81969c',
      )

    bedFrame.position.y =
      0.85

    patientGroup.add(
      bedFrame,
    )

    const bedBase =
      createBox(
        2.7,
        0.45,
        1.3,
        '#9fb0b5',
      )

    bedBase.position.y =
      0.55

    patientGroup.add(
      bedBase,
    )

    const mattress =
      createBox(
        4.15,
        0.26,
        1.78,
        '#f6fafb',
      )

    mattress.position.y =
      1.13

    patientGroup.add(
      mattress,
    )

    const pillow =
      createBox(
        0.75,
        0.18,
        1.15,
        '#f9fbfc',
      )

    pillow.position.set(
      -1.55,
      1.34,
      0,
    )

    patientGroup.add(
      pillow,
    )

    const headboard =
      createBox(
        0.18,
        1.2,
        2,
        '#afc5ca',
      )

    headboard.position.set(
      -2.15,
      1.55,
      0,
    )

    patientGroup.add(
      headboard,
    )

    const footboard =
      createBox(
        0.18,
        0.95,
        2,
        '#afc5ca',
      )

    footboard.position.set(
      2.15,
      1.42,
      0,
    )

    patientGroup.add(
      footboard,
    )

    /*
     * Patient torso.
     */

    const torsoGeometry =
      new THREE.CapsuleGeometry(
        0.42,
        1.4,
        8,
        18,
      )

    const torsoMaterial =
      new THREE.MeshStandardMaterial({
        color: '#7399a8',
        roughness: 0.76,
      })

    const torso =
      new THREE.Mesh(
        torsoGeometry,
        torsoMaterial,
      )

    torso.rotation.z =
      Math.PI / 2

    torso.position.set(
      0,
      1.53,
      0,
    )

    torso.castShadow =
      true

    patientGroup.add(
      torso,
    )

    /*
     * Patient head.
     */

    const headGeometry =
      new THREE.SphereGeometry(
        0.39,
        24,
        24,
      )

    const headMaterial =
      new THREE.MeshStandardMaterial({
        color: '#d5a88d',
        roughness: 0.78,
      })

    const head =
      new THREE.Mesh(
        headGeometry,
        headMaterial,
      )

    head.position.set(
      -1.17,
      1.52,
      0,
    )

    head.castShadow =
      true

    patientGroup.add(
      head,
    )

    /*
     * Blanket.
     */

    const blanket =
      createBox(
        1.8,
        0.12,
        1.55,
        '#94bbc6',
      )

    blanket.position.set(
      0.85,
      1.48,
      0,
    )

    patientGroup.add(
      blanket,
    )

    /*
     * Wheels.
     */

    const wheelPositions = [
      [-1.65, 0.25, -0.7],
      [-1.65, 0.25, 0.7],
      [1.65, 0.25, -0.7],
      [1.65, 0.25, 0.7],
    ]

    wheelPositions.forEach(
      ([x, y, z]) => {
        const wheel =
          createCylinder(
            0.14,
            0.1,
            '#39484d',
          )

        wheel.rotation.z =
          Math.PI / 2

        wheel.position.set(
          x,
          y,
          z,
        )

        patientGroup.add(
          wheel,
        )
      },
    )

    patientGroup.position.set(
      0.4,
      0,
      0.5,
    )

    scene.add(
      patientGroup,
    )

    registerHotspot(
      patientGroup,
      'hs_patient',
    )

    /*
     * ==========================================
     * VITAL SIGNS MONITOR
     * ==========================================
     */

    const monitorGroup =
      new THREE.Group()

    const monitorStand =
      createBox(
        0.12,
        2.3,
        0.12,
        '#75888e',
      )

    monitorStand.position.y =
      1.55

    monitorGroup.add(
      monitorStand,
    )

    const monitorBody =
      createBox(
        1.75,
        1.35,
        0.34,
        '#28363d',
      )

    monitorBody.position.y =
      3.05

    monitorGroup.add(
      monitorBody,
    )

    const monitorScreen =
      createBox(
        1.48,
        1.06,
        0.035,
        '#061318',
      )

    monitorScreen.position.set(
      0,
      3.05,
      0.19,
    )

    monitorGroup.add(
      monitorScreen,
    )

    /*
     * Basic waveform.
     */

    const waveformPoints =
      []

    for (
      let index = 0;
      index < 26;
      index++
    ) {
      const x =
        -0.62 +
        index * 0.05

      let y = 3.15

      if (
        index % 6 === 2
      ) {
        y += 0.15
      }

      if (
        index % 6 === 3
      ) {
        y -= 0.12
      }

      waveformPoints.push(
        new THREE.Vector3(
          x,
          y,
          0.22,
        ),
      )
    }

    const waveformGeometry =
      new THREE.BufferGeometry()
        .setFromPoints(
          waveformPoints,
        )

    const waveformMaterial =
      new THREE.LineBasicMaterial({
        color: '#60e39d',
      })

    const waveform =
      new THREE.Line(
        waveformGeometry,
        waveformMaterial,
      )

    monitorGroup.add(
      waveform,
    )

    /*
     * Red alarm light.
     */

    const alarmGeometry =
      new THREE.SphereGeometry(
        0.09,
        16,
        16,
      )

    const alarmMaterial =
      new THREE.MeshStandardMaterial({
        color: '#ff4f58',
        emissive: '#ff2835',
        emissiveIntensity: 2,
      })

    const alarmLight =
      new THREE.Mesh(
        alarmGeometry,
        alarmMaterial,
      )

    alarmLight.position.set(
      0.68,
      3.53,
      0.24,
    )

    monitorGroup.add(
      alarmLight,
    )

    const monitorBase =
      createBox(
        0.85,
        0.1,
        0.75,
        '#697d83',
      )

    monitorBase.position.y =
      0.4

    monitorGroup.add(
      monitorBase,
    )

    monitorGroup.position.set(
      -3.65,
      0,
      -1.75,
    )

    scene.add(
      monitorGroup,
    )

    registerHotspot(
      monitorGroup,
      'hs_monitor',
    )

    /*
     * ==========================================
     * VENTILATOR
     * ==========================================
     */

    const ventilatorGroup =
      new THREE.Group()

    const ventilatorBody =
      createBox(
        1.3,
        1.75,
        1,
        '#d4e0e3',
      )

    ventilatorBody.position.y =
      1.15

    ventilatorGroup.add(
      ventilatorBody,
    )

    const ventilatorTop =
      createBox(
        1.05,
        0.55,
        0.7,
        '#aabcc1',
      )

    ventilatorTop.position.y =
      2.25

    ventilatorGroup.add(
      ventilatorTop,
    )

    const ventilatorScreen =
      createBox(
        0.85,
        0.45,
        0.035,
        '#0b252d',
      )

    ventilatorScreen.position.set(
      0,
      2.27,
      0.37,
    )

    ventilatorGroup.add(
      ventilatorScreen,
    )

    const ventilatorKnob =
      createCylinder(
        0.09,
        0.08,
        '#4f666c',
      )

    ventilatorKnob.rotation.x =
      Math.PI / 2

    ventilatorKnob.position.set(
      0.42,
      1.65,
      0.54,
    )

    ventilatorGroup.add(
      ventilatorKnob,
    )

    /*
     * Lower ventilation controls.
     */

    const controlOne =
      createCylinder(
        0.045,
        0.05,
        '#237f8f',
      )

    controlOne.rotation.x =
      Math.PI / 2

    controlOne.position.set(
      -0.32,
      1.65,
      0.54,
    )

    ventilatorGroup.add(
      controlOne,
    )

    const controlTwo =
      createCylinder(
        0.045,
        0.05,
        '#237f8f',
      )

    controlTwo.rotation.x =
      Math.PI / 2

    controlTwo.position.set(
      -0.12,
      1.65,
      0.54,
    )

    ventilatorGroup.add(
      controlTwo,
    )

    ventilatorGroup.position.set(
      3.55,
      0,
      -1.05,
    )

    scene.add(
      ventilatorGroup,
    )

    registerHotspot(
      ventilatorGroup,
      'hs_ventilator',
    )

    /*
     * ==========================================
     * EHR TERMINAL
     * ==========================================
     */

    const ehrGroup =
      new THREE.Group()

    const ehrStand =
      createBox(
        0.16,
        1.9,
        0.16,
        '#71878d',
      )

    ehrStand.position.y =
      1

    ehrGroup.add(
      ehrStand,
    )

    const ehrShelf =
      createBox(
        1.65,
        0.12,
        0.75,
        '#a8b9bd',
      )

    ehrShelf.position.set(
      0,
      1.65,
      0.15,
    )

    ehrGroup.add(
      ehrShelf,
    )

    const ehrBody =
      createBox(
        1.75,
        1.15,
        0.22,
        '#283940',
      )

    ehrBody.position.y =
      2.38

    ehrGroup.add(
      ehrBody,
    )

    const ehrScreen =
      createBox(
        1.48,
        0.88,
        0.035,
        '#164b58',
      )

    ehrScreen.position.set(
      0,
      2.38,
      0.13,
    )

    ehrGroup.add(
      ehrScreen,
    )

    /*
     * Fake EHR interface rows.
     */

    const ehrRowOne =
      createBox(
        1.1,
        0.05,
        0.025,
        '#80cad5',
      )

    ehrRowOne.position.set(
      -0.05,
      2.6,
      0.16,
    )

    ehrGroup.add(
      ehrRowOne,
    )

    const ehrRowTwo =
      createBox(
        0.85,
        0.05,
        0.025,
        '#80cad5',
      )

    ehrRowTwo.position.set(
      -0.17,
      2.4,
      0.16,
    )

    ehrGroup.add(
      ehrRowTwo,
    )

    const ehrRowThree =
      createBox(
        0.95,
        0.05,
        0.025,
        '#80cad5',
      )

    ehrRowThree.position.set(
      -0.12,
      2.2,
      0.16,
    )

    ehrGroup.add(
      ehrRowThree,
    )

    ehrGroup.position.set(
      4.35,
      0,
      2.7,
    )

    ehrGroup.rotation.y =
      -0.4

    scene.add(ehrGroup)

    registerHotspot(
      ehrGroup,
      'hs_ehr',
    )

    /*
     * ==========================================
     * CALL BUTTON
     * ==========================================
     */

    const callGroup =
      new THREE.Group()

    const callPanel =
      createBox(
        0.7,
        0.85,
        0.12,
        '#eef3f4',
      )

    callGroup.add(
      callPanel,
    )

    const callButton =
      createCylinder(
        0.18,
        0.08,
        '#c83c47',
      )

    callButton.rotation.x =
      Math.PI / 2

    callButton.position.z =
      0.11

    callGroup.add(
      callButton,
    )

    callGroup.position.set(
      4.8,
      2.15,
      -4.8,
    )

    scene.add(callGroup)

    registerHotspot(
      callGroup,
      'hs_call',
    )

    /*
     * ==========================================
     * NON-INTERACTIVE IV POLE
     * ==========================================
     */

    const ivPole =
      createCylinder(
        0.035,
        2.6,
        '#7d9297',
      )

    ivPole.position.set(
      -1.8,
      1.3,
      -1,
    )

    scene.add(ivPole)

    const ivTop =
      createBox(
        0.8,
        0.05,
        0.05,
        '#7d9297',
      )

    ivTop.position.set(
      -1.8,
      2.58,
      -1,
    )

    scene.add(ivTop)

    /*
     * ==========================================
     * RAYCASTING
     *
     * This is how plain Three.js detects
     * which 3D object the mouse is over.
     * ==========================================
     */

    const raycaster =
      new THREE.Raycaster()

    const pointer =
      new THREE.Vector2()

    let hoveredHotspot:
      | HotspotId
      | null = null

    /*
     * Used to distinguish clicking an object
     * from dragging the camera.
     */
    let pointerStart:
      | {
          x: number
          y: number
        }
      | null = null

    let pointerDragged =
      false

    function updatePointer(
      event: PointerEvent,
    ) {
      const rect =
        renderer.domElement
          .getBoundingClientRect()

      pointer.x =
        ((event.clientX -
          rect.left) /
          rect.width) *
          2 -
        1

      pointer.y =
        -(
          (event.clientY -
            rect.top) /
          rect.height
        ) *
          2 +
        1
    }

    function findHotspot():
      | HotspotId
      | null {
      raycaster.setFromCamera(
        pointer,
        camera,
      )

      const hits =
        raycaster.intersectObjects(
          interactiveObjects,
          false,
        )

      if (
        hits.length === 0
      ) {
        return null
      }

      return hits[0].object
        .userData
        .hotspot as HotspotId
    }

    function setHovered(
      hotspot:
        | HotspotId
        | null,
    ) {
      if (
        hoveredHotspot ===
        hotspot
      ) {
        return
      }

      /*
       * Hide previous outline.
       */
      if (hoveredHotspot) {
        const previous =
          hotspotHelpers.get(
            hoveredHotspot,
          )

        if (previous) {
          previous.visible =
            false
        }
      }

      hoveredHotspot =
        hotspot

      /*
       * Show outline for new object.
       */
      if (hoveredHotspot) {
        const next =
          hotspotHelpers.get(
            hoveredHotspot,
          )

        if (next) {
          next.update()
          next.visible = true
        }
      }

      if (!pointerDragged) {
        renderer.domElement
          .style.cursor =
          hoveredHotspot
            ? 'pointer'
            : 'grab'
      }

      onHotspotHover(
        hoveredHotspot,
      )
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      pointerStart = {
        x: event.clientX,
        y: event.clientY,
      }

      pointerDragged = false
    }

    function handlePointerMove(
      event: PointerEvent,
    ) {
      /*
       * Detect camera drag.
       */
      if (pointerStart) {
        const distance =
          Math.hypot(
            event.clientX -
              pointerStart.x,
            event.clientY -
              pointerStart.y,
          )

        if (distance > 6) {
          pointerDragged =
            true

          renderer.domElement
            .style.cursor =
            'grabbing'
        }
      }

      updatePointer(event)

      if (!pointerDragged) {
        setHovered(
          findHotspot(),
        )
      }
    }

    function handlePointerUp(
      event: PointerEvent,
    ) {
      updatePointer(event)

      /*
       * Only trigger the hotspot if
       * the user clicked rather than
       * dragged the camera.
       */
      if (!pointerDragged) {
        const hotspot =
          findHotspot()

        if (hotspot) {
          onHotspotClick(
            hotspot,
          )
        }
      }

      pointerStart = null
      pointerDragged = false

      setHovered(
        findHotspot(),
      )
    }

    function handlePointerLeave() {
      pointerStart = null
      pointerDragged = false

      setHovered(null)

      renderer.domElement
        .style.cursor =
        'grab'
    }

    renderer.domElement
      .addEventListener(
        'pointerdown',
        handlePointerDown,
      )

    renderer.domElement
      .addEventListener(
        'pointermove',
        handlePointerMove,
      )

    renderer.domElement
      .addEventListener(
        'pointerup',
        handlePointerUp,
      )

    renderer.domElement
      .addEventListener(
        'pointerleave',
        handlePointerLeave,
      )

    /*
     * ==========================================
     * RESPONSIVE RESIZING
     * ==========================================
     */

    function handleResize() {
    const currentContainer =
        mountRef.current

    if (!currentContainer) {
        return
    }

    const width =
        currentContainer.clientWidth

    const height =
        currentContainer.clientHeight

    if (
        width === 0 ||
        height === 0
    ) {
        return
    }

    camera.aspect =
        width / height

    camera.updateProjectionMatrix()

    renderer.setSize(
        width,
        height,
    )
    }

    const resizeObserver =
      new ResizeObserver(
        handleResize,
      )

    resizeObserver.observe(
      container,
    )

    /*
     * ==========================================
     * ANIMATION
     * ==========================================
     */

    const clock =
      new THREE.Clock()

    renderer.setAnimationLoop(
      () => {
        const elapsed =
          clock.getElapsedTime()

        /*
         * Flashing red monitor alarm.
         *
         * Later this will depend on:
         *
         * vitals.spo2 < 90
         */
        alarmMaterial.emissiveIntensity =
          1.7 +
          Math.sin(
            elapsed * 5,
          ) *
            1.2

        controls.update()

        renderer.render(
          scene,
          camera,
        )
      },
    )

    /*
     * ==========================================
     * CLEANUP
     *
     * Important because React StrictMode may
     * mount/unmount the component during
     * development.
     * ==========================================
     */

    return () => {
      resizeObserver.disconnect()

      renderer.domElement
        .removeEventListener(
          'pointerdown',
          handlePointerDown,
        )

      renderer.domElement
        .removeEventListener(
          'pointermove',
          handlePointerMove,
        )

      renderer.domElement
        .removeEventListener(
          'pointerup',
          handlePointerUp,
        )

      renderer.domElement
        .removeEventListener(
          'pointerleave',
          handlePointerLeave,
        )

      controls.dispose()

      renderer.setAnimationLoop(
        null,
      )

      scene.traverse(
        (object: any) => {
          if (object.geometry) {
            object.geometry.dispose()
          }

          if (
            !object.material
          ) {
            return
          }

          if (
            Array.isArray(
              object.material,
            )
          ) {
            object.material.forEach(
              (
                material: any,
              ) => {
                material.dispose()
              },
            )
          } else {
            object.material.dispose()
          }
        },
      )

      renderer.dispose()

      if (
        renderer.domElement
          .parentElement ===
        container
      ) {
        container.removeChild(
          renderer.domElement,
        )
      }
    }
  }, [
    onHotspotClick,
    onHotspotHover,
  ])

  return (
    <div
      ref={mountRef}
      className="icu-scene"
      aria-label="Interactive 3D intensive care unit"
    />
  )
}

export default ICUScene