export const asset=(path:string)=>`${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
export interface Pose {key:string;label:string;title:string;position:number[];target:number[];interior?:boolean;section?:boolean}
export type Quality='standard'|'high'|'mobile';
export type SectionMode='none'|'south'|'quarter';
export interface ViewState {night:boolean;spin:boolean;dimensions:boolean;eaves:boolean;interior:boolean;explode:number;floor:number;section:SectionMode}
export const initialState:ViewState={night:false,spin:false,dimensions:false,eaves:true,interior:true,explode:0,floor:0,section:'none'};
export const floors=[
 {n:1,z:4.2,h:10.4,w:25.5,bays:9,description:'九间起势，四面辟门。南面入口两侧的碑龛，留存着两通唐碑的历史。'},
 {n:2,z:14.6,h:8.5,w:23.2,bays:9,description:'仍作九开间，砖柱与横枋延续首层的秩序。中央券洞通向塔心室。'},
 {n:3,z:23.1,h:7.6,w:21,bays:7,description:'立面收为七开间。砖砌檐口逐层向上，形成疏朗而有力的水平节奏。'},
 {n:4,z:30.7,h:7,w:18.9,bays:7,description:'七开间的中段塔身连接上下。厚重墙体与中央空腔共同组织登塔空间。'},
 {n:5,z:37.7,h:6.5,w:16.8,bays:5,description:'自此收为五开间。逐层缩小的塔身，使整座塔保持稳重的方锥形轮廓。'},
 {n:6,z:44.2,h:6,w:14.6,bays:5,description:'砖柱、券洞、檐口依旧清晰。近看细部，能读出砖仿木构的层次。'},
 {n:7,z:50.2,h:5.4,w:12.5,bays:5,description:'七层之上，砖砌收顶托起葫芦形塔刹。塔室四面开券，视线向外展开。'},
];
export const sources=[
 {title:'丝绸之路 · 世界遗产资料',publisher:'UNESCO',url:'https://whc.unesco.org/en/list/1442/'},
 {title:'大雁塔的文化遗产背景',publisher:'文化和旅游部',url:'https://www.mct.gov.cn/wlbphone/wlbydd/xxfb/qglb/sx_9787/202401/t20240111_950780.html'},
 {title:'大雁塔——犹存的盛唐',publisher:'建筑图文参考 · 澎湃号',url:'https://www.thepaper.cn/newsDetail_forward_24621530'},
];
