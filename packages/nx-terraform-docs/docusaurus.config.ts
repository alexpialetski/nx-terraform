import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'nx-terraform',
  tagline: 'An Nx plugin for managing Terraform projects within an Nx monorepo',
  favicon: 'img/favicon.svg',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://alexpialetski.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/nx-terraform/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'alexpialetski', // Usually your GitHub org/user name.
  projectName: 'nx-terraform', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/alexpialetski/nx-terraform/tree/main/packages/nx-terraform-docs/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/nx-terraform-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'nx-terraform',
      logo: {
        alt: 'nx-terraform Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/alexpialetski/nx-terraform',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/installation',
            },
            {
              label: 'Tutorials',
              to: '/docs/tutorials/tutorial-01-create-workspace',
            },
            {
              label: 'Guides',
              to: '/docs/guides/project-types',
            },
            {
              label: 'Reference',
              to: '/docs/reference/generators/init',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Nx Documentation',
              href: 'https://nx.dev',
            },
            {
              label: 'Terraform Documentation',
              href: 'https://developer.hashicorp.com/terraform/docs',
            },
            {
              label: 'GitHub Repository',
              href: 'https://github.com/alexpialetski/nx-terraform',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/alexpialetski/nx-terraform',
            },
            {
              label: 'npm Package',
              href: 'https://www.npmjs.com/package/nx-terraform',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} nx-terraform. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'forest' },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
