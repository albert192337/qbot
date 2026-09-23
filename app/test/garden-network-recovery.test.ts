import {afterEach,describe,it,expect,vi} from 'vitest';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const mock=vi.hoisted(()=>({dir:'',request:vi.fn(),actor:'pet-a'}));
vi.mock('electron',()=>({app:{getPath:()=>mock.dir},BrowserWindow:{getAllWindows:()=>[]}}));
vi.mock('../src/main/config',()=>({getSettings:async()=>({activeCharacter:mock.actor}),setSettings:vi.fn()}));
vi.mock('../src/main/rooms/rooms',()=>({gardenRealm:()=> 'test-realm',gardenRequest:mock.request}));
import {networkAction,networkGarden} from '../src/main/garden/network';
afterEach(async()=>{vi.clearAllMocks();if(mock.dir){expect(path.resolve(mock.dir).startsWith(path.resolve(os.tmpdir())+path.sep)).toBe(true);await rm(mock.dir,{recursive:true,force:true});}mock.dir='';mock.actor='pet-a';});
describe('uncertain garden transactions',()=>{
  it('recovers a spent item by its original receipt after a response is lost',async()=>{
    mock.dir=await mkdtemp(path.join(os.tmpdir(),'qbot-network-recovery-'));
    mock.request.mockResolvedValueOnce({ok:true,state:{}}).mockRejectedValueOnce(Error('timeout'));
    const command={type:'feed' as const,wish:'today',produce:'eaten-fruit'};
    await expect(networkAction(command)).rejects.toThrow('timeout');
    const file=path.join(mock.dir,'garden-network-pending.json'),pending=JSON.parse(await readFile(file,'utf8'));
    mock.request.mockResolvedValueOnce({ok:true,state:{produce:[]}}).mockResolvedValueOnce({ok:true,state:{produce:[],reconciled:true}});
    expect(await networkGarden()).toMatchObject({reconciled:true});
    expect(mock.request).toHaveBeenLastCalledWith({action:'act',command,actor:'pet-a',operation:pending.id});
    await expect(readFile(file)).rejects.toMatchObject({code:'ENOENT'});
  });
  it('does not replay another character or server transaction',async()=>{
    mock.dir=await mkdtemp(path.join(os.tmpdir(),'qbot-network-recovery-'));
    const file=path.join(mock.dir,'garden-network-pending.json');
    await writeFile(file,JSON.stringify({id:'pending',actor:'pet-b',realm:'test-realm',command:{type:'claim'}}));
    mock.request.mockResolvedValue({ok:true,state:{produce:[]}});await networkGarden();
    expect(mock.request).toHaveBeenCalledTimes(1);expect(JSON.parse(await readFile(file,'utf8')).id).toBe('pending');
  });
});
