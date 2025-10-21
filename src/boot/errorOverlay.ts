let mounted = false;
function mount() {
  if (mounted) return; mounted = true;
  const el = document.createElement('div');
  el.id = 'br-error';
  Object.assign(el.style, {
    position:'fixed', left:'0', right:'0', top:'0',
    padding:'8px 12px', background:'#8b0000', color:'#fff',
    font:'12px ui-monospace, Menlo, Consolas, monospace',
    zIndex:'99999', whiteSpace:'pre-wrap', display:'none',
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
}
function show(msg:string){ mount(); const el = document.getElementById('br-error')!; el.textContent = msg; (el as HTMLElement).style.display = 'block'; }
export function installGlobalErrorOverlay(){
  window.addEventListener('error', e=> show(`ERROR: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`));
  window.addEventListener('unhandledrejection', (e:any)=> show(`UNHANDLED: ${e?.reason?.stack||e?.reason?.message||String(e?.reason)}`));
}
export function errorBanner(text:string){ show(text); }
