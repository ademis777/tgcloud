"use client";
import { useEffect, useState } from "react";
import { ArrowDownToLine, X, File as FileIcon, FileAudio, FileText, FileVideo, Image as ImageIcon, LoaderCircle } from "lucide-react";
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
export function FileThumbnail({file}:{file:PreviewFile}){
 const kind=previewDescriptor(file.mime_type,file.name).kind;
 const [url,setUrl]=useState<string|null>(null);
 useEffect(()=>{
  if(kind!=="image"||file.status!=="ready")return;
  const controller=new AbortController();let objectUrl:string|null=null;
  void loadPreview(file,controller.signal).then(blob=>{
   if(controller.signal.aborted)return;
   objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
  }).catch(()=>{});
  return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[file.id,file.status,file.name,file.mime_type,kind]);
 return <span className="file-glyph preview-glyph">{url?<img src={url} alt="" loading="lazy"/>:<FileIconFor kind={kind}/>}</span>;
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
