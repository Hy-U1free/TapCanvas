export type HomeScene = {
  id: string
  src: string
  alt: string
  role: 'script' | 'reference' | 'storyboard' | 'video'
}

export const HOME_SCENES = [
  {
    id: 'desert-slate',
    src: '/home/scene-01.jpg',
    alt: '沙漠外景中的电影场记板',
    role: 'script',
  },
  {
    id: 'morning-waves',
    src: '/home/scene-02.jpg',
    alt: '清晨海面上的低角度波浪',
    role: 'reference',
  },
  {
    id: 'canyon-road',
    src: '/home/scene-03.jpg',
    alt: '红色峡谷中延伸的公路',
    role: 'storyboard',
  },
  {
    id: 'screening-hall',
    src: '/home/scene-04.jpg',
    alt: '电影放映厅内聚集的观众',
    role: 'reference',
  },
  {
    id: 'layered-mountains',
    src: '/home/scene-05.jpg',
    alt: '晨光下层叠的远山',
    role: 'storyboard',
  },
  {
    id: 'paint-brushes',
    src: '/home/scene-06.jpg',
    alt: '画布上沾有红橙颜料的画笔',
    role: 'reference',
  },
  {
    id: 'empty-cinema',
    src: '/home/scene-07.jpg',
    alt: '黑暗放映厅中的红色座椅',
    role: 'video',
  },
  {
    id: 'neon-street',
    src: '/home/scene-08.jpg',
    alt: '蓝紫霓虹灯下的城市街道',
    role: 'video',
  },
] as const satisfies readonly HomeScene[]
