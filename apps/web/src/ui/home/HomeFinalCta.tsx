import { IconArrowRight } from '@tabler/icons-react'
import { motion } from 'framer-motion'

type HomeFinalCtaProps = {
  studioUrl: string
}

export function HomeFinalCta({ studioUrl }: HomeFinalCtaProps): JSX.Element {
  return (
    <section className="tc-home-page__final" aria-labelledby="home-final-title">
      <div className="tc-home-page__final-light" aria-hidden="true" />
      <motion.div
        className="tc-home-page__final-inner"
        initial={false}
      >
        <p className="tc-home-page__eyebrow tc-home-page__eyebrow--centered">
          <span className="tc-home-page__eyebrow-dot" aria-hidden="true" />
          ACT IV / 开始创作
        </p>
        <h2 id="home-final-title" className="tc-home-page__final-title">把灵感放进来，让画面找到路径。</h2>
        <p className="tc-home-page__final-copy">从第一个文字片段开始，在一张连续画布上完成你的下一支影像。</p>
        <a className="tc-home-page__final-cta" href={studioUrl}>
          <span className="tc-home-page__final-cta-label">进入工作台</span>
          <IconArrowRight className="tc-home-page__final-cta-icon" size={19} stroke={1.8} aria-hidden="true" />
        </a>
      </motion.div>
      <footer className="tc-home-page__footer">
        <span className="tc-home-page__footer-brand">TapCanvas</span>
        <span className="tc-home-page__footer-meta">SCRIPT / STORYBOARD / VIDEO</span>
      </footer>
    </section>
  )
}
