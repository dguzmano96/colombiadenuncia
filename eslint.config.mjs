import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "00-discovery/**",
      "01-backlog/**",
      "02-arquitectura/**",
      "03-calidad/**",
      "04-sesion/**",
      "public/sw.js",
      "public/swe-worker*",
    ],
  },
];

export default eslintConfig;
