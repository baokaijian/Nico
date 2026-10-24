export function installPageHealth(health,target=globalThis.window) {
  const count=()=>health.pageError();
  target?.addEventListener('error',count);target?.addEventListener('unhandledrejection',count);
  return ()=>{target?.removeEventListener('error',count);target?.removeEventListener('unhandledrejection',count);};
}
