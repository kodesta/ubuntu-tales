import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { IconButton } from '../IconButton/IconButton';

import styles from './Drawer.module.css';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: 'left' | 'right';
  children: ReactNode;
  className?: string;
}

/** Navigation drawer — a Radix Dialog so focus is trapped and Escape works. */
export function Drawer({
  open,
  onOpenChange,
  title,
  side = 'left',
  children,
  className,
}: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content
          className={cn(styles.panel, styles[side], className)}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <div className={styles.header}>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close menu">
                <X size={20} aria-hidden="true" />
              </IconButton>
            </DialogPrimitive.Close>
          </div>
          <div className={styles.body}>{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
