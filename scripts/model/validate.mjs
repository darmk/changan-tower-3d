import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {getBounds} from '@gltf-transform/functions';
import validator from 'gltf-validator';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const manifest=JSON.parse(await fs.readFile('public/model/manifest.json','utf8'));const report={};let failed=false;
for(const [key,v] of Object.entries(manifest.variants)){
 const bytes=await fs.readFile('public/model/'+v.file);
 const checked=await validator.validateBytes(bytes,{uri:v.file,maxIssues:30});
 const doc=await io.readBinary(bytes);const nodes=doc.getRoot().listNodes();
 for(const extension of doc.getRoot().listExtensionsUsed())if(extension.extensionName.includes('meshopt'))extension.dispose();
 const decoded=await validator.validateBytes(await io.writeBinary(doc),{uri:'decoded-'+v.file,maxIssues:30});
 const levels=nodes.filter(n=>/^Floor\d\d$/.test(n.getName()));
 const bounds=getBounds(doc.getRoot().listScenes()[0]);
 const size=bounds.max.map((x,i)=>x-bounds.min[i]);
 let badCoordinates=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())for(const x of p.getAttribute('POSITION').getArray())if(!Number.isFinite(x))badCoordinates++;
 const contract=levels.length===7 && nodes.filter(n=>n.getExtras().componentType==='facade').length===28 && nodes.some(n=>n.getName()==='Stele_West') && nodes.some(n=>n.getName()==='Stele_East') && Math.abs(size[1]-64.7)<.1 && !badCoordinates;
 report[key]={issues:checked.issues,decodedIssues:decoded.issues,bounds,size,levels:levels.map(n=>n.getName()),contract,badCoordinates};
 if(checked.issues.numErrors||decoded.issues.numErrors||!contract)failed=true;
 console.log(key,JSON.stringify({errors:checked.issues.numErrors,warnings:checked.issues.numWarnings,decodedErrors:decoded.issues.numErrors,decodedWarnings:decoded.issues.numWarnings,size,contract}));
}
await fs.mkdir('docs/qa',{recursive:true});await fs.writeFile('docs/qa/model-validation.json',JSON.stringify(report,null,2));
if(failed)process.exitCode=1;
