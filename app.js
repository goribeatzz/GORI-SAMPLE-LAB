// GORI SAMPLE LAB — geração remota via Cloudflare Worker + ElevenLabs\nconst $=id=>document.getElementById(id);const fileInput=$("audioFile"),source=$("sourcePlayer"),analyzeBtn=$("analyzeBtn");let audioBuffer=null,sourceUrl=null;const noteNames=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];noteNames.forEach((n,i)=>$("keyInput").add(new Option(n,i)));$("keyInput").value="0";
const fmtTime=s=>{const m=Math.floor(s/60),r=Math.floor(s%60);return m+":"+String(r).padStart(2,"0")};function setMsg(id,msg){$(id).textContent=msg}
function getYouTubeId(raw){try{const u=new URL(raw);if(!["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtu.be","youtube-nocookie.com","www.youtube-nocookie.com"].includes(u.hostname))return null;if(u.hostname.includes("youtu.be"))return u.pathname.split("/").filter(Boolean)[0]||null;if(u.pathname==="/watch")return u.searchParams.get("v");const parts=u.pathname.split("/").filter(Boolean);if(["embed","shorts","live"].includes(parts[0]))return parts[1]||null;return null}catch{return null}}
$("loadYoutubeBtn").addEventListener("click",()=>{const id=getYouTubeId($("youtubeUrl").value.trim());const box=$("youtubePreview");if(!id||! /^[a-zA-Z0-9_-]{11}$/.test(id)){box.hidden=true;box.replaceChildren();setMsg("analysisFeedback","Cole um endereço válido de vídeo do YouTube.");return}const frame=document.createElement("iframe");frame.src="https://www.youtube-nocookie.com/embed/"+id;frame.title="Referência do YouTube";frame.loading="lazy";frame.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";frame.allowFullscreen=true;frame.referrerPolicy="strict-origin-when-cross-origin";box.replaceChildren(frame);box.hidden=false;setMsg("analysisFeedback","Vídeo carregado como referência. Para analisar BPM, tom e textura, importe o arquivo de áudio autorizado abaixo.")});
$("youtubeUrl").addEventListener("keydown",e=>{if(e.key==="Enter")$("loadYoutubeBtn").click()});
fileInput.addEventListener("change",()=>{const f=fileInput.files?.[0];if(!f)return;if(f.size>80*1024*1024){setMsg("analysisFeedback","Arquivo acima do limite de 80 MB.");fileInput.value="";return}if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl=URL.createObjectURL(f);source.src=sourceUrl;source.hidden=false;$("fileLine").textContent=f.name+" · "+(f.size/1048576).toFixed(1)+" MB";analyzeBtn.disabled=false;audioBuffer=null;setMsg("analysisFeedback","Arquivo carregado. Pronto para análise local.")});
async function decodeFile(file){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw Error("Este navegador não oferece Web Audio.");const ctx=new Ctx();try{return await ctx.decodeAudioData(await file.arrayBuffer())}finally{await ctx.close()}}
function analyze(buffer){const data=buffer.getChannelData(0),sr=buffer.sampleRate;const frame=1024,hop=512,energies=[];for(let p=0;p+frame<data.length;p+=hop){let e=0;for(let i=0;i<frame;i++)e+=data[p+i]*data[p+i];energies.push(Math.sqrt(e/frame))}let diffs=[];for(let i=1;i<energies.length;i++)diffs.push(Math.max(0,energies[i]-energies[i-1]));const mean=diffs.reduce((a,b)=>a+b,0)/(diffs.length||1);let bestLag=0,best=-1;const minLag=Math.max(1,Math.floor(60*sr/(hop*180))),maxLag=Math.min(diffs.length-1,Math.ceil(60*sr/(hop*55)));for(let lag=minLag;lag<=maxLag;lag++){let c=0;for(let i=lag;i<diffs.length;i++)c+=(diffs[i]-mean)*(diffs[i-lag]-mean);if(c>best){best=c;bestLag=lag}}let bpm=bestLag?Math.round(60*sr/(hop*bestLag)):86;while(bpm<70)bpm*=2;while(bpm>160)bpm/=2;bpm=Math.round(bpm);const rms=energies.reduce((a,b)=>a+b,0)/(energies.length||1);let z=0;for(let i=0;i<data.length;i+=8)z+=Math.abs(data[i]);const brightness=z/(Math.ceil(data.length/8)||1);const key=estimateKey(data,sr);return{bpm,energy:rms,brightness,key}}
function estimateKey(data,sr){const n= Math.min(2048,2**Math.floor(Math.log2(data.length)));if(n<2048)return 0;const chroma=new Array(12).fill(0);for(let start=0;start+n<=data.length;start+=n*2){for(let k=1;k<n/2;k++){let re=0,im=0;for(let j=0;j<n;j+=4){const v=data[start+j]*(.5-.5*Math.cos(2*Math.PI*j/n));const a=2*Math.PI*k*j/n;re+=v*Math.cos(a);im-=v*Math.sin(a)}const hz=k*sr/n;if(hz<55||hz>1500)continue;const midi=Math.round(69+12*Math.log2(hz/440));chroma[(midi%12+12)%12]+=Math.sqrt(re*re+im*im)}}return chroma.indexOf(Math.max(...chroma))}
analyzeBtn.addEventListener("click",async()=>{try{setMsg("analysisFeedback","Analisando no dispositivo…");audioBuffer=await decodeFile(fileInput.files[0]);const a=analyze(audioBuffer);$("duration").textContent=fmtTime(audioBuffer.duration);$("bpmReadout").textContent=a.bpm;$("bpmInput").value=a.bpm;$("keyReadout").textContent=noteNames[a.key];$("keyInput").value=a.key;$("energyReadout").textContent=a.energy>.12?"Alta":a.energy>.045?"Média":"Baixa";$("textureReadout").textContent=a.brightness>.12?"Brilhante / transientes presentes":"Escura / macia";setMsg("analysisFeedback","Análise concluída. BPM e tom são estimativas; ajuste manualmente se necessário.")}catch(e){setMsg("analysisFeedback","Não foi possível decodificar este formato no Safari. Tente WAV ou MP3. ("+e.message+")")}});
const scales={warm:[0,4,7,11],dark:[0,3,7,10],airy:[0,4,7,9,14]};function midiFreq(n){return 440*Math.pow(2,(n-69)/12)}function makeSketch(style){const bpm=Math.max(50,Math.min(180,Number($("bpmInput").value)||86)),root=Number($("keyInput").value)||0,sr=44100,beats=32,duration=beats*60/bpm,total=Math.floor(duration*sr),out=new Float32Array(total),chord=scales[style],base=style==="dark"?43:style==="airy"?55:48;let seed=style==="warm"?17:style==="dark"?41:73;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};const progression=style==="airy"?[0,5,9,7]:style==="dark"?[0,8,3,10]:[0,9,5,7];for(let bar=0;bar<8;bar++){const start=Math.floor(bar*4*60/bpm*sr),len=Math.floor(4*60/bpm*sr),deg=progression[bar%4];for(let note=0;note<chord.length;note++){const midi=base+root+deg+chord[note]+(style==="airy"&&note===4?12:0),freq=midiFreq(midi),amp=(style==="dark"?.12:.09)/(1+note*.45);for(let i=0;i<len&&start+i<total;i++){const t=i/sr,env=Math.min(1,t*18)*Math.exp(-t*(style==="dark"?1.8:2.8));const wobble=style==="dark"?1+.0015*Math.sin(2*Math.PI*4.2*t):1;let s=Math.sin(2*Math.PI*freq*wobble*t);s+=.22*Math.sin(2*Math.PI*freq*2*t);if(style==="warm")s+=.08*Math.sin(2*Math.PI*freq*3*t);out[start+i]+=s*amp*env}}}for(let i=0;i<total;i++){let v=out[i];if(style==="dark")v=Math.tanh(v*3.8)*.82;else if(style==="warm")v=Math.tanh(v*1.5);else v*=.88;const fade=Math.min(1,i/(sr*.03),(total-i)/(sr*.08));out[i]=v*fade}return encodeWav24(out,sr)}
function encodeWav24(samples,sr){const bytes=new ArrayBuffer(44+samples.length*3),v=new DataView(bytes),write=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};write(0,"RIFF");v.setUint32(4,bytes.byteLength-8,true);write(8,"WAVE");write(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*3,true);v.setUint16(32,3,true);v.setUint16(34,24,true);write(36,"data");v.setUint32(40,samples.length*3,true);let o=44;for(const s of samples){const x=Math.max(-1,Math.min(1,s)),n=Math.round(x<0?x*8388608:x*8388607);v.setUint8(o++,n&255);v.setUint8(o++,(n>>8)&255);v.setUint8(o++,(n>>16)&255)}return new Blob([bytes],{type:"audio/wav"})}
const API_URL="https://gori-sample-lab-api.contato-goribeatzz.workers.dev";
const presetMap={warm:"soul_warm_groove",dark:"dark_jazz_drumless",airy:"funk_deep_groove"};
async function generateWithAI(btn){
  const card=btn.closest(".proposal"),player=card.querySelector("audio"),link=card.querySelector(".download");
  if(!window.turnstile){setMsg("generationFeedback","A verificação de segurança ainda está carregando. Aguarde alguns segundos e tente novamente.");return}
  const turnstileToken=window.turnstile.getResponse();
  if(!turnstileToken){setMsg("generationFeedback","Conclua a verificação de segurança antes de gerar.");return}
  btn.disabled=true;const oldLabel=btn.textContent;btn.textContent="Gerando…";
  setMsg("generationFeedback","Enviando seu pedido para a IA. A geração pode levar alguns instantes.");
  try{
    const response=await fetch(API_URL+"/api/generate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        preset:presetMap[btn.dataset.style],
        durationMs:45000,
        bpm:Number($("bpmInput").value)||86,
        key:noteNames[Number($("keyInput").value)]||"C",
        turnstileToken
      })
    });
    if(!response.ok){
      let message="Não foi possível gerar o áudio.";
      try{const data=await response.json();if(data.error)message=data.error}catch{}
      throw new Error(message);
    }
    const blob=await response.blob();
    if(!blob.size)throw new Error("A IA retornou um arquivo vazio. Tente novamente.");
    const url=URL.createObjectURL(blob);
    if(player.dataset.url)URL.revokeObjectURL(player.dataset.url);
    player.dataset.url=url;player.src=url;player.hidden=false;
    link.href=url;link.download="GORI-SAMPLE-LAB-"+btn.dataset.style.toUpperCase()+".mp3";
    link.hidden=false;link.textContent="↓ Baixar MP3";
    setMsg("generationFeedback","Instrumental original gerado pela IA. Ouça ou baixe o MP3.");
  }catch(error){
    setMsg("generationFeedback",error.message||"Falha de conexão com o serviço de geração.");
  }finally{
    try{window.turnstile.reset()}catch{}
    btn.disabled=false;btn.textContent=oldLabel;
  }
}
document.querySelectorAll(".generate").forEach(btn=>btn.addEventListener("click",()=>generateWithAI(btn)));
if("serviceWorker"in navigator&&location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));