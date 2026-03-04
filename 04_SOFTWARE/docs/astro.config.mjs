import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'P31 Labs',
      description: 'Open-source assistive technology for neurodivergent individuals',
      social: {
        github: 'https://github.com/p31labs/p31',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Architecture',
          autogenerate: { directory: 'architecture' },
        },
      ],
    }),
  ],
});
