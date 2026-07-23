import { buildStudioUrl } from '../utils/appRoutes'
import { HomeFinalCta } from './home/HomeFinalCta'
import { HomeFormation } from './home/HomeFormation'
import { HomeHero } from './home/HomeHero'
import { HomeWorkspaceShowcase } from './home/HomeWorkspaceShowcase'
import './homePage.css'

export default function HomePage(): JSX.Element {
  const studioUrl = buildStudioUrl()

  return (
    <main className="tc-home-page">
      <HomeHero studioUrl={studioUrl} />
      <HomeFormation />
      <HomeWorkspaceShowcase />
      <HomeFinalCta studioUrl={studioUrl} />
    </main>
  )
}
