import {PUBLIC_CLIENT_ID,SCOPES} from './policy.mjs';
// Credentials live only in this closure. No storage, server session, refresh or silent renewal.
export function makeMemoryLogin({enabled=false,gis,verify,onStatus=()=>{},clock=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}={}){
 let token=null,deadline=0,timer=null,client=null,busy=false,generation=0;
 function clear(reason='signed_out'){generation++;if(timer!==null)cancel(timer);timer=null;token=null;deadline=0;client=null;busy=false;onStatus(reason);}
 function bearer(){if(token&&clock()<deadline)return token;if(token)clear('expired');return null;}
 function prepare(){if(!enabled||busy||!gis?.initTokenClient||!verify)return false;const preparedRun=++generation;
  client=gis.initTokenClient({client_id:PUBLIC_CLIENT_ID,scope:SCOPES,include_granted_scopes:false,
   callback:async response=>{if(!busy||preparedRun!==generation)return;const run=preparedRun;try{
    if(response?.error||response?.token_type!=='Bearer'||typeof response.access_token!=='string'||!response.access_token||response.access_token.length>8192||!Number.isInteger(Number(response.expires_in))||Number(response.expires_in)<=0)throw Error('invalid_token');
    token=response.access_token;deadline=clock()+Math.min(900000,Number(response.expires_in)*1000);if(timer!==null)cancel(timer);timer=schedule(()=>clear('expired'),deadline-clock());
    const result=await verify();if(run!==generation)return;
    if(!result?.authenticated||!result.allowed)throw Error('identity_not_verified');
    onStatus('authenticated',{subject:result.subject,expiresAt:deadline});
   }catch{if(run===generation)clear('not_authenticated');}finally{if(run===generation)busy=false;}},
   error_callback:()=>{if(preparedRun===generation)clear('popup_closed');}});return true;
 }
 function start(){if(!enabled||!client||busy)return false;busy=true;try{client.requestAccessToken({prompt:'select_account'});return true;}catch{clear('popup_failed');return false;}}
 return {prepare,start,bearer,expiresAt:()=>deadline,logout:()=>clear()};
}
