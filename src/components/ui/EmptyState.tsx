import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-ws-panel border border-ws-line flex items-center justify-center mb-5 text-ws-accent shadow-glow">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-ws-paper mb-2">{title}</h3>
      <p className="text-sm text-ws-ink max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="normal-case tracking-normal">
          {action.label}
        </Button>
      )}
    </div>
  );
}
