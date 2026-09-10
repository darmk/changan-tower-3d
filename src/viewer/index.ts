import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {asset,floors,initialState,type Pose,type Quality,type ViewState} from '../data';

export interface ViewerAPI {view:(key:string)=>void;update:(s:ViewState)=>void;quality:(q:Quality)=>Promise<void>;fit:()=>void;zoom:(factor:number)=>void;capture:()=>void;dispose:()=>void}
interface Hooks {onReady:()=>void;onProgress:(n:number)=>void;onError:(message:string)=>void;onStats:(s:string)=>void;onSelect:(level:number)=>void;onManual:()=>void;onBusy:(busy:boolean)=>void}

function disposeObject(object:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 object.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{if(t.source?.data instanceof ImageBitmap)t.source.data.close();t.dispose();});
}

export async function createViewer(host:HTMLDivElement,poses:Pose[],quality:Quality,hooks:Hooks):Promise<ViewerAPI>{
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 host.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','大雁塔交互模型，拖动旋转，方向键平移');
 const scene=new T.Scene();const camera=new T.PerspectiveCamera(33,1,.04,1200);camera.position.set(90,65,130);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,29,0);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=.5;controls.maxDistance=500;controls.maxPolarAngle=Math.PI*.92;controls.autoRotateSpeed=.35;controls.listenToKeyEvents(renderer.domElement);
 const pmrem=new T.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.025);scene.environment=environment.texture;scene.environmentIntensity=.30;pmrem.dispose();room.dispose();
 const hemi=new T.HemisphereLight('#fff3dd','#b4aa99',1.6);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff1d9',3.1);sun.position.set(-42,83,54);sun.target.position.set(0,24,0);scene.add(sun,sun.target);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-50,right:50,top:60,bottom:-45,near:1,far:200});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;
 const fill=new T.DirectionalLight('#dce6eb',.7);fill.position.set(45,35,-20);scene.add(fill);
 const ground=new T.Mesh(new T.PlaneGeometry(300,300),new T.ShadowMaterial({color:'#4d3b29',opacity:.14,depthWrite:false}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
 const nightLights=new T.Group();scene.add(nightLights);
 for(const x of [-19,19])for(const z of [-19,19]){const l=new T.SpotLight('#ffd397',3300,120,.39,.75,1.5);l.position.set(x,5.4,z);l.target.position.set(x*.15,36,z*.15);nightLights.add(l,l.target);}nightLights.visible=false;
 const indoor=new T.Group();scene.add(indoor);for(const f of floors){const l=new T.PointLight('#ffe2b1',12,18,1.5);l.position.set(0,f.z+f.h*.55,0);indoor.add(l);}
 let state={...initialState},model:T.Group|null=null,disposed=false,frameId=0,requestId=0,overview=true,currentPose='overall';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let tween:null|{a:T.Vector3;b:T.Vector3;c:T.Vector3;d:T.Vector3;start:number}=null;
 const layerNodes:T.Object3D[]=[];const initialPos=new Map<T.Object3D,T.Vector3>();
 const selectedBox=new T.Box3Helper(new T.Box3(),new T.Color('#a84631'));selectedBox.visible=false;scene.add(selectedBox);
 const dimensionGroup=new T.Group();scene.add(dimensionGroup);dimensionGroup.visible=false;
 const lineMaterial=new T.LineBasicMaterial({color:'#aa7651'});
 function line(points:number[][]){const geom=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));dimensionGroup.add(new T.Line(geom,lineMaterial));}
 line([[29,0,0],[31,0,0],[30,0,0],[30,64.7,0],[29,64.7,0],[31,64.7,0]]);
 line([[-12.75,4.3,17],[-12.75,4.3,19],[-12.75,4.3,18],[12.75,4.3,18],[12.75,4.3,17],[12.75,4.3,19]]);
 const labels:[HTMLSpanElement,T.Vector3][]=[];
 for(const [label,point] of [['约 64.7 m',[30,33,0]],['首层约 25.5 m',[0,4.4,18]]] as [string,number[]][]){const el=document.createElement('span');el.className='dimension-label';el.textContent=label;el.hidden=true;host.appendChild(el);labels.push([el,new T.Vector3(...point)]);}
 const southPlane=new T.Plane(new T.Vector3(0,0,-1),0),sectionPlanes=[southPlane];
 const cutCaps=new T.Group();scene.add(cutCaps);cutCaps.visible=false;
 const capMaterial=new T.MeshStandardMaterial({color:'#8e7051',roughness:1,side:T.DoubleSide});
 // Cut surfaces follow wall taper and preserve the east/west doorway section.
 function cap(points:number[][],level:number){const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],p[1])));const mesh=new T.Mesh(new T.ShapeGeometry(shape),capMaterial);mesh.position.z=.05;mesh.userData.floor=level;cutCaps.add(mesh);}
 for(const f of floors){const inner=[8,7.8,7.5,7.1,6.6,6,5.4][f.n-1]/2,outer=f.w/2,taper=[1,.9,.85,.8,.7,.65,.6][f.n-1]/2;
  const doorTop=f.z+[3.7,3.47,3.22,3.07,2.92,2.82,2.67][f.n-1],wallTop=f.z+f.h-1.08;
  for(const sign of [-1,1]){
   cap([[sign*inner,doorTop],[sign*(outer-taper*(doorTop-f.z)/(f.h-1.08)),doorTop],[sign*(outer-taper),wallTop],[sign*inner,wallTop]],f.n);
   if(f.n>1)cap([[sign*inner,f.z],[sign*outer,f.z],[sign*outer,f.z+.12],[sign*inner,f.z+.12]],f.n);
   cap([[sign*inner,wallTop],[sign*(outer-taper+.65),wallTop+.5],[sign*(outer-taper+.65),wallTop+.6],[sign*(outer-taper),f.z+f.h-.1],[sign*inner,f.z+f.h-.1]],f.n);
  }
 }
 const crownProfile:number[][]=[[-6.3,55.6],[6.3,55.6]];for(let j=1;j<=40;j++){const t=j/40;crownProfile.push([(3.2+9.4*(1-t)**1.9)/2,55.6+t*4.5]);}for(let j=40;j>=1;j--){const t=j/40;crownProfile.push([-(3.2+9.4*(1-t)**1.9)/2,55.6+t*4.5]);}cap(crownProfile,7);
 const raycaster=new T.Raycaster();let pointerDown={x:0,y:0};
 function down(e:PointerEvent){pointerDown={x:e.clientX,y:e.clientY};}
 function pick(e:PointerEvent){if(!model||Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>5)return;
  const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
  for(const hit of raycaster.intersectObject(model,true)){let o:T.Object3D|null=hit.object;let visible=true;while(o){if(!o.visible)visible=false;o=o.parent;}if(!visible)continue;if(state.section==='quarter'&&hit.point.z>0)continue;
   const level=Number(hit.object.userData.floor);if(level>0){hooks.onSelect(level);break;}}
 }
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',pick);
 controls.addEventListener('start',()=>{tween=null;overview=false;hooks.onManual();});

 function move(position:T.Vector3,target:T.Vector3,instant=false){
  if(instant||reduced.matches){camera.position.copy(position);controls.target.copy(target);controls.update();tween=null;}
  else tween={a:camera.position.clone(),b:controls.target.clone(),c:position,d:target,start:performance.now()};
 }
 function fit(instant=false){if(!model)return;overview=true;model.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(model);const center=box.getCenter(new T.Vector3());center.y-=2;
  const direction=(currentPose==='section'?new T.Vector3(.22,.14,1):new T.Vector3(.56,.29,.83)).normalize(),right=new T.Vector3().crossVectors(camera.up,direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
  const tanV=Math.tan(T.MathUtils.degToRad(camera.fov/2))*.88,tanH=tanV*camera.aspect;
  let distance=0;const v=new T.Vector3();
  // Fit actual vertices. Empty space above the broad platform must not shrink the tower.
  model.traverse(o=>{if(!(o instanceof T.Mesh))return;const attr=o.geometry.getAttribute('position');for(let i=0;i<attr.count;i+=Math.max(1,Math.floor(attr.count/3500))){v.fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld).sub(center);distance=Math.max(distance,Math.abs(v.dot(right))/tanH+v.dot(direction),Math.abs(v.dot(up))/tanV+v.dot(direction));}});
  move(center.clone().addScaledVector(direction,distance),center,instant);
 }
 function view(key:string){currentPose=key;controls.autoRotate=false;if(key==='overall'||key==='section'){fit();return;}overview=false;const p=poses.find(p=>p.key===key);if(!p)return;
  // Indoor jumps deliberately avoid flying the camera through solid masonry.
  const pos=new T.Vector3(...p.position),target=new T.Vector3(...p.target);move(pos,target,!!p.interior);
 }
 function update(s:ViewState){const old=state;state={...s};
  hemi.intensity=s.night?.32:1.6;sun.intensity=s.night?.12:3.1;fill.intensity=s.night?.14:.7;scene.environmentIntensity=s.night?.1:.3;
  renderer.toneMappingExposure=s.night?1.5:1.03;nightLights.visible=s.night;controls.autoRotate=s.spin&&!reduced.matches;
  dimensionGroup.visible=s.dimensions&&s.explode===0;labels.forEach(([e])=>e.hidden=!dimensionGroup.visible);
  indoor.visible=s.interior;
  if(model){
   for(const n of layerNodes){const base=initialPos.get(n)!;const floor=Number(n.userData.floor)||7;n.position.copy(base);n.position.y+=(floor-1)*s.explode*.065;}
   model.traverse(o=>{
    const type=o.userData.componentType;
    if(type==='facade')o.visible=!(s.section==='south'&&o.userData.facade==='S');
    if(type==='eaves')o.visible=s.eaves;
    if(type==='interior')o.visible=s.interior;
    if(o instanceof T.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material]){const material=m as T.MeshStandardMaterial;const desired=s.section==='quarter'&&o.userData.floor>0?sectionPlanes:null;if(material.clippingPlanes!==desired){material.clippingPlanes=desired;material.clipShadows=true;material.needsUpdate=true;}}}
   });
   renderer.localClippingEnabled=s.section==='quarter';cutCaps.visible=s.section==='quarter';
   model.updateMatrixWorld(true);
   selectedBox.visible=s.floor>0;
   if(s.floor){const n=model.getObjectByName(`Floor${String(s.floor).padStart(2,'0')}`);if(n)selectedBox.box.setFromObject(n);if(s.floor!==old.floor){const f=floors[s.floor-1],y=f.z+f.h*.45+(f.n-1)*s.explode*.065;overview=false;move(new T.Vector3(f.w*1.5,y+f.h*.4,f.w*2.0),new T.Vector3(0,y,0));}}
  }
  if(s.explode!==old.explode)fit(true);
 }
 async function load(q:Quality){const id=++requestId;hooks.onBusy(true);hooks.onProgress(0);
  const file=q==='high'?'dayan-pagoda-hd.glb':q==='mobile'?'dayan-pagoda-mobile.glb':'dayan-pagoda.glb';
  try{const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(asset('model/'+file),e=>{if(id===requestId&&e.total)hooks.onProgress(Math.round(e.loaded/e.total*100));});
   if(disposed||id!==requestId){disposeObject(gltf.scene);return;}
   if(model){scene.remove(model);disposeObject(model);}model=gltf.scene;scene.add(model);layerNodes.length=0;initialPos.clear();
   model.traverse(o=>{if(o.userData.componentType==='floor'||o.name==='Crown'){layerNodes.push(o);initialPos.set(o,o.position.clone());}
    if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of Array.isArray(o.material)?o.material:[o.material]){const mat=m as T.MeshStandardMaterial;for(const tex of [mat.map,mat.normalMap,mat.roughnessMap,mat.aoMap])if(tex)tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}}});
   update(state);fit(true);hooks.onReady();hooks.onBusy(false);hooks.onStats(q==='high'?'高清模型':q==='mobile'?'轻量模型':'标准模型');
  }catch(error){if(disposed||id!==requestId)return;hooks.onBusy(false);hooks.onError(model?'画质切换失败，已保留当前模型。':'模型载入失败，请重试或查看静态预览。');throw error;}
 }
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(overview)fit(true);}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 let frames=0,started=performance.now();
 function frame(t:number){if(disposed)return;frameId=requestAnimationFrame(frame);if(document.hidden)return;
  if(tween){const r=Math.min(1,(t-tween.start)/850),k=r*r*(3-2*r);camera.position.lerpVectors(tween.a,tween.c,k);controls.target.lerpVectors(tween.b,tween.d,k);if(r===1)tween=null;}
  controls.update();for(const [e,v]of labels){if(e.hidden)continue;const p=v.clone().project(camera);e.style.left=(p.x*.5+.5)*host.clientWidth+'px';e.style.top=(-p.y*.5+.5)*host.clientHeight+'px';e.style.visibility=p.z>1?'hidden':'visible';}
  renderer.render(scene,camera);frames++;
  if(t-started>2000){const fps=Math.round(frames*1000/(t-started));host.dataset.fps=String(fps);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.mode=state.section;host.dataset.loaded=String(!!model);frames=0;started=t;}
 }
 frameId=requestAnimationFrame(frame);
 const api:ViewerAPI={view,update,quality:load,fit:()=>fit(),zoom:(factor)=>{overview=false;tween=null;const offset=camera.position.clone().sub(controls.target);const distance=T.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset.setLength(distance));},capture:()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download='西安大雁塔.png';a.href=renderer.domElement.toDataURL('image/png');a.click();},dispose:()=>{disposed=true;requestId++;cancelAnimationFrame(frameId);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',pick);controls.dispose();if(model)disposeObject(model);ground.geometry.dispose();(ground.material as T.Material).dispose();dimensionGroup.traverse(o=>{if(o instanceof T.Line)o.geometry.dispose();});lineMaterial.dispose();cutCaps.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});capMaterial.dispose();selectedBox.geometry.dispose();(selectedBox.material as T.Material).dispose();environment.dispose();renderer.dispose();host.replaceChildren();}};
 void load(quality).catch(()=>{});return api;
}
