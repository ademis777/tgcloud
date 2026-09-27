/** Run independently authorized per-file deletes with bounded Telegram API concurrency.
 * Failed items are returned to the caller; never treat an API error as deleted. */
export type BulkDeleteProgress={done:number;total:number;deleted:number;failed:number};
export type BulkDeleteResult={deletedIds:string[];failedIds:string[];firstError:string|null};
export async function runBulkDelete(
 ids:readonly string[],
 remove:(id:string)=>Promise<void>,
 onProgress:(progress:BulkDeleteProgress)=>void,
 concurrency=2,
):Promise<BulkDeleteResult>{
 const unique=[...new Set(ids)];
 const total=unique.length;
 if(!Number.isSafeInteger(concurrency)||concurrency<1||concurrency>5)throw new Error("Invalid concurrency.");
 let index=0,done=0;
 const deletedIds:string[]=[],failedIds:string[]=[];
 let firstError:string|null=null;
 onProgress({done,total,deleted:0,failed:0});
 await Promise.all(Array.from({length:Math.min(concurrency,total)},async()=>{
   for(;;){
     const current=index++;
     if(current>=total)return;
     const id=unique[current];
     try{await remove(id);deletedIds.push(id);}
     catch(e){
       failedIds.push(id);
       if(firstError===null)firstError=e instanceof Error ? e.message : "Request failed.";
     }
     done++;
     onProgress({done,total,deleted:deletedIds.length,failed:failedIds.length});
   }
 }));
 return {deletedIds,failedIds,firstError};
}
