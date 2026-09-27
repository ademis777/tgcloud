import test from "node:test";
import assert from "node:assert/strict";
import { detectLocale, localeCodes, translate } from "../src/lib/i18n.ts";

test("IP country selects supported locale",()=>{
  assert.equal(detectLocale(undefined,"UA","en-US,en;q=0.9"),"uk");
  assert.equal(detectLocale(undefined,"FR","en-US,en;q=0.9"),"fr");
  assert.equal(detectLocale(undefined,"DE","en-US,en;q=0.9"),"de");
  assert.equal(detectLocale(undefined,"MX","en-US,en;q=0.9"),"es");
  assert.equal(detectLocale(undefined,"US","ru-RU,ru;q=0.9"),"en");
});
test("manual cookie wins over country/IP and browser",()=>{
  assert.equal(detectLocale("de","UA","fr-FR"),"de");
  assert.equal(detectLocale("uk","US","en-US"),"uk");
});
test("fallback uses Accept-Language then English",()=>{
  assert.equal(detectLocale(undefined,null,"fr-CA,fr;q=0.9,en;q=0.8"),"fr");
  assert.equal(detectLocale("invalid","ZZ","pt-BR,ja;q=0.8,en;q=0.4"),"en");
  assert.equal(detectLocale(undefined,null,null),"en");
});
test("translations exist in all six languages",()=>{
  assert.equal(localeCodes.length,6);
  for(const locale of localeCodes){
    const string=translate(locale,"dashboardItems",{count:3});
    assert.ok(string.includes("3"),locale);
    assert.notEqual(translate(locale,"heroTitle1").length,0);
  }
});
