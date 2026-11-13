import type { ReactNode } from 'react';
import { useOnline } from '../lib/connectivity';
export function ExternalLink({ href, children, className = '', label }: { href: string; children: ReactNode; className?: string; label?: string }) {
  const online = useOnline();
  return online
    ? <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>{children}</a>
    : <span className={`${className} link-offline`} aria-disabled="true" title="連線後即可開啟">{children}<span className="sr-only">（離線時無法開啟）</span></span>;
}
