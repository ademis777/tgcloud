"use client";
import { useEffect, useState } from "react";
import { ArrowDownToLine, X, File as FileIcon, FileAudio, FileText, FileVideo, Image as ImageIcon, LoaderCircle, Play } from "lucide-react";
import { accessToken } from "@/lib/browser-api";
import { previewDescriptor, type PreviewKind } from "@/lib/file-preview";
import { usePreferences } from "@/components/preferences";

export type PreviewFile={id:string;name:string;mime_type:string;size_bytes:number;status:"pending"|"ready"|"failed"};
async function loadPreview(file:PreviewFile,signal:AbortSignal):Promise<Blob>{
 const response=await fetch("/api/files/"+encodeURIComponent(file.id)+"?view=1",{
  headers:{Authorization:"Bearer "+await accessToken()},cache:"no-store",signal,
 });
 if(!response.ok)throw new Error("Preview unavailable");
 const descriptor=previewDescriptor(file.mime_type,file.name);
 if(descriptor.kind==="unsupported")throw new Error("Unsupported");
 const blob=await response.blob();
 return new Blob([blob],{type:descriptor.contentType});
}
function FileIconFor({kind}:{kind:PreviewKind}){
 if(kind==="image")return <ImageIcon size={19}/>;
 if(kind==="video")return <FileVideo size={19}/>;
 if(kind==="audio")return <FileAudio size={19}/>;
 if(kind==="pdf"||kind==="text")return <FileText size={19}/>;
 return <FileIcon size={19}/>;
}
/** Decode a real browser-rendered frame; generated image is much smaller than the source MP4. */
async function makeVideoPoster(blob:Blob, signal:AbortSignal):Promise<string>{
 const source=URL.createObjectURL(blob);
 const video=document.createElement("video");
 video.muted=true;
 video.playsInline=true;
 video.preload="auto";
 try{
  await new Promise<void>((resolve,reject)=>{
   let finished=false;
   const complete=(error?:Error)=>{
    if(finished)return;
    finished=true;
    clearTimeout(timeout);
    video.onloadeddata=null;
    video.onerror=null;
    signal.removeEventListener("abort",onAbort);
    if(error)reject(error);else resolve();
   };
   const onAbort=()=>complete(new Error("Aborted"));
   const timeout=setTimeout(()=>complete(new Error("Video frame timed out")),15000);
   video.onloadeddata=()=>complete();
   video.onerror=()=>complete(new Error("Video cannot be decoded"));
   signal.addEventListener("abort",onAbort,{once:true});
   video.src=source;
   if(signal.aborted)onAbort();
  });
  if(signal.aborted || !video.videoWidth || !video.videoHeight)throw new Error("Video frame unavailable");
  const scale=Math.min(1,320/video.videoWidth,180/video.videoHeight);
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
  canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Canvas unavailable");
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",0.78);
 }finally{
  video.pause();
  video.removeAttribute("src");
  video.load();
  URL.revokeObjectURL(source);
 }
}
export function FileThumbnail({file}:{file:PreviewFile}){
 const kind=previewDescriptor(file.mime_type,file.name).kind;
 const [url,setUrl]=useState<string|null>(null);
 const [visible,setVisible]=useState(false);
 const [element,setElement]=useState<HTMLSpanElement|null>(null);
 useEffect(()=>{
  if(!element || (kind!=="image"&&kind!=="video") || file.status!=="ready")return;
  if(typeof IntersectionObserver==="undefined"){setVisible(true);return;}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    setVisible(true);
    observer.disconnect();
   }
  },{rootMargin:"120px"});
  observer.observe(element);
  return ()=>observer.disconnect();
 },[element,kind,file.status,file.id]);
 useEffect(()=>{
  if(!visible || (kind!=="image"&&kind!=="video") || file.status!=="ready")return;
  const controller=new AbortController();
  let objectUrl:string|null=null;
  void loadPreview(file,controller.signal).then(async blob=>{
   if(controller.signal.aborted)return;
   if(kind==="image"){
    objectUrl=URL.createObjectURL(blob);
    setUrl(objectUrl);
   }else{
    const poster=await makeVideoPoster(blob,controller.signal);
    if(!controller.signal.aborted)setUrl(poster);
   }
  }).catch(()=>{}); // Unsupported codec: retain the original video icon.
  return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[file.id,file.status,file.name,file.mime_type,kind,visible]);
 return <span ref={setElement} className="file-glyph preview-glyph">
  {url?<><img src={url} alt="" loading="lazy"/>{kind==="video"&&<span className="video-thumb-play" aria-hidden="true"><Play size={12} fill="currentColor"/></span>}</>:<FileIconFor kind={kind}/>}
 </span>;
}
export function FilePreviewModal({file,onClose,onDownload}:{file:PreviewFile;onClose:()=>void;onDownload:()=>void}){
 const {t}=usePreferences();
 const descriptor=previewDescriptor(file.mime_type,file.name);
 const [state,setState]=useState<{url:string|null;text:string|null;loading:boolean;error:boolean}>({url:null,text:null,loading:true,error:false});
 useEffect(()=>{
  const controller=new AbortController();let objectUrl:string|null=null;
  setState({url:null,text:null,loading:true,error:false});
  void loadPreview(file,controller.signal).then(async blob=>{
   if(controller.signal.aborted)return;
   if(descriptor.kind==="text"){
    const text=await blob.text();
    if(!controller.signal.aborted)setState({url:null,text,loading:false,error:false});
   }else{
    objectUrl=URL.createObjectURL(blob);
    if(!controller.signal.aborted)setState({url:objectUrl,text:null,loading:false,error:false});
   }
  }).catch(()=>{if(!controller.signal.aborted)setState({url:null,text:null,loading:false,error:true});});
  return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[file.id,file.name,file.mime_type,descriptor.kind]);
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};
  window.addEventListener("keydown",key);
  return ()=>window.removeEventListener("keydown",key);
 },[onClose]);
 return <div className="preview-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
  <section className="preview-dialog" role="dialog" aria-modal="true" aria-label={file.name}>
   <header className="preview-header">
    <strong className="preview-heading" title={file.name}><FileIconFor kind={descriptor.kind}/>{file.name}</strong>
    <div className="preview-actions">
     <button type="button" className="button outline" onClick={onDownload}><ArrowDownToLine size={16}/>{t("dashboardDownload")}</button>
     <button type="button" className="preview-close" onClick={onClose} aria-label={t("previewClose")}><X size={20}/></button>
    </div>
   </header>
   <div className="preview-content">
    {state.loading&&<div className="preview-status"><LoaderCircle className="preview-spinner" size={25}/>{t("previewLoading")}</div>}
    {state.error&&<div className="preview-status">{t("previewError")}</div>}
    {!state.loading&&!state.error&&state.url&&descriptor.kind==="image"&&<img className="preview-image" src={state.url} alt={file.name}/>}
    {!state.loading&&!state.error&&state.url&&descriptor.kind==="video"&&<video className="preview-player" src={state.url} controls playsInline preload="metadata"/>}
    {!state.loading&&!state.error&&state.url&&descriptor.kind==="audio"&&<div className="preview-audio"><FileAudio size={50}/><audio src={state.url} controls preload="metadata"/></div>}
    {!state.loading&&!state.error&&state.url&&descriptor.kind==="pdf"&&<iframe className="preview-pdf" src={state.url} title={file.name}/>}
    {!state.loading&&!state.error&&state.text!==null&&<pre className="preview-text">{state.text}</pre>}
   </div>
  </section>
 </div>;
}
