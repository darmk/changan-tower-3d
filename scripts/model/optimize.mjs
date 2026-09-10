import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,unweld,meshopt,simplify,textureCompress,tangents} from '@gltf-transform/functions';
import * as MikkTSpace from 'three/addons/libs/mikktspace.module.js';
import {MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
await MeshoptEncoder.ready;await MeshoptSimplifier.ready;await MikkTSpace.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
function cleanGeometry(doc){
 for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  const position=primitive.getAttribute('POSITION'),indices=primitive.getIndices();
  if(indices){const keep=[],a=[],b=[],c=[];for(let i=0;i<indices.getCount();i+=3){const x=indices.getScalar(i),y=indices.getScalar(i+1),z=indices.getScalar(i+2);if(x===y||y===z||x===z)continue;position.getElement(x,a);position.getElement(y,b);position.getElement(z,c);const u=b.map((v,j)=>v-a[j]),v=c.map((w,j)=>w-a[j]);const area=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);if(area>1e-12)keep.push(x,y,z);}indices.setArray(new Uint32Array(keep));}
  const tangent=primitive.getAttribute('TANGENT'),normal=primitive.getAttribute('NORMAL');
  if(tangent){const t=[],n=[];for(let i=0;i<tangent.getCount();i++){tangent.getElement(i,t);let length=Math.hypot(...t.slice(0,3));if(length<.1){normal.getElement(i,n);const axis=Math.abs(n[1])<.9?[0,1,0]:[1,0,0];t[0]=axis[1]*n[2]-axis[2]*n[1];t[1]=axis[2]*n[0]-axis[0]*n[2];t[2]=axis[0]*n[1]-axis[1]*n[0];length=Math.hypot(...t.slice(0,3));}tangent.setElement(i,[t[0]/length,t[1]/length,t[2]/length,t[3]<0?-1:1]);}}
 }
}
const report={generatedAt:new Date().toISOString(),generator:'Blender 4.2 LTS + glTF-Transform',variants:{}};
for(const [key,name,size,ratio] of [['high','dayan-pagoda-hd.glb',2048,1],['standard','dayan-pagoda.glb',1536,.78],['mobile','dayan-pagoda-mobile.glb',1024,.5]]){
 const doc=await io.read('blender/dayan-pagoda-raw.glb');
 const scenes=doc.getRoot().listScenes();
 const scene=scenes.find(s=>s.listChildren().length>0);
 if(!scene)throw new Error('No model scene in Blender export');
 doc.getRoot().setDefaultScene(scene);
 for(const s of scenes)if(s!==scene&&s.listChildren().length===0)s.dispose();
 await doc.transform(dedup(),weld());
 if(ratio<1)await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio,error:.0002}));
 cleanGeometry(doc);
 await doc.transform(unweld(),tangents({generateTangents:MikkTSpace.generateTangents}),weld());
 cleanGeometry(doc);
 await doc.transform(prune({keepLeaves:true}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[size,size],quality:92}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 cleanGeometry(doc);
 let triangles=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
 const bytes=await io.writeBinary(doc);await fs.writeFile('public/model/'+name,bytes);
 report.variants[key]={file:name,bytes:bytes.length,triangles,meshes:doc.getRoot().listMeshes().length,textures:doc.getRoot().listTextures().length};
 console.log(key,report.variants[key]);
}
await fs.writeFile('public/model/manifest.json',JSON.stringify(report,null,2));

