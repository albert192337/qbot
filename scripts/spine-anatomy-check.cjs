// Geometry gates shared by offline fixtures and rendered landmark reports.
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function chain(points){
 if(!Array.isArray(points)||points.length!==3||!points.every(finite))throw Error('Three finite joint landmarks required');
 const [a,b,c]=points,u={x:b.x-a.x,y:b.y-a.y},v={x:c.x-b.x,y:c.y-b.y};
 const lengths=[Math.hypot(u.x,u.y),Math.hypot(v.x,v.y)];
 if(Math.min(...lengths)<1e-4)throw Error('Degenerate joint segment');
 return {angle:Math.atan2(u.x*v.y-u.y*v.x,u.x*v.x+u.y*v.y)*180/Math.PI,lengths};
}
function checkChain(expected,actual,options={}){
 const limits={straightDegrees:8,maxAngleError:25,maxLengthRatio:1.4,minLengthRatio:.7,maxJointResidual:.2,maxFoldDegrees:155,...options};
 try{
  const e=chain(expected),a=chain(actual),issues=[];
  if(Math.abs(a.angle)>limits.maxFoldDegrees)issues.push('extreme_joint_fold');
  if(Math.abs(e.angle)>limits.straightDegrees&&Math.abs(a.angle)>limits.straightDegrees&&Math.sign(e.angle)!==Math.sign(a.angle))issues.push('reversed_bend');
  const angleError=Math.abs(((a.angle-e.angle+540)%360)-180);
  if(angleError>limits.maxAngleError)issues.push('joint_angle_mismatch');
  const ratios=a.lengths.map((n,i)=>n/e.lengths[i]);
  if(ratios.some(n=>n<limits.minLengthRatio||n>limits.maxLengthRatio))issues.push('segment_stretch');
  const normalizedResidual=Math.max(...actual.map((p,i)=>Math.hypot(p.x-expected[i].x,p.y-expected[i].y)))/e.lengths.reduce((a,b)=>a+b,0);
  if(normalizedResidual>limits.maxJointResidual)issues.push('joint_alignment');
  return {status:issues.length?'fail':'pass',issues,expectedAngle:e.angle,actualAngle:a.angle,angleError,lengthRatios:ratios,normalizedResidual};
 }catch(e){return {status:'fail',issues:['invalid_landmarks'],error:e.message};}
}
function releaseStatus({geometry=[],visual,requiredSamples=56,samples=0}){
 if(geometry.some(g=>g.status==='fail')||visual?.status==='fail')return 'fail';
 if(geometry.length===0||geometry.some(g=>g.status!=='pass')||samples<requiredSamples||!visual||visual.status!=='pass'||!visual.evidence?.length)return 'needs_review';
 return 'candidate_pass'; // Never substitutes for user aesthetic acceptance.
}
module.exports={chain,checkChain,releaseStatus};
if(require.main===module){
 const fs=require('fs'),input=process.argv[2];if(!input)throw Error('Usage: node spine-anatomy-check.cjs landmarks.json');
 const data=JSON.parse(fs.readFileSync(input,'utf8'));
 const geometry=data.checks.map(c=>({id:c.id,...checkChain(c.expected,c.actual,c.limits)}));
 console.log(JSON.stringify({geometry,status:releaseStatus({...data,geometry})},null,2));
}
