import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { catalog, factoryCrosswalk, originalPreset, resolvePoints } from './catalog.js?v=20261110-wig';
import { setupPosition } from './position.js?v=20261110-wig';
import { setupPressure } from './pressure.js?v=pressure-1';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stage=$('.stage'),host=$('#scene'),labelsHost=$('#labels'),leaders=$('#leaders');
const blue='#5e83c6',namespace='http://www.w3.org/2000/svg';
const topDimensionIds=new Set(['length','breadth','noseOcciput','tragionOcciput','tragionBreadth']);
const faceWidthDimensions=new Set(['faceBreadth','jawBreadth','noseBreadth','pupilDistance']);
const faceHeightDimensions=new Set(['faceLength','noseHeight']);
const earHeightDimensions=new Set(['earLength','atoE','atoG']);
const earWidthDimensions=new Set(['earBreadth','atoH']);
const earDimensions=new Set([...earHeightDimensions,...earWidthDimensions]);
const caseColors={jobskin11:'#9b6f59',atoB:'#a76252',atoC:'#3d8779',atoD:'#936c9f',
  atoE:'#8b638b',atoF:'#577d83',atoG:'#956c59',atoH:'#4e8575',eegSagittal:'#a76252',
  eegCoronal:'#3d8779',starAP:'#a76252',starML:'#3d8779',
  wigFrontNape:'#a76252',wigOverTop:'#3d8779',wigForehead:'#95668c',wigBack:'#84724d',wigNapeWidth:'#5a7e88',
  earLength:'#8f6877',earBreadth:'#557d83',length:'#a76252',breadth:'#3d8779',
  sagittal:'#a76252',coronal:'#3d8779',chinArc:'#936c9f'};
const folderProjectViews={length:'side',breadth:'front',pupilDistance:'front',earLength:'side',earBreadth:'side',
  sagittal:'side',coronal:'front',chinArc:'oblique',cervicalArc:'side',frontal:'front'};
const dimensionRow=23;
const dimensionLayer=$('#dimensions');
const vec=p=>new THREE.Vector3(...p),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const chosenPoints=new Set(),suppressed=new Set();
const groups=new Map(),pointGroups=new Map(),annotations=new Map(),projectRows=new Map(),pointRows=new Map();
let mode=location.hash==='#pressure'?'pressure':'industries',currentCase,industryBasis='folder',industrySide='R',active=null,focused=false,showLabels=true,allLabels=false,hovered=null;
let data,renderer,camera,controls,scene,mesh,pressure,tween=null,dirty=true,frameId,drawn=new Set(),preset=false;
let pointQuery='';

function route(item){
  if(mode==='points')return resolvePoints(item,chosenPoints);
  return industrySide==='L'&&item.alternate?item.alternate:item.points;
}
function matches(item){return item.points.every(p=>chosenPoints.has(p)) || item.alternate?.every(p=>chosenPoints.has(p));}
function projectColor(id){return mode==='industries'?(caseColors[id]||blue):blue;}
function industryProjects(){
  if(!currentCase)return [];
  return industryBasis==='folder'?currentCase.folderProjects:currentCase.projects;
}
function visibleProject(id){return industryProjects().includes(id);}
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function pointName(id){
  const point=data.landmarks[id];
  return point.type==='standard'?`${point.name} ${point.code}`:point.name;
}
function standardReference(item){
  if(!item.caseOnly)return `图 A.2 第 ${item.number} 项 · ${item.name}`;
  const reference=factoryCrosswalk[item.id];
  const standard=reference?.standard&&catalog[reference.standard];
  const caption=standard?`参照图 A.2 第 ${standard.number} 项 · ${standard.name}`:'图 A.2 无直接对应';
  return reference?.difference?`${caption}。 ${reference.difference}`:caption;
}
function folderSupplement(scene,folder){
  const supplement=new Map();
  const listed=new Set(folder.projects);
  for(const factoryId of scene.projects){
    const reference=factoryCrosswalk[factoryId];
    const standard=reference?.standard;
    if(!standard||listed.has(standard)||supplement.has(standard))continue;
    const item=catalog[factoryId];
    const originalName=item.number===null?item.name:`${item.number} ${item.name}`;
    supplement.set(standard,`原厂补充 · ${originalName}。 ${reference.difference||''}`.trim());
  }
  return supplement;
}
function focusMeasurement(item){
  const view=industryBasis==='folder'?folderProjectViews[item.id]:item.view;
  if(view)setView(view);
}

function buildUI(){
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
    const dot=element('i','color-dot'),number=element('span','project-number',item.caseOnly?item.number??'':String(item.number).padStart(2,'0')),meta=element('div','project-meta');
    main.append(input,button,dot,number);row.append(main,meta);$('#project-list').append(row);
    input.addEventListener('change',()=>selectProject(id,input.checked));
    button.addEventListener('click',()=>{
      if(mode==='industries'&&!drawn.has(id)){selectProject(id,true);return;}
      focused=active!==id||!focused;
      active=id;
      update();
      if(mode==='industries'&&focused)focusMeasurement(item);
    });
    const caption=item.number===null?item.name:`${item.number}. ${item.name}`;
    const option=element('option','',caption);option.value=id;$('#method-select').append(option);
    projectRows.set(id,{row,input,button,dot,meta,option});
  }
}

function togglePoint(id,checked=!chosenPoints.has(id)){
  if(mode!=='points')return;
  checked?chosenPoints.add(id):chosenPoints.delete(id);
  preset=false;
  focused=false;
  active=null;
  update();
}
function selectProject(id,checked){
  if(mode!=='industries')return;
  checked?suppressed.delete(id):suppressed.add(id);
  active=checked?id:null;
  focused=checked;
  update();
  if(checked)focusMeasurement(catalog[id]);
}

function updateChosenPoints(){
  const container=$('#chosen-points');
  for(const button of container.children){
    button.hidden=!chosenPoints.has(button.dataset.id);
  }
  $('#point-count').textContent=`${chosenPoints.size} 个`;
  $('#point-summary').hidden=chosenPoints.size>0;
}

function update(){
  if(!data)return;
  const showingPressure=mode==='pressure';
  $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  stage.classList.toggle('point-mode',mode==='points');
  stage.classList.toggle('pressure-mode',showingPressure);
  $('#pressure-pane').hidden=!showingPressure;
  $('.projects-section').hidden=showingPressure;
  $('.panel-bottom').hidden=showingPressure;
  $('.label-options').hidden=showingPressure;
  $('#points-pane').hidden=mode!=='points';
  $('#industries-pane').hidden=mode!=='industries';
  $('#case-tools').hidden=mode!=='industries';
  $('#score-method').hidden=mode!=='industries';
  pressure?.setActive(showingPressure);
  if(showingPressure){
    drawn.clear();
    for(const variants of groups.values())for(const group of variants)group.visible=false;
    for(const group of pointGroups.values())group.visible=false;
    $('.detail').hidden=true;
    tooltip.hidden=true;
    host.classList.remove('point-hover');
    $('#scene-summary').textContent='压力不适阈值';
    $('#gesture-hint').textContent='拖动旋转 · 滚轮缩放';
    $('#sr-status').textContent='压力敏感度模式';
    dirty=true;
    return;
  }
  drawn=new Set(Object.keys(catalog).filter(id=>{
    if(mode==='points')return !catalog[id].caseOnly&&matches(catalog[id])&&(!preset||originalPreset.includes(id));
    return visibleProject(id)&&!suppressed.has(id);
  }));
  if(!drawn.has(active)){active=[...drawn].at(-1)||null;focused=false;}
  $('#industry-basis').hidden=mode!=='industries';
  const basisNote=$('#measurement-basis-note');
  basisNote.hidden=mode!=='industries';
  basisNote.textContent=industryBasis==='folder'
    ?currentCase?.folderNote||'按行业对照表及原厂路线选项。编号见图 A.2，点位代号见图 A.1。'
    :'原厂路线与标准项目分别标明。';
  $('#industry-note').hidden=industryBasis==='folder'||!currentCase?.note;
  $$('[data-basis]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.basis===industryBasis)));
  $('#industry-ear-side').hidden=mode!=='industries'||!industryProjects().some(id=>catalog[id].alternate);
  $$('[data-industry-side]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.industrySide===industrySide)));
  $('#projects-title').textContent=mode==='points'&&preset?'头戴设备方案':'测量项目';
  for(const [id,row] of pointRows){row.querySelector('input').checked=chosenPoints.has(id);const m=data.landmarks[id];row.hidden=!!pointQuery&&!`${m.name} ${m.code}`.toLowerCase().includes(pointQuery);}
  $$('.point-group').forEach(group=>{const rows=[...group.querySelectorAll('.point-row')];group.hidden=rows.every(r=>r.hidden);if(pointQuery && !group.hidden)group.open=true;});
  updateChosenPoints();
  let count=0;
  for(const [id,{row,input,button,dot,meta,option}] of projectRows){
    const item=catalog[id];
    row.hidden=mode==='points'?!drawn.has(id):!visibleProject(id);
    option.hidden=option.disabled=mode==='points'?Boolean(item.caseOnly):!visibleProject(id);
    if(!row.hidden)count++;
    input.hidden=mode==='points';
    input.checked=drawn.has(id);
    row.classList.toggle('is-active',active===id&&(mode==='industries'||focused));
    button.setAttribute('aria-pressed',String(active===id&&focused));
    button.title=mode==='points'?'查看项目详情':'点击突出此项目，再次点击查看全部路径';
    dot.style.setProperty('--color',projectColor(id));
    if(mode==='industries'){
      const points=element('div','project-points',`点位 · ${route(item).map(pointName).join(' → ')}`);
      meta.replaceChildren(points);
      if(industryBasis==='factory')meta.append(element('div','project-reference',standardReference(item)));
      if(industryBasis==='folder'&&currentCase.supplement.has(id)){
        meta.append(element('div','project-reference project-supplement',currentCase.supplement.get(id)));
      }
      if(industryBasis==='folder'&&id==='circumference'){
        meta.append(element('div','project-reference','围线按项目约定采用 WS/T 424—2013。'));
      }
    }else{
      meta.textContent=preset?(id==='circumference'?'必测':'建议测量'):item.kind;
    }
    meta.hidden=!meta.textContent;
  }
  $('#project-count').textContent=mode==='industries'?`${count} 项`:`已选 ${drawn.size} 项`;
  $('#empty-message').hidden=count>0;
  $('#empty-message').textContent=mode==='points'?'选齐所需点位后，测量项目自动出现。':'点图上的案例，查看测量项目。';
  const relevant=new Set([...drawn].flatMap(id=>route(catalog[id])));
  if(mode==='points')for(const p of chosenPoints)relevant.add(p);
  for(const [id,variants] of groups){
    const item=catalog[id],useAlt=item.alternate&&route(item)===item.alternate;
    variants.forEach((g,i)=>{
      g.visible=drawn.has(id)&&Boolean(i)===Boolean(useAlt);
      g.traverse(child=>{
        if(!child.material)return;
        child.material.color.set(projectColor(id));
        const dimmed=mode==='industries'&&focused&&id!==active;
        child.material.opacity=dimmed?.23:.95;
      });
    });
  }
  for(const [id,g] of pointGroups){
    const a=annotations.get(id);
    a.visible=g.visible=(mode==='points'&&data.landmarks[id].type!=='case')||relevant.has(id);
    a.relevant=relevant.has(id);
    if(mode==='points')a.element.setAttribute('aria-pressed',String(chosenPoints.has(id)));
    else a.element.removeAttribute('aria-pressed');
  }
  $('.detail').hidden=mode==='industries'||!focused;
  $('#detail-name').textContent=active?catalog[active].name:'选择测量项目';
  $('#detail-type').textContent=active?`${catalog[active].tool} / ${catalog[active].kind}`:'';
  $('#detail-route').textContent=active?route(catalog[active]).map(p=>data.landmarks[p].name).join(' → ')+(catalog[active].closed?' → 起点':''):'';
  $('#detail-owners').textContent=active?catalog[active].short||'':'';
  $('#scene-summary').textContent=mode==='points'?`29 类测量点 · 已选 ${drawn.size} 项`:currentCase?.label||'';
  $('#gesture-hint').textContent=mode==='points'?'悬停查看 · 点击选点 · 拖动旋转':'拖动旋转 · 滚轮缩放';
  $('#clear').hidden=mode==='industries';
  $('#clear').disabled=!chosenPoints.size;
  $('#sr-status').textContent=`${mode==='points'?'测量点模式':'行业对比模式'}，显示 ${drawn.size} 项${active?'，当前'+catalog[active].name:''}`;
  dirty=true;
}

function resetIndustryMeasurements(){
  suppressed.clear();
  if(industryBasis==='factory'&&currentCase.initiallyVisible){
    for(const id of currentCase.projects)if(!currentCase.initiallyVisible.includes(id))suppressed.add(id);
  }
  focused=false;
  active=industryProjects()[0];
  update();
  const view=industryBasis==='folder'?currentCase.folderView||'reset':currentCase.view;
  setView(view);
}

const position=setupPosition((scene, label, name, featured, {scoreSummary,reasons,folder})=>{
  if(currentCase?.scene!==scene)industryBasis=scene.defaultBasis||(currentCase?.defaultBasis?'folder':industryBasis);
  const supplement=folderSupplement(scene,folder);
  currentCase={...scene,scene,label,supplement,folderProjects:[...folder.projects,...supplement.keys()]};
  $('#industry-name').textContent=label;
  $('#industry-model').textContent=featured?(scene.referenceName||name):`自定义案例 · 参照${scene.label}`;
  $('#industry-source').href=scene.source;
  $('#industry-note').textContent=scene.note||'';
  $('#case-score-breakdown').textContent=scoreSummary;
  $('#case-score-reasons').textContent=reasons;
  $('#case-score-reasons').hidden=!reasons;
  if(mode==='industries')resetIndustryMeasurements();
});
function switchMode(next){
  if(mode===next)return;
  const leavingPressure=mode==='pressure';
  mode=next;
  hovered=null;
  if(leavingPressure||next==='pressure'){
    const url=new URL(location.href);
    url.hash=next==='pressure'?'pressure':'';
    history.replaceState(null,'',url);
  }
  if(mode==='industries'){
    resetIndustryMeasurements();
    return;
  }
  suppressed.clear();
  focused=false;
  active=null;
  update();
  if(mode==='pressure')setView('pressureOverview');
  else if(leavingPressure)setView('reset');
}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.mode)));
$$('[data-basis]').forEach(button=>button.addEventListener('click',()=>{
  if(industryBasis===button.dataset.basis)return;
  industryBasis=button.dataset.basis;
  resetIndustryMeasurements();
}));
$$('[data-industry-side]').forEach(button=>button.addEventListener('click',()=>{
  industrySide=button.dataset.industrySide;
  update();
  setView('side');
}));
$('#clear').addEventListener('click',()=>{chosenPoints.clear();preset=false;suppressed.clear();active=null;focused=false;update();});
$('#preset').addEventListener('click',()=>{chosenPoints.clear();originalPreset.forEach(id=>catalog[id].points.forEach(p=>chosenPoints.add(p)));preset=true;active='circumference';focused=false;update();});
$('#point-search').addEventListener('input',e=>{pointQuery=e.target.value.trim().toLowerCase();update();});
$('#label-toggle').addEventListener('click',()=>{showLabels=!showLabels;$('#label-toggle').setAttribute('aria-pressed',String(showLabels));dirty=true;});
$('#all-labels').addEventListener('click',()=>{allLabels=!allLabels;showLabels=true;$('#all-labels').setAttribute('aria-pressed',String(allLabels));$('#label-toggle').setAttribute('aria-pressed','true');dirty=true;});
function showMethod(id){
  const item=catalog[id];$('#method-select').value=id;$('#method-name').textContent=item.name;$('#method-tool').textContent=`${item.tool} · ${item.kind}`;$('#method-definition').textContent=item.definition;$('#method-note').textContent=item.note;$('#method-source').textContent=item.source;
  const sourceUrl=item.caseOnly?currentCase?.source:item.sourceUrl;
  if(sourceUrl){const a=element('a','',' 查看原文');a.href=sourceUrl;a.target='_blank';a.rel='noopener noreferrer';$('#method-source').append(a);}
  $('#method-points').replaceChildren(...route(item).map(p=>element('span','',pointName(p))));
  const crosswalk=$('#method-crosswalk');
  crosswalk.textContent=item.caseOnly?standardReference(item)
    :mode==='industries'?currentCase.supplement.get(id)||'':'';
  crosswalk.hidden=!crosswalk.textContent;
}
function openInfo(){
  if(!data)return;
  const fallback=mode==='industries'?industryProjects()[0]:'circumference';
  showMethod(active||fallback);
  $('#info-dialog').showModal();
}
$('#info-open').addEventListener('click',openInfo);$('#detail-name').addEventListener('click',openInfo);$('#info-close').addEventListener('click',()=>$('#info-dialog').close());$('#method-select').addEventListener('change',e=>showMethod(e.target.value));
$('#info-dialog').addEventListener('click',e=>{if(e.target===$('#info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#retry').addEventListener('click',()=>location.reload());

function stroke(points,radius=.44,closed=false){
  const curve=points.length===2?new THREE.LineCurve3(vec(points[0]),vec(points[1])):new THREE.CatmullRomCurve3(points.map(vec),closed,'centripetal');
  const geometry=new THREE.TubeGeometry(curve,points.length===2?1:Math.max(32,points.length*2),radius,6,closed);
  const line=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:blue,transparent:true,depthWrite:false}));line.renderOrder=2;return line;
}
function createMeasurements(){
  for(const [id,item] of Object.entries(catalog)){
    if(!item.path)continue;
    const group=new THREE.Group();
    const points=data.paths[item.path];
    group.add(stroke(item.closed?points.slice(0,-1):points,item.caseOnly ? .72 : .5,!!item.closed));
    scene.add(group);
    groups.set(id,[group]);
  }
}

const occlusionRay=new THREE.Raycaster();
const projection=new THREE.Matrix4();
const lastProjection=new THREE.Matrix4();
const tooltip=$('#point-tooltip');
const projected=new Map();
let modelBounds, pointerStart=null, labelsResumeAt=0;

function createAnnotations(){
  const sphere=new THREE.SphereGeometry(1.03,12,8);
  const rim=new THREE.SphereGeometry(1.5,12,8);
  for(const [id,landmark] of Object.entries(data.landmarks)){
    const point=vec(landmark.position);
    const normal=vec(landmark.normal).normalize();
    const group=new THREE.Group();
    group.add(new THREE.Mesh(rim,new THREE.MeshBasicMaterial({color:'#f8f8f8'})),
      new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:blue})));
    group.position.copy(point).addScaledVector(normal,1);
    group.children[1].position.copy(normal).multiplyScalar(.65);
    scene.add(group);
    pointGroups.set(id,group);

    const label=element('button','landmark-label',pointName(id));
    label.hidden=true;
    label.title=landmark.note||landmark.name;
    label.addEventListener('click',()=>togglePoint(id));
    labelsHost.append(label);

    const chip=element('button','point-chip',landmark.name);
    chip.dataset.id=id;
    chip.hidden=true;
    chip.setAttribute('aria-label',`取消选择${landmark.name}`);
    chip.append(element('span','','×'));
    chip.addEventListener('click',()=>{
      togglePoint(id,false);
      const next=[...$('#chosen-points').children].find(button=>!button.hidden);
      (next||$('.point-picker summary')).focus();
    });
    $('#chosen-points').append(chip);

    const leader=document.createElementNS(namespace,'path');
    leader.setAttribute('fill','none');
    leader.style.display='none';
    leaders.append(leader);
    annotations.set(id,{element:label,leader,point,visible:false,relevant:false});
  }
}

function occluded(mark){
  if(mark.occluded!==undefined)return mark.occluded;
  const direction=camera.getWorldDirection(new THREE.Vector3());
  occlusionRay.set(mark.annotation.point.clone().addScaledVector(direction,-650),direction);
  occlusionRay.far=646.5;
  mark.occluded=occlusionRay.intersectObject(mesh,false).some(hit=>hit.point.y>=94);
  return mark.occluded;
}

function pointAt(event){
  if(mode!=='points'||!data)return null;
  const bounds=host.getBoundingClientRect();
  const x=event.clientX-bounds.left;
  const y=event.clientY-bounds.top;
  const radius=event.pointerType==='touch'?22:16;
  const candidates=[];
  for(const [id,mark] of projected){
    if(!mark.annotation.visible)continue;
    const distance=Math.hypot(x-mark.x,y-mark.y);
    if(distance<=radius)candidates.push({id,mark,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  return candidates.find(({mark})=>!occluded(mark))?.id??null;
}

function setHover(id){
  if(hovered===id)return;
  hovered=id;
  dirty=true;
}

host.addEventListener('pointerdown',event=>{
  if(pointerStart){pointerStart.dragged=true;return;}
  if(!event.isPrimary||event.button!==0)return;
  pointerStart={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};
});
host.addEventListener('pointermove',event=>{
  if(pointerStart){
    if(Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5){
      pointerStart.dragged=true;
      setHover(null);
    }
    return;
  }
  setHover(event.pointerType==='mouse'?pointAt(event):null);
});
host.addEventListener('pointerup',event=>{
  if(pointerStart?.id!==event.pointerId)return;
  const wasClick=!pointerStart.dragged&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)<=5;
  pointerStart=null;
  dirty=true;
  if(!wasClick)return;
  if(mode==='pressure'){
    pressure?.pick(event);
    return;
  }
  const id=pointAt(event);
  if(id)togglePoint(id);
  setHover(event.pointerType==='mouse'?id:null);
});
host.addEventListener('pointercancel',event=>{
  if(pointerStart?.id===event.pointerId){
    pointerStart=null;
    dirty=true;
  }
  setHover(null);
});
host.addEventListener('pointerleave',()=>setHover(null));

function railLayout(width){
  const compact=width<535;
  const narrow=width<680;
  const margin=narrow?12:24;
  const column=narrow?110:130;
  const gap=narrow?14:25;
  return {compact,margin,column,gap,right:width-margin-column};
}

function refreshProjection(width,height){
  projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  if(lastProjection.equals(projection)&&projected.size)return;
  lastProjection.copy(projection);
  modelBounds=null;
  projected.clear();
  for(const [id,annotation] of annotations){
    const screen=annotation.point.clone().project(camera);
    if(Math.abs(screen.z)>1)continue;
    projected.set(id,{annotation,x:(screen.x+1)*width/2,y:(1-screen.y)*height/2});
  }
}

function headBounds(width,height){
  if(modelBounds)return modelBounds;
  const values=mesh.geometry.attributes.position.array;
  const matrix=projection.elements;
  let left=Infinity,right=-Infinity,top=-Infinity,bottom=Infinity;
  for(let i=0;i<values.length;i+=3){
    if(values[i+1]<94)continue;
    const x=matrix[0]*values[i]+matrix[4]*values[i+1]+matrix[8]*values[i+2]+matrix[12];
    const y=matrix[1]*values[i]+matrix[5]*values[i+1]+matrix[9]*values[i+2]+matrix[13];
    left=Math.min(left,x);
    right=Math.max(right,x);
    top=Math.max(top,y);
    bottom=Math.min(bottom,y);
  }
  modelBounds={left:(left+1)*width/2,right:(right+1)*width/2,
    top:(1-top)*height/2,bottom:(1-bottom)*height/2};
  return modelBounds;
}

function updatePointAppearance(height,landmarks){
  const unitsPerPixel=(camera.top-camera.bottom)/(camera.zoom*height);
  for(const [id,group] of pointGroups){
    group.visible=(mode==='points'&&data.landmarks[id].type!=='case')||landmarks.has(id);
    if(!group.visible)continue;
    const selected=annotations.get(id).relevant;
    const highlighted=hovered===id;
    const radius=highlighted?5.5:selected?4.2:3;
    group.scale.setScalar(radius*unitsPerPixel/1.5);
    group.children[1].material.color.set(selected||highlighted?blue:'#8599b7');
  }
}

function placeLabels(rows,left,rail){
  const labelX=left?rail.margin:rail.right;
  const endX=left?labelX+rail.column+5:labelX-5;
  for(const mark of rows){
    const y=mark.y.toFixed(1);
    const {element,leader}=mark.annotation;
    element.hidden=false;
    element.classList.toggle('rail-left',left);
    element.style.width=`${rail.column}px`;
    element.style.transform=`translate(${labelX}px,${mark.y-10}px)`;
    leader.style.display='';
    leader.setAttribute('d',`M ${mark.x.toFixed(1)} ${y} H ${endX}`);
    leader.setAttribute('stroke',mark.annotation.relevant?'#a1b2ca':'#c2ccda');
  }
}

function dimensionLine(start,end,className){
  const line=document.createElementNS(namespace,'line');
  line.setAttribute('x1',start.x);
  line.setAttribute('y1',start.y);
  line.setAttribute('x2',end.x);
  line.setAttribute('y2',end.y);
  if(className)line.classList.add(className);
  return line;
}

function appendDimension({id,a,b},start,end,captionPosition,endpointLabels=[]){
  const color=projectColor(id);
  const group=document.createElementNS(namespace,'g');
  group.dataset.project=id;
  group.setAttribute('stroke',color);
  if(mode==='industries'&&focused&&id!==active)group.setAttribute('opacity','.35');
  for(const [point,extensionEnd] of [[a,start],[b,end]]){
    if(point===extensionEnd)continue;
    group.append(dimensionLine(point,extensionEnd,'dimension-guide'));
    const anchor=document.createElementNS(namespace,'circle');
    anchor.classList.add('dimension-anchor');
    anchor.setAttribute('cx',point.x);
    anchor.setAttribute('cy',point.y);
    anchor.setAttribute('r','2.3');
    group.append(anchor);
  }
  group.append(dimensionLine(start,end,'dimension-main'));
  if(captionPosition){
    const caption=document.createElementNS(namespace,'text');
    caption.setAttribute('x',captionPosition.x);
    caption.setAttribute('y',captionPosition.y);
    caption.setAttribute('fill',color);
    if(captionPosition.align)caption.style.textAnchor=captionPosition.align;
    caption.textContent=catalog[id].name;
    group.append(caption);
  }
  if(showLabels)for(const [point,x,y,align] of endpointLabels){
    const name=document.createElementNS(namespace,'text');
    name.classList.add('dimension-point-name');
    name.setAttribute('x',x);name.setAttribute('y',y);
    name.style.textAnchor=align;name.textContent=point.annotation.element.textContent;
    group.append(name);
  }
  dimensionLayer.append(group);
}

function layoutDimensions(width,height,moving,direction){
  dimensionLayer.setAttribute('viewBox',`0 0 ${width} ${height}`);
  dimensionLayer.replaceChildren();
  const displayed=new Set();
  if(moving)return displayed;
  const lateral=Math.abs(direction.x)>.94;
  const frontal=direction.z<-.45;
  const horizontal=[],below=[],vertical=[],direct=[];
  const bounds=headBounds(width,height);
  for(const id of drawn){
    const item=catalog[id];
    if(item.path||(lateral&&(id==='breadth'||id==='tragionBreadth')))continue;
    const [a,b]=route(item).map(point=>projected.get(point));
    if(!a||!b)continue;
    const measurement={id,a,b};
    if(earDimensions.has(id)){
      if(Math.abs(direction.x)<=.55||occluded(a)||occluded(b))continue;
      if(earHeightDimensions.has(id)&&Math.abs(a.y-b.y)>=10){
        const nose=projected.get('prn');
        const useLeft=nose?nose.x>(a.x+b.x)/2:direction.x>0;
        const x=useLeft?Math.max(76,bounds.left-16):Math.min(width-76,bounds.right+16);
        if((useLeft&&x>=bounds.left-5)||(!useLeft&&x<=bounds.right+5))continue;
        const labelX=x+(useLeft?-8:8),align=useLeft?'end':'start';
        appendDimension(measurement,{x,y:a.y},{x,y:b.y},{x:labelX,y:(a.y+b.y)/2+4,align},
          [[a,labelX,a.y+4,align],[b,labelX,b.y+4,align]]);
        displayed.add(id);
      }else if(earWidthDimensions.has(id)&&Math.abs(a.x-b.x)>=8){
        below.unshift(measurement);
      }
    }else if(item.placement==='earProjection'){
      if(Math.abs(direction.x)<=.75||Math.abs(a.x-b.x)<8)continue;
      const y=a.y;
      appendDimension(measurement,a,{x:b.x,y},{x:(a.x+b.x)/2,y:y-7});
      displayed.add(id);
    }else if(faceHeightDimensions.has(id)){
      if(direction.z<-.72&&!occluded(a)&&!occluded(b)&&Math.abs(a.y-b.y)>=10)vertical.push(measurement);
    }else if(faceWidthDimensions.has(id)){
      if(frontal&&Math.abs(a.x-b.x)>=10&&!occluded(a)&&!occluded(b))below.push(measurement);
    }else if(topDimensionIds.has(id)||item.placement==='above'){
      if(Math.abs(a.x-b.x)>=10)horizontal.push(measurement);
    }else if(item.axis==='y'||item.placement==='side'){
      if(Math.abs(a.y-b.y)>=10)vertical.push(measurement);
    }else{
      direct.push(measurement);
    }
  }
  for(const measurement of direct){
    const {id,a,b}=measurement;
    if(occluded(a)||occluded(b))continue;
    appendDimension(measurement,a,b);
    displayed.add(id);
  }
  if(horizontal.length){
    const lastRow=headBounds(width,height).top-20;
    let y=Math.max(60,lastRow-(horizontal.length-1)*dimensionRow);
    for(const measurement of horizontal){
      const {id,a,b}=measurement;
      appendDimension(measurement,{x:a.x,y},{x:b.x,y},{x:(a.x+b.x)/2,y:y-6});
      displayed.add(id);
      y+=dimensionRow;
    }
  }
  if(below.length){
    const span=({a,b})=>Math.abs(a.x-b.x);
    below.sort((a,b)=>span(a)-span(b));
    let y=headBounds(width,height).bottom+dimensionRow;
    for(const measurement of below){
      if(y>height-96)break;
      const {id,a,b}=measurement;
      const left=a.x<b.x?a:b,right=left===a?b:a;
      const names=earWidthDimensions.has(id)?[[left,left.x-7,y+13,'end'],[right,right.x+7,y+13,'start']]:[];
      appendDimension(measurement,{x:a.x,y},{x:b.x,y},{x:(a.x+b.x)/2,y:y-6},names);
      displayed.add(id);
      y+=dimensionRow;
    }
  }
  if(vertical.length){
    const bounds=headBounds(width,height);
    const useLeft=bounds.left>=90||width-bounds.right<bounds.left;
    const margin=12;
    vertical.forEach((measurement,index)=>{
      const {id,a,b}=measurement;
      const left=faceHeightDimensions.has(id)?id==='faceLength':useLeft;
      const offset=faceHeightDimensions.has(id)?35:16+index*16;
      const ideal=left?bounds.left-offset:bounds.right+offset;
      const x=THREE.MathUtils.clamp(ideal,margin,width-margin);
      const caption=faceHeightDimensions.has(id)||catalog[id].placement==='side'
        ?{x:THREE.MathUtils.clamp(x,38,width-38),y:Math.min(a.y,b.y)-7}:null;
      appendDimension(measurement,{x,y:a.y},{x,y:b.y},caption);
      displayed.add(id);
    });
  }
  return displayed;
}

function layoutAnnotations(width,height,moving,landmarks,dimensions){
  leaders.setAttribute('viewBox',`0 0 ${width} ${height}`);
  for(const {element,leader} of annotations.values()){
    element.hidden=true;
    leader.style.display='none';
  }
  const hoverMark=projected.get(hovered);
  const canHover=hoverMark?.annotation.visible&&!moving&&!occluded(hoverMark);
  host.classList.toggle('point-hover',Boolean(canHover&&mode==='points'));
  tooltip.hidden=!canHover;
  if(canHover){
    tooltip.textContent=pointName(hovered);
    const x=THREE.MathUtils.clamp(hoverMark.x,tooltip.offsetWidth/2+8,width-tooltip.offsetWidth/2-8);
    tooltip.style.transform=`translate(${x}px,${hoverMark.y}px) translate(-50%, calc(-100% - 10px))`;
  }
  if(!showLabels||moving)return;

  const rail=railLayout(width);
  const bounds=headBounds(width,height);
  const leftFits=!rail.compact&&bounds.left>=rail.margin+rail.column+rail.gap;
  const rightFits=bounds.right<=rail.right-rail.gap;
  if(!leftFits&&!rightFits)return;
  const activePoints=active&&(catalog[active].path||dimensions.has(active))
    ?new Set(route(catalog[active])):new Set();
  const dimensionPoints=new Set([...dimensions].flatMap(id=>route(catalog[id])));
  const earLabels=new Set([...dimensions].filter(id=>earDimensions.has(id)).flatMap(id=>route(catalog[id])));
  const candidates=[];
  const bottom=height-102;
  for(const [id,mark] of projected){
    const {annotation,x,y}=mark;
    const showPoint=landmarks.has(id)||(mode==='points'&&allLabels);
    if(!annotation.visible||!showPoint||id===hovered||earLabels.has(id))continue;
    if(x<4||x>width-4||y<60||y>bottom)continue;
    const priority=activePoints.has(id)?3:dimensionPoints.has(id)?2:Number(annotation.relevant);
    candidates.push({mark,priority});
  }
  candidates.sort((a,b)=>b.priority-a.priority||a.mark.y-b.mark.y);

  const left=[],right=[];
  const center=(bounds.left+bounds.right)/2;
  for(const {mark} of candidates){
    const onLeft=mark.x<center;
    const column=onLeft?left:right;
    const fits=onLeft?leftFits:rightFits;
    if(!fits||column.some(row=>Math.abs(row.y-mark.y)<22)||occluded(mark))continue;
    mark.annotation.element.tabIndex=mode==='points'?0:-1;
    column.push(mark);
  }
  placeLabels(left,true,rail);
  placeLabels(right,false,rail);
}

let cameraFitKey='',lowerRows=0,earSides=false;
function fitCamera(width,height,rows){
  const key=`${width}:${height}:${rows}:${earSides}:${mode}`;
  if(key===cameraFitKey)return;
  cameraFitKey=key;
  if(mode==='pressure'){
    const vertical=Math.max(345,240*height/Math.max(width-36,120));
    const horizontal=vertical*width/height;
    camera.left=-horizontal/2;
    camera.right=horizontal/2;
    camera.top=vertical/2-4;
    camera.bottom=-vertical/2-4;
    camera.updateProjectionMatrix();
    return;
  }
  const rail=railLayout(width);
  const reserve=rail.margin+rail.column+rail.gap;
  const modelWidth=Math.max(120,width-(earSides&&rail.compact?170:reserve*(rail.compact?1:2)));
  const top=100,bottom=height-108-rows*dimensionRow;
  const available=Math.max(height*.35,bottom-top);
  const reservedHeight=rows?280*height/available:0;
  const vertical=Math.max(width<550?410:365,268*height/modelWidth,reservedHeight);
  const horizontal=vertical*width/height;
  const shiftX=rail.compact&&!earSides?reserve*vertical/(2*height):0;
  const shiftY=rows?((top+bottom)/2-height/2)*vertical/height-10:0;
  camera.left=-horizontal/2+shiftX;
  camera.right=horizontal/2+shiftX;
  camera.top=vertical/2+shiftY;
  camera.bottom=-vertical/2+shiftY;
  camera.updateProjectionMatrix();
  projected.clear();
}

function resize(){
  if(!renderer||!stage.clientWidth)return;
  renderer.setSize(stage.clientWidth,stage.clientHeight);
  projected.clear();
  dirty=true;
}
function setView(name, point){
  if(!camera)return;
  setHover(null);
  const target=new THREE.Vector3(0,227,-2);
  const item=active&&catalog[active];
  const leftSide=mode==='industries'?industrySide==='L':item?.alternate&&route(item)===item.alternate;
  const offsets={
    front:[0,0,720],
    side:[leftSide?720:-720,0,0],
    back:[0,0,-720],
    top:[0,720,10],
    oblique:[-470,145,550],
    reset:mode==='pressure'?[-550,105,530]:[-250,55,720],
    pressureOverview:[-550,105,530],
    pressureEar:[-720,0,0],
    pressurePoint:point?.clone().sub(target).normalize().multiplyScalar(720).toArray()
  };
  if(name==='pressureEar')target.set(0,232,0);
  tween={
    start:performance.now(),duration:reducedMotion?0:650,
    from:camera.position.clone(),to:target.clone().add(vec(offsets[name])),
    fromTarget:controls.target.clone(),toTarget:target,fromZoom:camera.zoom,toZoom:name==='pressureEar'?1.9:1
  };
  $$('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===name));
  dirty=true;
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
function animate(time){
  frameId=requestAnimationFrame(animate);
  if(tween){
    const t=tween.duration?Math.min(1,(time-tween.start)/tween.duration):1;
    const eased=1-Math.pow(1-t,3);
    camera.position.lerpVectors(tween.from,tween.to,eased);
    controls.target.lerpVectors(tween.fromTarget,tween.toTarget,eased);
    camera.zoom=THREE.MathUtils.lerp(tween.fromZoom,tween.toZoom,eased);
    camera.updateProjectionMatrix();
    if(t===1)tween=null;
    dirty=true;
  }
  if(controls.update())dirty=true;
  const labelsSettled=labelsResumeAt>0&&time>=labelsResumeAt;
  if(labelsSettled){labelsResumeAt=0;dirty=true;}
  if(!dirty)return;
  const width=stage.clientWidth,height=stage.clientHeight;
  camera.updateMatrixWorld();
  if(mode==='pressure'){
    fitCamera(width,height,0);
    renderer.render(scene,camera);
    dirty=false;
    return;
  }
  const moving=Boolean(tween||pointerStart?.dragged||labelsResumeAt);
  const direction=camera.getWorldDirection(new THREE.Vector3());
  if(!moving){
    earSides=Math.abs(direction.x)>.55&&[...drawn].some(id=>earHeightDimensions.has(id));
    lowerRows=(direction.z<-.45?[...drawn].filter(id=>faceWidthDimensions.has(id)).length:0)
      +(Math.abs(direction.x)>.55?[...drawn].filter(id=>earWidthDimensions.has(id)).length:0);
  }
  fitCamera(width,height,lowerRows);
  refreshProjection(width,height);
  const displayed=layoutDimensions(width,height,moving,direction);
  const landmarks=new Set([...drawn].filter(id=>catalog[id].path||displayed.has(id))
    .flatMap(id=>route(catalog[id])));
  if(mode==='points')for(const id of chosenPoints)landmarks.add(id);
  updatePointAppearance(height,landmarks);
  renderer.render(scene,camera);
  layoutAnnotations(width,height,moving,landmarks,displayed);
  if(!moving&&active){
    const item=catalog[active];
    $('#detail-type').textContent=item.path||displayed.has(active)
      ?`${item.tool} / ${item.kind}`:'调整视角或缩放查看测量线';
  }
  dirty=false;
}
host.addEventListener('keydown',e=>{if(!camera||e.altKey||e.ctrlKey||e.metaKey)return;const k=e.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(k))return;e.preventDefault();tween=null;if(k==='Home'){setView('reset');return;}if(['+','=','-'].includes(k)){camera.zoom=THREE.MathUtils.clamp(camera.zoom*(k==='-'?.9:1.1),.65,2.2);camera.updateProjectionMatrix();}else{const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(k==='ArrowLeft')s.theta-=.12;if(k==='ArrowRight')s.theta+=.12;if(k==='ArrowUp')s.phi-=.12;if(k==='ArrowDown')s.phi+=.12;s.phi=THREE.MathUtils.clamp(s.phi,.025,Math.PI-.15);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));}dirty=true;});

async function init(){
  try{
    const [meta,parts]=await Promise.all([fetch('./assets/measurements.json?v=20261110-wig'),Promise.all(Array.from({length:13},(_,i)=>fetch(`./assets/head/${i}.bin`)))]);
    if(!meta.ok||parts.some(r=>!r.ok))throw new Error('头模文件无法读取');data=await meta.json();
    const blocks=await Promise.all(parts.map(r=>r.arrayBuffer())),combined=new Uint8Array(blocks.reduce((n,b)=>n+b.byteLength,0));let cursor=0;for(const b of blocks){combined.set(new Uint8Array(b),cursor);cursor+=b.byteLength;}
    const bytes=combined.buffer,header=new DataView(bytes);if(header.getUint32(0,true)!==0x44414548)throw new Error('头模格式不正确');const nv=header.getUint32(4,true),nf=header.getUint32(8,true);if(bytes.byteLength!==12+nv*12+nf*12)throw new Error('头模数据不完整');
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-200,200,182.5,-182.5,1,2400);camera.position.set(-250,282,718);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.localClippingEnabled=true;host.append(renderer.domElement);
    controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,227,-2);controls.enableDamping=!reducedMotion;controls.dampingFactor=.1;controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2.2;controls.rotateSpeed=.65;controls.zoomSpeed=.7;controls.minPolarAngle=.025;controls.maxPolarAngle=Math.PI-.15;
    controls.addEventListener('change',()=>{
      labelsResumeAt=performance.now()+100;
      setHover(null);
      dirty=true;
    });
    controls.addEventListener('start',()=>{tween=null;$$('[data-view]').forEach(b=>b.classList.remove('active'));});
    controls.update();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(bytes,12,nv*3),3));geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(bytes,12+nv*12,nf*3),1));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({color:'#f0efed',roughness:.86,metalness:0,clippingPlanes:[new THREE.Plane(new THREE.Vector3(0,1,0),-94)],side:THREE.DoubleSide});mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
    if(data.neckCap){const positions=[],center=[0,94,0];for(let i=0;i<data.neckCap.length-1;i++)positions.push(...center,...data.neckCap[i],...data.neckCap[i+1]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();const m=material.clone();m.clippingPlanes=[];scene.add(new THREE.Mesh(g,m));}
    scene.add(new THREE.HemisphereLight(0xffffff,0xc3c6ce,1.6));const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(-220,530,400);scene.add(key);const fill=new THREE.DirectionalLight(0xe6edff,.8);fill.position.set(300,180,220);scene.add(fill);const rim=new THREE.DirectionalLight(0xffffff,1.7);rim.position.set(-100,430,-350);scene.add(rim);
    buildUI();createMeasurements();createAnnotations();
    pressure=setupPressure({scene,mesh,camera,host,onChange:()=>{dirty=true;},showView:setView});
    if(mode==='industries'&&currentCase)resetIndustryMeasurements();
    else {
      update();
      if(mode==='pressure')setView('pressureOverview');
    }
    resize();new ResizeObserver(resize).observe(stage);$('#loading').classList.add('done');$('#loading').setAttribute('aria-hidden','true');requestAnimationFrame(animate);
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(frameId);controls.dispose();renderer.dispose();},{once:true});renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').classList.remove('done');$('#loading').classList.add('failed');$('#loading-text').textContent='三维显示已中断，请重新载入';$('#retry').hidden=false;});
  }catch(error){console.error(error);$('#loading').classList.add('failed');$('#loading-text').textContent='头模未能载入，请重试';$('#retry').hidden=false;}
}
position.draw();
init();
