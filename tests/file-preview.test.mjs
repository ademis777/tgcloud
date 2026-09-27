import test from "node:test";
import assert from "node:assert/strict";
import { previewDescriptor } from "../src/lib/file-preview.ts";
const cases=[
 ["image/png","photo.png","image"],["video/mp4","clip.mp4","video"],
 ["application/octet-stream","clip.mp4","video"],["audio/mpeg","song.mp3","audio"],
 ["application/pdf","report.pdf","pdf"],["application/json","data.json","text"],
 ["text/plain","notes.txt","text"],["application/octet-stream","notes.md","text"],
 ["image/svg+xml","test.svg","unsupported"],["text/html","test.jpg","unsupported"],
 ["application/octet-stream","code.html","unsupported"],["application/zip","archive.zip","unsupported"],
];
for(const [mime,name,kind] of cases)test("classifies "+name+" "+mime,()=>assert.equal(previewDescriptor(mime,name).kind,kind));
test("active uploaded content is never rendered inline",()=>{
 for(const mime of ["text/html","application/xhtml+xml","image/svg+xml","application/javascript"])
  assert.equal(previewDescriptor(mime,"fake.pdf").kind,"unsupported");
});
