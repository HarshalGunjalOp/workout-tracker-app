import test from 'node:test';
import assert from 'node:assert/strict';
import { createJournalSync } from '../lib/journal-sync.ts';
import type { Session } from '../lib/training.ts';
const session = (id: string): Session => ({id, dayId:'upper', startedAt:'2026-10-26T09:00:00.000Z',finishedAt:'2026-10-26T10:00:00.000Z',updatedAt:'2026-10-26T10:00:00.000Z',note:'',movements:[]});
function fixture(initial: Session[]) {
  let local = structuredClone(initial), authenticated = true;
  const database = new Map<string, Session>();
  const statuses: string[] = [], writes: string[] = [];
  let intercept: ((path:string, init?:RequestInit)=>Promise<Response | undefined>) | undefined;
  const engine = createJournalSync({
    read:()=>local, write:s=>{local=s;}, status:s=>statuses.push(s), key:()=> 'saved-private-key',
    fetch: (async (path,init)=>{
      const url=String(path);
      const custom=await intercept?.(url,init);if(custom)return custom;
      if(url==='/api/pair'){authenticated=true;return Response.json({ok:true});}
      if(!authenticated)return new Response(null,{status:401});
      if(init?.method==='POST'){
        const value=JSON.parse(String(init.body));
        database.set(value.id,value);writes.push(value.id);
        return Response.json({ok:true});
      }
      return Response.json([...database.values()]);
    }) as typeof fetch,
  });
  return {engine,database,statuses,writes, get local(){return local;},set local(s){local=s;},loseCookie(){authenticated=false;},intercept(fn:typeof intercept){intercept=fn;}};
}

test('uploads both missing completed sessions before reporting Synced', async()=>{
  const f=fixture([session('monday'),session('tuesday')]);
  f.intercept(async (_path,init)=>{if(init?.method==='POST')assert.notEqual(f.statuses.at(-1),'Synced');return undefined;});
  try { await f.engine.flush(); assert.equal(f.database.size,2);assert.equal(f.statuses.at(-1),'Synced'); }
  finally {f.engine.stop();}
});
test('lost authentication cookie reconnects with the saved device key and uploads',async()=>{
  const f=fixture([session('monday')]);f.loseCookie();
  try {await f.engine.flush();assert.equal(f.database.size,1);assert.equal(f.statuses.at(-1),'Synced');}finally{f.engine.stop();}
});
test('offline failure retains local data and a later retry uploads it',async()=>{
  const f=fixture([session('monday')]);f.intercept(async()=>{throw Error('offline');});
  try {await f.engine.flush();assert.equal(f.statuses.at(-1),'Offline');assert.equal(f.local.length,1);f.intercept(undefined);await f.engine.flush();assert.equal(f.database.size,1);assert.equal(f.statuses.at(-1),'Synced');}finally{f.engine.stop();}
});
test('edits while upload is in flight stay pending until the next acknowledged upload',async()=>{
 const f=fixture([session('monday')]);let release!:()=>void;const blocked=new Promise<void>(r=>release=r);let began!:()=>void;const started=new Promise<void>(r=>began=r);
 f.intercept(async(_path,init)=>{if(init?.method==='POST'){began();await blocked;}return undefined;});
 try {const pending=f.engine.flush();await started;f.local=[{...f.local[0],note:'new set saved',updatedAt:'2026-10-26T11:00:00.000Z'}];f.engine.schedule();release();await pending;assert.notEqual(f.statuses.at(-1),'Synced');f.intercept(undefined);await f.engine.flush();assert.equal(f.database.get('monday')?.note,'new set saved');assert.equal(f.statuses.at(-1),'Synced');}finally{f.engine.stop();}
});
test('remote date correction wins before any stale local upload',async()=>{
 const f=fixture([session('monday')]);f.database.set('monday',{...session('monday'),startedAt:'2026-10-25T09:00:00.000Z',updatedAt:'2026-10-28T10:00:00.000Z'});
 try {await f.engine.flush();assert.equal(f.local[0].startedAt,'2026-10-25T09:00:00.000Z');assert.equal(f.writes.length,0);}finally{f.engine.stop();}
});
test('an invalid draft does not prevent completed sessions from saving',async()=>{
 const f=fixture([{...session('draft'),finishedAt:null},session('monday')]);
 f.intercept(async(_path,init)=>init?.method==='POST'&&JSON.parse(String(init.body)).id==='draft'?new Response(null,{status:400}):undefined);
 try {await f.engine.flush();assert.ok(f.database.has('monday'));assert.equal(f.statuses.at(-1),'Some changes need attention');}finally{f.engine.stop();}
});
test('a stale upload conflict pulls the newer server copy on retry',async()=>{
 const f=fixture([session('monday')]);let conflict=true;
 f.intercept(async(_path,init)=>{
  if(init?.method==='POST'&&conflict){conflict=false;f.database.set('monday',{...session('monday'),note:'other device',updatedAt:'2026-10-28T10:00:00.000Z'});return new Response(null,{status:409});}return undefined;
 });
 try{await f.engine.flush();assert.notEqual(f.statuses.at(-1),'Synced');await f.engine.flush();assert.equal(f.local[0].note,'other device');assert.equal(f.statuses.at(-1),'Synced');}finally{f.engine.stop();}
});

test('a dropped request retries automatically without another workout edit', async()=>{
 const f=fixture([session('monday')]);let attempts=0;
 f.intercept(async()=>{if(attempts++===0)throw Error('temporary network failure');return undefined;});
 try {
  await f.engine.flush();assert.equal(f.statuses.at(-1),'Offline');
  await new Promise<void>((resolve,reject)=>{
   const deadline=setTimeout(()=>{clearInterval(poll);reject(Error('automatic retry did not finish'));},7000);
   const poll=setInterval(()=>{if(f.statuses.at(-1)==='Synced'){clearTimeout(deadline);clearInterval(poll);resolve();}},20);
  });
  assert.equal(f.database.size,1);
 } finally {f.engine.stop();}
});
test('a sync requested while another pass is running is automatically drained',async()=>{
 const f=fixture([session('monday')]);let release!:()=>void;const blocked=new Promise<void>(r=>release=r);let began!:()=>void;const started=new Promise<void>(r=>began=r);
 let first=true;
 f.intercept(async(_path,init)=>{if(init?.method==='POST'&&first){first=false;began();await blocked;}return undefined;});
 try {
  const running=f.engine.flush();await started;f.local=[...f.local,session('tuesday')];f.engine.schedule();release();await running;
  await new Promise<void>((resolve,reject)=>{
   const deadline=setTimeout(()=>{clearInterval(poll);reject(Error('queued save was dropped'));},1000);
   const poll=setInterval(()=>{if(f.database.has('tuesday')){clearTimeout(deadline);clearInterval(poll);resolve();}},10);
  });
  assert.equal(f.statuses.at(-1),'Synced');
 }finally{f.engine.stop();}
});

test('JSONB key ordering does not cause redundant uploads of saved sessions',async()=>{
 const f=fixture([session('monday')]);
 const reordered=JSON.parse(JSON.stringify(session('monday')),(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).reverse()):value);
 f.database.set('monday',reordered);
 try{await f.engine.flush();assert.equal(f.writes.length,0);assert.equal(f.statuses.at(-1),'Synced');}finally{f.engine.stop();}
});
