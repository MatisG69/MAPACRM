import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, loading }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-ws-bear-dim border border-ws-bear/30 flex items-center justify-center">
          <AlertTriangle size={24} className="text-ws-bear" strokeWidth={2} />
        </div>
        <p className="text-sm text-ws-ink leading-relaxed">{description}</p>
        <div className="flex gap-3 w-full pt-2">
          <Button variant="secondary" className="flex-1 normal-case tracking-normal" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" className="flex-1 normal-case tracking-normal" onClick={onConfirm} loading={loading}>
            Supprimer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
