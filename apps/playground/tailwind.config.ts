import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        mastra: {
          "bg-1": "#121212", // used for main background
          "bg-2": "#171717", // used for view-windowed background
          "bg-3": "#1a1a1a", // sed for areas in view window that need separation
          "bg-4": "#262626", // overlay modal -> dialog e.t.c
          "bg-5": "#2e2e2e", // context menu, dropdown
          "bg-6": "#202020",
          "bg-7": "#5f5fc5",
          "bg-8": "#242424",
          "bg-9": "#2c2c2c",
          "bg-10": "#202020",
          "bg-11": "#232323",
          "bg-12": "#d9d9d908",
          "bg-13": "#1f1f1f",
          "bg-accent": "#5699a8",
          "bg-connected": "#6cd063",
          "border-1": "#343434",
          "border-2": "#424242",
          "border-3": "#3e3e3e",
          "border-4": "#a5a5f1",
          "border-5": "#5699a8",
          "border-6": "#212121",
          "border-7": "#2f2f2f",
          "border-destructive": "hsl(3deg, 72.4%, 51.6%)", //colors should be hsl/oklch values
          "border-connected": "#6cd063",
          "el-1": "#5c5c5f",
          "el-2": "#707070",
          "el-3": "#939393",
          "el-4": "#a9a9a9",
          "el-5": "#e6e6e6",
          "el-6": "#ffffff",
          "el-accent": "#5f5fc5",
          "el-warning": "#F09A56",
          "el-connected": "#6cd063",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "typing-dot-bounce": {
          "0%,40%": {
            transform: "translateY(0)",
          },
          "20%": {
            transform: "translateY(-0.25rem)",
          },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "typing-dot-bounce": "typing-dot-bounce 1.25s ease-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
  atDirectives: [
    {
      name: "@tailwind",
      description:
        "Use the `@tailwind` directive to insert Tailwind's `base`, `components`, `utilities` and `screens` styles into your CSS.",
      references: [
        {
          name: "Tailwind Documentation",
          url: "https://tailwindcss.com/docs/functions-and-directives#tailwind",
        },
      ],
    },
    {
      name: "@apply",
      description:
        "Use the `@apply` directive to inline any existing utility classes into your own custom CSS. This is useful when you find a common utility pattern in your HTML that you’d like to extract to a new component.",
      references: [
        {
          name: "Tailwind Documentation",
          url: "https://tailwindcss.com/docs/functions-and-directives#apply",
        },
      ],
    },
    {
      name: "@responsive",
      description:
        "You can generate responsive variants of your own classes by wrapping their definitions in the `@responsive` directive:\n```css\n@responsive {\n  .alert {\n    background-color: #E53E3E;\n  }\n}\n```\n",
      references: [
        {
          name: "Tailwind Documentation",
          url: "https://tailwindcss.com/docs/functions-and-directives#responsive",
        },
      ],
    },
    {
      name: "@screen",
      description:
        "The `@screen` directive allows you to create media queries that reference your breakpoints by **name** instead of duplicating their values in your own CSS:\n```css\n@screen sm {\n  /* ... */\n}\n```\n…gets transformed into this:\n```css\n@media (min-width: 640px) {\n  /* ... */\n}\n```\n",
      references: [
        {
          name: "Tailwind Documentation",
          url: "https://tailwindcss.com/docs/functions-and-directives#screen",
        },
      ],
    },
    {
      name: "@variants",
      description:
        "Generate `hover`, `focus`, `active` and other **variants** of your own utilities by wrapping their definitions in the `@variants` directive:\n```css\n@variants hover, focus {\n   .btn-brand {\n    background-color: #3182CE;\n  }\n}\n```\n",
      references: [
        {
          name: "Tailwind Documentation",
          url: "https://tailwindcss.com/docs/functions-and-directives#variants",
        },
      ],
    },
  ],
} satisfies Config;
