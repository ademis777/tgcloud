import test from "node:test";
import assert from "node:assert/strict";
import { accountProfile } from "../src/lib/account-profile.ts";

test("renders Telegram name, handle and secure avatar",()=>{
  const p=accountProfile({identities:[{provider:"custom:telegram",identity_data:{name:"Alex Test",preferred_username:"alex_test",picture:"https://example.org/p.png"}}]});
  assert.deepEqual(p,{displayName:"Alex Test",userLabel:"@alex_test",avatarUrl:"https://example.org/p.png",authMethod:"telegram"});
});
test("falls back to email and excludes unsafe profile-picture schemes",()=>{
  assert.deepEqual(accountProfile({email:"tester@example.org",user_metadata:{avatar_url:"javascript:alert(1)"}}),{displayName:"tester",userLabel:"tester@example.org",avatarUrl:null,authMethod:"email"});
});
test("uses Telegram metadata when no identity object is included",()=>{
  const p=accountProfile({user_metadata:{iss:"https://oauth.telegram.org",given_name:"Sam",preferred_username:"sam",picture:"http://example.org/a.jpg"}});
  assert.equal(p.authMethod,"telegram");assert.equal(p.displayName,"Sam");assert.equal(p.avatarUrl,null);
});
