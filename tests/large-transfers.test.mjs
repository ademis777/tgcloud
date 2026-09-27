import test from "node:test";
import assert from "node:assert/strict";
import {LOCAL_BOT_MAX_BYTES,TRANSFER_CHUNK_BYTES,validLargeFileSize,validTransferProgress,canTransitionTransfer} from "../src/lib/large-transfers.ts";
test("local bot size is 2000 decimal MB, chunks are six MiB",()=>{
 assert.equal(LOCAL_BOT_MAX_BYTES,2_000_000_000);
 assert.equal(TRANSFER_CHUNK_BYTES,6*1024*1024);
 for(const n of [1,100_000_000,500_000_000,1_000_000_000,2_000_000_000])assert.equal(validLargeFileSize(n),true);
 for(const n of [0,-1,2_000_000_001,NaN,Infinity,1.5])assert.equal(validLargeFileSize(n),false);
});
test("transition guard stops accidental ready, retry or cancellation after sending",()=>{
 assert.equal(canTransitionTransfer("created","uploading"),true);
 assert.equal(canTransitionTransfer("uploading","staged"),true);
 assert.equal(canTransitionTransfer("staged","sending"),true);
 assert.equal(canTransitionTransfer("sending","ready"),true);
 assert.equal(canTransitionTransfer("sending","uploading"),false);
 assert.equal(canTransitionTransfer("sending","canceled"),false);
 assert.equal(canTransitionTransfer("ready","sending"),false);
});
test("progress cannot exceed declared size",()=>{
 assert.equal(validTransferProgress(2_000_000_000,2_000_000_000),true);
 assert.equal(validTransferProgress(100,0),true);
 assert.equal(validTransferProgress(100,101),false);
 assert.equal(validTransferProgress(100,-1),false);
});
