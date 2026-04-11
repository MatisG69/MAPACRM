import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-gradient-to-b from-ws-accent-soft to-ws-accent text-ws-void hover:brightness-[1.06] shadow-glow-sm border border-white/15 active:scale-[0.98]',
    secondary:
      'bg-ws-panel/90 text-ws-paper border border-ws-line hover:border-ws-accent/40 hover:bg-ws-raised active:scale-[0.98]',
    danger:
      'bg-ws-bear-dim text-red-400 border border-red-500/25 hover:bg-red-500/20 active:scale-[0.98]',
    ghost: 'text-ws-ink hover:text-ws-paper hover:bg-white/[0.05] border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px] uppercase tracking-wide',
    md: 'px-4 py-2.5 text-xs',
    lg: 'px-5 py-3 text-sm',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
