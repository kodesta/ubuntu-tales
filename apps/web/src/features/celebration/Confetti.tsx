import type { CSSProperties } from 'react';

import styles from './Confetti.module.css';

const PIECES = Array.from({ length: 18 }, (_, index) => ({
  left: 4 + ((index * 53) % 92),
  delay: (index % 6) * 0.05,
  duration: 0.92 + ((index * 7) % 5) * 0.055,
  rotation: (index * 47) % 360,
  drift: (index % 2 === 0 ? 1 : -1) * (12 + ((index * 13) % 36)),
}));

/**
 * Finite CSS-only celebration confetti (≤ 1.2 s, one iteration). No animation library, no JS
 * timers — and it disappears entirely under `prefers-reduced-motion` (design doc §7.9, §10).
 */
export function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden="true">
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className={styles.piece}
          style={
            {
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              '--rotation': `${piece.rotation}deg`,
              '--drift': `${piece.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
