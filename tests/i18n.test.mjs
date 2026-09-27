import test from "node:test";
import assert from "node:assert/strict";
import { detectLocale, localeCodes, publicLocaleCodes, regionalLocale, translate } from "../src/lib/i18n.ts";

const globalLocales=["en","fr","es","de"];
test("public list is browser-first and region-aware",()=>{
  assert.deepEqual(publicLocaleCodes("UA","uk-UA,uk;q=0.9,en;q=0.8"),[...globalLocales,"uk"]);
  assert.deepEqual(publicLocaleCodes("UA","ru-RU,ru;q=0.9,uk;q=0.8"),[...globalLocales,"ru"]);
  assert.deepEqual(publicLocaleCodes("RU","uk-UA,uk;q=0.9,ru;q=0.8"),[...globalLocales,"uk"]);
  assert.deepEqual(publicLocaleCodes("RU","en-US,en;q=0.9"),[...globalLocales,"ru"]);
  assert.deepEqual(publicLocaleCodes("UA","en-US,en;q=0.9"),[...globalLocales,"uk"]);
  assert.deepEqual(publicLocaleCodes("US","en-US,en;q=0.9"),globalLocales);
  assert.deepEqual(publicLocaleCodes("FR","fr-FR,fr;q=0.9"),globalLocales);
  assert.deepEqual(publicLocaleCodes(null,"de-DE,de;q=0.9"),globalLocales);
  assert.deepEqual(publicLocaleCodes("US","ru-RU,ru;q=0.9"),[...globalLocales,"ru"]);
  assert.deepEqual(publicLocaleCodes("US","uk-UA,uk;q=0.9"),[...globalLocales,"uk"]);
  assert.equal(regionalLocale("UA","en-US,en;q=0.9"),"uk");
  assert.equal(regionalLocale("RU","ru-RU,ru;q=0.9"),"ru");
});
test("public cookie cannot leak a restricted regional language into another region",()=>{
  assert.equal(detectLocale("ru","US","en-US,en;q=0.9"),"en");
  assert.equal(detectLocale("uk","US","en-US,en;q=0.9"),"en");
  assert.equal(detectLocale("ru","UA","uk-UA,uk;q=0.9"),"uk");
  assert.equal(detectLocale("uk","RU","ru-RU,ru;q=0.9"),"ru");
  assert.equal(detectLocale("uk","UA","en-US,en;q=0.9"),"uk");
  assert.equal(detectLocale("de","UA","ru-RU,ru;q=0.9"),"de");
});
test("IP and browser fallback select supported languages",()=>{
  assert.equal(detectLocale(undefined,"FR",null),"fr");
  assert.equal(detectLocale(undefined,"DE",null),"de");
  assert.equal(detectLocale(undefined,"MX",null),"es");
  assert.equal(detectLocale(undefined,"UA",null),"uk");
  assert.equal(detectLocale(undefined,"RU",null),"ru");
  assert.equal(detectLocale(undefined,null,"fr-CA,fr;q=0.9,en;q=0.8"),"fr");
  assert.equal(detectLocale(undefined,"US","ru-RU,ru;q=0.9"),"ru");
  assert.equal(detectLocale(undefined,"ZZ","pt-BR,ja;q=0.8,en;q=0.4"),"en");
  assert.equal(detectLocale(undefined,null,null),"en");
});
test("all six dictionaries remain available in authenticated account settings",()=>{
  assert.deepEqual(localeCodes,["en","fr","es","de","uk","ru"]);
  for(const locale of localeCodes){
    for(const key of ["heroTitle1","authTelegram","dashboardAccount","settings","settingsLanguage","settingsLanguageSaved"]){
      assert.ok(translate(locale,key).length>0,locale+" "+key);
    }
    assert.ok(translate(locale,"dashboardItems",{count:3}).includes("3"));
  }
});

test("both deletion modes have unambiguous localized text",()=>{
  for(const locale of localeCodes){
    for(const key of ["dashboardRemoveConfirm","dashboardRemoved","dashboardRemoveError","dashboardCatalogOnlyAction","dashboardCatalogOnlyConfirm","dashboardCatalogOnlyRemoved"])
      assert.ok(translate(locale,key).length>12,locale+" "+key);
  }
});
