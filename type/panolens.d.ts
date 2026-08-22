// type/panolens.d.ts
//
// panolens@0.12.1 no trae sus propios tipos (ni existe @types/panolens), así
// que estas declaraciones cubren únicamente lo que Vista360.tsx realmente
// usa. No es una definición completa de toda la librería.

declare module 'panolens' {
  import * as THREE from 'three'

  // ---------------------------------------------------------------------
  // Controls de cámara internos del Viewer (viewer.OrbitControls). No se
  // exportan como clase importable desde 'panolens', solo existen como
  // instancia colgada del Viewer.
  // ---------------------------------------------------------------------
  interface PanolensOrbitControls {
    enabled: boolean
    target: THREE.Vector3
    object: THREE.Camera

    noPan: boolean
    noZoom: boolean
    noRotate: boolean

    minPolarAngle: number
    maxPolarAngle: number
    minAzimuthAngle: number
    maxAzimuthAngle: number

    minDistance: number
    maxDistance: number
    minFov: number
    maxFov: number

    rotateSpeed: number
    zoomSpeed: number

    autoRotate: boolean
    autoRotateSpeed: number

    momentumScalingFactor: number
    momentumDampingFactor: number

    update(ignoreUpdate?: boolean): void
    reset(): void
    getPolarAngle(): number
    getAzimuthalAngle(): number
    dispose(): void
  }

  // ---------------------------------------------------------------------
  // Panorama base / Infospot
  // ---------------------------------------------------------------------
  class Panorama extends THREE.Mesh {
    type: string
    animationDuration: number
    dispose(): void
    onEnter(): void
    onLeave(): void
    addEventListener(type: string, listener: (event: any) => void): void
    removeEventListener(type: string, listener: (event: any) => void): void
    dispatchEvent(event: { type: string; [key: string]: unknown }): void
  }

  class ImagePanorama extends Panorama {
    constructor(image?: string | HTMLImageElement, geometry?: THREE.BufferGeometry, material?: THREE.Material)
    src: string | HTMLImageElement
    load(src?: string): void
  }

  class Infospot extends THREE.Sprite {
    constructor(scale?: number, imageSrc?: string, animated?: boolean)
    addHoverText(text: string, height?: number): void
    show(delay?: number): void
    hide(delay?: number): void
    addEventListener(type: string, listener: (event: any) => void): void
    removeEventListener(type: string, listener: (event: any) => void): void
  }

  // ---------------------------------------------------------------------
  // Viewer
  // ---------------------------------------------------------------------
  interface ViewerOptions {
    container?: HTMLElement
    controlBar?: boolean
    controlButtons?: string[]
    autoHideControlBar?: boolean
    autoHideInfospot?: boolean
    horizontalView?: boolean
    clickTolerance?: number
    cameraFov?: number
    reverseDragging?: boolean
    enableReticle?: boolean
    dwellTime?: number
    autoReticleSelect?: boolean
    viewIndicator?: boolean
    indicatorSize?: number
    output?: 'none' | 'event' | 'console' | 'overlay'
    autoRotate?: boolean
    autoRotateSpeed?: number
    autoRotateActivationDuration?: number
    [key: string]: unknown
  }

  class Viewer {
    constructor(options?: ViewerOptions)

    camera: THREE.PerspectiveCamera
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer
    container: HTMLElement
    panorama: Panorama | null

    OrbitControls: PanolensOrbitControls
    control: PanolensOrbitControls

    add(...objects: THREE.Object3D[]): void
    remove(object: THREE.Object3D): void
    setPanorama(pano: Panorama): void

    getCamera(): THREE.PerspectiveCamera
    getControl(): PanolensOrbitControls
    getScene(): THREE.Scene
    getRenderer(): THREE.WebGLRenderer
    getContainer(): HTMLElement

    onWindowResize(width?: number, height?: number): void

    enableControl(index?: number): void
    disableControl(): void

    addEventListener(type: string, listener: (event: any) => void): void
    removeEventListener(type: string, listener: (event: any) => void): void

    dispose(): void
    destroy(): void
  }
}