import type { SVGProps } from 'react';

/* Hand-rolled icon set — 20 icons is not worth a dependency, and owning them
   means every glyph shares one stroke weight and one grid.
   All icons: 24x24 viewBox, 1.75 stroke, round caps, currentColor. */

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="8" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="11" width="7" height="10" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);

export const IconContacts = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3.25 3.25 0 0 1 0 6.1M17.5 14.6A5.5 5.5 0 0 1 20.5 20" />
  </Icon>
);

export const IconCompanies = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V6.5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14 6.5V21" />
    <path d="M14 10h3.5A1.5 1.5 0 0 1 19 11.5V21" />
    <path d="M8 9h3M8 13h3M8 17h3" />
  </Icon>
);

export const IconDeals = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="5.5" height="13" rx="1.5" />
    <rect x="10.5" y="4" width="5.5" height="9" rx="1.5" />
    <rect x="18" y="4" width="3" height="16" rx="1.5" />
  </Icon>
);

export const IconTasks = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </Icon>
);

export const IconReports = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 20v-6M12.5 20V8M17 20v-9" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.25" />
    <circle cx="9" cy="17" r="2.25" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 6l6 6-6 6" />
  </Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 6l-6 6 6 6" />
  </Icon>
);

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5M12 16h.01" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6.5h16M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
    <path d="M6.5 6.5L7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" />
    <path d="M10.5 10.5v6M13.5 10.5v6" />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Icon>
);

export const IconDots = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconSpark = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5l2.2 5.6 5.8 2.4-5.8 2.4L12 19.5l-2.2-5.6L4 11.5l5.8-2.4z" />
  </Icon>
);

export const IconCart = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M3 4h3l2.2 11.5a1.5 1.5 0 0 0 1.5 1.2h8.8a1.5 1.5 0 0 0 1.5-1.2L21.5 7H7" />
  </Icon>
);

export const IconTruck = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="5" width="13" height="11" rx="1.5" />
    <path d="M15 9h4.5l2.5 3v4h-7V9z" />
    <circle cx="6" cy="18.5" r="2" />
    <circle cx="18" cy="18.5" r="2" />
  </Icon>
);

export const IconWarehouse = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21v-7h6v7" />
    <path d="M9 10h6" />
  </Icon>
);

export const IconDollar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2v20M17 6.5A4.5 4.5 0 0 0 8.5 9c0 4 7 3 7 7a4.5 4.5 0 0 1-8.5 2.5" />
  </Icon>
);

export const IconReceipt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 3v18l3-1.5 3 1.5 3-1.5 3 1.5 4-2V3H4z" />
    <path d="M8 8h8M8 12h8M8 16h4" />
  </Icon>
);

export const IconTrendingUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M22 6L13.5 14.5 8.5 9.5 2 16" />
    <path d="M16 6h6v6" />
  </Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3s7 3 7 9c0 5.5-4.5 8.5-7 10-2.5-1.5-7-4.5-7-10 0-6 7-9 7-9z" />
  </Icon>
);

export const IconZap = (p: IconProps) => (
  <Icon {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Icon>
);

export const IconMessage = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

export const IconPackage = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16.5 9.4L7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </Icon>
);

export const IconFileText = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </Icon>
);

export const IconActivity = (p: IconProps) => (
  <Icon {...p}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Icon>
);

export const IconCheckCircle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

export const IconTag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Icon>
);

export const IconSliders = (p: IconProps) => (
  <Icon {...p}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </Icon>
);

export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Icon>
);

