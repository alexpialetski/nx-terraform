import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/workspace-creation',
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/tutorial-01-create-workspace',
        'tutorials/tutorial-02-setup-backend',
        'tutorials/tutorial-03-first-module',
        'tutorials/tutorial-04-multiple-environments',
        'tutorials/tutorial-05-reusable-modules',
      ],
    },
      {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/project-types',
        'guides/backend-types',
        'guides/dependencies',
        'guides/caching',
        'guides/project-discovery',
        'guides/configuration',
        'guides/troubleshooting',
        'guides/best-practices',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        {
          type: 'category',
          label: 'Generators',
          items: [
            'reference/generators/init',
            'reference/generators/terraform-backend',
            'reference/generators/terraform-module',
            'reference/generators/preset',
            'reference/generators/sync-terraform-metadata',
          ],
        },
        {
          type: 'category',
          label: 'Targets',
          items: [
            'reference/targets/terraform-init',
            'reference/targets/terraform-plan',
            'reference/targets/terraform-apply',
            'reference/targets/terraform-destroy',
            'reference/targets/terraform-validate',
            'reference/targets/terraform-fmt',
            'reference/targets/terraform-output',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/complete-workflow',
        'examples/multiple-environments',
        'examples/reusable-modules',
      ],
    },
  ],
};

export default sidebars;
