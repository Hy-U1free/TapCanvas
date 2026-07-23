import {
  Badge,
  Button,
  Group,
  Menu,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import {
  IconBrandGithub,
  IconCoin,
  IconDeviceFloppy,
  IconDots,
  IconDownload,
  IconHelpCircle,
  IconLanguage,
  IconMoonStars,
  IconMovie,
  IconRobot,
  IconSun,
} from '@tabler/icons-react'
import { UI_LAYERS } from '../../theme/uiLayers'

export interface StudioHeaderProps {
  compact: boolean
  ownerLabel: string
  ownerTone: 'orange' | 'blue' | 'gray'
  hostDescription: string
  isDirty: boolean
  saving: boolean
  projectName: string
  onProjectNameChange: (value: string) => void
  onProjectNameBlur: () => void | Promise<void>
  showAccountActions: boolean
  showAiWorkbench: boolean
  points: number | null
  pointsLoading: boolean
  rechargeLoading: boolean
  onOpenAiWorkbench: () => void
  onRecharge: () => void
  onSave: () => void | Promise<void>
  onExport: () => void
  colorScheme: 'light' | 'dark' | 'auto'
  onToggleTheme: () => void
  language: string
  onToggleLanguage: () => void
  onHelp: () => void
  tapshowUrl: string
  sourceUrl: string
}

type LowFrequencyActionsProps = Pick<
  StudioHeaderProps,
  | 'onExport'
  | 'colorScheme'
  | 'onToggleTheme'
  | 'language'
  | 'onToggleLanguage'
  | 'onHelp'
  | 'tapshowUrl'
  | 'sourceUrl'
>

function formatCreditLabel(points: number | null, loading: boolean): string {
  if (loading) return '积分加载中'
  if (points === null) return '积分暂不可用 · 充值'
  return `积分 ${points} · 充值`
}

function DesktopActions({
  onExport,
  colorScheme,
  onToggleTheme,
  language,
  onToggleLanguage,
  onHelp,
  tapshowUrl,
  sourceUrl,
}: LowFrequencyActionsProps): JSX.Element {
  return (
    <>
      <Button
        className="app-export-action tc-studio-header__command"
        size="xs"
        variant="subtle"
        leftSection={<IconDownload className="app-export-icon" size={16} />}
        onClick={onExport}
      >
        导出
      </Button>
      <Button
        className="app-tapshow-link tc-studio-header__command"
        size="xs"
        variant="subtle"
        component="a"
        href={tapshowUrl}
        target="_blank"
        rel="noopener noreferrer"
        leftSection={<IconMovie size={16} />}
      >
        展映
      </Button>
      <Button
        className="app-theme-toggle tc-studio-header__command"
        size="xs"
        variant="subtle"
        leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoonStars size={16} />}
        onClick={onToggleTheme}
      >
        主题
      </Button>
      <Button
        className="app-language-toggle tc-studio-header__command"
        size="xs"
        variant="subtle"
        leftSection={<IconLanguage size={16} />}
        aria-label={`语言，当前 ${language}`}
        onClick={onToggleLanguage}
      >
        语言
      </Button>
      <Button
        className="app-help-toggle tc-studio-header__command"
        size="xs"
        variant="subtle"
        leftSection={<IconHelpCircle size={16} />}
        onClick={onHelp}
        data-tour="help-tour"
      >
        帮助
      </Button>
      <Button
        className="app-github-link tc-studio-header__command"
        size="xs"
        variant="subtle"
        component="a"
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        leftSection={<IconBrandGithub size={16} />}
      >
        源码
      </Button>
    </>
  )
}

function CompactActions({
  showAccountActions,
  showAiWorkbench,
  points,
  pointsLoading,
  rechargeLoading,
  onOpenAiWorkbench,
  onRecharge,
  onExport,
  colorScheme,
  onToggleTheme,
  language,
  onToggleLanguage,
  onHelp,
  tapshowUrl,
  sourceUrl,
}: LowFrequencyActionsProps & Pick<
  StudioHeaderProps,
  | 'showAccountActions'
  | 'showAiWorkbench'
  | 'points'
  | 'pointsLoading'
  | 'rechargeLoading'
  | 'onOpenAiWorkbench'
  | 'onRecharge'
>): JSX.Element {
  const creditLabel = formatCreditLabel(points, pointsLoading)

  return (
    <Menu
      className="tc-studio-header__more-menu"
      withinPortal
      zIndex={UI_LAYERS.floatingPopover}
      position="bottom-end"
      shadow="md"
      transitionProps={{ duration: 0 }}
    >
      <Menu.Target>
        <Button
          className="tc-studio-header__more-trigger"
          size="xs"
          variant="subtle"
          leftSection={<IconDots size={16} />}
          aria-label="更多"
        >
          更多
        </Button>
      </Menu.Target>
      <Menu.Dropdown className="tc-studio tc-studio-header__more-dropdown">
        {showAccountActions && showAiWorkbench ? (
          <Menu.Item leftSection={<IconRobot size={16} />} onClick={onOpenAiWorkbench}>
            AI 工作台
          </Menu.Item>
        ) : null}
        {showAccountActions ? (
          <Menu.Item
            leftSection={<IconCoin size={16} />}
            disabled={rechargeLoading || pointsLoading}
            onClick={onRecharge}
          >
            {creditLabel}
          </Menu.Item>
        ) : null}
        {showAccountActions ? <Menu.Divider /> : null}
        <Menu.Item leftSection={<IconDownload size={16} />} onClick={onExport}>
          导出
        </Menu.Item>
        <Menu.Item
          component="a"
          href={tapshowUrl}
          target="_blank"
          rel="noopener noreferrer"
          leftSection={<IconMovie size={16} />}
        >
          展映
        </Menu.Item>
        <Menu.Item
          leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoonStars size={16} />}
          onClick={onToggleTheme}
        >
          主题
        </Menu.Item>
        <Menu.Item leftSection={<IconLanguage size={16} />} onClick={onToggleLanguage}>
          语言
        </Menu.Item>
        <Menu.Item
          leftSection={<IconHelpCircle size={16} />}
          onClick={onHelp}
          data-tour="help-tour"
        >
          帮助
        </Menu.Item>
        <Menu.Item
          component="a"
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          leftSection={<IconBrandGithub size={16} />}
        >
          源码
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

export default function StudioHeader(props: StudioHeaderProps): JSX.Element {
  const {
    compact,
    ownerLabel,
    ownerTone,
    hostDescription,
    isDirty,
    saving,
    projectName,
    onProjectNameChange,
    onProjectNameBlur,
    showAccountActions,
    showAiWorkbench,
    points,
    pointsLoading,
    rechargeLoading,
    onOpenAiWorkbench,
    onRecharge,
    onSave,
  } = props
  const creditLabel = formatCreditLabel(points, pointsLoading)

  return (
    <Group component="header" aria-label="Studio 顶栏" className="app-header tc-studio-header" justify="space-between" p="sm" wrap="nowrap">
      <Group className="app-header-left tc-studio-header__context" wrap="nowrap">
        <Badge className="app-owner-badge" color={ownerTone} variant="light">
          {ownerLabel}
        </Badge>
        <Text className="tc-studio-header__host" size="xs" c="dimmed">
          {hostDescription}
        </Text>
        {isDirty ? (
          <Badge className="app-dirty-badge" color="red" variant="light">
            未保存
          </Badge>
        ) : null}
      </Group>

      <Group className="app-header-actions tc-studio-header__actions" gap="xs" wrap="nowrap">
        <TextInput
          className="app-project-input"
          size="xs"
          aria-label="项目名"
          placeholder="项目名"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.currentTarget.value)}
          onBlur={() => void onProjectNameBlur()}
          data-tour="project-name"
        />

        {!compact && showAccountActions && showAiWorkbench ? (
          <Button
            className="app-ai-admin-workbench-entry"
            size="xs"
            variant="light"
            leftSection={<IconRobot size={16} />}
            onClick={onOpenAiWorkbench}
          >
            AI 工作台
          </Button>
        ) : null}

        {!compact && showAccountActions ? (
          <Tooltip label={creditLabel} withArrow>
            <Button
              className="app-quick-recharge-button"
              size="xs"
              variant="light"
              leftSection={<IconCoin size={16} />}
              loading={rechargeLoading || pointsLoading}
              onClick={onRecharge}
            >
              {creditLabel}
            </Button>
          </Tooltip>
        ) : null}

        <Button
          className="app-save-button"
          size="xs"
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={() => void onSave()}
          disabled={!isDirty}
          loading={saving}
          data-tour="save-button"
        >
          {saving ? '保存中' : '保存'}
        </Button>

        {compact ? <CompactActions {...props} /> : <DesktopActions {...props} />}
      </Group>
    </Group>
  )
}
