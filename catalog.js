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
add('earLength',17,'容貌耳长',['saR','sbaR'],'直线距离','同侧耳上点 → 耳下点。',{offset:[-23,0,25],alternate:['saL','sbaL']});
add('earBreadth',18,'容貌耳宽',['praR','paR'],'直线距离','同侧耳前点 → 耳后点。',{offset:[-27,32,0],alternate:['praL','paL']});
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

export const originalPreset=['circumference','sagittal','coronal','frontal','breadth','length'];
export function resolvePoints(item,selected,preferred='R') {
  if(item.alternate && item.alternate.every(id=>selected.has(id))) return item.alternate;
  if(item.alternate && preferred==='L' && !item.points.every(id=>selected.has(id))) return item.alternate;
  return item.points;
}
