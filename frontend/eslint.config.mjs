import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Inline plugin keeping component files in the right places without adding
// any dependency: React components live under components/, and component
// filenames must be kebab-case.
const localFilenamesRules = {
  "no-components-in-lib": {
    meta: {
      type: "problem",
      docs: {
        description: "Disallow React components directly inside a lib folder.",
      },
      schema: [],
      messages: {
        componentInLib: "React components must live under components/, not lib/.",
      },
    },
    create(context) {
      return {
        Program(node) {
          const segments = String(context.filename).replace(/\\/g, "/").split("/");
          const basename = segments[segments.length - 1];
          if (!basename.endsWith(".tsx")) {
            return;
          }
          const parentSegment = segments[segments.length - 2];
          // Only files directly inside a lib folder (not lib/pages etc.).
          if (parentSegment === "lib") {
            context.report({
              node,
              messageId: "componentInLib",
            });
          }
        },
      };
    },
  },
  "component-filename-case": {
    meta: {
      type: "problem",
      docs: {
        description: "Require kebab-case filenames for component files.",
      },
      schema: [],
      messages: {
        notKebabCase: "Component filenames must be kebab-case.",
      },
    },
    create(context) {
      return {
        Program(node) {
          const filename = String(context.filename).replace(/\\/g, "/");
          if (!filename.includes("/components/")) {
            return;
          }
          const basename = filename.slice(filename.lastIndexOf("/") + 1);
          const stem = basename.replace(/\.tsx$/i, "");
          if (/[A-Z]/.test(stem)) {
            context.report({
              node,
              messageId: "notKebabCase",
            });
          }
        },
      };
    },
  },
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: {
      "local-filenames": {
        rules: localFilenamesRules,
      },
    },
    rules: {
      "local-filenames/no-components-in-lib": "error",
      "local-filenames/component-filename-case": "error",
    },
  },
];

export default eslintConfig;
