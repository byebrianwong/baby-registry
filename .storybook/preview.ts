import type { Preview } from "@storybook/react";
import { fontVariables } from "../src/app/fonts";
import "../src/app/globals.css";

// Match the root layout (src/app/layout.tsx): font variables on <html>, body
// font on <body>. Then stories, and the dialogs they open in portals, use the
// site's fonts.
document.documentElement.classList.add(...fontVariables.split(" "));
document.body.classList.add("font-sans", "antialiased");

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
