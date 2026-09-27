/** Process a chosen batch sequentially to avoid flooding the Telegram storage bot.
 * Every failure stays visible; successful uploads are never retried automatically. */
export type UploadItemStatus="pending"|"uploading"|"uploaded"|"failed";
export type UploadItem={id:string;name:string;status:UploadItemStatus;error:string|null};
export type UploadProgress={items:UploadItem[];done:number;total:number;uploaded:number;failed:number};
export const MAX_UPLOAD_BATCH=20;
export const MAX_UPLOAD_BYTES=8*1024*1024;
export function validateUploadCount(count:number):boolean{
 return Number.isSafeInteger(count)&&count>0&&count<=MAX_UPLOAD_BATCH;
}
export async function runUploadQueue<T extends {name:string;size:number}>(
 files:readonly T[],
 send:(file:T,index:number)=>Promise<void>,
 update:(state:UploadProgress)=>void,
 tooLargeMessage:string,
):Promise<UploadProgress>{
 if(!validateUploadCount(files.length))throw new Error("Invalid upload batch size.");
 const items:UploadItem[]=files.map((file,index)=>({id:String(index),name:file.name,status:"pending",error:null}));
 let uploaded=0,failed=0;
 function emit(){update({items:items.map(item=>({...item})),done:uploaded+failed,total:files.length,uploaded,failed});}
 emit();
 for(let index=0;index<files.length;index++){
   const file=files[index];
   if(file.size>MAX_UPLOAD_BYTES){
     items[index]={...items[index],status:"failed",error:tooLargeMessage};
     failed++;emit();continue;
   }
   items[index]={...items[index],status:"uploading"};emit();
   try{
     await send(file,index);
     items[index]={...items[index],status:"uploaded"};uploaded++;
   }catch(e){
     items[index]={...items[index],status:"failed",error:e instanceof Error?e.message:"Upload failed."};failed++;
   }
   emit();
 }
 return {items:items.map(item=>({...item})),done:uploaded+failed,total:files.length,uploaded,failed};
}
