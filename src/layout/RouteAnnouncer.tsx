import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { primaryNav, secondaryNav } from './navigation';

/* What a browser does for free on a normal page load, and that a single-page
 * app has to put back by hand:
 *
 *   1. **The document title changes.** Otherwise every entry in the history
 *      menu, every bookmark and every tab reads the same word.
 *   2. **Something announces the new page.** Screen-reader users get no
 *      indication that a route changed, because nothing reloaded.
 *   3. **Focus moves.** After following a link, focus is stranded on a link
 *      that no longer exists; the next Tab starts from the top of the document.
 *
 * All three are skipped on the first render — the page has just loaded, so the
 * browser has already done them.
 */

const TITLES = [...primaryNav, ...secondaryNav];

/** Longest matching nav prefix, so /contacts/abc still resolves to "Contacts". */
function titleForPath(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const match = TITLES.filter((item) => item.to !== '/' && pathname.startsWith(item.to)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];
  return match?.label ?? 'Not found';
}

export function RouteAnnouncer({ companyName }: { companyName: string }) {
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState('');
  const first = useRef(true);

  useEffect(() => {
    const title = titleForPath(pathname);
    document.title = `${title} · ${companyName}`;

    if (first.current) {
      first.current = false;
      return;
    }

    setAnnouncement(`${title} page`);

    /* Focus the main landmark rather than its first control: landing on a
       "Delete" button because it happens to be first is the same hazard the
       overlays avoid (components/Overlay.tsx). */
    const main = document.getElementById('main');
    main?.focus({ preventScroll: true });
  }, [pathname, companyName]);

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </p>
  );
}
