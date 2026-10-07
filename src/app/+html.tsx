import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Web only: the root HTML document. `dir="rtl"` makes the web build right-to-left,
// matching the native RTL forced by the expo-localization plugin.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
