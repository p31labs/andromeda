
# Setting Up a New Astro Project with React and Tailwind CSS

This tutorial will guide you through creating a new Astro project from scratch, integrating React for component-based UI and Tailwind CSS for styling.

## Step 1: Initialize Your Astro Project

First, we'll create a new Astro project. We'll use the `--template empty` flag to start with a minimal setup.

```bash
npm create astro@latest -- --template empty
```

This command initializes a new Astro project in a new directory. It will prompt you for a project name. For this tutorial, we'll assume the project is named `my-astro-app`.

## Step 2: Add React Integration

Next, we'll add the Astro integration for React. This will allow you to use React components in your Astro project.

```bash
npx astro add react
```

This command does the following:
1.  Installs the `@astrojs/react` package and its dependencies.
2.  Automatically updates your `astro.config.mjs` file to include the React integration.

After running the command, your `astro.config.mjs` file should look like this:

```javascript
import { defineConfig } from 'astro/config';
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [react()]
});
```

## Step 3: Add Tailwind CSS Integration

Now, let's add the Tailwind CSS integration for styling.

```bash
npx astro add tailwind
```

This command will:
1.  Install the `@astrojs/tailwind` package and its dependencies.
2.  Create a `tailwind.config.mjs` file in your project root.
3.  Update your `astro.config.mjs` file to include the Tailwind integration.

Your `astro.config.mjs` will now look like this:

```javascript
import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()]
});
```

And you will have a new `tailwind.config.mjs` file:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	plugins: [],
}
```

## Step 4: Create a React Component

Now that we have React and Tailwind set up, let's create a simple React component.

Create a new file at `src/components/Card.tsx` and add the following code:

```tsx
import React from 'react';

export default function Card({ title, children }) {
  return (
    <div className="p-6 border border-gray-200 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
```

This component takes a `title` and `children` as props and displays them in a styled card using Tailwind CSS utility classes.

## Step 5: Render the React Component in an Astro Page

Finally, let's render our new `Card` component on the main index page.

Open `src/pages/index.astro` and replace its content with the following:

```astro
---
import Layout from '../layouts/Layout.astro';
import Card from '../components/Card.tsx';
---

<Layout title="Welcome to Astro">
	<main class="p-8">
		<h1 class="text-4xl font-bold text-center mb-8">My Astro App</h1>
		<Card title="My First React Component">
			This is a React component rendered inside an Astro page, styled with Tailwind CSS.
		</Card>
	</main>
</Layout>
```

You will also need a basic layout. If you don't have one, create `src/layouts/Layout.astro`:

```astro
---
export interface Props {
	title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="description" content="Astro description" />
		<meta name="viewport" content="width=device-width" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<meta name="generator" content={Astro.generator} />
		<title>{title}</title>
	</head>
	<body>
		<slot />
	</body>
</html>
```


## Step 6: Run the Development Server

You are now ready to start the development server and see your creation.

```bash
npm run dev
```

This will start the Astro development server, typically at `http://localhost:4321`. Open this URL in your browser.

You should see a page with the title "My Astro App" and a card with the title "My First React Component" and the text "This is a React component rendered inside an Astro page, styled with Tailwind CSS." The card will have a border, rounded corners, and a shadow, confirming that Tailwind CSS is working correctly.
