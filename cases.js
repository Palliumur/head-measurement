// Coordinates are design judgments, not product test data.
const wigSizingGuide='https://www.evawigs.com/blog/wig-cap-size.html';
const c=(id,industry,name,label,x,y,wrap,stability,source)=>({id,industry,name,label,x,y,wrap,stability,source});
export const caseBaseline=[
  c('stetson','stetson','Stetson 成品帽','成品帽',26,24,
    '帽冠覆盖头顶，但与头部固定的接触主要集中在一圈汗带；耳部与脸部开放。','主要靠帽带松紧与摩擦，常规款无下颌固定。'),
  c('franzens','franzens','Franzéns 博士帽','定制博士帽',31,38,
    '刚性帽体的个体化接触集中在帽围，头型仪采集帽口轮廓；不包覆耳朵或脸。','定制帽口轮廓有助于贴合，仍主要靠帽口接触保持。'),
  c('shoei-size','shoei-size','SHOEI RF-1400 · 成品选码','摩托头盔（成品）',89,82,
    '以 RF-1400 全盔为代表：覆盖头顶、后脑和面侧，并延伸至下巴。','固定靠下颌带与头部、脸颊衬垫；按尺码试戴。','https://shoei-helmets.com/models/rf-1400/'),
  c('shoei-pfs','shoei-pfs','SHOEI RF-1400 · PFS 内衬适配','摩托头盔（定制内衬）',89,90,
    '以同类全盔作对照，PFS 改变内衬接触，不改变外壳的覆盖区。','多处衬垫按头型调整并试戴复核，在图中估计略高于只按尺码选配。','https://shoeiuk.com/pages/what-is-a-pfs'),
  c('gentex','gentex','Gentex Ops-Core FAST SF','防弹头盔',66,86,
    '高切壳体覆盖头顶和头侧上方，耳廓与面部大部分外露。','带有可调衬垫与 Head-Loc Flex 下颌固定系统。'),
  c('ato','ato','ATO FORM Starlight Base','康复防护帽',66,70,
    '基础版覆盖头顶部及头周，前额、下巴和颈部的选配件会改变覆盖范围。','可调下颌带、不同扣合件与定制壳体提供固定。','https://ato-form.com/en/pd/head-protection-starlight-base/'),
  c('brain','brain','Brain Products actiCAP','脑电帽',57,55,
    '弹性帽体覆盖多个头皮区域，脸部基本开放；电极定位涉及多个头皮点。','主要靠弹性帽体、贴合和固定带保持电极位置。'),
  c('star','star','Orthomerica STARband','颅形矫形器',60,77,
    '定制壳体包住颅部周边，面部开放；形状由头部扫描或模型提供。','贴合区域由个体头型确定，扣合后维持佩戴位置，仍保留生长空间。','https://orthomerica.com/products/pediatric/cranial-remolding-orthoses/'),
  c('job-band','job-band','Jobskin 压力头带 PO 0017','压力头带',22,48,
    '覆盖主要集中在额头及绕头带状区域。','弹性压力和扣合提供固定，接触区窄，对转动的约束有限。','https://www.jobskin.co.uk/premium-original-head-band-po-17'),
  c('job-mask','job-mask','Jobskin 全脸压力面罩 PO 0540','全脸压力面罩',81,74,
    '贴合较大面积的头面部，为眼、鼻、口、耳留开口。','弹性织物包覆并以后部拉链闭合，位置保持依赖个体贴合。'),
  c('job-collar','job-mask','Jobskin 下巴延伸领 PO 0545','下巴延伸领',39,61,
    '主要覆盖下颌和颈部，头顶、眼周与大部分脸部开放。','颈后扣合配合弹性织物固定，受下颌活动影响。'),
  c('vive','vr-optics','HTC VIVE Pro 2','可调瞳距 VR 眼镜',46,68,
    '接触集中在眼周、前额和后脑头带；下半脸外露。','头带与后部支撑共同固定前部显示器，可调瞳距本身不增加固定。','https://www.vive.com/au/support/vive-pro2/category_howto/adjusting-the-ipd-on-the-headset.html'),
  c('varjo','vr-optics','Varjo XR-4','混合现实眼镜',53,79,
    '眼周面垫和额头、后脑支撑分区接触，下半脸仍开放。','顶部与头周支撑可调，厂商要求调节两者以分配重量、维持位置。','https://support.varjo.com/hc/en-us/fitting-the-headset-xr-4-series'),
  c('bigscreen','bigscreen','Bigscreen Beyond · 2023','定制面垫 VR 眼镜',37,73,
    '定制面垫主要贴合眼周和鼻梁附近，脸部其他区域开放。','深度面扫定制面垫加头带；较轻的前部减小前倾负担。这是依据结构的判断。'),
  c('niosh','niosh','NIOSH 人体测量调查','呼吸防护人体测量调查',null,null,
    '这是人体尺寸和数字头模的研究案例，不对应单一呼吸防护产品。','没有具体佩戴结构可评估。'),
  c('health','health','WS/T 424—2013 健康监测','健康监测',null,null,
    '这是用软尺测量人体的方法。','没有佩戴产品可评估。'),
  c('jon-renau','jon-renau','Jon Renau 假发帽底','假发帽底',49,36,
    '帽底覆盖头发区域，脸部开放；品牌另测耳间跨顶和前后发际线弧长。','帽底随头型贴合；不同帽底和固定方式有差异，此处按常规佩戴示意。','https://jonrenau.com/blog/wig-cap-designs/'),
  c('wig-cap','wig-cap','免胶全蕾丝假发帽底','假发帽底选码',75,56,
    '以 EvaWigs 的免胶全蕾丝结构为参照：从前发际线覆盖至后颈，脸部和耳部开放。',
    '后部调节带和梳夹提供固定，适配取决于帽底选码和调节。本分值为结构估计。','https://www.evawigs.com/page/wig-vocabulary.html'),
  c('resmed','resmed','ResMed AirFit F20','呼吸机面罩',43,87,
    '面垫覆盖口鼻周围，头带延伸到后脑，眼部和头顶开放。','上、下绑带与面垫共同约束面罩位置；稳定程度为定性估计。','https://document.resmed.com/documents/products/mask/airfit-f20/product-guide/airfit-f20_product_guide_amer_eng.pdf'),
  c('danmar','danmar','Danmar 定制防护帽 · 软壳参考','软壳防护帽',72,62,
    '参考带软壳和下颌带的防护帽，覆盖头顶及头侧，具体定制边界随款式变化。','以下颌带和内侧贴合为主要固定方式；未假定额外固定配件。','https://www.danmarproducts.com/product-category/helmets/'),
  c('vision-pro','vision-pro','Apple Vision Pro · Dual Knit Band','双头带混合现实眼镜',50,62,
    '遮光罩围绕眼周、额头与上颊，后部双带接触头部；下半脸外露。','两条可独立调节的头带分配前部重量，佩戴位置还受遮光罩适配影响。','https://support.apple.com/en-us/119999')
];

// Each featured point has its own source and the measurements for that task.
export const featuredScenes = new Map([
  ['stetson', {label:'成品帽选码', projects:['stetsonTape'], view:'reset',
    referenceName:'Stetson（制帽品牌）· 官方帽子选码指南',
    source:'https://stetson.com/pages/size-guide'}],
  ['job-band', {label:'压力头带定制', projects:['jobskin5','jobskin11'], view:'side',
    source:'https://www.jobskin.co.uk/images/pictures/downloads/pdf-files/premium-original/jsifu289-v7-premium-original-head-of-062025-electronic.pdf#page=3'}],
  ['vive', {label:'VR 眼镜瞳距', projects:['pupilDistance'], view:'front', folderView:'front',
    source:'https://www.vive.com/us/support/vive-pro2/category_howto/adjusting-the-ipd-on-the-headset.html'}],
  ['shoei-size', {label:'摩托头盔选码', projects:['shoeiTape'], view:'reset',
    source:'https://www.shoei.com/support/howtouse/wear.html'}],
  ['ato', {label:'定制康复防护帽', projects:['atoA','atoB','atoC','atoD','atoE','atoF','atoG','atoH'], folderView:'side',
    initiallyVisible:['atoA','atoB','atoC','atoD'], view:'oblique',
    referenceName:'ATO FORM · Starlight 定制测量表',
    note:'默认展示 A–D，勾选 E–H 查看耳部尺寸。耳位高低见原表图 2，选配护颊的 L–N 见第 2 页。',
    source:'https://ato-form.com/pdf/ma/en/af-dimension-sheet-for-made-to-measure-head-protection.pdf#page=1'}],
  ['brain', {label:'脑电帽', projects:['eegTape','eegSagittal','eegCoronal'], view:'oblique',
    referenceName:'Brain Products · actiCAP 选码与 Cz 定位',
    note:'头围用于选码，两条跨顶弧用于找 Cz。头模上的耳前凹点和 Cz 均为示意。',
    source:'https://pressrelease.brainproducts.com/tms-eeg/'}],
  ['star', {label:'定制颅形矫形器', projects:['starTape','starAP','starML'], view:'top', folderView:'oblique',
    referenceName:'Orthomerica · STARband 侧开款',
    note:'原厂要求在针织头套外手工测量，并另交扫描或取模。成人头模仅示意量带与卡尺方向。',
    source:'https://orthomerica.com/download/741/?tmstv=1755377693'}],
  ['wig-cap', {label:'假发帽底选码', projects:['wigTape','wigFrontNape','wigForehead','wigOverTop','wigBack','wigNapeWidth'],
    initiallyVisible:['wigTape','wigFrontNape','wigOverTop'], defaultBasis:'factory', view:'oblique', folderView:'oblique',
    referenceName:'第 21 页补充案例 · 假发帽底',
    note:'默认显示三条主线，勾选可查看其余三项。发际线为示意，实际按个人取点。',
    folderNote:'按六项假发帽底测法对照文件夹的标准项目。取点有差异，切回「原厂测法」查看实际发际线路线。',
    source:wigSizingGuide}]
]);

// Project rubric. Levels from 0 to 4 are assigned from each documented design.
export const featuredRatings = new Map([
  ['stetson',    {coverage:2,contact:1,retention:1,fit:1}],
  ['job-band',   {coverage:1,contact:1,retention:2,fit:3}],
  ['vive',       {coverage:2,contact:3,retention:3,fit:2}],
  ['shoei-size', {coverage:4,contact:3,retention:4,fit:3}],
  ['ato',        {coverage:3,contact:3,retention:3,fit:4}],
  ['brain',      {coverage:3,contact:2,retention:2,fit:2}],
  ['star',       {coverage:2,contact:3,retention:3,fit:4}],
  ['wig-cap',    {coverage:3,contact:3,retention:2,fit:3}]
]);

export function ratedPosition({coverage,contact,retention,fit}){
  const score=(main,support)=>Math.round(100*(3*main+support)/16);
  return {x:score(coverage,contact),y:score(retention,fit)};
}
