import React from 'react'
import { ActionIcon, Badge, Stack, Tooltip, useMantineColorScheme } from '@mantine/core'
import { IconPlus, IconTopologyStar3, IconListDetails, IconHistory, IconFolders, IconMovie, IconChartBar, IconTerminal2, IconLayoutGrid, IconUserCircle } from '@tabler/icons-react'
import { useAuth } from '../auth/store'
import { useIsAdmin } from '../auth/isAdmin'
import { useUIStore } from './uiStore'
import { PanelCard } from './PanelCard'
import { $ } from '../canvas/i18n'
import { spaNavigate } from '../utils/spaNavigate'
import { confirmLeaveForProjectChange } from './pendingUploadGuard'

type FloatingNavItemProps = {
  label: string
  shortLabel: string
  icon: React.ReactNode
  onHover?: (y: number) => void
  onHoverEnd?: () => void
  onClick?: () => void
  badge?: string
  tooltipLabel?: string
  pressed?: boolean
  activeStyle?: React.CSSProperties
}

type HoverTogglePanel = 'add' | 'template' | 'assets' | 'tapshow' | 'runs' | 'history' | 'account'

const FloatingNavItem = React.memo(function FloatingNavItem({
  label,
  shortLabel,
  icon,
  onHover,
  onHoverEnd,
  onClick,
  badge,
  tooltipLabel,
  pressed,
  activeStyle,
}: FloatingNavItemProps): JSX.Element {
  return (
    <div
      className="floating-nav-item-wrap"
      style={{ position: 'relative' }}
      data-ux-floating
      onMouseEnter={(e) => {
        if (!onHover) return
        const rect = e.currentTarget.getBoundingClientRect()
        onHover(rect.top + rect.height / 2)
      }}
      onMouseLeave={onHoverEnd}
    >
      <Tooltip
        className="floating-nav-item-tooltip"
        label={tooltipLabel}
        position="right"
        withArrow
        disabled={!tooltipLabel}
      >
        <ActionIcon
          className="floating-nav-item"
          variant="subtle"
          size={44}
          radius="md"
          aria-label={label}
          aria-pressed={pressed}
          data-active={pressed === undefined ? undefined : pressed ? 'true' : 'false'}
          onClick={onClick}
          style={pressed ? activeStyle : undefined}
        >
          <span className="tc-studio-nav__icon" aria-hidden="true">{icon}</span>
          <span className="tc-studio-nav__label">{shortLabel}</span>
        </ActionIcon>
      </Tooltip>
      {badge ? (
        <Badge
          className="floating-nav-item-badge"
          color="gray"
          size="xs"
          variant="light"
          style={{ position: 'absolute', top: -6, right: -6, borderRadius: 999 }}
        >
          {badge}
        </Badge>
      ) : null}
    </div>
  )
})

export default function FloatingNav({ className }: { className?: string }): JSX.Element {
  const activePanel = useUIStore((state) => state.activePanel)
  const setActivePanel = useUIStore((state) => state.setActivePanel)
  const setPanelAnchorY = useUIStore((state) => state.setPanelAnchorY)
  const hoverOpenedPanelRef = React.useRef<HoverTogglePanel | null>(null)
  const user = useAuth((state) => state.user)
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme !== 'light'
  const activeItemBackground = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17, 24, 39, 0.06)'
  const activeItemColor = '#f4f4f5'
  const activeItemBorder = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(17,24,39,0.14)'
  const activeItemShadow = isDark ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 18px rgba(0,0,0,0.28)' : '0 10px 18px rgba(15,23,42,0.14)'
  const activeItemStyle = React.useMemo<React.CSSProperties>(() => ({
    background: activeItemBackground,
    color: activeItemColor,
    border: activeItemBorder,
    boxShadow: activeItemShadow,
  }), [activeItemBackground, activeItemBorder, activeItemShadow])

  const isAdmin = useIsAdmin()
  // Removed presence ping heartbeat: Cloudflare Workers does not need keep-alive and this endpoint isn't used elsewhere.

  const navClassName = ['floating-nav', className].filter(Boolean).join(' ')
  const openPanelFromHover = (panel: HoverTogglePanel, anchorY: number) => {
    setPanelAnchorY(anchorY)
    hoverOpenedPanelRef.current = activePanel === panel ? null : panel
    setActivePanel(panel)
  }
  const clearHoverOpenIntent = (panel: HoverTogglePanel) => {
    if (hoverOpenedPanelRef.current === panel) hoverOpenedPanelRef.current = null
  }
  const togglePanelFromClick = (panel: HoverTogglePanel) => {
    if (hoverOpenedPanelRef.current === panel) {
      hoverOpenedPanelRef.current = null
      if (activePanel !== panel) setActivePanel(panel)
      return
    }
    setActivePanel(activePanel === panel ? null : panel)
  }

  return (
    <nav aria-label="Studio 主导航" className={navClassName} style={{ position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 300 }} data-ux-floating data-tour="floating-nav">
      <PanelCard className="floating-nav-card" padding="compact" data-ux-floating>
        <Stack className="floating-nav-stack" align="center" gap={6}>
          <Tooltip className="floating-nav-add-tooltip" label={$('添加节点')} position="right" withArrow>
            <ActionIcon
              className="floating-nav-add"
              size={42}
              radius={999}
              aria-label={$('添加节点')}
              aria-pressed={activePanel === 'add'}
              title={$('添加节点')}
              variant="subtle"
              data-active={activePanel === 'add' ? 'true' : 'false'}
              onMouseEnter={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const anchorY = r.top + r.height / 2
                if (activePanel !== 'template') {
                  openPanelFromHover('add', anchorY)
                } else {
                  setPanelAnchorY(anchorY)
                  clearHoverOpenIntent('add')
                }
              }}
              onMouseLeave={() => clearHoverOpenIntent('add')}
              onClick={() => togglePanelFromClick('add')}
              data-ux-floating
              data-tour="add-button">
              <span className="tc-studio-nav__icon" aria-hidden="true">
                <IconPlus className="floating-nav-add-icon" size={18} stroke={2.2} />
              </span>
              <span className="tc-studio-nav__label">添加</span>
            </ActionIcon>
          </Tooltip>
          <div className="floating-nav-divider" />
          <FloatingNavItem
            label={$('项目')}
            shortLabel="项目"
            icon={<IconFolders className="floating-nav-item-icon" size={18} />}
            tooltipLabel="项目管理"
            onHover={() => {
              hoverOpenedPanelRef.current = null
              setActivePanel(null)
            }}
            onClick={() => {
              if (!confirmLeaveForProjectChange()) return
              setActivePanel(null)
              spaNavigate('/projects')
            }}
          />
          <FloatingNavItem
            label={$('工作流')}
            shortLabel="工作流"
            icon={<IconTopologyStar3 className="floating-nav-item-icon" size={18} />}
            onHover={(y) => openPanelFromHover('template', y)}
            onHoverEnd={() => clearHoverOpenIntent('template')}
            onClick={() => togglePanelFromClick('template')}
            pressed={activePanel === 'template'}
            activeStyle={activeItemStyle}
          />
          <FloatingNavItem
            label={$('我的资产')}
            shortLabel="资产"
            icon={<IconListDetails className="floating-nav-item-icon" size={18} />}
            onHover={(y) => openPanelFromHover('assets', y)}
            onHoverEnd={() => clearHoverOpenIntent('assets')}
            onClick={() => togglePanelFromClick('assets')}
            pressed={activePanel === 'assets'}
            activeStyle={activeItemStyle}
          />
          <FloatingNavItem
            label={$('漫剧工作台')}
            shortLabel="漫剧"
            icon={<IconLayoutGrid className="floating-nav-item-icon" size={18} />}
            tooltipLabel="画布内分镜工作台"
            onClick={() => {
              setActivePanel(activePanel === 'nanoComic' ? null : 'nanoComic')
            }}
            pressed={activePanel === 'nanoComic'}
            activeStyle={activeItemStyle}
          />
          <FloatingNavItem
            label={$('TapShow')}
            shortLabel="展映"
            icon={<IconMovie className="floating-nav-item-icon" size={18} />}
            onHover={(y) => openPanelFromHover('tapshow', y)}
            onHoverEnd={() => clearHoverOpenIntent('tapshow')}
            onClick={() => togglePanelFromClick('tapshow')}
            pressed={activePanel === 'tapshow'}
            activeStyle={activeItemStyle}
          />
          <FloatingNavItem
            label={$('运行记录')}
            shortLabel="运行"
            icon={<IconTerminal2 className="floating-nav-item-icon" size={18} />}
            onHover={(y) => openPanelFromHover('runs', y)}
            onHoverEnd={() => clearHoverOpenIntent('runs')}
            onClick={() => togglePanelFromClick('runs')}
            pressed={activePanel === 'runs'}
            activeStyle={activeItemStyle}
          />
          {isAdmin && (
            <FloatingNavItem
              label="看板"
              shortLabel="看板"
              icon={<IconChartBar className="floating-nav-item-icon" size={18} />}
              tooltipLabel={$('看板（仅管理员）')}
              onClick={() => {
                try {
                  const url = new URL(window.location.href)
                  url.search = ''
                  url.hash = ''
                  url.pathname = '/stats'
                  window.open(url.toString(), '_blank', 'noopener,noreferrer')
                } catch {
                  window.open('/stats', '_blank', 'noopener,noreferrer')
                }
              }}
            />
          )}
          <FloatingNavItem
            label={$('历史记录')}
            shortLabel="历史"
            icon={<IconHistory className="floating-nav-item-icon" size={18} />}
            onHover={(y) => openPanelFromHover('history', y)}
            onHoverEnd={() => clearHoverOpenIntent('history')}
            onClick={() => togglePanelFromClick('history')}
            pressed={activePanel === 'history'}
            activeStyle={activeItemStyle}
          />
          <div className="floating-nav-divider floating-nav-divider--bottom" />
          <button
            type="button"
            className="floating-nav-glyph"
            aria-label="账户"
            aria-pressed={activePanel === 'account'}
            title={user?.login || '账户'}
            onMouseEnter={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              openPanelFromHover('account', r.top + r.height / 2)
            }}
            onMouseLeave={() => clearHoverOpenIntent('account')}
            onClick={() => togglePanelFromClick('account')}
            data-active={activePanel === 'account' ? 'true' : 'false'}
            data-ux-floating
          >
            <span className="tc-studio-nav__icon" aria-hidden="true">
              <IconUserCircle className="floating-nav-item-icon" size={18} />
            </span>
            <span className="tc-studio-nav__label">账户</span>
          </button>
        </Stack>
      </PanelCard>
    </nav>
  )
}
