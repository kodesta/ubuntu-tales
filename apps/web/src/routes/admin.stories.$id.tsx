import { createFileRoute } from '@tanstack/react-router';

import { AdminStoryEditor } from '@/features/admin';

export const Route = createFileRoute('/admin/stories/$id')({
  component: AdminStoryEditorRoute,
});

function AdminStoryEditorRoute() {
  const { id } = Route.useParams();
  return <AdminStoryEditor storyId={id} />;
}
