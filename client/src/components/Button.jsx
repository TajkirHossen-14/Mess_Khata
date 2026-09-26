import { forwardRef } from 'react'

const Button = forwardRef(function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  as: Component = 'button',
  ...props
}, ref) {
  const base = 'inline-flex items-center justify-center font-medium transition-colors rounded-control disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue700 text-white hover:bg-blue600 focus:ring-2 focus:ring-blue400 focus:ring-offset-2',
    secondary: 'bg-white border-2 border-blue700 text-blue700 hover:bg-blue50 focus:ring-2 focus:ring-blue400 focus:ring-offset-2',
    danger: 'bg-rejected text-white hover:opacity-90 focus:ring-2 focus:ring-rejected focus:ring-offset-2',
    ghost: 'text-blue700 hover:bg-blue50 focus:ring-2 focus:ring-blue400 focus:ring-offset-2',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const isButton = Component === 'button'

  return (
    <Component
      ref={ref}
      type={isButton ? type : undefined}
      onClick={onClick}
      disabled={isButton ? disabled : undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      aria-disabled={!isButton && disabled ? 'true' : undefined}
      tabIndex={!isButton && disabled ? -1 : undefined}
      {...props}
    >
      {children}
    </Component>
  )
})

Button.displayName = 'Button'

export default Button