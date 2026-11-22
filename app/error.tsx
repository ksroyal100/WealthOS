'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (<div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}><div><h1 style={{ fontSize: '2rem' }}>Something went wrong</h1><p style={{ opacity: 0.7 }}>We have been notified. Please try again.</p><button onClick={reset} style={{ textDecoration: 'underline' }}>Try again</button></div></div>);
}
