import test from "node:test";
import assert from "node:assert/strict";
// Telegram's sendDocument may normalize known media into its video/audio/animation fields.
import { sentMediaFileId } from "../src/lib/telegram-media.ts";
const id="FILE_ID_123";
for(const kind of ["document","video","audio","animation","voice","video_note"]){
  test("extracts "+kind+" response",()=>assert.equal(sentMediaFileId({message_id:42,[kind]:{file_id:id}}),id));
}
test("photo array uses the largest available representation",()=>{
 assert.equal(sentMediaFileId({message_id:42,photo:[{file_id:"small"},{file_id:"large"}]}),"large");
});
test("missing media is detectable, never marks it ready",()=>{
 assert.equal(sentMediaFileId({message_id:42}),null);
});
