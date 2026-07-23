import { ActionIcon, type ActionIconProps } from '@mantine/core'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type IconActionButtonProps = Omit<ActionIconProps, 'children'> & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
  icon: ReactNode
}

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(function IconActionButton({
  icon,
  className,
  variant = 'subtle',
  ...props
}, ref) {
  const rootClassName = className ? `tc-icon-action-button ${className}` : 'tc-icon-action-button'

  return (
    <ActionIcon
      {...props}
      className={rootClassName}
      ref={ref}
      radius="xs"
      variant={variant}
    >
      {icon}
    </ActionIcon>
  )
})
