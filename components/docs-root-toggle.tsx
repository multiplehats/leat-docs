import type { SidebarTab } from 'fumadocs-ui/utils/get-sidebar-tabs';
import { Compass, ShoppingBag, Braces } from 'lucide-react';

export const docsRootTabs: SidebarTab[] = [
  {
    title: 'Getting Started',
    description: 'Introduction to Leat',
    url: '/',
    icon: <Compass className="size-full" />,
  },
  {
    title: 'WooCommerce Plugin',
    description: 'WooCommerce integration',
    url: '/wordpress-plugin',
    icon: <ShoppingBag className="size-full" />,
  },
  {
    title: 'API Reference',
    description: 'REST API documentation',
    url: '/api-reference',
    icon: <Braces className="size-full" />,
  },
];
