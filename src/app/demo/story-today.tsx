import type { Decorator } from "@storybook/react";
import { DemoTodayProvider } from "./demo-today";

/**
 * For the demo page stories. The demo's dates count from today, and on the
 * site src/app/demo/layout.tsx supplies today. Stories render the pages
 * without that layout, so this decorator supplies a fixed day instead, which
 * also keeps the snapshots from changing every day. With this day, the demo
 * due date is June 15, 2026.
 */
export const withDemoToday: Decorator = (Story) => (
  <DemoTodayProvider today="2026-04-06">
    <Story />
  </DemoTodayProvider>
);

/**
 * Story parameters for a demo page: full screen, with the app router mocked
 * at `pathname`, so the dashboard tabs underline the right one.
 */
export function demoPageParameters(pathname: string) {
  return {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname } },
  };
}
