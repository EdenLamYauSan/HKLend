import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ARCH-14 / Story 1.5 AC-6: Schema files must be pure.
 * *.schema.ts files MUST NOT import @/lib/db or prisma.
 * They are imported by client bundles — any DB or server import breaks the bundle.
 */
const schemaImportRule = {
  files: ["**/*.schema.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/lib/db", "@/lib/db.ts", "*/lib/db"],
            message:
              "Schema files must be pure (no I/O). Import db in server files only.",
          },
          {
            group: ["@prisma/client", "prisma", "@prisma/*"],
            message:
              "Schema files must be pure (no Prisma). Keep schema files importable by the client bundle.",
          },
        ],
      },
    ],
  },
};

/**
 * UX-DR12 / AC-2: Coral #cf554f as TEXT fails WCAG AA (3.9:1 on white).
 * ONLY #B8390E (5.2:1) is permitted for coral text.
 *
 * This rule catches the most common patterns:
 *   className="text-[#cf554f]"  → error
 *   style={{ color: '#cf554f' }} → error
 *
 * It does NOT ban #cf554f for bg-/fill-/border- (those are allowed for
 * badge backgrounds, icon fills, destructive button fills, etc.).
 *
 * Use text-brand-coral-text (#B8390E) for any coral-coloured text.
 */
const coralTextRule = {
  files: ["**/*.{ts,tsx,js,jsx}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        // Tailwind arbitrary text colour: text-[#cf554f] (case-insensitive)
        selector: "Literal[value=/text-\\[#[Cc][Ff]554[Ff]\\]/]",
        message:
          "#cf554f fails WCAG AA as text (3.9:1). Use text-brand-coral-text (#B8390E, 5.2:1) instead.",
      },
      {
        // Inline style color: '#cf554f' or "#CF554F"
        selector:
          "Property[key.name='color'] > Literal[value=/^#[Cc][Ff]554[Ff]$/]",
        message:
          "#cf554f fails WCAG AA as text (3.9:1). Use '#B8390E' (5.2:1) instead.",
      },
      {
        // CSS-in-JS color variable containing #cf554f
        selector:
          "Property[key.name='color'] > TemplateLiteral",
        message:
          "Check colour value — #cf554f fails WCAG AA as text. Use #B8390E instead.",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  schemaImportRule,
  coralTextRule,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
