import type { ReactNode } from 'react';

export function AppLayout({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
