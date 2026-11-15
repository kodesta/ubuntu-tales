import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

import styles from './Tabs.module.css';

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn(styles.list, className)} {...props} />;
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn(styles.trigger, className)} {...props} />;
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn(styles.content, className)} {...props} />;
}

/** Radix Tabs with the editorial underline treatment (library, saved lists). */
export const Tabs = {
  Root: TabsPrimitive.Root,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};
