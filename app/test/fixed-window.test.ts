import {afterEach,describe,it,expect,vi} from 'vitest';
import {moveFixedSize} from '../src/main/fixed-window';
afterEach(()=>vi.unstubAllGlobals());
function windowMock(){return {isDestroyed:()=>false,isResizable:()=>false,setResizable:vi.fn(),setBounds:vi.fn(),setPosition:vi.fn(),getBounds:vi.fn(()=>{throw Error('must not reuse rounded size')})};}
describe('fixed window movement',()=>{
 it('always sends authoritative dimensions on Windows, without resize toggles',()=>{
  vi.stubGlobal('process',{...process,platform:'win32'});const win=windowMock();
  for(let i=0;i<100;i++) moveFixedSize(win as any,i+.2,20.8,{width:360,height:360});
  expect(win.setBounds).toHaveBeenLastCalledWith({x:99,y:21,width:360,height:360});
  expect(win.setPosition).not.toHaveBeenCalled();expect(win.setResizable).not.toHaveBeenCalled();expect(win.getBounds).not.toHaveBeenCalled();
 });
 it('keeps position-only movement on macOS',()=>{
  vi.stubGlobal('process',{...process,platform:'darwin'});const win=windowMock();
  moveFixedSize(win as any,2,3,{width:360,height:360});expect(win.setPosition).toHaveBeenCalledWith(2,3);expect(win.setBounds).not.toHaveBeenCalled();
 });
 it('restores resizable state even if an explicit resize fails',()=>{
  const win=windowMock();win.setBounds.mockImplementation(()=>{throw Error('native error')});
  expect(()=>moveFixedSize(win as any,2,3,{width:720,height:360},true)).toThrow('native error');
  expect(win.setResizable.mock.calls).toEqual([[true],[false]]);
 });
 it('ignores destroyed windows and invalid pointer coordinates',()=>{
  const win=windowMock();moveFixedSize(win as any,NaN,0,{width:360,height:360});moveFixedSize(null,0,0,{width:360,height:360});
  expect(win.setBounds).not.toHaveBeenCalled();expect(win.setPosition).not.toHaveBeenCalled();
 });
});
