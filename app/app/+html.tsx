import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// HTML shell for web only. Adds a global CSS rule that prevents text
// selection on tappable surfaces — otherwise a tap on a button can
// "select" the button's label instead of firing onPress.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalCss = `
  /* Disable text selection on any pressable surface and its descendants —
     otherwise the inner Text element steals the click and produces a
     selection highlight instead. */
  [role="button"],
  [role="tab"],
  [role="link"],
  [role="button"] *,
  [role="tab"] *,
  [role="link"] * {
    user-select: none !important;
    -webkit-user-select: none !important;
    -webkit-tap-highlight-color: transparent;
  }

  [role="button"],
  [role="tab"],
  [role="link"] {
    cursor: pointer;
  }
`;
