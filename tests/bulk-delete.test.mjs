import test from "node:test";
import assert from "node:assert/strict";
import { runBulkDelete } from "../src/lib/bulk-delete.ts";
test("deletes 200 unique files in bounded concurrency",async()=>{
 let active=0,maximum=0;const progress=[];
 const ids=Array.from({length:200},(_,i)=>"file-"+i);
 const result=await runBulkDelete(ids,async()=>{
  active++;maximum=Math.max(maximum,active);
  await Promise.resolve();
  active--;
 },p=>progress.push({...p}),2);
 assert.equal(result.deletedIds.length,200);
 assert.deepEqual(result.failedIds,[]);
 assert.equal(maximum,2);
 assert.deepEqual(progress.at(-1),{done:200,total:200,deleted:200,failed:0});
});
test("partial Telegram failures stay failed and are not counted as deletions",async()=>{
 const progress=[];
 const result=await runBulkDelete(["a","b","c","b"],async id=>{
   if(id==="b")throw new Error("Telegram did not confirm deletion");
 },p=>progress.push({...p}),2);
 assert.equal(result.deletedIds.length,2);
 assert.deepEqual(result.failedIds,["b"]);
 assert.equal(result.firstError,"Telegram did not confirm deletion");
 assert.deepEqual(progress.at(-1),{done:3,total:3,deleted:2,failed:1});
});
test("empty selection is a no-op",async()=>{
 const progress=[];
 const result=await runBulkDelete([],async()=>{throw Error("never")},p=>progress.push(p));
 assert.deepEqual(result,{deletedIds:[],failedIds:[],firstError:null});
 assert.deepEqual(progress,[{done:0,total:0,deleted:0,failed:0}]);
});
