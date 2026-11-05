import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { catalog, originalPreset, resolvePoints } from './catalog.js';
import { industries } from './industries.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stage=$('.stage'),host=$('#scene'),labelsHost=$('#labels'),leaders=$('#leaders');
const blue='#5e83c6', subsetColor='#9484a5',namespace='http://www.w3.org/2000/svg';
const vec=p=>new THREE.Vector3(...p),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const selectedIndustries=new Set(['industry0']),chosenPoints=new Set(),suppressed=new Set();
const groups=new Map(),pointGroups=new Map(),annotations=new Map(),projectRows=new Map(),pointRows=new Map();
let mode='industries',filter='all',preferredSide='R',active='circumference',focused=false,showLabels=true,allLabels=false,hovered=null;
let data,renderer,camera,controls,scene,mesh,tween=null,dirty=true,frameId,drawn=new Set(),owners=new Map(),preset=false;
let pointQuery='',projectQuery='';

function selectedPlans(){return industries.filter(i=>selectedIndustries.has(i.id));}
function route(item){return mode==='points'?resolvePoints(item,chosenPoints):item.alternate&&preferredSide==='L'?item.alternate:item.points;}
function matches(item){return item.points.every(p=>chosenPoints.has(p)) || item.alternate?.every(p=>chosenPoints.has(p));}
function projectColor(id){
  if(mode==='points')return blue;
  const list=owners.get(id)||[];
  return list.length===selectedIndustries.size?blue:list.length===1?list[0].color:subsetColor;
}
function visibleProject(id){
  const list=owners.get(id)||[];
  if(!list.length)return false;
  if(filter==='common')return list.length===selectedIndustries.size;
  if(filter==='difference')return selectedIndustries.size>1 && list.length<selectedIndustries.size;
  return true;
}
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}

function buildUI(){
  for(const industry of industries){
    const label=element('label','industry-row'),input=element('input');input.type='checkbox';input.value=industry.id;input.setAttribute('aria-label',industry.name);
    const text=element('span','industry-text'),name=element('span','industry-name',industry.name),dot=element('i','color-dot');dot.style.setProperty('--color',industry.color);name.append(dot);
    text.append(name,element('small','industry-brands',industry.brands));label.append(input,text);$('#industry-list').append(label);
    input.addEventListener('change',()=>{input.checked?selectedIndustries.add(industry.id):selectedIndustries.delete(industry.id);focused=false;update();});
  }
  for(const groupName of ['头部','眼部','鼻部','口部与下颌','耳部','辅助定位']){
    const details=element('details','point-group');details.open=groupName==='头部';const summary=element('summary','',groupName);const count=element('small');summary.append(count);details.append(summary);
    const members=Object.entries(data.landmarks).filter(([,m])=>m.group===groupName);count.textContent=`${members.length} 点`;
    for(const [id,m] of members){
      const label=element('label','point-row');label.dataset.id=id;const input=element('input');input.type='checkbox';input.value=id;input.setAttribute('aria-label',m.name);
      label.append(input,element('span','',m.name),element('code','',m.code));details.append(label);pointRows.set(id,label);
      input.addEventListener('change',()=>togglePoint(id,input.checked));
      label.addEventListener('pointerenter',()=>{hovered=id;dirty=true;});label.addEventListener('pointerleave',()=>{hovered=null;dirty=true;});
    }
    $('#point-list').append(details);
  }
  for(const [id,item] of Object.entries(catalog)){
    const row=element('div','project-row'),main=element('div','project-main'),input=element('input','project-select');input.type='checkbox';input.setAttribute('aria-label',item.name);input.value=id;
    const button=element('button','',item.name);button.title='点击突出此项目，再次点击查看全部路径';
    const dot=element('i','color-dot'),number=element('span','project-number',String(item.number).padStart(2,'0')),meta=element('div','project-meta');
    main.append(input,button,dot,number);row.append(main,meta);$('#project-list').append(row);projectRows.set(id,{row,input,button,dot,meta});
    input.addEventListener('change',()=>selectProject(id,input.checked));
    button.addEventListener('click',()=>{if(!drawn.has(id))selectProject(id,true);else{focused=active===id?!focused:true;active=id;update();}});
    const option=element('option','',`${item.number}. ${item.name}`);option.value=id;$('#method-select').append(option);
  }
}

function togglePoint(id,checked=!chosenPoints.has(id)){
  if(mode!=='points')return;
  checked?chosenPoints.add(id):chosenPoints.delete(id);suppressed.clear();preset=false;focused=false;active=null;update();
}
function selectProject(id,checked){
  const item=catalog[id];
  if(mode==='points'){
    if(checked){for(const p of route(item))chosenPoints.add(p);suppressed.delete(id);}else suppressed.add(id);
  }else checked?suppressed.delete(id):suppressed.add(id);
  active=checked?id:null;focused=checked;update();
}

function update(){
  if(!data)return;
  owners=new Map();
  for(const industry of selectedPlans())for(const id of industry.projects){if(!owners.has(id))owners.set(id,[]);owners.get(id).push(industry);}
  drawn=new Set(Object.keys(catalog).filter(id=>(mode==='points'?matches(catalog[id]):visibleProject(id))&&!suppressed.has(id)));
  if(!drawn.has(active)){active=[...drawn].at(-1)||null;focused=false;}
  $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  $('#points-pane').hidden=mode!=='points';$('#industries-pane').hidden=mode!=='industries';$('#compare-filters').hidden=mode!=='industries';$('#project-search').hidden=mode!=='points';
  $('#projects-title').textContent=mode==='points'?(preset?'头戴设备方案':'对应测量项目'):'测量项目';
  for(const input of $$('#industry-list input'))input.checked=selectedIndustries.has(input.value);
  for(const [id,row] of pointRows){row.querySelector('input').checked=chosenPoints.has(id);const m=data.landmarks[id];row.hidden=!!pointQuery&&!`${m.name} ${m.code}`.toLowerCase().includes(pointQuery);}
  $$('.point-group').forEach(group=>{const rows=[...group.querySelectorAll('.point-row')];group.hidden=rows.every(r=>r.hidden);if(pointQuery && !group.hidden)group.open=true;});
  $('#point-summary').textContent=chosenPoints.size?`已选 ${chosenPoints.size} 点 · 显示 ${drawn.size} 项`:'点击头上的点或勾选点名；也可直接选择下方项目。';
  let count=0;
  for(const [id,{row,input,button,dot,meta}] of projectRows){
    const item=catalog[id],points=route(item),relevant=points.some(p=>chosenPoints.has(p));
    const show=mode==='industries'?visibleProject(id):(!chosenPoints.size || relevant || drawn.has(id) || projectQuery)&&(!preset||originalPreset.includes(id));
    row.hidden=!show || (mode==='points'&&!!projectQuery&&!`${item.name} ${item.alias||''}`.includes(projectQuery));
    if(!row.hidden)count++;
    input.checked=drawn.has(id);row.classList.toggle('is-active',active===id);button.setAttribute('aria-pressed',String(active===id&&focused));dot.style.setProperty('--color',projectColor(id));
    if(mode==='industries')meta.textContent=selectedIndustries.size>1?(owners.get(id)?.length===selectedIndustries.size?'共同 · ':'')+(owners.get(id)||[]).map(i=>i.name).join('、'):'';
    else {
      const missing=points.filter(p=>!chosenPoints.has(p));
      meta.textContent=preset?(id==='circumference'?'必测':'建议测量'):missing.length?`还需：${missing.map(p=>data.landmarks[p].name).join('、')}`:`${suppressed.has(id)?'已隐藏':'已连接'} · ${item.kind}`;
      meta.classList.toggle('ready',!missing.length);
    }
  }
  $('#project-count').textContent=`${drawn.size} 项显示`;
  $('#empty-message').hidden=count>0;
  $('#empty-message').textContent=mode==='points'?'没有对应项目，可增加测量点或清空搜索。':!selectedIndustries.size?'勾选行业，查看测量项目。':filter==='difference'&&selectedIndustries.size<2?'选择两个或更多行业，查看差异项目。':'当前所选行业没有这类项目。';
  const relevant=new Set([...drawn].flatMap(id=>route(catalog[id])));
  if(mode==='points')for(const p of chosenPoints)relevant.add(p);
  for(const [id,variants] of groups){
    const item=catalog[id],useAlt=item.alternate&&route(item)===item.alternate;
    variants.forEach((g,i)=>{g.visible=drawn.has(id)&&Boolean(i)===Boolean(useAlt);g.traverse(child=>{if(child.material){child.material.color.set(projectColor(id));child.material.opacity=(focused&&id!==active ? .23 : .95)*(child.userData.fine ? .45 : 1);}});});
  }
  for(const [id,g] of pointGroups){
    const standard=data.landmarks[id].type==='standard',visible=relevant.has(id)||(mode==='points'&&standard);
    g.visible=visible;
    g.children[1].material.color.set(relevant.has(id)?blue:'#abb8ca');g.scale.setScalar(chosenPoints.has(id)?1.25:relevant.has(id)?1:.7);
    const a=annotations.get(id);a.visible=visible;a.relevant=relevant.has(id);a.emphasized=active&&route(catalog[active]).includes(id);a.target.setAttribute('aria-pressed',String(chosenPoints.has(id)));a.target.disabled=mode!=='points';
  }
  $('#detail-name').textContent=active?catalog[active].name:'选择测量项目';
  $('#detail-type').textContent=active?`${catalog[active].tool} / ${catalog[active].kind}${focused?' · 已突出，点击项目恢复全部':''}`:'';
  $('#detail-route').textContent=active?route(catalog[active]).map(p=>data.landmarks[p].name).join(' → ')+(catalog[active].closed?' → 起点':''):'选中项目后显示对应测量点和路径。';
  $('#detail-owners').textContent=active&&mode==='industries'?(owners.get(active)||[]).map(i=>i.name).join(' · '):active?catalog[active].short:'';
  $('#scene-summary').textContent=mode==='points'?`29 类测量点 · ${drawn.size} 项路径`:`${selectedIndustries.size} 个行业 · ${drawn.size} 项路径`;
  $('#gesture-hint').textContent=mode==='points'?'点击测量点 · 拖动旋转 · 滚轮缩放':'拖动旋转 · 滚轮缩放';
  $('#scene-legend').replaceChildren();
  if(mode==='industries' && selectedIndustries.size>1){
    const legends=[['共同项目',blue],...selectedPlans().map(i=>[i.name,i.color])];
    if([...owners.values()].some(v=>v.length>1&&v.length<selectedIndustries.size))legends.push(['部分行业共有',subsetColor]);
    for(const [label,color] of legends){const el=element('span','legend-item'),i=element('i');i.style.setProperty('--color',color);el.append(i,document.createTextNode(label));$('#scene-legend').append(el);}
  }
  $('#clear').disabled=mode==='points'?!chosenPoints.size:!selectedIndustries.size;
  $('#sr-status').textContent=`${mode==='points'?'测量点模式':'行业对比模式'}，显示 ${drawn.size} 项${active?'，当前'+catalog[active].name:''}`;
  dirty=true;
}

$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;suppressed.clear();focused=false;active=null;update();}));
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));focused=false;update();}));
$$('[data-side]').forEach(b=>b.addEventListener('click',()=>{preferredSide=b.dataset.side;$$('[data-side]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));update();}));
$('#clear').addEventListener('click',()=>{if(mode==='points'){chosenPoints.clear();preset=false;}else selectedIndustries.clear();suppressed.clear();active=null;focused=false;update();});
$('#preset').addEventListener('click',()=>{chosenPoints.clear();originalPreset.forEach(id=>catalog[id].points.forEach(p=>chosenPoints.add(p)));suppressed.clear();Object.keys(catalog).filter(id=>!originalPreset.includes(id)).forEach(id=>suppressed.add(id));preset=true;active='circumference';focused=false;projectQuery='';$('#project-search').value='';update();});
$('#point-search').addEventListener('input',e=>{pointQuery=e.target.value.trim().toLowerCase();update();});
$('#project-search').addEventListener('input',e=>{projectQuery=e.target.value.trim();update();});
$('#label-toggle').addEventListener('click',()=>{showLabels=!showLabels;$('#label-toggle').setAttribute('aria-pressed',String(showLabels));dirty=true;});
$('#all-labels').addEventListener('click',()=>{allLabels=!allLabels;showLabels=true;$('#all-labels').setAttribute('aria-pressed',String(allLabels));$('#label-toggle').setAttribute('aria-pressed','true');dirty=true;});
function showMethod(id){
  const item=catalog[id];$('#method-select').value=id;$('#method-name').textContent=item.name;$('#method-tool').textContent=`${item.tool} · ${item.kind}`;$('#method-definition').textContent=item.definition;$('#method-note').textContent=item.note;$('#method-source').textContent=item.source;
  if(item.sourceUrl){const a=element('a','',' 查看原文');a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';$('#method-source').append(a);}
  $('#method-points').replaceChildren(...route(item).map(p=>element('span','',data.landmarks[p].name)));
}
function openInfo(){if(!data)return;showMethod(active||'circumference');$('#info-dialog').showModal();}
$('#info-open').addEventListener('click',openInfo);$('#detail-name').addEventListener('click',openInfo);$('#info-close').addEventListener('click',()=>$('#info-dialog').close());$('#method-select').addEventListener('change',e=>showMethod(e.target.value));
$('#info-dialog').addEventListener('click',e=>{if(e.target===$('#info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#retry').addEventListener('click',()=>location.reload());

function stroke(points,radius=.44,fine=false,closed=false){
  const curve=points.length===2?new THREE.LineCurve3(vec(points[0]),vec(points[1])):new THREE.CatmullRomCurve3(points.map(vec),closed,'centripetal');
  const geometry=new THREE.TubeGeometry(curve,points.length===2?1:Math.max(32,points.length*2),radius,6,closed);
  const line=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:blue,transparent:true,depthWrite:false}));line.userData.fine=fine;line.renderOrder=2;return line;
}
function dimension(item,ids){
  const group=new THREE.Group(),a=vec(data.landmarks[ids[0]].position),b=vec(data.landmarks[ids.at(-1)].position),offset=vec(item.offset||[0,20,25]);
  if(ids===item.alternate)offset.x*=-1;
  let A=a.clone().add(offset),B=b.clone().add(offset);
  if(item.axis==='y'){A.x=B.x=Math.min(a.x,b.x)+offset.x;A.z=B.z=Math.max(a.z,b.z)+offset.z;}
  if(item.axis==='z'){A.x=B.x=(a.x+b.x)/2+offset.x;A.y=B.y=Math.max(a.y,b.y)+offset.y;}
  const dir=B.clone().sub(A).normalize();let perp=new THREE.Vector3(0,1,0).addScaledVector(dir,-dir.y);
  if(perp.length()<.01)perp.set(1,0,0);else perp.normalize();
  group.add(stroke([A.toArray(),B.toArray()],.39));
  for(const [point,end,direction] of [[a,A,dir],[b,B,dir.clone().negate()]]){
    const ext=end.clone().sub(point).normalize().multiplyScalar(3);group.add(stroke([point.toArray(),end.clone().add(ext).toArray()],.18,true));
    for(const sign of [-1,1])group.add(stroke([end.toArray(),end.clone().addScaledVector(direction,3.6).addScaledVector(perp,sign*1.4).toArray()],.26));
  }
  return group;
}
function createMeasurements(){
  for(const [id,item] of Object.entries(catalog)){
    const variants=[];
    for(const points of [item.points,...(item.alternate?[item.alternate]:[])]){
      let group;
      if(item.path){group=new THREE.Group();let p=data.paths[item.path];if(item.closed)p=p.slice(0,-1);group.add(stroke(p,.5,false,!!item.closed));}
      else group=dimension(item,points);
      variants.push(group);scene.add(group);
    }
    groups.set(id,variants);
  }
}

function createAnnotations(){
  const sphere=new THREE.SphereGeometry(1.03,12,8),rim=new THREE.SphereGeometry(1.5,12,8);
  for(const [id,m] of Object.entries(data.landmarks)){
    const p=vec(m.position),normal=vec(m.normal).normalize();
    const g=new THREE.Group();g.add(new THREE.Mesh(rim,new THREE.MeshBasicMaterial({color:'#f8f8f8'})),new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:blue})));
    g.position.copy(p).addScaledVector(normal,1);g.children[1].position.copy(normal).multiplyScalar(.65);scene.add(g);pointGroups.set(id,g);
    const label=element('button','landmark-label');label.append(element('span','',m.name),element('span','point-code',m.code));label.title=m.note||`${m.name} · ${m.registration}`;
    const back=element('span','back-label','背面');label.append(back);label.addEventListener('click',()=>togglePoint(id));labelsHost.append(label);
    const target=element('button','point-target');target.setAttribute('aria-label',`模型点：${m.name}`);target.title=m.name;target.tabIndex=-1;target.addEventListener('click',()=>{const direction=camera.position.clone().sub(controls.target).normalize();occlusionRay.set(p.clone().addScaledVector(direction,650),direction.negate());const hit=occlusionRay.intersectObject(mesh,false)[0];if(!hit||hit.distance>646.5)togglePoint(id);});target.addEventListener('pointerenter',()=>{hovered=id;dirty=true;});target.addEventListener('pointerleave',()=>{hovered=null;dirty=true;});$('#point-targets').append(target);
    const leader=document.createElementNS(namespace,'path');leader.setAttribute('fill','none');leader.setAttribute('stroke-width','.8');
    leaders.append(leader);annotations.set(id,{element:label,leader,target,back,point:p,normal,visible:false,relevant:false,emphasized:false});
  }
}
const occlusionRay=new THREE.Raycaster();
function layoutAnnotations(){
  const width=stage.clientWidth,height=stage.clientHeight;leaders.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const center=new THREE.Vector3(0,228,0).project(camera),cx=(center.x+1)*width/2,compact=width<550,sideSpace=compact?17:25;
  const camDir=camera.position.clone().sub(controls.target).normalize(),sides=[[],[]];
  for(const [id,a] of annotations){
    const screen=a.point.clone().project(camera),x=(screen.x+1)*width/2,y=(1-screen.y)*height/2;
    const inFrame=a.visible&&screen.z>-1&&screen.z<1&&x>6&&x<width-6&&y>52&&y<height-105;
    const occluded=a.normal.dot(camDir)<-.07;
    a.target.hidden=!inFrame||occluded||mode!=='points';a.target.style.left=`${x}px`;a.target.style.top=`${y}px`;
    const wanted=showLabels&&(allLabels||a.relevant||hovered===id);
    const show=inFrame&&wanted;
    a.element.classList.toggle('hidden',!show);a.leader.style.display=show?'':'none';a.element.tabIndex=show&&mode==='points'?0:-1;
    if(!show)continue;
    a.element.classList.toggle('occluded',occluded);a.element.classList.toggle('inactive',!a.emphasized&&focused&&hovered!==id);a.back.style.display=occluded?'':'none';
    const isLeft=x<cx-5||(Math.abs(x-cx)<5&&['v','g','n','se'].includes(id)),w=a.element.offsetWidth;
    const half=Math.min(width*.29,82*height/(compact?440:365))*camera.zoom;
    const labelX=isLeft?Math.max(10,Math.min(x-sideSpace-w,cx-half-sideSpace-w)):Math.min(width-w-10,Math.max(x+sideSpace,cx+half+sideSpace));
    sides[isLeft?0:1].push({id,a,x,y,w,isLeft,labelX,labelY:Math.max(62,Math.min(height-150,y-10)),occluded});
  }
  for(const side of sides){
    side.sort((a,b)=>a.labelY-b.labelY);
    const minGap=allLabels?3:8;
    for(let i=1;i<side.length;i++)side[i].labelY=Math.max(side[i].labelY,side[i-1].labelY+side[i-1].a.element.offsetHeight+minGap);
    const overflow=side.length?Math.max(0,side.at(-1).labelY-(height-145)):0;
    if(overflow)for(const o of side)o.labelY-=overflow;
    // When all 45 point names cannot fit, show the front-facing names first.
    let lastBottom=52;
    for(const o of side){
      const {id,a,x,y,w,isLeft,labelX,occluded}=o;const labelY=Math.max(55,o.labelY);
      if(labelY<lastBottom || (allLabels&&occluded&&!a.relevant)){a.element.classList.add('hidden');a.leader.style.display='none';continue;}
      lastBottom=labelY+a.element.offsetHeight+minGap;
      a.element.style.transform=`translate(${Math.round(labelX)}px,${Math.round(labelY)}px)`;
      const ex=isLeft?labelX+w+5:labelX-5,ey=labelY+a.element.offsetHeight/2,bend=isLeft?ex+10:ex-10;
      a.leader.setAttribute('d',`M${x.toFixed(1)} ${y.toFixed(1)} L${bend.toFixed(1)} ${ey.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`);
      a.leader.setAttribute('stroke',occluded?'#b2becd':'#a0b4d1');a.leader.setAttribute('stroke-dasharray',occluded?'2 3':'');a.leader.setAttribute('opacity',a.emphasized||hovered===id?'.9':'.55');
    }
  }
}

function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight,vertical=w<550?438:365;camera.left=-vertical*w/h/2;camera.right=vertical*w/h/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();renderer.setSize(w,h);dirty=true;}
function setView(name){if(!camera)return;const target=new THREE.Vector3(0,227,-2),offsets={front:[0,28,720],side:[-720,28,0],back:[0,28,-720],top:[0,720,10],reset:[-250,55,720]};const end=target.clone().add(vec(offsets[name]));tween={start:performance.now(),duration:reducedMotion?0:650,from:camera.position.clone(),to:end,fromTarget:controls.target.clone(),toTarget:target,fromZoom:camera.zoom};$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));dirty=true;}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
function animate(time){frameId=requestAnimationFrame(animate);if(tween){const t=tween.duration?Math.min(1,(time-tween.start)/tween.duration):1,eased=1-Math.pow(1-t,3);camera.position.lerpVectors(tween.from,tween.to,eased);controls.target.lerpVectors(tween.fromTarget,tween.toTarget,eased);camera.zoom=THREE.MathUtils.lerp(tween.fromZoom,1,eased);camera.updateProjectionMatrix();if(t===1)tween=null;dirty=true;}if(controls.update())dirty=true;if(dirty){renderer.render(scene,camera);layoutAnnotations();dirty=false;}}
host.addEventListener('keydown',e=>{if(!camera||e.altKey||e.ctrlKey||e.metaKey)return;const k=e.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(k))return;e.preventDefault();tween=null;if(k==='Home'){setView('reset');return;}if(['+','=','-'].includes(k)){camera.zoom=THREE.MathUtils.clamp(camera.zoom*(k==='-'?.9:1.1),.65,2.2);camera.updateProjectionMatrix();}else{const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(k==='ArrowLeft')s.theta-=.12;if(k==='ArrowRight')s.theta+=.12;if(k==='ArrowUp')s.phi-=.12;if(k==='ArrowDown')s.phi+=.12;s.phi=THREE.MathUtils.clamp(s.phi,.025,Math.PI-.15);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));}dirty=true;});

async function init(){
  try{
    const [meta,parts]=await Promise.all([fetch('./assets/measurements.json'),Promise.all(Array.from({length:13},(_,i)=>fetch(`./assets/head/${i}.bin`)))]);
    if(!meta.ok||parts.some(r=>!r.ok))throw new Error('头模文件无法读取');data=await meta.json();
    const blocks=await Promise.all(parts.map(r=>r.arrayBuffer())),combined=new Uint8Array(blocks.reduce((n,b)=>n+b.byteLength,0));let cursor=0;for(const b of blocks){combined.set(new Uint8Array(b),cursor);cursor+=b.byteLength;}
    const bytes=combined.buffer,header=new DataView(bytes);if(header.getUint32(0,true)!==0x44414548)throw new Error('头模格式不正确');const nv=header.getUint32(4,true),nf=header.getUint32(8,true);if(bytes.byteLength!==12+nv*12+nf*12)throw new Error('头模数据不完整');
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-200,200,182.5,-182.5,1,2400);camera.position.set(-250,282,718);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.localClippingEnabled=true;host.append(renderer.domElement);
    controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,227,-2);controls.enableDamping=!reducedMotion;controls.dampingFactor=.1;controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2.2;controls.rotateSpeed=.65;controls.zoomSpeed=.7;controls.minPolarAngle=.025;controls.maxPolarAngle=Math.PI-.15;
    controls.addEventListener('change',()=>{dirty=true;});controls.addEventListener('start',()=>{tween=null;$$('[data-view]').forEach(b=>b.classList.remove('active'));});controls.update();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(bytes,12,nv*3),3));geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(bytes,12+nv*12,nf*3),1));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({color:'#f0efed',roughness:.86,metalness:0,clippingPlanes:[new THREE.Plane(new THREE.Vector3(0,1,0),-94)],side:THREE.DoubleSide});mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
    if(data.neckCap){const positions=[],center=[0,94,0];for(let i=0;i<data.neckCap.length-1;i++)positions.push(...center,...data.neckCap[i],...data.neckCap[i+1]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();const m=material.clone();m.clippingPlanes=[];scene.add(new THREE.Mesh(g,m));}
    scene.add(new THREE.HemisphereLight(0xffffff,0xc3c6ce,1.6));const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(-220,530,400);scene.add(key);const fill=new THREE.DirectionalLight(0xe6edff,.8);fill.position.set(300,180,220);scene.add(fill);const rim=new THREE.DirectionalLight(0xffffff,1.7);rim.position.set(-100,430,-350);scene.add(rim);
    buildUI();createMeasurements();createAnnotations();update();resize();new ResizeObserver(resize).observe(stage);$('#loading').classList.add('done');$('#loading').setAttribute('aria-hidden','true');requestAnimationFrame(animate);
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(frameId);controls.dispose();renderer.dispose();},{once:true});renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').classList.remove('done');$('#loading').classList.add('failed');$('#loading-text').textContent='三维显示已中断，请重新载入';$('#retry').hidden=false;});
  }catch(error){console.error(error);$('#loading').classList.add('failed');$('#loading-text').textContent='头模未能载入，请重试';$('#retry').hidden=false;}
}
init();
