import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "home" | "shop" | "history" | "plus" | "user" | "wallet" | "orders"
  | "support" | "rules" | "admin" | "back" | "chevron" | "check" | "close"
  | "refresh" | "box" | "message" | "users" | "card" | "search";

const PATHS: Record<IconName, ReactNode> = {
  home: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  shop: (<><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20" /></>),
  history: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  wallet: (<><path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M3 7l12-3v3" /><circle cx="17" cy="13.5" r="1" /></>),
  orders: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  support: (<><path d="M4 14v-2a8 8 0 0116 0v2" /><rect x="3" y="14" width="4" height="6" rx="1" /><rect x="17" y="14" width="4" height="6" rx="1" /></>),
  rules: (<><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4M10 12h6M10 16h6" /></>),
  admin: (<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />),
  back: (<path d="M15 5l-7 7 7 7" />),
  chevron: (<path d="M9 5l7 7-7 7" />),
  check: (<path d="M5 12l5 5 9-10" />),
  close: (<path d="M6 6l12 12M18 6L6 18" />),
  refresh: (<><path d="M20 12a8 8 0 10-3 6.2" /><path d="M20 5v7h-7" /></>),
  box: (<><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>),
  message: (<path d="M4 5h16v11H9l-5 4z" />),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" /><path d="M16 4.5a3.5 3.5 0 010 7M18 15c2.5.6 4 2.3 4 5" /></>),
  card: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M16 16l5 5" /></>),
};

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
