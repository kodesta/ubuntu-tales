import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { IconButton } from '../IconButton/IconButton';

import styles from './BottomSheet.module.css';

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Mobile-first sheet (Radix Dialog) that slides up from the bottom of the viewport. */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  className,
}: BottomSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content className={cn(styles.sheet, className)}>
          <span className={styles.handle} aria-hidden="true" />
          <DialogPrimitive.Title className={styles.title}>{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className={styles.description}>
              {description}
            </DialogPrimitive.Description>
          ) : null}
          {children ? <div className={styles.body}>{children}</div> : null}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
          <DialogPrimitive.Close asChild>
            <IconButton label="Close sheet" className={styles.close}>
              <X size={20} aria-hidden="true" />
            </IconButton>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
