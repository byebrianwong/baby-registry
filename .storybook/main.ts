import { builtinModules } from "node:module";
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: "@storybook/nextjs",
  staticDirs: ["../public"],
  env: (config) => ({
    ...config,
    NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-key-for-storybook",
  }),
  // Server actions can import Node built-ins. Next.js keeps server actions out
  // of the browser bundle, but Storybook bundles them, and webpack cannot build
  // node: imports for the browser. So drop the node: prefix and resolve built-ins
  // to empty modules. A story that actually calls one of them will fail.
  webpackFinal: (config) => {
    config.plugins ??= [];
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.normalModuleFactory.tap("StripNodeScheme", (factory) => {
          factory.hooks.beforeResolve.tap("StripNodeScheme", (data) => {
            data.request = data.request.replace(/^node:/, "");
          });
        });
      },
    });
    config.resolve ??= {};
    config.resolve.fallback = {
      ...Object.fromEntries(builtinModules.map((name) => [name, false])),
      ...config.resolve.fallback,
    };
    return config;
  },
};
export default config;
