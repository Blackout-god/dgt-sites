'use client';
import { useEffect } from 'react';
export default function Entry() {
  useEffect(()=>{window.location.replace(navigator.language.toLowerCase().startsWith('uk')?'/uk/':'/en/');},[]);
  return <main className="entry-page"><span className="wordmark">inka<span>toys</span>✳</span><p>Маленькі друзі. Великі історії.</p><a className="button button-dark" href="/uk/">Українська ↗</a><a className="button button-outline" href="/en/">English ↗</a></main>;
}
