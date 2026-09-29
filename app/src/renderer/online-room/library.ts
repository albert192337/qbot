/** Original QBot modular furniture. Atlas rectangles are independent of placement geometry. */
export type FurnitureSurface = 'wall' | 'floor' | 'rug';
export type FurnitureCategory = 'cabinet' | 'seat' | 'plant' | 'table' | 'hanging' | 'rug';
export type FurnitureTheme = 'tea' | 'scholar' | 'reading' | 'rattan';
export const FURNITURE_THEMES = [
  { id:'tea', name:'雨夜茶室' }, { id:'scholar', name:'梅影书斋' },
  { id:'reading', name:'奶油书屋' }, { id:'rattan', name:'藤编花房' },
] as const;
export const CATEGORY_NAMES: Record<FurnitureCategory,string> = {cabinet:'柜架',seat:'座椅',plant:'植物',table:'桌几',hanging:'挂饰',rug:'地毯'};
export interface FurnitureDefinition {
  id:string; name:string; surface:FurnitureSurface; category:FurnitureCategory;
  theme:FurnitureTheme; atlas:FurnitureTheme; cell:number;
  /** Maximum display box in the shared 1000×295 room coordinate system. */
  width:number; height:number;
  anchor:'bottom-center';
}
const define=(id:string,name:string,theme:FurnitureTheme,category:FurnitureCategory,cell:number,width:number,height:number):FurnitureDefinition=>({
  id,name,theme,atlas:theme,category,cell,width,height,anchor:'bottom-center',surface:category==='hanging'?'wall':category==='rug'?'rug':'floor',
});
export const BASIC_ITEMS: readonly FurnitureDefinition[] = [
  define('tea-counter','煮茶柜','tea','cabinet',0,265,185),
  define('tea-sofa','青竹软榻','tea','seat',1,270,115),
  define('tea-plant','阔叶盆栽','tea','plant',2,170,200),
  define('tea-table','木茶几','tea','table',3,195,80),
  define('tea-lantern','暖光灯笼','tea','hanging',4,60,110),
  define('tea-rug','青纹地毯','tea','rug',5,450,55),
  define('scholar-cabinet','藏卷书架','scholar','cabinet',0,220,185),
  define('scholar-seat','梅色长榻','scholar','seat',1,270,115),
  define('scholar-plant','白瓷梅枝','scholar','plant',2,165,175),
  define('scholar-table','墨香书案','scholar','table',3,195,80),
  define('scholar-lantern','绢纱圆灯','scholar','hanging',4,68,110),
  define('scholar-rug','梅红织毯','scholar','rug',5,450,55),
  define('reading-cabinet','玻璃书柜','reading','cabinet',0,220,185),
  define('reading-seat','奶油双人沙发','reading','seat',1,270,115),
  define('reading-plant','蓝陶橄榄树','reading','plant',2,165,180),
  define('reading-table','橡木圆角茶几','reading','table',3,195,80),
  define('reading-lamp','乳白玻璃吊灯','reading','hanging',4,65,105),
  define('reading-rug','雾蓝织毯','reading','rug',5,450,55),
  define('rattan-cabinet','藤门边柜','rattan','cabinet',0,235,145),
  define('rattan-seat','青垫藤沙发','rattan','seat',1,270,115),
  define('rattan-plant','白绣球花篮','rattan','plant',2,160,165),
  define('rattan-table','竹编圆茶几','rattan','table',3,180,80),
  define('rattan-art','叶影植物画','rattan','hanging',4,80,110),
  define('rattan-rug','椭圆黄麻毯','rattan','rug',5,430,55),
];
/** A preset assembles independent pieces; it never changes the room shell or earned inventory. */
export function piecesForTheme(theme:FurnitureTheme):Record<FurnitureCategory,string> {
  return Object.fromEntries(BASIC_ITEMS.filter(item=>item.theme===theme).map(item=>[item.category,item.id])) as Record<FurnitureCategory,string>;
}
