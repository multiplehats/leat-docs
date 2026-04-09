import type { SidebarTab } from 'fumadocs-ui/utils/get-sidebar-tabs';
import { BookOpen, Plug, Code } from 'lucide-react';

export const docsRootTabs: SidebarTab[] = [
  {
    title: 'Getting Started',
    description: 'Introduction to Leat',
    url: '/',
    icon: <BookOpen />,
  },
  {
    title: 'WordPress Plugin',
    description: 'WooCommerce integration',
    url: '/wordpress-plugin',
    icon: <Plug />,
  },
  {
    title: 'API Reference',
    description: 'REST API documentation',
    url: '/api-reference',
    icon: <Code />,
  },
];
