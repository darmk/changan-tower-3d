import {useEffect,useRef,useState} from 'react';
import {asset,floors,sources,initialState,type Pose,type Quality,type SectionMode,type ViewState} from './data';
import type {ViewerAPI} from './viewer';

function Icon({name,size=18}:{name:string;size?:number}){
 const shapes:Record<string,React.ReactNode>={arrow:<><path d="M4 12h15m-6-6 6 6-6 6"/></>,layers:<><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></>,eye:<><path d="M2 12s3.4-7 10-7 10 7 10 7-3.4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></>,sun:<><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l1.5 1.5M18.5 18.5 20 20M4 20l1.5-1.5M18.5 5.5 20 4"/></>,moon:<path d="M20 14A8.5 8.5 0 0 1 10 3 9 9 0 1 0 20 14Z"/>,plus:<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M6 10h8m-4-4v8"/></>,minus:<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M6 10h8"/></>,reset:<><path d="M4 4v6h6M4 10a8 8 0 1 1 .6 7"/></>,fit:<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>,close:<path d="m5 5 14 14M5 19 19 5"/>,cut:<><path d="M4 4h16v16H4zM12 1v22"/><path d="m4 8 4-4m-4 9 8-8m-8 13 8-8m-5 10 5-5"/></>,ruler:<><path d="m3 17 14-14 4 4L7 21 3 17Zm5-5 3 3m1-7 3 3m1-7 3 3"/></>,chevron:<path d="m7 10 5 5 5-5"/>,camera:<><path d="M3 7h5l2-3h4l2 3h5v13H3Z"/><circle cx="12" cy="13" r="4"/></>,play:<><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></>,room:<><path d="M4 21V3h16v18M9 21V9h6v12M2 21h20"/></>,roof:<><path d="m2 11 10-7 10 7M4 13h16M6 16h12M8 19h8"/></>};
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]||shapes.layers}</svg>;
}
function Switch({label,checked,onChange,disabled}:{label:string;checked:boolean;onChange:()=>void;disabled?:boolean}){return <button className="switch" type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={onChange}><span/></button>;}

export default function App(){
 const host=useRef<HTMLDivElement>(null),api=useRef<ViewerAPI|null>(null),dialog=useRef<HTMLDialogElement>(null);
 const [state,setState]=useState<ViewState>({...initialState}),[poses,setPoses]=useState<Pose[]>([]),[view,setView]=useState('overall');
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(true),[progress,setProgress]=useState(0),[error,setError]=useState(''),[fallback,setFallback]=useState(false);
 const [quality,setQuality]=useState<Quality>(()=>innerWidth<600?'mobile':'standard'),[qualityText,setQualityText]=useState(''),[focused,setFocused]=useState(false),[allViews,setAllViews]=useState(false),[panel,setPanel]=useState(()=>innerWidth>650),[reloadKey,setReloadKey]=useState(0);
 const [infoTab,setInfoTab]=useState<'about'|'sources'>('about');
 const stateRef=useRef(state);stateRef.current=state;
 useEffect(()=>{const controller=new AbortController();fetch(asset('model/cameras.json'),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('视角资料载入失败');return r.json();}).then(setPoses).catch(e=>{if(e.name!=='AbortError'){setError(e.message);setBusy(false);}});return()=>controller.abort();},[reloadKey]);
 useEffect(()=>{
  if(!poses.length)return;let cancelled=false;setReady(false);setBusy(true);setError('');setFallback(false);
  import('./viewer').then(({createViewer})=>{if(cancelled||!host.current)return;return createViewer(host.current,poses,quality,{
   onReady:()=>{if(!cancelled){setReady(true);setError('');}},onProgress:n=>{if(!cancelled)setProgress(n);},onBusy:b=>{if(!cancelled)setBusy(b);},
   onError:e=>{if(!cancelled){setError(e);setBusy(false);}},onStats:s=>{if(!cancelled)setQualityText(s);},
   onSelect:n=>{if(!cancelled)setState(s=>({...s,floor:s.floor===n?0:n}));},onManual:()=>{if(!cancelled)setState(s=>s.spin?{...s,spin:false}:s);}
  });}).then(v=>{if(!v)return;if(cancelled)v.dispose();else{api.current=v;v.update(stateRef.current);}}).catch(()=>{if(!cancelled){setError('当前浏览器无法启动三维画面，可查看静态预览。');setFallback(true);setBusy(false);}});
  return()=>{cancelled=true;api.current?.dispose();api.current=null;};
 },[poses]);
 useEffect(()=>{api.current?.update(state);},[state]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setFocused(false);};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 function set<K extends keyof ViewState>(key:K,value:ViewState[K]){setState(s=>({...s,[key]:value}));}
 function selectView(key:string){const p=poses.find(p=>p.key===key);setView(key);setState(s=>({...s,spin:false,explode:0,floor:0,section:p?.section?'south':'none',interior:true}));api.current?.update({...state,spin:false,explode:0,floor:0,section:p?.section?'south':'none',interior:true});api.current?.view(key);}
 function reset(){setState({...initialState});setView('overall');api.current?.update({...initialState});api.current?.view('overall');}
 function section(mode:SectionMode){const next=state.section===mode?'none':mode;setState(s=>({...s,section:next,explode:0,spin:false,interior:true}));setView(next==='none'?'overall':'section');api.current?.view(next==='none'?'overall':'section');}
 async function changeQuality(next:Quality){if(next===quality)return;const previous=quality;setQuality(next);setError('');try{await api.current?.quality(next);setView('overall');}catch{setQuality(previous);}}
 const disabled=!ready||busy||fallback;const floor=state.floor?floors[state.floor-1]:null;const active=poses.find(p=>p.key===view);
 return <div className={`exhibition${state.night?' night':''}${focused?' focused':''}`}>
  <header className="header">
   <button className="brand" onClick={reset} aria-label="西安大雁塔，返回全景"><img src={asset('favicon.svg')} alt=""/><span>西安大雁塔</span></button>
   <nav className="modes" aria-label="浏览模式"><button aria-pressed={!focused} onClick={()=>setFocused(false)}>建筑概览</button><button aria-pressed={focused} onClick={()=>setFocused(true)}>专注浏览</button></nav>
   <span className="series">长安建筑志 <i/> 02</span>
   <button className="about-link" onClick={()=>dialog.current?.showModal()}>建模说明 <Icon name="arrow" size={16}/></button>
  </header>
  <main className="main">
   <section className="intro" aria-labelledby="tower-title">
    <p className="eyebrow">大慈恩寺 · 西安</p><h1 id="tower-title">大雁塔</h1><p className="english">GIANT WILD GOOSE PAGODA</p><span className="red-rule"/>
    <p className="era">唐 · 永徽三年始建 / 652</p><p className="description">七层摩苍穹。<br/>在砖石之间，读懂长安。</p>
    <button className="enter" disabled={disabled} onClick={()=>{selectView('eaves');setAllViews(true);}}>探索塔身 <Icon name="arrow" size={21}/></button>
    <dl className="metrics"><div><dt>参考总高</dt><dd>64.7 <small>m</small></dd></div><div><dt>现存层数</dt><dd>7 <small>层</small></dd></div></dl>
    <div className="heritage"><span className="heritage-mark">世<br/>遗</span><p>丝绸之路<br/><span>长安—天山廊道的路网</span></p></div>
    <p className="intro-note">始建于唐，历代修葺。<br/>本模型呈现现存七层形态。</p>
   </section>
   <section className="stage" aria-label="大雁塔三维展厅">
    <div className="canvas" ref={host}/>
    {!ready&&!fallback&&<div className="loading" role="status">{!error?<><span className="loading-seal">雁</span><p>正在载入砖石与光影</p><div className="progress"><span style={{width:`${progress||8}%`}}/></div><small>{progress>0?`${progress}%`:'初次相见，稍候片刻'}</small></>:<><p>{error}</p><button onClick={()=>setReloadKey(k=>k+1)}>重新加载</button><button onClick={()=>setFallback(true)}>查看静态预览</button></>}</div>}
    {fallback&&<div className="fallback"><img src={asset(`model/views/${view}.jpg`)} alt={`大雁塔${active?.label||'全景'}静态渲染`}/><p>静态预览 · {error}</p><button onClick={()=>setReloadKey(k=>k+1)}>重新尝试三维浏览</button></div>}
    {ready&&busy&&<p className="quality-loading" role="status">正在切换画质 {progress}%</p>}
    {ready&&error&&<div className="toast" role="alert">{error}<button aria-label="关闭提示" onClick={()=>setError('')}><Icon name="close" size={14}/></button></div>}
    <div className="stage-caption"><span>{state.explode>0?'分层展开 · 结构示意':state.section!=='none'?'内部空间 · 研究性示意':active?.title||'七层浮屠 · 建筑全貌'}</span></div>
    <span className="compass" aria-label="南向初始视角"><span>N</span><svg viewBox="0 0 34 34"><path d="m17 3 6 25-6-4-6 4Z" fill="none" stroke="currentColor"/><path d="M17 3v21" stroke="currentColor"/></svg></span>
   </section>
   <aside className="inspector" aria-label="建筑探索">
    <button className="inspector-heading" aria-expanded={panel} aria-controls="controls" onClick={()=>setPanel(!panel)}><Icon name="layers" size={21}/><span>建筑探索</span><Icon name="chevron" size={16}/></button>
    {panel&&<div id="controls" className="controls">
     <div className="control-title"><span>层层向上</span><button disabled={disabled||!state.floor} onClick={()=>set('floor',0)}>全塔</button></div>
     <div className="floor-picker" aria-label="选择楼层">{floors.map(f=><button key={f.n} disabled={disabled} aria-label={`第${f.n}层`} aria-pressed={state.floor===f.n} onClick={()=>set('floor',state.floor===f.n?0:f.n)}>{f.n}</button>)}</div>
     <div className="control-divider"/>
     <button className="control-row" aria-pressed={state.eaves} disabled={disabled} onClick={()=>set('eaves',!state.eaves)}><Icon name="roof"/><span>砖砌檐口</span><Icon name="eye" size={16}/><i className={state.eaves?'on':''}/></button>
     <button className="control-row" aria-pressed={state.interior} disabled={disabled} onClick={()=>set('interior',!state.interior)}><Icon name="room"/><span>内部木构</span><Icon name="eye" size={16}/><i className={state.interior?'on':''}/></button>
     <button className="control-row" aria-pressed={state.dimensions} disabled={disabled||state.explode>0} onClick={()=>set('dimensions',!state.dimensions)}><Icon name="ruler"/><span>参考尺度</span><i className={state.dimensions?'on':''}/></button>
     <div className="explode"><label htmlFor="explode"><Icon name="layers"/><span>分层展开</span><output>{state.explode}%</output></label><input id="explode" type="range" min="0" max="100" step="1" value={state.explode} disabled={disabled} onChange={e=>{setState(s=>({...s,explode:Number(e.target.value),section:'none',spin:false}));setView('overall');}}/></div>
     <div className="section-controls"><span><Icon name="cut"/>结构剖视</span><div><button aria-pressed={state.section==='south'} disabled={disabled} onClick={()=>section('south')}>揭开立面</button><button aria-pressed={state.section==='quarter'} disabled={disabled} onClick={()=>section('quarter')}>纵向剖切</button></div></div>
     <div className="control-divider"/><div className="night-switch"><Icon name={state.night?'moon':'sun'}/><span>夜间灯光</span><Switch label="夜间灯光" checked={state.night} disabled={disabled} onChange={()=>set('night',!state.night)}/></div>
     <div className="quality"><label htmlFor="quality">显示画质</label><select id="quality" value={quality} disabled={disabled} onChange={e=>changeQuality(e.target.value as Quality)}><option value="standard">标准</option><option value="high">高清</option><option value="mobile">轻量</option></select></div>
    </div>}
    {floor&&<div className="floor-note"><div><small>第 {String(floor.n).padStart(2,'0')} 层</small><button aria-label="关闭楼层说明" onClick={()=>set('floor',0)}><Icon name="close" size={14}/></button></div><h2>{floor.bays}开间</h2><p>{floor.description}</p><span>开间指立面分格</span></div>}
   </aside>
  </main>
  <footer className="dock">
   <nav className="gallery" aria-label="建筑视角"><button className="all-views" aria-expanded={allViews} onClick={()=>setAllViews(!allViews)}>{allViews?'常用视角':'全部视角'}<Icon name="chevron" size={13}/></button><div className="thumbnails">{(allViews?poses:poses.slice(0,4)).map(p=><button key={p.key} className={`thumbnail ${view===p.key?'active':''}`} disabled={(!ready&&!fallback)||busy} aria-pressed={view===p.key} onClick={()=>selectView(p.key)}><img src={asset(`model/views/${p.key}.jpg`)} alt=""/><span>{p.label}</span></button>)}</div></nav>
   <div className="tools"><button aria-label="放大模型" disabled={disabled} onClick={()=>api.current?.zoom(.84)}><Icon name="plus"/></button><button aria-label="缩小模型" disabled={disabled} onClick={()=>api.current?.zoom(1/.84)}><Icon name="minus"/></button><span className="tool-divider"/><button disabled={disabled} onClick={()=>{api.current?.fit();setView('overall');}}><Icon name="fit"/><span>完整入画</span></button><button disabled={disabled} onClick={reset}><Icon name="reset"/><span>复位</span></button><button aria-label="保存模型截图" disabled={disabled} onClick={()=>api.current?.capture()}><Icon name="camera"/></button><div className="rotate"><Icon name="play"/><span>自动旋转</span><Switch label="自动旋转" checked={state.spin} disabled={disabled} onChange={()=>set('spin',!state.spin)}/></div></div>
   <div className="dock-meta"><span>{ready?qualityText:'BLENDER · WEB 3D'}<i/> 现存形态研究</span><span>拖动旋转 · 滚轮缩放 · 右键平移 · 点击选层</span></div>
  </footer>
  <dialog ref={dialog} className="about-dialog" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} aria-labelledby="about-title">
   <button className="dialog-close" aria-label="关闭建模说明" onClick={()=>dialog.current?.close()}><Icon name="close" size={22}/></button><p className="eyebrow">长安建筑志 / 02</p><h2 id="about-title">一座塔，千年长安。</h2>
   <div className="dialog-tabs"><button aria-pressed={infoTab==='about'} onClick={()=>setInfoTab('about')}>关于模型</button><button aria-pressed={infoTab==='sources'} onClick={()=>setInfoTab('sources')}>资料与依据</button></div>
   {infoTab==='about'?<><p>以西安大慈恩寺内现存的七层大雁塔为对象，使用 Blender 制作砖塔、檐口、券洞、碑龛与内部空间，通过网页自由观察。</p><p>建模单位为米。总高约 64.7 米、首层边长约 25.5 米采用公开参考口径；逐层尺寸、局部构造、风化和内部楼梯属于研究性推定，不代表现场测绘精度。</p><p>石刻保留简化形制，没有虚构原碑文字。剖视与展开用于解释空间，夜景为展示性照明。原始 Blender 工程与生成脚本随项目交付。</p><div className="credits"><span>建模 / GPT-6 + Blender</span><span>展示 / Three.js</span></div></>:<><p>建筑层数与总体形制参考公开资料，细节通过照片比对。开间属于立面划分；内部结构示意另行标识。</p><div className="sources">{sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer"><div><small>{s.publisher}</small><span>{s.title}</span></div><Icon name="arrow"/></a>)}</div><p className="source-note">材质为程序生成的原创贴图。研究图片不嵌入模型，资料存在差异的尺寸按约值表达。</p></>}
  </dialog>
 </div>;
}

