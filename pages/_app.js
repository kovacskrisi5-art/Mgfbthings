import { useEffect } from 'react';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="application-name" content="Gluten Free Save Club" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="GF Save Club" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3d1a0a" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
