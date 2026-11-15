import { createFileRoute, lazyRouteComponent, notFound } from '@tanstack/react-router';

const UiGallery = lazyRouteComponent(
  () => import('@/features/gallery/UiGallery'),
  'UiGallery',
);

/**
 * DEV-only design-system gallery (`/__ui`).
 *
 * The file is named `[_]_ui.tsx` because TanStack Router treats a leading `__` as a pathless
 * layout token; the bracket escape keeps the literal `/__ui` URL. Production builds throw 404.
 */
export const Route = createFileRoute('/__ui')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
  },
  component: UiGallery,
});
