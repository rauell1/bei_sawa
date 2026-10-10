import styles from "./brand-logo.module.css";

/** The shared mark for the desk, account pages and public evidence page. */
export function BrandLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return <span className={`${styles.logo} ${inverse ? styles.inverse : ""} ${compact ? styles.compact : ""}`} role="img" aria-label="BeiSawa — Value, with evidence">
    <svg className={styles.mark} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M39 10H19C11.8 10 6 15.8 6 23V45C6 52.2 11.8 58 19 58H43C50.2 58 56 52.2 56 45V29" stroke="currentColor" strokeWidth="5" />
      <path d="M14 43H21V50H14zM24 36H31V50H24zM34 29H41V50H34zM44 23H51V50H44z" fill="currentColor" />
      <path className={styles.check} d="M40 16L48 23L60 8" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
    <span className={styles.wordmark} aria-hidden="true">beiSawa<small>VALUE, WITH EVIDENCE</small></span>
  </span>;
}
