import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { IconButton } from '../IconButton/IconButton';

import styles from './Dialog.module.css';

export interface DialogContentProps extends Omit<
  ComponentProps<typeof DialogPrimitive.Content>,
  'title'
> {
  title: ReactNode;
  description?: ReactNode;
  size?: 'sm' | 'md';
}

/** Radix dialog with focus trap, title/description wiring and the editorial paper surface. */
export function DialogContent({
  title,
  description,
  size = 'md',
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={styles.overlay} />
      <DialogPrimitive.Content
        className={cn(styles.content, styles[size], className)}
        {...props}
      >
        <DialogPrimitive.Title className={styles.title}>{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className={styles.description}>
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">
            Dialog
          </DialogPrimitive.Description>
        )}
        <div className={styles.body}>{children}</div>
        <DialogPrimitive.Close asChild>
          <IconButton label="Close dialog" className={styles.close}>
            <X size={20} aria-hidden="true" />
          </IconButton>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const Dialog = {
  Root: DialogPrimitive.Root,
  Trigger: DialogPrimitive.Trigger,
  Close: DialogPrimitive.Close,
  Content: DialogContent,
};
