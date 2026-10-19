import {ORIGIN,APP_ID,FOLDER_ID} from './policy.mjs';
export {FOLDER_ID};
const must=(yes,code)=>{if(!yes)throw Error(code);};
export function makeFolderPicker({enabled=false,picker,requestTicket,verifyFolder,onResult=()=>{},onStatus=()=>{},clock=()=>Date.now(),schedule=setTimeout,cancelSchedule=clearTimeout}={}){
 let current=null,busy=false;
 function dispose(run){if(run.timer!==null){cancelSchedule(run.timer);run.timer=null;}try{run.instance?.setVisible(false);run.instance?.dispose();}catch{}run.instance=null;run.ticket=null;}
 function finish(run){dispose(run);if(current===run){current=null;busy=false;}}
 async function open(){
  if(!enabled){onStatus('disabled');return false;}if(busy)return false;
  must(picker?.DocsView&&picker?.PickerBuilder&&requestTicket&&verifyFolder,'picker_not_configured');
  const run={instance:null,ticket:null,timer:null,deadline:0};current=run;busy=true;
  try{
   const ticket=await requestTicket();if(current!==run)return false;
   must(ticket&&ticket.appId===APP_ID&&ticket.folderId===FOLDER_ID&&typeof ticket.accessToken==='string'&&ticket.accessToken&&typeof ticket.developerKey==='string'&&ticket.developerKey,'invalid_picker_ticket');
   const deadline=Math.min(ticket.expiresAt,ticket.sessionExpiresAt);must(Number.isFinite(deadline)&&deadline>clock(),'picker_expired');run.deadline=deadline;run.ticket=ticket;
   const view=new picker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes('application/vnd.google-apps.folder');
   const callback=async data=>{
    if(current!==run)return;
    if(data?.action===picker.Action.CANCEL){finish(run);onStatus('cancelled');return;}
    if(data?.action!==picker.Action.PICKED)return;
    const docs=data.docs;dispose(run); // Clear our refs/remove SDK UI before server folder verification.
    try{
     must(clock()<run.deadline&&Array.isArray(docs)&&docs.length===1&&docs[0]?.id===FOLDER_ID,'wrong_or_expired_folder');
     const result=await verifyFolder({folderId:FOLDER_ID});if(current!==run)return;
     must(clock()<run.deadline&&result?.folderId===FOLDER_ID&&result.folderVerified===true,'private_folder_not_verified');
     onResult({folderId:FOLDER_ID,folderVerified:true});onStatus('verified');
    }catch{if(current===run)onStatus('folder_not_verified');}finally{finish(run);}
   };
   run.instance=new picker.PickerBuilder().setAppId(APP_ID).setDeveloperKey(ticket.developerKey).setOAuthToken(ticket.accessToken).setOrigin(ORIGIN).addView(view).setCallback(callback).build();
   run.timer=schedule(()=>{if(current===run){finish(run);onStatus('expired');}},deadline-clock());
   run.instance.setVisible(true);onStatus('open');return true;
  }catch{if(current===run){finish(run);onStatus('unavailable');}return false;}
 }
 function close(){const run=current;current=null;busy=false;if(run)dispose(run);}
 return {open,close};
}
