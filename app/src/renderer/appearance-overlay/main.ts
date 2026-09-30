import {PetalField} from '../appearance-preview/petals';
const petals=new PetalField();document.body.append(petals.canvas);
const off=window.qbot.appearances.onFoot(p=>petals.emit(p.x,p.y,p.size));
document.addEventListener('visibilitychange',()=>{if(document.hidden)petals.clear();});
window.addEventListener('pagehide',()=>{off();petals.dispose();},{once:true});
