import { BRAND } from "@/lib/brand";
import { BrandMark } from "./brand-mark";
import styles from "./brand-logo.module.css";

/** The shared mark for the desk, account pages and public evidence page. */
export function BrandLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return <span className={`${styles.logo} ${inverse ? styles.inverse : ""} ${compact ? styles.compact : ""}`} role="img" aria-label={`${BRAND.name} — ${BRAND.tagline}`}>
    <BrandMark className={styles.mark} accent={inverse ? "#a8d8bd" : BRAND.sage} />
    <span className={styles.wordmark} aria-hidden="true">{BRAND.wordmark}<small>{BRAND.tagline.toUpperCase()}</small></span>
  </span>;
}
