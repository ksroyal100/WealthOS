'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (<html lang="en-US"><body style={{ fontFamily: 'system-ui', display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center' }}><div><h1>Something went wrong</h1><p>Please refresh the page.</p></div></body></html>);
}
