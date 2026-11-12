import { caseBaseline, featuredScenes, featuredRatings, ratedPosition } from './cases.js?v=20261110-wig';
import { industries } from './industries.js?v=20261110-wig';

const $=id=>document.getElementById(id);
const element=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const legacyBaseline=new Map(caseBaseline.map(c=>[c.id,c]));
const baseline=new Map(caseBaseline.map(c=>{
  const rating=featuredRatings.get(c.id);
  return [c.id,rating?{...c,...ratedPosition(rating)}:c];
}));
const scenes=new Map(industries.map(c=>[c.id,c]));
const featuredByIndustry=new Map([...featuredScenes].map(([id,scene])=>[baseline.get(id).industry,scene]));
const storeKey='head-measurement-position-v1';
const placed=c=>c.x!==null&&c.y!==null;
const pointName=c=>featuredScenes.has(c.id)&&baseline.get(c.id).name===c.name?featuredScenes.get(c.id).label:c.label;
const safeUrl=value=>{try{return ['https:','http:'].includes(new URL(value).protocol);}catch{return false;}};

function validate(list,legacy=false){
  if(!Array.isArray(list)||list.length>250)throw Error('文件最多可包含 250 个案例。');
  const ids=new Set(),score=v=>Number.isInteger(v)&&v>=0&&v<=100;
  const check=(v,n,required=false)=>typeof v==='string'&&v.length<=n&&(!required||v.trim());
  return list.map(c=>{
    if(!c||!check(c.id,100,true)||ids.has(c.id)||!check(c.name,60,true)||!check(c.label,60,true)
      ||!check(c.industry,50)||(c.industry&&!scenes.has(c.industry))||!check(c.category??'',40)
      ||!check(c.wrap,500)||!check(c.stability,500)||!check(c.source??'',1000)||(c.source&&!safeUrl(c.source))
      ||(!(score(c.x)&&score(c.y))&&!(c.x===null&&c.y===null)))throw Error('案例名称、坐标、关联场景或资料链接格式有误。');
    const preset=baseline.get(c.id);
    const industry=preset&&!c.industry&&scenes.get(preset.industry)?.supplemental?preset.industry:c.industry;
    if(preset&&industry!==preset.industry)throw Error('预设案例的关联场景不能更改。');
    const previous=legacyBaseline.get(c.id);
    const oldDefault=legacy&&previous&&c.x===previous.x&&c.y===previous.y;
    const scores=featuredScenes.has(c.id)&&(c.x===null||oldDefault)?preset:c;
    ids.add(c.id);
    return {id:c.id,name:c.name.trim(),label:c.label.trim(),industry,category:c.category??'',x:scores.x,y:scores.y,wrap:c.wrap,stability:c.stability,source:c.source??''};
  });
}

export function setupPosition(onSelect){
  const plot=$('position-plot'),dialog=$('case-dialog'),form=$('case-form'),fields=form.elements;
  const customToggle=$('position-custom');
  const namespace='http://www.w3.org/2000/svg';
  let selected='job-band',editing=null,cases=new Map(baseline),caseLabels=[],dots=[],lines;
  function read(text){
    const file=JSON.parse(text);
    if(![1,2].includes(file?.version))throw Error('请选择由行业对比导出的 JSON 文件。');
    return validate(file.cases,file.version===1);
  }
  try{for(const c of read(localStorage.getItem(storeKey)||'{"version":1,"cases":[]}'))cases.set(c.id,c);}catch{}
  function persist(){
    try{localStorage.setItem(storeKey,JSON.stringify({version:2,cases:[...cases.values()].filter(c=>c!==baseline.get(c.id))}));return true;}
    catch{return false;}
  }
  function notify(text){const notice=$('position-notice');notice.textContent=text;notice.hidden=!text;}
  function choose(id){
    selected=id;
    const item=cases.get(selected);
    const featured=featuredScenes.get(id);
    const reference=baseline.get(id);
    const rating=featuredRatings.get(id);
    let scoreSummary=`自定坐标 · 包裹 ${item.x} / 稳定 ${item.y}`;
    if(rating){
      const {coverage,contact,retention,fit}=rating;
      const breakdown=`覆盖 ${coverage}、接触 ${contact}、固定 ${retention}、适配 ${fit}（各 0–4 级）`;
      const overridden=item.x!==reference.x||item.y!==reference.y;
      scoreSummary=overridden
        ?`${scoreSummary}。参考评分为包裹 ${reference.x}、稳定 ${reference.y}，${breakdown}。`
        :`当前案例 · 包裹 ${item.x} / 稳定 ${item.y}。 ${breakdown}。`;
    }
    const reasons=[item.wrap,item.stability].filter(Boolean).join(' ');
    onSelect(featured||featuredByIndustry.get(item.industry),pointName(item),item.name,Boolean(featured),{
      scoreSummary,reasons,folder:scenes.get(item.industry)
    });
    layoutLabels();
  }

  function draw(){
    const shown=[...cases.values()].filter(c=>placed(c)&&(featuredScenes.has(c.id)
      ||(customToggle.checked&&!baseline.has(c.id)&&featuredByIndustry.has(c.industry))));
    if(!shown.some(c=>c.id===selected))selected=shown[0].id;

    plot.replaceChildren();
    const layer=document.createElementNS(namespace,'svg');layer.setAttribute('aria-hidden','true');layer.classList.add('position-label-guides');plot.append(layer);lines=layer;
    for(const tick of [0,25,50,75,100]){
      const x=element('span','position-tick tick-x',tick),y=element('span','position-tick tick-y',tick);
      x.style.left=`${tick}%`;y.style.bottom=`${tick}%`;plot.append(x,y);
    }
    const clusters=new Map();
    for(const c of shown){
      const key=`${c.x},${c.y}`;
      if(!clusters.has(key))clusters.set(key,[]);
      clusters.get(key).push(c);
    }
    caseLabels=[];dots=[];
    for(const cluster of clusters.values()){
      const first=cluster[0],dot=element('button',featuredScenes.has(first.id)?'position-dot':'position-dot custom',cluster.length>1?String(cluster.length):'');
      const label=element('span','position-dot-label');
      const names=cluster.map(pointName).join('、');
      dot.title=names;
      dot.setAttribute('aria-label',`${names}：包裹 ${first.x}，稳定 ${first.y}${cluster.length>1?'；再次点击切换重叠案例':''}`);
      dot.dataset.caseId=first.id;
      dot.style.left=`${first.x}%`;dot.style.bottom=`${first.y}%`;
      const selectCluster=()=>{
        const index=cluster.findIndex(c=>c.id===selected);
        choose(cluster[(index+1)%cluster.length].id);
      };
      dot.addEventListener('click',selectCluster);
      label.addEventListener('click',selectCluster);
      plot.append(dot,label);
      caseLabels.push({cluster,dot,label});
      dots.push({x:first.x,y:first.y});
    }
    choose(selected);
  }

  function layoutLabels(){
    const w=plot.clientWidth,h=plot.clientHeight;
    if(!w||!h||!lines)return;
    lines.setAttribute('viewBox',`0 0 ${w} ${h}`);lines.replaceChildren();
    const coords=c=>({x:c.x/100*w,y:(1-c.y/100)*h});
    const ordered=[...caseLabels].sort((a,b)=>Number(b.cluster.some(c=>c.id===selected))-Number(a.cluster.some(c=>c.id===selected)));
    const rects=dots.map(p=>{const {x,y}=coords(p);return {left:x-8,top:y-8,right:x+8,bottom:y+8};});
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
    for(const {dot,label,cluster} of ordered){
      const current=cluster.find(c=>c.id===selected);
      dot.classList.toggle('is-selected',Boolean(current));
      dot.setAttribute('aria-pressed',String(Boolean(current)));
      label.classList.toggle('is-selected',Boolean(current));
      label.textContent=pointName(current||cluster[0])+(cluster.length>1?` +${cluster.length-1}`:'');
      label.hidden=false;
      const {x,y}=coords(cluster[0]),lw=label.offsetWidth,lh=label.offsetHeight;
      let box;
      for(const extra of [0,12,25]){
        const positions=[
          [x+10+extra,y-lh/2],[x-lw-10-extra,y-lh/2],
          [x-lw/2,y-lh-10-extra],[x-lw/2,y+10+extra],
          [x+9+extra,y-lh-9-extra],[x-lw-9-extra,y-lh-9-extra],
          [x+9+extra,y+9+extra],[x-lw-9-extra,y+9+extra]
        ];
        box=positions.map(([left,top])=>({left,top,right:left+lw,bottom:top+lh})).find(b=>b.left>=1&&b.top>=1&&b.right<=w-1&&b.bottom<=h-1&&!rects.some(r=>b.left<r.right+2&&b.right>r.left-2&&b.top<r.bottom+1&&b.bottom>r.top-1));
        if(box)break;
      }
      if(!box){label.hidden=true;continue;}
      rects.push(box);label.style.left=`${box.left}px`;label.style.top=`${box.top}px`;
      const targetX=clamp(x,box.left,box.right),targetY=clamp(y,box.top,box.bottom);
      if(Math.hypot(targetX-x,targetY-y)>13){
        const guide=document.createElementNS(namespace,'line');
        for(const [key,value] of Object.entries({x1:x,y1:y,x2:targetX,y2:targetY}))guide.setAttribute(key,value);
        lines.append(guide);
      }
    }
  }

  for(const [id,label] of [['','请选择行业场景'],...[...featuredScenes].map(([id,scene])=>[baseline.get(id).industry,scene.label])]){
    const option=element('option','',label);option.value=id;fields.industry.append(option);
  }
  customToggle.addEventListener('change',draw);
  new ResizeObserver(layoutLabels).observe(plot);

  function openForm(c){
    editing=c?.id??null;
    const original=baseline.get(editing);
    $('case-title').textContent=c?'编辑案例':'新增案例';
    $('case-error').hidden=true;
    const remove=$('case-remove');
    remove.hidden=!c||c===original;
    remove.textContent=original?'恢复预设':'删除案例';
    for(const [key,value] of Object.entries({name:c?.name??'',category:c?.category??'',industry:c?.industry??'',x:c?.x??50,y:c?.y??50,wrap:c?.wrap??'',stability:c?.stability??'',source:c?.source??''}))fields[key].value=value;
    fields.industry.disabled=Boolean(original);
    const scored=!c||placed(c);
    for(const key of ['x','y'])fields[key].disabled=!scored;
    form.querySelector('.case-scores').hidden=!scored;
    dialog.showModal();
  }
  $('position-add').addEventListener('click',()=>openForm());
  $('position-edit').addEventListener('click',()=>openForm(cases.get(selected)));
  $('case-close').addEventListener('click',()=>dialog.close());
  $('case-remove').addEventListener('click',()=>{
    const original=baseline.get(editing);
    if(original)cases.set(editing,original);
    else cases.delete(editing);
    dialog.close();
    notify(persist()?(original?'已恢复预设。':'已删除案例。'):'浏览器无法保存，请导出备份。');
    draw();
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const original=cases.get(editing);
    const name=fields.name.value.trim();
    try{
      const [c]=validate([{id:editing??`custom-${crypto.randomUUID?.()??Date.now()}`,name,label:original?.name===name?original.label:name.slice(0,24),
        category:fields.category.value.trim(),industry:fields.industry.value,x:fields.x.disabled?null:fields.x.valueAsNumber,y:fields.y.disabled?null:fields.y.valueAsNumber,
        wrap:fields.wrap.value.trim(),stability:fields.stability.value.trim(),source:fields.source.value.trim()}]);
      cases.set(c.id,c);selected=c.id;
      if(!baseline.has(c.id))customToggle.checked=true;
      dialog.close();
      notify(persist()?'已保存在此浏览器。':'浏览器无法保存，请导出备份。');
      draw();
    }catch(e){$('case-error').textContent=e.message;$('case-error').hidden=false;}
  });

  $('position-export').addEventListener('click',()=>{
    const data=[...cases.values()].map(c=>({...c,source:c.source??''}));
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:2,cases:data},null,2)],{type:'application/json'}));
    const anchor=element('a');anchor.href=url;anchor.download='头戴产品定位-案例.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify('已导出当前案例和坐标。');
  });
  $('position-import').addEventListener('click',()=>$('position-file').click());
  $('position-file').addEventListener('change',async e=>{
    const input=e.target,file=input.files[0];input.value='';
    if(!file)return;
    try{
      if(file.size>1000000)throw Error('文件大小超过 1 MB。');
      const incoming=read(await file.text());
      if(new Set([...cases.keys(),...incoming.map(c=>c.id)]).size>250)throw Error('合并后超过 250 个案例。');
      for(const c of incoming)cases.set(c.id,c);
      draw();
      notify(persist()?`已合并 ${incoming.length} 个案例，同一案例使用导入版本。`:'已导入，浏览器无法保存，请导出备份。');
    }catch(e){notify(e instanceof SyntaxError?'文件不是有效的 JSON。':e.message);}
  });

  return { draw };
}
