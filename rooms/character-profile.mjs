/** Read only public character identity from an already content-verified asset pack. */
export function characterProfile(buffer) {
  const empty={name:'伙伴',persona:''};
  try {
    const length=buffer.readUInt32BE(0);
    if(length>1024*1024||length+4>buffer.length)return empty;
    const header=JSON.parse(buffer.subarray(4,4+length));let offset=4+length;
    for(const entry of header.files??[]){
      if(!Number.isSafeInteger(entry.size)||entry.size<0||offset+entry.size>buffer.length)return empty;
      if(entry.path==='manifest.json'){
        if(entry.size>1024*1024)return empty;
        const m=JSON.parse(buffer.subarray(offset,offset+entry.size));
        return {name:typeof m.name==='string'&&m.name.trim()?m.name.slice(0,80):'伙伴',persona:typeof m.persona==='string'?m.persona.slice(0,4000):''};
      }
      offset+=entry.size;
    }
  }catch{}
  return empty;
}
