import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import HomeView from '@/components/home-view';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';

const products = [{ slug: 'finora', name: 'Finora', tagline: 'Your Personal Finance Management Platform', category: 'Finance', status: 'live' }];
const posts: any[] = []; const news: any[] = []; const leaders: any[] = [];   // nothing is invented: sections without approved content simply do not render
const css = fs.readFileSync('app/(public)/public.css', 'utf8');
const b64 = (p: string) => fs.readFileSync(p).toString('base64');
const faces = `@font-face{font-family:'Inter Variable';font-style:normal;font-display:swap;font-weight:100 900;src:url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}) format('woff2')}`;
const body = renderToStaticMarkup(<div className="wos"><a href="#main" className="skip">Skip to main content</a><SiteHeader products={products} /><main id="main"><HomeView products={products} posts={posts} news={news} leaders={leaders} /></main><SiteFooter year={2026} /></div>)
  .replace(/href="\/marketplace\/[^"]*"/g, 'href="#products"').replace(/href="\/(?!\/)[^"]*"/g, 'href="#"');
const js = `(function(){var r=matchMedia('(prefers-reduced-motion: reduce)').matches,e=[].slice.call(document.querySelectorAll('.reveal'));if(r||!('IntersectionObserver' in window)){e.forEach(function(x){x.classList.add('in')});return}document.documentElement.classList.add('rv');var o=new IntersectionObserver(function(l){l.forEach(function(n){if(n.isIntersecting){n.target.classList.add('in');o.unobserve(n.target)}})},{threshold:.14,rootMargin:'0px 0px -6% 0px'});e.forEach(function(x){o.observe(x)})})();`;
const html = `<!DOCTYPE html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>WealthOS | Financial Intelligence for the Future</title><meta name="description" content="WealthOS is a technology and media company developing digital products, software platforms, financial technology solutions and educational media."><style>html{scroll-behavior:smooth}body{margin:0}${faces}${css}</style></head><body>${body}<script>${js}</script></body></html>`;
fs.mkdirSync('preview', { recursive: true });
fs.writeFileSync('preview/wealthos-homepage.html', html);
if (fs.existsSync('/mnt/user-data/outputs')) fs.copyFileSync('preview/wealthos-homepage.html', '/mnt/user-data/outputs/wealthos-homepage.html');
console.log('preview KB', Math.round(html.length / 1024));
