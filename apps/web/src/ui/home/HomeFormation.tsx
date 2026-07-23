import React from 'react'
import { IconArrowRight, IconFileText, IconLayoutGrid, IconVideo } from '@tabler/icons-react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { HOME_SCENES, type HomeScene } from './homeSceneData'

type FormationPlacement = {
  startX: number
  startY: number
  endX: number
  endY: number
  rotate: number
}

type FormationSceneCardProps = {
  index: number
  placement: FormationPlacement
  progress: MotionValue<number>
  reducedMotion: boolean
  scene: HomeScene
}

const FORMATION_PLACEMENTS: readonly FormationPlacement[] = [
  { startX: -520, startY: -240, endX: -390, endY: -128, rotate: -10 },
  { startX: 510, startY: -250, endX: 390, endY: -120, rotate: 8 },
  { startX: -650, startY: 80, endX: -420, endY: 105, rotate: 7 },
  { startX: 650, startY: 70, endX: 420, endY: 98, rotate: -7 },
  { startX: -400, startY: 390, endX: -250, endY: 260, rotate: -6 },
  { startX: 420, startY: 390, endX: 250, endY: 260, rotate: 6 },
  { startX: -560, startY: -80, endX: -430, endY: 30, rotate: 5 },
  { startX: 560, startY: -90, endX: 430, endY: 20, rotate: -5 },
]

function FormationSceneCard({
  index,
  placement,
  progress,
  reducedMotion,
  scene,
}: FormationSceneCardProps): JSX.Element {
  const x = useTransform(progress, [0, 0.52, 0.82], [placement.startX, placement.endX, placement.endX * 0.92])
  const y = useTransform(progress, [0, 0.52, 0.82], [placement.startY, placement.endY, placement.endY * 0.92])
  const rotate = useTransform(progress, [0, 0.68], [placement.rotate, 0])
  const opacity = useTransform(progress, [0, 0.12, 0.72, 0.94], [0.5, 1, 0.78, 0.28])

  return (
    <motion.figure
      className={`tc-home-page__formation-card tc-home-page__formation-card--${index + 1}`}
      style={{
        x: reducedMotion ? 0 : x,
        y: reducedMotion ? 0 : y,
        rotate: reducedMotion ? 0 : rotate,
        opacity: reducedMotion ? 1 : opacity,
      }}
    >
      <img
        className="tc-home-page__formation-image"
        src={scene.src}
        alt={scene.alt}
        loading="lazy"
        decoding="async"
      />
      <figcaption className="tc-home-page__formation-caption">
        <span className="tc-home-page__formation-caption-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="tc-home-page__formation-caption-role">{scene.role}</span>
      </figcaption>
    </motion.figure>
  )
}

export function HomeFormation(): JSX.Element {
  const sectionRef = React.useRef<HTMLElement | null>(null)
  const prefersReducedMotion = Boolean(useReducedMotion())
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const workflowOpacity = useTransform(scrollYProgress, [0.34, 0.55], [0, 1])
  const workflowY = useTransform(scrollYProgress, [0.34, 0.62], [34, 0])
  const progressScale = useTransform(scrollYProgress, [0.18, 0.82], [0, 1])

  return (
    <section
      ref={sectionRef}
      id="workflow-formation"
      className="tc-home-page__formation"
      aria-label="素材组装为工作流"
    >
      <div className="tc-home-page__formation-sticky">
        <header className="tc-home-page__formation-header">
          <p className="tc-home-page__eyebrow">
            <span className="tc-home-page__eyebrow-dot" aria-hidden="true" />
            ACT II / 素材组装
          </p>
          <h2 className="tc-home-page__section-title">散落的素材，收束成一条可运行链路。</h2>
          <p className="tc-home-page__section-copy">
            参考图、角色、场景和动作不再散落在文件夹里。它们进入画布，建立关系，并沿着同一条路径抵达成片。
          </p>
        </header>

        <div className="tc-home-page__formation-stage">
          <div className="tc-home-page__formation-cards">
            {HOME_SCENES.map((scene, index) => (
              <FormationSceneCard
                key={scene.id}
                index={index}
                placement={FORMATION_PLACEMENTS[index]}
                progress={scrollYProgress}
                reducedMotion={prefersReducedMotion}
                scene={scene}
              />
            ))}
          </div>

          <motion.div
            className="tc-home-page__formation-workflow"
            style={{
              opacity: prefersReducedMotion ? 1 : workflowOpacity,
              y: prefersReducedMotion ? 0 : workflowY,
            }}
          >
            <article className="tc-home-page__formation-node">
              <span className="tc-home-page__formation-node-icon">
                <IconFileText className="tc-home-page__formation-node-svg" size={20} stroke={1.7} aria-hidden="true" />
              </span>
              <span className="tc-home-page__formation-node-step">01 / 脚本</span>
              <strong className="tc-home-page__formation-node-title">故事拆解</strong>
              <span className="tc-home-page__formation-node-meta">12 个镜头</span>
            </article>

            <span className="tc-home-page__formation-connector" aria-hidden="true">
              <span className="tc-home-page__formation-connector-line" />
              <IconArrowRight className="tc-home-page__formation-connector-icon" size={18} stroke={1.7} />
            </span>

            <article className="tc-home-page__formation-node tc-home-page__formation-node--active">
              <span className="tc-home-page__formation-node-icon">
                <IconLayoutGrid className="tc-home-page__formation-node-svg" size={20} stroke={1.7} aria-hidden="true" />
              </span>
              <span className="tc-home-page__formation-node-step">02 / 分镜</span>
              <strong className="tc-home-page__formation-node-title">镜头编排</strong>
              <span className="tc-home-page__formation-node-meta">8 / 12 已就绪</span>
            </article>

            <span className="tc-home-page__formation-connector" aria-hidden="true">
              <span className="tc-home-page__formation-connector-line" />
              <IconArrowRight className="tc-home-page__formation-connector-icon" size={18} stroke={1.7} />
            </span>

            <article className="tc-home-page__formation-node">
              <span className="tc-home-page__formation-node-icon">
                <IconVideo className="tc-home-page__formation-node-svg" size={20} stroke={1.7} aria-hidden="true" />
              </span>
              <span className="tc-home-page__formation-node-step">03 / 视频</span>
              <strong className="tc-home-page__formation-node-title">生成输出</strong>
              <span className="tc-home-page__formation-node-meta">4K · 16:9</span>
            </article>
          </motion.div>
        </div>

        <div className="tc-home-page__formation-progress" aria-hidden="true">
          <span className="tc-home-page__formation-progress-label">原始素材</span>
          <span className="tc-home-page__formation-progress-track">
            <motion.span
              className="tc-home-page__formation-progress-value"
              style={{ scaleX: prefersReducedMotion ? 1 : progressScale }}
            />
          </span>
          <span className="tc-home-page__formation-progress-label">可运行画布</span>
        </div>
      </div>
    </section>
  )
}
