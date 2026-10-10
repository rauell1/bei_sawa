/** Vector geometry shared by the interface and generated share images. */
export function BrandMark({ className, color = "currentColor", accent = "#81a889", size = 64 }: { className?: string; color?: string; accent?: string; size?: number }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M39 10H19C11.8 10 6 15.8 6 23V45C6 52.2 11.8 58 19 58H43C50.2 58 56 52.2 56 45V29" stroke={color} strokeWidth="5" />
    <path d="M14 43H21V50H14zM24 36H31V50H24zM34 29H41V50H34zM44 23H51V50H44z" fill={color} />
    <path d="M40 16L48 23L60 8" stroke={accent} strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>;
}
