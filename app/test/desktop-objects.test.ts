import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({rows:[] as any[],fail:false,icon:vi.fn(),directories:vi.fn()}));
vi.mock('electron',()=>({app:{getPath:()=> 'C:/Users/test/Desktop',getFileIcon:m.icon}}));
vi.mock('node:child_process',()=>({execFile:Object.assign(()=>{}, {[Symbol.for('nodejs.util.promisify.custom')]:async()=>{if(m.fail)throw Error('Shell unavailable');return {stdout:JSON.stringify(m.rows),stderr:''};}})}));
vi.mock('node:fs/promises',()=>({readdir:m.directories}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();m.fail=false;m.rows=Array.from({length:8},(_,i)=>({name:i===7?'逆水寒手游':`应用${i}`,location:`C:/Desktop/item${i}.lnk`,filesystem:true,folder:false}));m.icon.mockResolvedValue({isEmpty:()=>false,toDataURL:()=> 'data:image/png;base64,actual-icon'});m.directories.mockResolvedValue([]);});
it('enumerates more than four real names without exposing paths, and resolves exactly the selected ID',async()=>{
 const api=await import('../src/main/desktop-icon-copies');const inventory=await api.desktopInventory(true);
 expect(inventory.source).toBe('shell');expect(inventory.items).toHaveLength(8);expect(JSON.stringify(inventory)).not.toContain('C:/Desktop');
 const game=inventory.items.find(i=>i.name==='逆水寒手游')!;const copy=await api.desktopIconCopy(game.id);
 expect(copy?.object).toEqual(game);expect(m.icon).toHaveBeenCalledWith('C:/Desktop/item7.lnk',{size:'normal'});
 expect(await api.desktopIconCopy('C:/Desktop/item7.lnk')).toBeNull();
 m.rows.pop();expect(await api.desktopIconCopy(game.id)).toBeNull();
});
it('duplicate display names retain distinct identities; shell failures are labelled as partial directory fallback',async()=>{
 const api=await import('../src/main/desktop-icon-copies');m.rows=[{name:'同名',location:'C:/Users/test/Desktop/x.lnk',filesystem:true},{name:'同名',location:'C:/Users/Public/Desktop/x.lnk',filesystem:true},{name:'回收站',location:'::{virtual}',filesystem:false}];
 const inventory=await api.desktopInventory(true);expect(new Set(inventory.items.map(i=>i.id)).size).toBe(3);expect(inventory.items[2].kind).toBe('virtual');
 m.fail=true;const fallback=await api.desktopInventory(true);expect(fallback.source).toBe('directories');expect(m.directories).toHaveBeenCalled();
});

it('shortcut icon metadata stays local and selects the actual application artwork',async()=>{
 const api=await import('../src/main/desktop-icon-copies');m.rows=[{name:'逆水寒手游',location:'C:/Desktop/game.lnk',target:'D:/Games/game.exe',iconLocation:'D:/Games/art.ico,0',filesystem:true}];
 const objects=await api.desktopInventory(true);expect(JSON.stringify(objects)).not.toMatch(/Games|location|target/);
 await api.desktopIconCopy(objects.items[0].id);expect(m.icon).toHaveBeenCalledWith('D:/Games/art.ico',{size:'normal'});
});
