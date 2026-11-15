# Community moderation runbook

1. Open `/admin/moderation` and pick the `Submitted` queue.
2. **Claim** a submission so other editors know it is being read.
3. Read the tale against `docs/design/substack-experience.md` voice and the community guidelines:
   provenance, respect, clarity, age-appropriateness.
4. Choose an action, always with a note:
   - **Request changes** — the author can edit and resubmit.
   - **Approve** — creates a DRAFT story with the tale pre-filled. Continue editing in
     `/admin/stories/:id`, add cover artwork and narration, then publish.
   - **Reject** — not for the archive; explain kindly.
5. Cultural concerns (sacred stories, misattribution) take priority: pause the queue, consult the
   cultural reviewer, record the decision in the submission note.
6. Publish only when the story has a cover, a non-empty body and the required review notes.
