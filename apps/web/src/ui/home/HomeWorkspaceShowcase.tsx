import React from 'react'
import {
  IconFileText,
  IconLayoutGrid,
  IconPlayerPlay,
  IconSparkles,
  IconVideo,
} from '@tabler/icons-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { HOME_SCENES } from './homeSceneData'

type ShowcaseMode = 'script' | 'storyboard' | 'video'

type ShowcaseTab = {
  id: ShowcaseMode
  index: string
  label: string
}

const SHOWCASE_TABS: readonly ShowcaseTab[] = [
  { id: 'script', index: '01', label: '脚本' },
  { id: 'storyboard', index: '02', label: '分镜' },
  { id: 'video', index: '03', label: '视频' },
]

const STORYBOARD_SCENES = [2, 0, 3, 5, 4, 7] as const

export function HomeWorkspaceShowcase(): JSX.Element {
  const [selectedMode, setSelectedMode] = React.useState<ShowcaseMode>('script')
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const prefersReducedMotion = Boolean(useReducedMotion())

  const selectAndFocus = React.useCallback((index: number) => {
    const nextTab = SHOWCASE_TABS[index]
    setSelectedMode(nextTab.id)
    tabRefs.current[index]?.focus()
  }, [])

  const handleTabKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex: number | null = null

      if (event.key === 'ArrowRight') nextIndex = (index + 1) % SHOWCASE_TABS.length
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + SHOWCASE_TABS.length) % SHOWCASE_TABS.length
      if (event.key === 'Home') nextIndex = 0
      if (event.key === 'End') nextIndex = SHOWCASE_TABS.length - 1
      if (nextIndex === null) return

      event.preventDefault()
      selectAndFocus(nextIndex)
    },
    [selectAndFocus],
  )

  return (
    <section
      id="product-showcase"
      className="tc-home-page__showcase"
      aria-labelledby="product-showcase-title"
    >
      <header className="tc-home-page__showcase-header">
        <div className="tc-home-page__showcase-heading">
          <p className="tc-home-page__eyebrow">
            <span className="tc-home-page__eyebrow-dot" aria-hidden="true" />
            ACT III / 产品舞台
          </p>
          <h2 id="product-showcase-title" className="tc-home-page__section-title">
            从文字到成片，始终留在同一张画布。
          </h2>
        </div>
        <p className="tc-home-page__showcase-intro">
          每个阶段都保留上游语境、生成结果与 AI 协作记录。切换视角，而不是切断创作过程。
        </p>
      </header>

      <div
        id="showcase-modes"
        className="tc-home-page__showcase-tabs"
        role="tablist"
        aria-label="创作流程预览"
      >
        {SHOWCASE_TABS.map((tab, index) => {
          const isSelected = selectedMode === tab.id
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              id={`showcase-tab-${tab.id}`}
              className={`tc-home-page__showcase-tab${isSelected ? ' tc-home-page__showcase-tab--active' : ''}`}
              type="button"
              role="tab"
              aria-controls={`showcase-panel-${tab.id}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelectedMode(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span className="tc-home-page__showcase-tab-index">{tab.index}</span>
              <span className="tc-home-page__showcase-tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="tc-home-page__showcase-stage">
        <header className="tc-home-page__showcase-topbar">
          <span className="tc-home-page__showcase-project">雨夜来信 / CH. 03</span>
          <span className="tc-home-page__showcase-canvas-name">叙事画布</span>
          <span className="tc-home-page__showcase-readonly">
            <span className="tc-home-page__showcase-readonly-dot" aria-hidden="true" />
            只读预览
          </span>
        </header>

        <div className="tc-home-page__showcase-body">
          <aside className="tc-home-page__showcase-rail" aria-label="工作台阶段">
            <span className={`tc-home-page__showcase-rail-item${selectedMode === 'script' ? ' tc-home-page__showcase-rail-item--active' : ''}`}>
              <IconFileText className="tc-home-page__showcase-rail-icon" size={19} stroke={1.7} aria-hidden="true" />
              <span className="tc-home-page__showcase-rail-label">脚本</span>
            </span>
            <span className={`tc-home-page__showcase-rail-item${selectedMode === 'storyboard' ? ' tc-home-page__showcase-rail-item--active' : ''}`}>
              <IconLayoutGrid className="tc-home-page__showcase-rail-icon" size={19} stroke={1.7} aria-hidden="true" />
              <span className="tc-home-page__showcase-rail-label">分镜</span>
            </span>
            <span className={`tc-home-page__showcase-rail-item${selectedMode === 'video' ? ' tc-home-page__showcase-rail-item--active' : ''}`}>
              <IconVideo className="tc-home-page__showcase-rail-icon" size={19} stroke={1.7} aria-hidden="true" />
              <span className="tc-home-page__showcase-rail-label">视频</span>
            </span>
          </aside>

          <div className={`tc-home-page__showcase-panel-host tc-home-page__showcase-panel-host--${selectedMode}`}>
            {SHOWCASE_TABS.map((tab) => {
              const isActivePanel = selectedMode === tab.id
              return (
                <div
                  key={tab.id}
                  id={`showcase-panel-${tab.id}`}
                  className={`tc-home-page__showcase-panel tc-home-page__showcase-panel--${tab.id}`}
                  role="tabpanel"
                  aria-labelledby={`showcase-tab-${tab.id}`}
                  hidden={!isActivePanel}
                >
                  <AnimatePresence initial={false}>
                    {isActivePanel && (
                      <motion.div
                        key={tab.id}
                        className="tc-home-page__showcase-panel-content"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.995 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8, scale: 0.995 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
                      >
                {selectedMode === 'script' && (
                  <div className="tc-home-page__script-canvas">
                    <span className="tc-home-page__script-wire tc-home-page__script-wire--first" aria-hidden="true" />
                    <span className="tc-home-page__script-wire tc-home-page__script-wire--second" aria-hidden="true" />
                    <span className="tc-home-page__script-wire tc-home-page__script-wire--third" aria-hidden="true" />

                    <article className="tc-home-page__script-node tc-home-page__script-node--source">
                      <span className="tc-home-page__script-node-kicker">SOURCE</span>
                      <strong className="tc-home-page__script-node-title">原始故事</strong>
                      <p className="tc-home-page__script-node-copy">雨夜，一名女孩在废弃车站等待一封不会到来的信。</p>
                    </article>
                    <article className="tc-home-page__script-node tc-home-page__script-node--agent">
                      <span className="tc-home-page__script-node-kicker">AGENT</span>
                      <strong className="tc-home-page__script-node-title">章节拆解</strong>
                      <p className="tc-home-page__script-node-copy">识别出 4 个叙事段落与 12 个镜头建议。</p>
                      <img
                        className="tc-home-page__script-node-image"
                        src={HOME_SCENES[1].src}
                        alt={HOME_SCENES[1].alt}
                        loading="lazy"
                        decoding="async"
                      />
                    </article>
                    <article className="tc-home-page__script-node tc-home-page__script-node--character">
                      <span className="tc-home-page__script-node-kicker">REFERENCE</span>
                      <strong className="tc-home-page__script-node-title">角色一致性</strong>
                      <p className="tc-home-page__script-node-copy">锁定服装、动作与冷暖光比。</p>
                      <img
                        className="tc-home-page__script-node-image"
                        src={HOME_SCENES[0].src}
                        alt={HOME_SCENES[0].alt}
                        loading="lazy"
                        decoding="async"
                      />
                    </article>
                    <article className="tc-home-page__script-node tc-home-page__script-node--scene">
                      <span className="tc-home-page__script-node-kicker">SCENE</span>
                      <strong className="tc-home-page__script-node-title">场景参考组</strong>
                      <p className="tc-home-page__script-node-copy">车站、雨幕、钨丝灯与远处城市光。</p>
                    </article>
                  </div>
                )}

                {selectedMode === 'storyboard' && (
                  <div className="tc-home-page__storyboard-grid">
                    {STORYBOARD_SCENES.map((sceneIndex, index) => {
                      const scene = HOME_SCENES[sceneIndex]
                      return (
                        <figure className="tc-home-page__storyboard-shot" key={scene.id}>
                          <img
                            className="tc-home-page__storyboard-image"
                            src={scene.src}
                            alt={scene.alt}
                            loading="lazy"
                            decoding="async"
                          />
                          <figcaption className="tc-home-page__storyboard-caption">
                            <span className="tc-home-page__storyboard-index">SHOT {String(index + 1).padStart(2, '0')}</span>
                            <span className="tc-home-page__storyboard-duration">00:0{index + 3}</span>
                          </figcaption>
                        </figure>
                      )
                    })}
                  </div>
                )}

                {selectedMode === 'video' && (
                  <div className="tc-home-page__video-workspace">
                    <figure className="tc-home-page__video-preview">
                      <img
                        className="tc-home-page__video-image"
                        src={HOME_SCENES[7].src}
                        alt={HOME_SCENES[7].alt}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="tc-home-page__video-play" aria-hidden="true">
                        <IconPlayerPlay className="tc-home-page__video-play-icon" size={24} stroke={1.6} />
                      </span>
                      <figcaption className="tc-home-page__video-caption">SHOT 09 / 夜行建立镜头</figcaption>
                    </figure>
                    <div className="tc-home-page__video-timeline" aria-label="视频时间线 24 秒">
                      <span className="tc-home-page__video-time">00:00</span>
                      <span className="tc-home-page__video-track">
                        <span className="tc-home-page__video-track-progress" />
                        <span className="tc-home-page__video-track-marker" />
                      </span>
                      <span className="tc-home-page__video-time">00:24</span>
                    </div>
                  </div>
                )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          <aside className="tc-home-page__showcase-agent" aria-label="AI 协作记录">
            <header className="tc-home-page__showcase-agent-header">
              <IconSparkles className="tc-home-page__showcase-agent-icon" size={18} stroke={1.7} aria-hidden="true" />
              <span className="tc-home-page__showcase-agent-title">AI 协作</span>
              <span className="tc-home-page__showcase-agent-status">在线</span>
            </header>
            <div className="tc-home-page__showcase-agent-thread">
              <article className="tc-home-page__showcase-message">
                <span className="tc-home-page__showcase-message-label">创作意图</span>
                <p className="tc-home-page__showcase-message-copy">保持雨夜的冷色环境，让人物始终被远处暖光勾边。</p>
              </article>
              <article className="tc-home-page__showcase-message tc-home-page__showcase-message--agent">
                <span className="tc-home-page__showcase-message-label">画布响应</span>
                <p className="tc-home-page__showcase-message-copy">已同步到 12 个镜头，并保留场景参考关系。</p>
              </article>
            </div>
            <div className="tc-home-page__showcase-agent-footer">
              <span className="tc-home-page__showcase-agent-context">当前上下文 / 12 镜头</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
