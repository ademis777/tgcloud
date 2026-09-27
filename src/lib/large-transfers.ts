/** Large transfer limits and state validation shared by the future gateway and worker.
 * Telegram Local Bot API documents a maximum upload size of 2000 MB (decimal).
 * This module does not enable a large upload route on Vercel. */
export const LOCAL_BOT_MAX_BYTES=2_000_000_000;
export const TRANSFER_CHUNK_BYTES=6*1024*1024;
export type LargeTransferStatus="created"|"uploading"|"staged"|"sending"|"ready"|"failed"|"canceled";
export const transferTransitions:Readonly<Record<LargeTransferStatus,readonly LargeTransferStatus[]>>={
 created:["uploading","failed","canceled"],
 uploading:["staged","failed","canceled"],
 staged:["sending","failed","canceled"],
 sending:["ready","failed"], // uncertain Telegram outcomes require reconciliation, never blind retry
 ready:[],
 failed:[],
 canceled:[],
};
export function validLargeFileSize(bytes:number):boolean{
 return Number.isSafeInteger(bytes)&&bytes>0&&bytes<=LOCAL_BOT_MAX_BYTES;
}
export function canTransitionTransfer(from:LargeTransferStatus,to:LargeTransferStatus):boolean{
 return transferTransitions[from].includes(to);
}
export function validTransferProgress(size:number,uploaded:number):boolean{
 return validLargeFileSize(size)&&Number.isSafeInteger(uploaded)&&uploaded>=0&&uploaded<=size;
}
