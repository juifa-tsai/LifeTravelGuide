import { Store } from 'lucide-react';
import { ExternalLink } from './ExternalLink';

export function NearbyStoresLink() {
  return <ExternalLink href="https://www.google.com/maps/search/?api=1&query=convenience+stores+near+me" className="nearby-stores-link" label="搜尋附近超商（Lawson、全家、7-Eleven）">
    <Store size={22} strokeWidth={1.7} aria-hidden="true" /><span className="sr-only">附近超商</span>
  </ExternalLink>;
}
