import test from "node:test";
import assert from "node:assert/strict";
import { runUploadQueue,validateUploadCount,MAX_UPLOAD_BATCH,MAX_UPLOAD_BYTES } from "../src/lib/upload-queue.ts";
test("one selection supports 20 sequential files",async()=>{
 const input=Array.from({length:20},(_,i)=>({name:"photo-"+i+".jpg",size:1024}));
 const order=[];let active=0,maxActive=0;const snapshots=[];
 const result=await runUploadQueue(input,async(file,index)=>{
  active++;maxActive=Math.max(maxActive,active);order.push(index);
  await Promise.resolve();active--;
 },p=>snapshots.push(p),"Too large");
 assert.equal(result.uploaded,20);assert.equal(result.failed,0);
 assert.equal(maxActive,1);assert.deepEqual(order,input.map((_,i)=>i));
 assert.deepEqual(snapshots.at(-1).items.map(x=>x.status),Array(20).fill("uploaded"));
});
test("oversize and API failures do not stop following files",async()=>{
 const files=[{name:"one",size:2},{name:"huge",size:MAX_UPLOAD_BYTES+1},{name:"bad",size:3},{name:"last",size:4}];
 const sent=[];
 const result=await runUploadQueue(files,async f=>{sent.push(f.name);if(f.name==="bad")throw Error("Telegram unavailable");},()=>{},"Too large");
 assert.deepEqual(sent,["one","bad","last"]);
 assert.deepEqual(result.items.map(x=>x.status),["uploaded","failed","failed","uploaded"]);
 assert.equal(result.items[1].error,"Too large");
 assert.equal(result.items[2].error,"Telegram unavailable");
 assert.equal(result.done,4);assert.equal(result.uploaded,2);assert.equal(result.failed,2);
});
test("batch limit is explicit",()=>{
 assert.equal(validateUploadCount(0),false);
 assert.equal(validateUploadCount(1),true);
 assert.equal(validateUploadCount(MAX_UPLOAD_BATCH),true);
 assert.equal(validateUploadCount(MAX_UPLOAD_BATCH+1),false);
});
