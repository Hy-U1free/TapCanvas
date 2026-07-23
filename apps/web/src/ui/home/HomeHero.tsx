import React from 'react'
import {
  IconArrowRight,
  IconBook2,
  IconBrandGithub,
  IconFileText,
  IconLayoutGrid,
  IconPlayerPlay,
  IconVideo,
} from '@tabler/icons-react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { HOME_SCENES, type HomeScene } from './homeSceneData'

type HomeHeroProps = {
  studioUrl: string
}

type HeroSceneCardProps = {
  index: number
  scene: HomeScene
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
  reducedMotion: boolean
}

const HERO_CARD_DEPTHS = [18, 28, 14, 24, 20, 12, 22, 16] as const

function HeroSceneCard({
  index,
  scene,
  pointerX,
  pointerY,
  reducedMotion,
}: HeroSceneCardProps): JSX.Element {
  const depth = HERO_CARD_DEPTHS[index]
  const x = useSpring(useTransform(pointerX, [-0.5, 0.5], [-depth, depth]), {
    stiffness: 150,
    damping: 24,
    mass: 0.5,
  })
  const y = useSpring(useTransform(pointerY, [-0.5, 0.5], [-depth * 0.55, depth * 0.55]), {
    stiffness: 150,
    damping: 24,
    mass: 0.5,
  })

  return (
    <motion.figure
      className={`tc-home-page__hero-scene-card tc-home-page__hero-scene-card--${index + 1}`}
      aria-hidden="true"
      style={{ x: reducedMotion ? 0 : x, y: reducedMotion ? 0 : y }}
    >
      <img
        className="tc-home-page__hero-scene-image"
        src={scene.src}
        alt=""
        loading={index < 2 ? 'eager' : 'lazy'}
        decoding="async"
      />
      <figcaption className="tc-home-page__hero-scene-caption">
        {String(index + 1).padStart(2, '0')} / {scene.role}
      </figcaption>
    </motion.figure>
  )
}

export function HomeHero({ studioUrl }: HomeHeroProps): JSX.Element {
  const heroRef = React.useRef<HTMLElement | null>(null)
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const prefersReducedMotion = Boolean(useReducedMotion())
  const stageX = useSpring(useTransform(pointerX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 130,
    damping: 24,
    mass: 0.6,
  })
  const stageY = useSpring(useTransform(pointerY, [-0.5, 0.5], [-6, 6]), {
    stiffness: 130,
    damping: 24,
    mass: 0.6,
  })

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const bounds = heroRef.current?.getBoundingClientRect()
      if (!bounds || bounds.width === 0 || bounds.height === 0) return

      pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5)
      pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5)
    },
    [pointerX, pointerY],
  )

  const handlePointerLeave = React.useCallback(() => {
    pointerX.set(0)
    pointerY.set(0)
  }, [pointerX, pointerY])

  return (
    <section
      ref={heroRef}
      id="tapcanvas-home"
      className="tc-home-page__hero"
      aria-labelledby="tapcanvas-home-title"
      onPointerMove={prefersReducedMotion ? undefined : handlePointerMove}
      onPointerLeave={prefersReducedMotion ? undefined : handlePointerLeave}
    >
      <div className="tc-home-page__hero-grid" aria-hidden="true" />

      <header className="tc-home-page__header">
        <a className="tc-home-page__brand" href="#tapcanvas-home" aria-label="TapCanvas 首页">
          <span className="tc-home-page__brand-mark" aria-hidden="true">
            <span className="tc-home-page__brand-mark-line tc-home-page__brand-mark-line--left" />
            <span className="tc-home-page__brand-mark-line tc-home-page__brand-mark-line--right" />
          </span>
          <span className="tc-home-page__brand-name">TapCanvas</span>
        </a>

        <nav className="tc-home-page__nav" aria-label="首页导航">
          <a className="tc-home-page__nav-link" href="#workflow-formation">创作能力</a>
          <a className="tc-home-page__nav-link" href="#product-showcase">工作流</a>
          <a className="tc-home-page__nav-link" href="#showcase-modes">案例</a>
          <a
            className="tc-home-page__nav-link tc-home-page__nav-link--external"
            href="https://github.com/anymouschina/TapCanvas#readme"
            target="_blank"
            rel="noreferrer"
          >
            <IconBook2 className="tc-home-page__nav-link-icon" size={15} stroke={1.8} aria-hidden="true" />
            文档
          </a>
        </nav>

        <div className="tc-home-page__header-actions">
          <a className="tc-home-page__login-link" href={studioUrl}>登录</a>
          <a className="tc-home-page__header-cta" href={studioUrl}>
            <span className="tc-home-page__header-cta-label">进入工作台</span>
            <IconArrowRight className="tc-home-page__header-cta-icon" size={16} stroke={1.8} aria-hidden="true" />
          </a>
        </div>
      </header>

      <div className="tc-home-page__hero-inner">
        <motion.div className="tc-home-page__hero-copy" initial={false}>
          <p className="tc-home-page__eyebrow">
            <span className="tc-home-page__eyebrow-dot" aria-hidden="true" />
            叙事影像工作流
          </p>
          <h1 id="tapcanvas-home-title" className="tc-home-page__hero-title">TapCanvas</h1>
          <p className="tc-home-page__hero-statement">让每个镜头，在画布中发生。</p>
          <p className="tc-home-page__hero-description">
            把脚本、角色、场景、分镜与视频模型放进同一条连续画布，让想法沿着可读、可运行的路径成为影像。
          </p>
          <div className="tc-home-page__hero-actions">
            <a className="tc-home-page__primary-cta" href={studioUrl} aria-label="立即进入创作画布">
              <span className="tc-home-page__primary-cta-label">立即进入创作画布</span>
              <IconArrowRight className="tc-home-page__primary-cta-icon" size={18} stroke={1.8} aria-hidden="true" />
            </a>
            <a className="tc-home-page__secondary-cta" href="#workflow-formation">
              <IconPlayerPlay className="tc-home-page__secondary-cta-icon" size={17} stroke={1.8} aria-hidden="true" />
              <span className="tc-home-page__secondary-cta-label">观看流程</span>
            </a>
          </div>
          <p className="tc-home-page__hero-chain" aria-label="脚本到分镜再到视频的一条连续画布">
            <span className="tc-home-page__hero-chain-step">SCRIPT</span>
            <span className="tc-home-page__hero-chain-arrow" aria-hidden="true">/</span>
            <span className="tc-home-page__hero-chain-step">STORYBOARD</span>
            <span className="tc-home-page__hero-chain-arrow" aria-hidden="true">/</span>
            <span className="tc-home-page__hero-chain-step">VIDEO</span>
          </p>
        </motion.div>

        <div className="tc-home-page__hero-visual">
          <div className="tc-home-page__hero-scene-field" aria-hidden="true">
            {HOME_SCENES.map((scene, index) => (
              <HeroSceneCard
                key={scene.id}
                index={index}
                scene={scene}
                pointerX={pointerX}
                pointerY={pointerY}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </div>

          <div className="tc-home-page__hero-workspace-frame">
            <motion.figure
              className="tc-home-page__hero-workspace"
              style={{ x: prefersReducedMotion ? 0 : stageX, y: prefersReducedMotion ? 0 : stageY }}
            >
            <figcaption className="tc-home-page__workspace-topbar">
              <span className="tc-home-page__workspace-project">Project / Neon Rain</span>
              <span className="tc-home-page__workspace-mode">Visual workflow</span>
              <span className="tc-home-page__workspace-status">
                <span className="tc-home-page__workspace-status-dot" aria-hidden="true" />
                运行中
              </span>
            </figcaption>
            <div className="tc-home-page__workspace-body">
              <aside className="tc-home-page__workspace-rail" aria-label="创作阶段">
                <span className="tc-home-page__workspace-rail-item tc-home-page__workspace-rail-item--active">
                  <IconFileText className="tc-home-page__workspace-rail-icon" size={18} stroke={1.6} aria-hidden="true" />
                </span>
                <span className="tc-home-page__workspace-rail-item">
                  <IconLayoutGrid className="tc-home-page__workspace-rail-icon" size={18} stroke={1.6} aria-hidden="true" />
                </span>
                <span className="tc-home-page__workspace-rail-item">
                  <IconVideo className="tc-home-page__workspace-rail-icon" size={18} stroke={1.6} aria-hidden="true" />
                </span>
              </aside>

              <div className="tc-home-page__workspace-canvas">
                <span className="tc-home-page__workspace-wire tc-home-page__workspace-wire--first" aria-hidden="true" />
                <span className="tc-home-page__workspace-wire tc-home-page__workspace-wire--second" aria-hidden="true" />

                <article className="tc-home-page__workspace-node tc-home-page__workspace-node--script">
                  <span className="tc-home-page__workspace-node-kicker">输入 / 脚本</span>
                  <strong className="tc-home-page__workspace-node-title">脚本拆解</strong>
                  <span className="tc-home-page__workspace-node-meta">12 个场景已识别</span>
                  <img
                    className="tc-home-page__workspace-node-image"
                    src={HOME_SCENES[0].src}
                    alt={HOME_SCENES[0].alt}
                    loading="eager"
                    decoding="async"
                  />
                </article>

                <article className="tc-home-page__workspace-node tc-home-page__workspace-node--storyboard">
                  <span className="tc-home-page__workspace-node-kicker">Agent / 分镜</span>
                  <strong className="tc-home-page__workspace-node-title">镜头生成</strong>
                  <span className="tc-home-page__workspace-node-meta">8 / 12 已完成</span>
                  <img
                    className="tc-home-page__workspace-node-image"
                    src={HOME_SCENES[3].src}
                    alt={HOME_SCENES[3].alt}
                    loading="eager"
                    decoding="async"
                  />
                </article>

                <article className="tc-home-page__workspace-node tc-home-page__workspace-node--video">
                  <span className="tc-home-page__workspace-node-kicker">输出 / 视频</span>
                  <strong className="tc-home-page__workspace-node-title">视频合成</strong>
                  <span className="tc-home-page__workspace-node-meta">4K · 16:9 · 6s</span>
                  <img
                    className="tc-home-page__workspace-node-image"
                    src={HOME_SCENES[7].src}
                    alt={HOME_SCENES[7].alt}
                    loading="eager"
                    decoding="async"
                  />
                </article>
              </div>

              <aside className="tc-home-page__workspace-agent" aria-label="AI 协作摘要">
                <span className="tc-home-page__workspace-agent-label">AI 协作</span>
                <p className="tc-home-page__workspace-agent-copy">已对齐角色外观与夜景色温，正在生成镜头 09。</p>
                <span className="tc-home-page__workspace-agent-progress">09 / 12</span>
              </aside>
            </div>
            </motion.figure>
          </div>
        </div>
      </div>

      <div className="tc-home-page__hero-footer">
        <span className="tc-home-page__hero-footer-line" aria-hidden="true" />
        <span className="tc-home-page__hero-footer-label">ACT II / ASSEMBLE</span>
        <IconBrandGithub className="tc-home-page__hero-footer-icon" size={16} stroke={1.6} aria-hidden="true" />
      </div>
    </section>
  )
}
