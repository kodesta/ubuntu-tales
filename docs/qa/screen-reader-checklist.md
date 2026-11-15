# Manual screen-reader and keyboard audit checklist

Run before public launch on: Android Chrome + TalkBack, iOS Safari + VoiceOver, desktop Chrome + NVDA.

## Per route

- [ ] One `<h1>`; headings descend in order.
- [ ] Skip link moves focus to `#main`.
- [ ] All controls reachable and operable by keyboard; focus ring visible.
- [ ] Dialog/bottom-sheet traps focus and returns it on close.
- [ ] Images have meaningful alt text (decorative ones are ignored).
- [ ] Form fields have labels; errors announced via `aria-describedby`/`role="alert"`.
- [ ] Live regions are not noisy (read-along uses `aria-current`, not a chatty live region).

## Player and reader

- [ ] Play/pause, seek, ±15 s, speed and soundscape toggle are labelled and usable with a keyboard.
- [ ] Seek slider announces value (time) as it changes.
- [ ] The active read-along sentence announces `aria-current="true"` without spam.
- [ ] Story text can be selected and copied.

## Mobile-only

- [ ] Bottom navigation labels are visible and hit areas ≥ 44 px.
- [ ] Offline banner is announced once, not repeatedly.
- [ ] Landscape does not clip the player.

Record results with device, OS/browser version and any defects raised.
