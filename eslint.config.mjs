import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    rules: {
      // React Compiler-readiness rules (eslint-plugin-react-hooks v7). This
      // codebase does not use the React Compiler; these flag long-standing,
      // working patterns (ref mutation during render for animation loops,
      // setState in mount effects for feature detection) with no present
      // benefit. Revisit if/when the compiler is adopted.
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default eslintConfig;
