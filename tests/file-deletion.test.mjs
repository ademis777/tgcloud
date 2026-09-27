import test from "node:test";
import assert from "node:assert/strict";
import { telegramDeletionTarget } from "../src/lib/file-deletion.ts";

const file={status:"ready",tg_message_id:125,tg_chat_id:"-1001234567890",tg_bot_id:99999999};
test("only the original storage bot and channel may delete a recorded Telegram message",()=>{
  assert.deepEqual(telegramDeletionTarget(file,{bot_id:99999999}),{kind:"target",chatId:"-1001234567890",messageId:125});
  assert.deepEqual(telegramDeletionTarget(file,{bot_id:11111111}),{kind:"error",reason:"bot-changed"});
  assert.deepEqual(telegramDeletionTarget(file,null),{kind:"error",reason:"connection-missing"});
});
test("never guess the target of a legacy or incomplete record",()=>{
  assert.deepEqual(telegramDeletionTarget({...file,tg_chat_id:null},{bot_id:99999999}),{kind:"error",reason:"unknown-origin"});
  assert.deepEqual(telegramDeletionTarget({...file,tg_message_id:null},{bot_id:99999999}),{kind:"error",reason:"missing-message"});
  assert.deepEqual(telegramDeletionTarget({...file,tg_message_id:"oops"},{bot_id:99999999}),{kind:"error",reason:"invalid-message"});
});
test("a failed upload with no Telegram message is staging/catalog only",()=>{
  assert.deepEqual(telegramDeletionTarget({status:"failed",tg_message_id:null,tg_chat_id:null,tg_bot_id:null},null),{kind:"none"});
});
