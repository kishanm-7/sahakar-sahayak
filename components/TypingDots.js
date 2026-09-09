'use client';

// Three-dot "thinking" indicator. Each dot runs the same keyframe with a
// staggered negative delay, which produces the travelling wave without any
// JS timers.
export default function TypingDots({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current animate-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}
