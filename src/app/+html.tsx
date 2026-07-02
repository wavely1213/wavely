// 웹(Expo) HTML 셸 — pre-JS 로딩 부팅 스플래시(2곡선 마크)를 여기서 주입. 앱 마운트되면 script가 제거.
// ⚠️ ScrollViewStyleReset·viewport 필수(RN Web). 부팅 마크업/스타일은 raw HTML(dangerouslySetInnerHTML)로 넣어 JSX 속성 이슈 회피.
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const BOOT_CSS = `
#__boot{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0C0C0E;transition:opacity .4s ease;font-family:-apple-system,'Noto Sans KR',system-ui,sans-serif}
#__boot .m{width:60px;height:60px;border-radius:17px;background:#7A2BC4;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(122,43,196,.35)}
#__boot .n{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.02em}
#__boot .b{width:120px;height:3px;border-radius:3px;background:rgba(255,255,255,.16);overflow:hidden}
#__boot .b i{display:block;width:38%;height:100%;border-radius:3px;background:#fff;animation:__bslide 1.1s ease-in-out infinite}
@keyframes __bslide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
@media (prefers-reduced-motion:reduce){#__boot .b i{animation:none;width:100%}}
`;

const BOOT_HTML =
  '<div id="__boot"><div class="m"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 9 c 3 -3 6.5 3 9.5 0 s 6.5 -3 9.5 0"/><path d="M2.5 15 c 3 -3 6.5 3 9.5 0 s 6.5 -3 9.5 0"/></svg></div><div class="n">와벨리</div><div class="b"><i></i></div></div>';

const BOOT_REMOVE =
  "function __hideBoot(){var b=document.getElementById('__boot');if(b){b.style.opacity='0';setTimeout(function(){if(b&&b.remove)b.remove();},450);}}" +
  "window.addEventListener('load',function(){setTimeout(__hideBoot,300);});setTimeout(__hideBoot,6000);";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: BOOT_HTML }} />
        {children}
        <script dangerouslySetInnerHTML={{ __html: BOOT_REMOVE }} />
      </body>
    </html>
  );
}
