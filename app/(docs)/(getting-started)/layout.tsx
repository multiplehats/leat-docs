import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { gettingStartedSource } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { docsRootTabs } from '@/components/docs-root-toggle';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={gettingStartedSource.getPageTree()}
      {...baseOptions()}
      sidebar={{ tabs: docsRootTabs }}
    >
      {children}
    </DocsLayout>
  );
}
