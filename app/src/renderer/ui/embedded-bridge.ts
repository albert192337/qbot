// Must run before modules with top-level API subscriptions (travel, weather, etc.).
if (window !== window.top && !window.qbot) {
  try {
    const stops=new Set<()=>void>();
    const scoped=Object.fromEntries(Object.entries(window.parent.qbot).map(([domain,methods])=>[domain,
      Object.fromEntries(Object.entries(methods).map(([key,value])=>{
        if(!/^on[A-Z]/.test(key)||typeof value!=='function')return [key,value];
        return [key,(...args:unknown[])=>{const stop=value(...args) as ()=>void;stops.add(stop);return()=>{stop();stops.delete(stop);};}];
      }))
    ]));
    window.qbot=scoped as typeof window.qbot;
    window.addEventListener('pagehide',()=>{for(const stop of stops)stop();stops.clear();},{once:true});
  } catch { /* Standalone pages use preload. */ }
}
export {};
