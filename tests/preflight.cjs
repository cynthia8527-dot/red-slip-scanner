// Supplemental local-only preflight. Synthetic data, no network or account data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const out=process.env.SCANNER_ARTIFACT_DIR||'/tmp/scanner-preflight';
fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function images(pdf){const result=[];let offset=0;while(true){const start=pdf.indexOf('/Subtype /Image',offset);if(start<0)break;const stream=pdf.indexOf('stream\n',start)+7;const n=Number(pdf.subarray(start,stream).toString().match(/\/Length (\d+)/)[1]);result.push(pdf.subarray(stream,stream+n));offset=stream+n;}return result;}
(async()=>{
 const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('index.html'));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const tab=await browser.newPage({viewport:{width:390,height:844}});
 await tab.goto('http://127.0.0.1:'+server.address().port);
 const report=await tab.evaluate(async()=>{
  const read=blob=>new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)});
  window.preflightSaved=[];download=(blob,name)=>preflightSaved.push({blob,name});
  const c=document.createElement('canvas');c.width=1500;c.height=968;const x=c.getContext('2d');
  const pixels=x.createImageData(c.width,c.height);let seed=20261013;
  for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=(seed>>>24)%150;pixels.data[i]=255-n;pixels.data[i+1]=238-n;pixels.data[i+2]=225-n;pixels.data[i+3]=255;}
  x.putImageData(pixels,0,0);x.fillStyle='white';x.fillRect(0,0,1500,340);x.fillStyle='black';
  for(const [px,y] of [[12,50],[16,95],[24,150]]){x.font=px+'px sans-serif';x.fillText('SYNTHETIC: 1.7 3.8 5.6 123.45 0.01 8.03',40,y);}
  for(const [width,y] of [[.5,200],[1,230],[2,260]]){x.strokeStyle='black';x.lineWidth=width;x.beginPath();x.moveTo(40,y);for(let n=0;n<100;n++)x.lineTo(40+n*5,y+8*Math.sin(n/3));x.stroke();}
  x.fillStyle='black';for(let i=0;i<4;i++){x.beginPath();x.arc(660+i*40,210,.8+i*.4,0,Math.PI*2);x.fill();}
  const png=await new Promise(r=>c.toBlob(r,'image/png'));
  const jpeg=await new Promise(r=>c.toBlob(r,'image/jpeg',.94));
  const processed=await processImage(jpeg,'color');
  const scan=await processImage(jpeg,'scan');
  const floorBitmap=await createImageBitmap(processed.blob);const floorCanvas=document.createElement('canvas');floorCanvas.width=processed.w;floorCanvas.height=processed.h;floorCanvas.getContext('2d').drawImage(floorBitmap,0,0);floorBitmap.close();const floorBlob=await new Promise(r=>floorCanvas.toBlob(r,'image/jpeg',.84));
  const quality={floorJpeg:await read(floorBlob),sourcePng:await read(png),sourceJpeg:await read(jpeg),processedJpeg:await read(processed.blob),scanJpeg:await read(scan.blob),w:processed.w,h:processed.h,detected:processed.detected};
  const started=performance.now();const input=new DataTransfer();
  for(let i=0;i<100;i++){
   x.fillStyle='white';x.fillRect(1050,20,430,65);x.fillStyle='black';x.font='24px sans-serif';x.fillText('SYNTHETIC PAGE '+String(i+1).padStart(3,'0'),1070,60);
   const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.94));input.items.add(new File([blob],'synthetic-'+String(i+1).padStart(3,'0')+'.jpg',{type:'image/jpeg'}));
  }
  camera.files=input.files;await camera.onchange();
  const importMs=performance.now()-started;
  const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const hashes=[];const rawHashes=[];for(const p of pages){hashes.push(await hash(p.blob));rawHashes.push(await hash(p.originalBlob));}
  const began=performance.now();await $('#pdfBtn').onclick();const exportMs=performance.now()-began;
  const count=pages.length;const sourceBytes=pages.reduce((n,p)=>n+p.originalBlob.size,0);const processedBytes=pages.reduce((n,p)=>n+p.blob.size,0);
  const buttons=[...document.querySelectorAll('[data-pdf-download]')];buttons.forEach(b=>b.click());
  const payload=[];for(const f of preflightSaved)payload.push({name:f.name,data:await read(f.blob)});
  const after=[];const rawAfter=[];for(const p of pages){after.push(await hash(p.blob));rawAfter.push(await hash(p.originalBlob));}
  const single=makePdf([{data:new Uint8Array(await processed.blob.arrayBuffer()),w:processed.w,h:processed.h}]);
  return {count,sourceBytes,processedBytes,importMs,exportMs,hashes,rawHashes,after,rawAfter,payload,quality,qualityPdf:await read(single),pdfButtonCount:buttons.length};
 });
 assert.equal(report.count,100);assert.deepEqual(report.after,report.hashes);assert.deepEqual(report.rawAfter,report.rawHashes);
 const files=report.payload.map(f=>Buffer.from(f.data,'base64'));
 assert.ok(files.length>1);assert.equal(report.pdfButtonCount,files.length);
 assert.deepEqual(files.flatMap(images).map(sha),report.hashes);
 const artifacts=[];let first=1;
 for(let i=0;i<files.length;i++){
  const file=out+'/batch-'+String(i+1).padStart(3,'0')+'.pdf';fs.writeFileSync(file,files[i]);assert.ok(files[i].length<=5000000);
  const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});const pages=Number(info.match(/Pages:\s+(\d+)/)[1]);assert.equal(pages,images(files[i]).length);
  assert.ok(report.payload[i].name.endsWith(`第${first}至${first+pages-1}頁.pdf`));
  artifacts.push({file,bytes:files[i].length,pages,first,last:first+pages-1,sha256:sha(files[i])});first+=pages;
 }
 assert.equal(first,101);
 const quality=report.quality;for(const [key,name] of [['sourcePng','quality-source.png'],['sourceJpeg','quality-source.jpg'],['processedJpeg','quality-processed.jpg'],['scanJpeg','quality-scan.jpg'],['floorJpeg','quality-floor84.jpg']])fs.writeFileSync(out+'/'+name,Buffer.from(quality[key],'base64'));
 const pdf=Buffer.from(report.qualityPdf,'base64');fs.writeFileSync(out+'/quality.pdf',pdf);assert.equal(sha(images(pdf)[0]),sha(Buffer.from(quality.processedJpeg,'base64')));
 execFileSync('pdftoppm',['-singlefile','-scale-to-x','1684','-scale-to-y','1190','-png',out+'/quality.pdf',out+'/quality-pdf-render'],{stdio:'pipe'});
 const result={time:new Date().toISOString(),baseline:'54ee18da89454bd72a9f5e7a6f2f6c0ef09be926',candidateIndexSha256:sha(fs.readFileSync('index.html')),count:report.count,sourceBytes:report.sourceBytes,processedBytes:report.processedBytes,importMs:Math.round(report.importMs),exportMs:Math.round(report.exportMs),files:artifacts,quality:{w:quality.w,h:quality.h,detected:quality.detected,processedJpegBytes:Buffer.from(quality.processedJpeg,'base64').length,exactPdfJpegMatch:true},limitations:['Desktop Chromium with mobile viewport; no Android hardware','Synthetic noise and glyphs; not representative of every handwritten form','No peak total browser memory measurement; ZIP stress not tested','Only loopback local HTTP server; no external upload, push or deployment', 'Quality .84 image is a separate encoder-floor comparison, not a naturally oversized-page repro']};
 fs.writeFileSync(out+'/preflight-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
