const test=require('node:test'),assert=require('node:assert/strict');
const {checkChain,releaseStatus}=require('./spine-anatomy-check.cjs');
const expected=[{x:0,y:0},{x:0,y:10},{x:4,y:18}];
test('finite matrices cannot excuse a reversed elbow or knee',()=>{
 const actual=[{x:0,y:0},{x:0,y:10},{x:-4,y:18}];
 assert(checkChain(expected,actual).issues.includes('reversed_bend'));
});
test('near straight sign changes do not trigger reversed bend',()=>{
 const a=[{x:0,y:0},{x:0,y:10},{x:.1,y:20}],b=[{x:0,y:0},{x:0,y:10},{x:-.1,y:20}];
 assert.equal(checkChain(a,b).status,'pass');
});
test('joint displacement and collapsed segment fail',()=>{
 assert(checkChain(expected,expected.map(p=>({...p,x:p.x+20}))).issues.includes('joint_alignment'));
 assert.equal(checkChain(expected,[{x:0,y:0},{x:0,y:0},{x:0,y:10}]).status,'fail');
});
test('matching skeleton transforms alone cannot release a character',()=>{
 const geometry=[checkChain(expected,expected)];
 assert.equal(releaseStatus({geometry,samples:56}),'needs_review');
 assert.equal(releaseStatus({geometry,samples:56,visual:{status:'pass',evidence:[]}}),'needs_review');
 assert.equal(releaseStatus({geometry,samples:56,visual:{status:'fail',evidence:['elbow.png']}}),'fail');
 assert.equal(releaseStatus({geometry,samples:8,visual:{status:'pass',evidence:['poses.png']}}),'needs_review');
});
test('an anatomically folded reference cannot validate its own folded render',()=>{
 const folded=[{x:0,y:0},{x:0,y:10},{x:.1,y:3}];
 assert(checkChain(folded,folded).issues.includes('extreme_joint_fold'));
});
