/* Offline candidate. No OAuth, network implementation, tokens, or production adapter. */
(function(root,factory){if(typeof module==='object')module.exports=factory();else root.ScannerUpload=factory();})(globalThis,()=>{
 'use strict';
 const FOLDER='1s_MzTWzVHmMt9UQfsvGxn_FG3x-LKpr2',LIMIT=5000000;
 async function digest(blob){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');}
 function memoryJournal(){const rows=new Map();return {get:k=>rows.get(k),set:(k,v)=>rows.set(k,structuredClone(v))};}
 function browserJournal(storage){return {get:k=>{const s=storage.getItem('scanner-upload-v1:'+k);return s?JSON.parse(s):undefined;},set:(k,v)=>storage.setItem('scanner-upload-v1:'+k,JSON.stringify(v))};}
 function allowed(s){return !!(s&&s.authenticated&&s.allowed&&s.driveGranted&&s.folderVerified&&s.folderId===FOLDER&&s.subject&&s.expiresAt>Date.now());}
 function receiptValid(r,m){return r&&r.state==='confirmed'&&typeof r.fileId==='string'&&r.fileId.length>0&&r.sha256===m.sha256&&r.bytes===m.bytes&&r.folderId===FOLDER;}
 function createQueue({adapter,journal=memoryJournal()}){
  if(!adapter)throw Error('Upload disabled: no verified server adapter');
  async function metadata(file){
   if(!(file.blob instanceof Blob)||file.blob.type!=='application/pdf'||file.blob.size<1||file.blob.size>LIMIT)throw Error('PDF must be 1..5,000,000 bytes');
   if(await file.blob.slice(0,5).text()!=='%PDF-')throw Error('Invalid PDF signature');
   return {sha256:await digest(file.blob),bytes:file.blob.size,name:file.name,start:file.start,end:file.end};
  }
  async function session(){const s=await adapter.session();if(!allowed(s))throw Error('Login, Drive consent and private destination verification required');return s;}
  async function send(file){
   const s=await session(),m=await metadata(file),key=s.subject+':'+FOLDER+':'+m.sha256;
   // Persist before any potentially mutating request. Fail closed if storage fails.
   const old=journal.get(key);if(old)return {...old,key};
   journal.set(key,{state:'unknown',metadata:m});
   try{
    const r=await adapter.put({key,metadata:m,blob:file.blob});
    if(!receiptValid(r,m))throw Error('Unverified receipt');
    const result={state:'confirmed',metadata:m,receipt:r};journal.set(key,result);return {...result,key};
   }catch(e){return {state:'unknown',metadata:m,key,reason:'Result unknown; check status before any further action'};}
  }
  async function reconcile(file){
   const s=await session(),m=await metadata(file),key=s.subject+':'+FOLDER+':'+m.sha256,old=journal.get(key);
   if(!old)return {state:'not-sent',key};
   let r;try{r=await adapter.status({key});}catch{r={state:'unknown'};}
   if(receiptValid(r,m)){const result={state:'confirmed',metadata:m,receipt:r};journal.set(key,result);return {...result,key};}
   const result={state:'unknown',metadata:m};
   if(old.receipt||old.lastConfirmedReceipt)result.lastConfirmedReceipt=old.receipt||old.lastConfirmedReceipt;
   journal.set(key,result);
   return {...result,key}; // A missing result never licenses a repeat PUT, including prior success.
  }
  return {send,reconcile,metadata};
 }
 return {FOLDER,LIMIT,digest,allowed,memoryJournal,browserJournal,createQueue};
});
