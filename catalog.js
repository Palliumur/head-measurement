// GB/T 2428—2024, figure A.2 numbering. Positions are illustrative registrations.
export const catalog = {};
function add(id,number,name,points,kind,short,options={}) {
  catalog[id]={id,number,name,points,kind,short,
    tool:kind.includes('弧')||kind.includes('周长')?'软尺':kind.includes('垂')||kind.includes('投影')?'测高仪 / 投影辅助':'卡尺',
    definition:short,source:`GB/T 2428—2024，图 A.2 第 ${number} 项；测量点见图 A.1。`,
    note:'点位为当前头模上的示意配准。左右以受测者自身为准，实际采集需按体表标志重新定位。',...options};
}
add('circumference',1,'头围',['brow','occipital'],'闭合周长','齐右侧眉弓上缘，经枕骨粗隆最高点，近水平绕头一周。',{
  path:'circumference',closed:true,tool:'软尺',
  definition:'按本项目选定定义：右侧齐眉弓上缘，经枕骨粗隆最高点，软尺贴合头表绕头一周，保持平整、不扭转。',
  note:'沿用原项目 WS/T 424—2013 头围操作定义。两处操作标志不强行替换为眉间点、枕后点或枕外隆突点。后方位置需真人触诊确认。行业表只提供项目名称，未区分各品牌的具体量带定位方法。',
  source:'WS/T 424—2013，第 3.5、4.4 条；项目对照：GB/T 2428—2024，图 A.2 第1项。',
  sourceUrl:'https://www.nhc.gov.cn/ewebeditor/uploadfile/2013/08/20130808141055922.pdf'});
add('faceLength',2,'形态面长',['n','gn'],'直线距离','鼻根点 → 颏下点。',{offset:[-112,0,28]});
add('length',3,'头长',['g','op'],'直线距离','眉间点 → 枕后点，测最大前后直线距离。',{offset:[0,135,0]});
add('breadth',4,'头宽',['euR','euL'],'直线距离','右头侧点 → 左头侧点，耳廓不计入头宽。',{offset:[0,105,0]});
add('sagittal',5,'头矢状弧',['g','v','inion'],'贴表弧长','眉间点 → 头顶点 → 枕外隆突点。',{path:'sagittal',note:'终点为枕外隆突点；与第19项至颈椎点的眉间顶颈弧长分开表示。枕外隆突需触诊定位。'});
add('coronal',6,'头冠状弧',['tR','v','tL'],'贴表弧长','右耳屏点 → 头顶点 → 左耳屏点。',{path:'coronal',alias:'耳屏间弧'});
add('headHeight',7,'头高',['v','gn'],'垂直距离','头顶点与颏下点之间的垂直距离。',{axis:'y',offset:[-108,0,10]});
add('noseOcciput',8,'鼻尖点至枕后点距',['prn','op'],'水平投影距离','按眼耳平面定位，测鼻尖点与枕后点的前后向投影距离。',{axis:'z',offset:[0,162,0]});
add('tragionOcciput',9,'耳屏点至枕后点距',['tR','op'],'水平投影距离','耳屏点与枕后点之间的前后向投影距离。',{axis:'z',offset:[-25,115,0],alternate:['tL','op']});
add('tragionBreadth',10,'两耳屏间宽',['tR','tL'],'直线距离','右耳屏点 → 左耳屏点。',{offset:[0,135,0]});
add('faceBreadth',11,'面宽',['zyR','zyL'],'直线距离','右颧点 → 左颧点，测面部最大宽度。',{offset:[0,-32,65]});
add('jawBreadth',12,'两下颌角间宽',['goR','goL'],'直线距离','右下颌角点 → 左下颌角点。',{offset:[0,-20,85]});
add('noseHeight',13,'鼻高',['n','sn'],'直线距离','鼻根点 → 鼻下点。',{offset:[-41,0,32]});
add('noseBreadth',14,'鼻宽',['alR','alL'],'直线距离','右鼻翼点 → 左鼻翼点。',{offset:[0,-18,32]});
add('lowerFace',15,'鼻下点至颏下点距',['sn','gn'],'直线距离','鼻下点 → 颏下点。',{offset:[52,0,28]});
add('pupilDistance',16,'瞳孔间距',['puR','puL'],'直线距离','双眼平视前方，测两侧瞳孔之间的直线距离。',{offset:[0,37,28],tool:'瞳距仪 / 瞳距尺',note:'当前 STL 无虹膜纹理，瞳孔点为眼球表面的示意定位；实际采集需在平视状态下标定。'});
const earNote='从对应侧观察。尺寸线外置，细虚线接回实际点位；实际测量取两点之间的直线距离。';
add('earLength',17,'容貌耳长',['saR','sbaR'],'直线距离','同侧耳上点 → 耳下点。',{alternate:['saL','sbaL'],note:earNote});
add('earBreadth',18,'容貌耳宽',['praR','paR'],'直线距离','同侧耳前点 → 耳后点。',{alternate:['praL','paL'],note:earNote});
add('cervicalArc',19,'眉间顶颈弧长',['g','v','cervicale'],'贴表弧长','眉间点 → 头顶点 → 颈椎点。',{path:'cervicalArc',note:'颈椎点是第19项需要的辅助测量点，未列于图 A.1。当前定位为示意，实际须触诊确认，不以枕外隆突点代替。'});
add('crownCircumference',20,'头冠状围',['v','gn'],'闭合周长','头顶点出发，沿头侧经颏下点，再由另一侧回到头顶点。',{path:'crownCircumference',closed:true});
add('eyeHeight',21,'眼顶高',['v','enR'],'垂直距离','头顶点至眼内角点的垂直距离。',{axis:'y',offset:[-107,0,24],alternate:['v','enL'],note:'依据标准第3.3条使用眼内角点 en，不能由项目英文名称推断为瞳孔。'});
add('earHeight',22,'头耳高',['v','tR'],'垂直距离','头顶点至耳屏点的垂直距离。',{axis:'y',offset:[-123,0,0],alternate:['v','tL']});
add('tragionNose',23,'耳屏鼻根长',['tR','se'],'直线距离','耳屏点 → 鼻梁最凹点。',{offset:[-10,0,30],alternate:['tL','se'],note:'按标准第3.11条的中文定义，前端定位在鼻梁最凹点（鼻梁点 se）；保留原项目名称。'});
add('tragionChin',24,'耳屏颏下长',['tR','gn'],'直线距离','同侧耳屏点 → 颏下点。',{offset:[-18,0,25],alternate:['tL','gn']});
add('frontal',25,'耳屏点间额弧长',['tR','g','tL'],'贴表弧长','右耳屏点 → 眉间点 → 左耳屏点。',{path:'frontal'});
add('chinArc',26,'耳屏点间颏下弧长',['tR','gn','tL'],'贴表弧长','右耳屏点 → 颏下点 → 左耳屏点。',{path:'chinArc'});
add('jawArc',27,'耳屏点间颌下弧长',['tR','submandible','tL'],'贴表弧长','右耳屏点 → 紧接喉结节上缘的颌下 → 左耳屏点。',{path:'jawArc',note:'颌下定位处与颏下点不同；采用辅助操作点示意，需真人确认喉结节上缘位置。'});
add('vertexGlabella',28,'头顶点至眉间点距',['v','g'],'垂直距离','头顶点至眉间点的垂直距离。',{axis:'y',offset:[-68,0,55]});
add('vertexNose',29,'头顶点至鼻尖点距',['v','prn'],'垂直距离','头顶点至鼻尖点的垂直距离。',{axis:'y',offset:[69,0,64]});

function addCaseMeasurement(id,number,name,points,definition,source,options){
  catalog[id]={id,number,name,points,kind:'直线距离',tool:'软尺',definition,
    source,note:'根据原厂图示在头模上示意定位。',caseOnly:true,...options};
}
function addTape(id,number,name,points,definition,source,options={}){
  addCaseMeasurement(id,number,name,points,definition,source,{kind:'闭合周长',path:id,closed:true,...options});
}
function addArc(id,number,name,points,definition,source,options={}){
  addCaseMeasurement(id,number,name,points,definition,source,{kind:'贴表弧长',path:id,...options});
}
addTape('stetsonTape',null,'帽带位置头围',['stetsonForehead','stetsonEarR','stetsonEarL'],
  '沿实际帽带佩戴位置绕头一周，通常经过额头中部和耳上约 3 毫米。','Stetson 帽子选码指南');
addTape('shoeiTape',null,'头盔选码头围',['shoeiForehead','shoeiEarR','shoeiBack','shoeiEarL'],
  '软尺经过眉上约 2 厘米、耳根上约 2 厘米和后脑最突出部，绕头一周。','SHOEI 使用说明 · 尺寸确认');
addTape('jobskin5','5','眉水平头围',['jobskinBrow'],
  '软尺在眉水平贴合头部，水平绕头一周。','Jobskin PO 0017 · 原厂表第 3 页 · 5');
addTape('jobskin11','11','额部经耳至后颈围',['jobskinForehead','jobskinEarR','jobskinNape','jobskinEarL'],
  '从额部沿耳上斜向绕至后颈，经另一侧耳上回到额部。','Jobskin PO 0017 · 原厂表第 3 页 · 11');

const atoSource='ATO FORM Starlight · 定制测量表第 1 页';
addTape('atoA','A','眉水平头围',['atoBrowLine','atoBack'],
  '在眉水平绕头，后侧从枕外隆突上方经过。',atoSource);
addArc('atoB','B','前后跨顶弧',['g','v','atoBack'],
  '从两眉之间跨头顶，量至枕外隆突上缘。',atoSource,{view:'side'});
addArc('atoC','C','左右跨顶弧',['atoSideR','v','atoSideL'],
  '从 A 线一侧跨头顶最高点至 A 线另一侧。',atoSource,{view:'front'});
addArc('atoD','D','经下巴弧',['atoSideR','gn','atoSideL'],
  '从 A 线一侧经下巴下方至 A 线另一侧。',atoSource,{view:'oblique'});
addCaseMeasurement('atoE','E','A 线至耳垂下缘',['atoSideR','sbaR'],
  '侧视量 A 基准线至耳垂下缘的垂直距离。',atoSource,
  {kind:'垂直投影距离',earDimension:'height',view:'side',alternate:['atoSideL','sbaL']});
addCaseMeasurement('atoF','F','外眼角至 E 线',['exR','atoFR'],
  '侧视从外眼角水平量到 E 的测量线。',atoSource,
  {kind:'水平投影距离',placement:'earProjection',view:'side',alternate:['exL','atoFL']});
addCaseMeasurement('atoG','G','耳高',['saR','sbaR'],
  '在耳廓图示的方向量耳上缘至下缘的高度。',atoSource,
  {earDimension:'height',view:'side',alternate:['saL','sbaL']});
addCaseMeasurement('atoH','H','耳宽',['praR','paR'],
  '在耳廓图示的方向量耳朵前后的宽度。',atoSource,
  {earDimension:'width',view:'side',alternate:['praL','paL']});

const eegSource='Brain Products · actiCAP 选码与 TMS–EEG 定位';
addTape('eegTape',null,'脑电帽选码头围',['eegCapLine'],
  '沿帽缘位置绕头一周，用于选帽尺寸。',eegSource);
addArc('eegSagittal',null,'鼻根至枕外隆突弧',['n','eegCz','inion'],
  '从鼻根沿头皮中线跨顶至枕外隆突，找弧长中点。',eegSource,{view:'side'});
addArc('eegCoronal',null,'双耳前凹点跨顶弧',['eegEarR','eegCz','eegEarL'],
  '从一侧耳前凹点沿头皮跨顶至另一侧耳前凹点，两条弧的中点用于找 Cz。',eegSource,{view:'front'});

const starSource='Orthomerica · STAR 系列订单表第 1 页';
const starNote='成人头模仅示意方向。原表要求在针织头套外测量，具体端点依厂商操作说明。';
addTape('starTape',null,'头围',['starFront','starRight','starBack','starLeft'],
  '在眉毛和耳朵上方绕头一周。',starSource,{note:starNote});
addCaseMeasurement('starAP','AP','颅部前后长',['starFront','starBack'],
  '按原表的前后方向用卡尺测量。',starSource,{tool:'卡尺',placement:'side',view:'top',note:starNote});
addCaseMeasurement('starML','ML','颅部左右宽',['starRight','starLeft'],
  '按原表的左右方向用卡尺测量。',starSource,{tool:'卡尺',placement:'above',view:'top',note:starNote});

const wigSource='第 21 页假发帽底示意 · EvaWigs 六项选码指南';
const wigNote='头模没有头发，发际线和太阳穴为示意。实际测量时将头发理平，按受测者的发际线取点。';
addTape('wigTape','1','发际线头围',['wigFront','wigSideburnR','wigAboveEarR','wigNape','wigAboveEarL','wigSideburnL'],
  '从前发际线中点出发，沿鬓角、耳周和后颈发际线贴合绕一圈。',wigSource,{view:'oblique',note:wigNote});
addArc('wigFrontNape','2','前发际线至后颈弧',['wigFront','v','wigNape'],
  '从前发际线中点沿头部正中线越过头顶，量至后颈发际线中点。',wigSource,{view:'side',note:wigNote});
addArc('wigForehead','3','双耳间前发际线弧',['wigSideburnR','wigFront','wigSideburnL'],
  '从一侧耳前鬓角的发际线下端，沿额前发际线量至另一侧同一位置。',wigSource,{view:'front',note:wigNote});
addArc('wigOverTop','4','双耳上方跨顶弧',['wigAboveEarR','v','wigAboveEarL'],
  '从一侧耳朵正上方的发际线跨过头顶，量至另一侧耳朵正上方的发际线。',wigSource,{view:'front',note:wigNote});
addArc('wigBack','5','双侧太阳穴间后脑弧',['wigTempleR','wigTempleL'],
  '从一侧太阳穴贴着后脑绕到另一侧太阳穴。',wigSource,{view:'back',note:wigNote});
addArc('wigNapeWidth','6','后颈发际线宽',['wigNapeR','wigNape','wigNapeL'],
  '沿后颈发际线横向量取左右边界之间的宽度。',wigSource,{view:'back',note:wigNote});

// A.2 references are crosswalks. Only the standard catalog supplies A.1 endpoints.
export const factoryCrosswalk={
  stetsonTape:{standard:'circumference',difference:'原厂沿实际帽带位置，经额头中部和耳上。'},
  shoeiTape:{standard:'circumference',difference:'原厂定位在眉上、耳根上和后脑突出部。'},
  jobskin5:{standard:'circumference',difference:'原厂要求眉水平，没有指定项目约定的后侧触诊点。'},
  jobskin11:{difference:'从额部经耳上至后颈的斜向围度。'},
  atoA:{standard:'circumference',difference:'原厂要求从枕外隆突上方经过。'},
  atoB:{standard:'sagittal',difference:'原厂终点是枕外隆突上缘，图 A.2 第 5 项止于枕外隆突点。'},
  atoC:{standard:'coronal',difference:'原厂两端在 A 基准线上，图 A.2 第 6 项两端是耳屏点。'},
  atoD:{standard:'chinArc',difference:'原厂两端在 A 基准线上，图 A.2 第 26 项两端是耳屏点。'},
  atoE:{difference:'以原厂 A 基准线为上端。'},
  atoF:{difference:'以原厂 E 线的投影为一端。'},
  atoG:{standard:'earLength',difference:'原厂图示为耳高。标准项目量耳上点至耳下点的直线。'},
  atoH:{standard:'earBreadth',difference:'原厂图示为耳宽。标准项目量耳前点至耳后点的直线。'},
  eegTape:{standard:'circumference',difference:'原厂沿脑电帽帽缘量头围。'},
  eegSagittal:{standard:'sagittal',difference:'原厂从鼻根点出发用于定位 Cz，标准项目从眉间点出发。'},
  eegCoronal:{standard:'coronal',difference:'原厂用耳前凹点和 Cz，标准项目用耳屏点和头顶点。'},
  starTape:{standard:'circumference',difference:'原厂在针织头套外，经眉毛、耳朵上方量。'},
  starAP:{standard:'length',difference:'原表给出卡尺方向。具体端点按厂商操作说明。'},
  starML:{standard:'breadth',difference:'原表给出卡尺方向。具体端点按厂商操作说明。'},
  wigTape:{standard:'circumference',difference:'沿个人发际线绕头，经过后颈；标准对照采用眉弓水平位置。'},
  wigFrontNape:{standard:'cervicalArc',difference:'同样跨过头顶；两端为额前和后颈的发际线中点。头矢状弧（第 5 项）止于位置更高的枕外隆突点。'},
  wigForehead:{standard:'frontal',difference:'沿前发际线，从两侧鬓角量起；标准额弧经眉间点，起止于两耳屏点。'},
  wigOverTop:{standard:'coronal',difference:'两端在耳上方发际线；标准冠状弧起止于两耳屏点。'},
  wigBack:{difference:'连接两侧太阳穴并绕过后脑，是帽底的测量路线。'},
  wigNapeWidth:{difference:'范围取决于个人后颈发际线的左右边界。'},
};

export const originalPreset=['circumference','sagittal','coronal','frontal','breadth','length'];
export function resolvePoints(item,selected,preferred='R') {
  if(item.alternate && item.alternate.every(id=>selected.has(id))) return item.alternate;
  if(item.alternate && preferred==='L' && !item.points.every(id=>selected.has(id))) return item.alternate;
  return item.points;
}
