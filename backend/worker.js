const ALLOWED_ORIGIN = "https://goribeatzz.github.io";
const MAX_DURATION_MS = 45000;
const MAX_ANALYSIS_BYTES = 14 * 1024 * 1024;
const PRESETS = {
  soul_warm_groove: "Create a completely original instrumental soul-jazz groove. Warm Rhodes chords with tasteful extensions, organic electric bass, live acoustic drums with relaxed swing and ghost notes, clean rhythm guitar, subtle strings and restrained brass accents. Evolving arrangement, natural band interaction, expressive dynamics, dusty analog recording character. No vocals. Do not imitate or reference any existing artist, song, recording, melody, or sample.",
  dark_jazz_drumless: "Create a completely original dark, cinematic drumless jazz instrumental. Expressive acoustic piano with rich extended harmony, upright bass, restrained tenor saxophone phrases, subtle vibraphone and intimate room ambience. No drums or percussion. Evolving arrangement, human timing, deep dynamics, warm aged recording texture. No vocals. Do not imitate or reference any existing artist, song, recording, melody, or sample.",
  funk_deep_groove: "Create a completely original deep funk instrumental. Syncopated electric bass, tight dry live acoustic drums with ghost notes, clavinet, rhythmic guitar, hand percussion and occasional restrained brass accents. Strong pocket, human interaction, fills and arrangement variations. Warm analog recording character. No vocals. Do not imitate or reference any existing artist, song, recording, melody, or sample."
};
function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type":"application/json; charset=utf-8", "Access-Control-Allow-Origin":origin, "Access-Control-Allow-Methods":"GET, POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type", "Vary":"Origin", "Cache-Control":"no-store" } });
}
function corsOrigin(request) { const origin=request.headers.get("Origin"); return origin===ALLOWED_ORIGIN?origin:null; }
async function verifyTurnstile(token, request, env) {
  if (!token) return false;
  const form=new FormData(); form.set("secret",env.TURNSTILE_SECRET_KEY); form.set("response",token);
  const ip=request.headers.get("CF-Connecting-IP"); if(ip) form.set("remoteip",ip);
  const res=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
  const data=await res.json().catch(()=>({})); return Boolean(data.success);
}
function extractOutputText(data) {
  if (typeof data.output_text==="string") return data.output_text;
  const parts=[];
  const walk=v=>{ if(!v)return; if(Array.isArray(v)){v.forEach(walk);return;} if(typeof v==="object"){if(typeof v.text==="string")parts.push(v.text); for(const [k,x] of Object.entries(v))if(k!=="text")walk(x);} };
  walk(data.output); walk(data.steps); return parts.join("\n");
}
function parseJsonText(raw) {
  const cleaned=raw.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,"").replace(/\s*\x60\x60\x60$/,"");
  const first=cleaned.indexOf("{"),last=cleaned.lastIndexOf("}");
  if(first<0||last<=first) throw new Error("A análise não retornou JSON válido.");
  return JSON.parse(cleaned.slice(first,last+1));
}
export default {
  async fetch(request, env) {
    const origin=corsOrigin(request);
    if(request.method==="OPTIONS"){ if(!origin)return new Response(null,{status:403}); return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"86400","Vary":"Origin"}}); }
    if(!origin)return new Response("Forbidden",{status:403});
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/api/health") return json({ok:true,service:"GORI SAMPLE LAB API",generationConfigured:Boolean(env.ELEVENLABS_API_KEY&&env.TURNSTILE_SECRET_KEY),referenceAnalysisConfigured:Boolean(env.GEMINI_API_KEY&&env.TURNSTILE_SECRET_KEY)},200,origin);
    if(request.method!=="POST"||!["/api/generate","/api/analyze-reference"].includes(url.pathname))return json({error:"Endpoint not found."},404,origin);
    if(!env.TURNSTILE_SECRET_KEY)return json({error:"Security service is not configured."},503,origin);
    let input; try{input=await request.json()}catch{return json({error:"Invalid JSON request."},400,origin)}
    if(!await verifyTurnstile(typeof input.turnstileToken==="string"?input.turnstileToken:"",request,env))return json({error:"Security verification failed. Please try again."},403,origin);

    if(url.pathname==="/api/analyze-reference"){
      if(!env.GEMINI_API_KEY)return json({error:"Gemini analysis is not configured yet."},503,origin);
      const youtubeUrl=typeof input.youtubeUrl==="string"?input.youtubeUrl.trim():"",audio=typeof input.audioBase64==="string"?input.audioBase64:"",mime=typeof input.mimeType==="string"?input.mimeType.toLowerCase():"";
      const allowed=["audio/wav","audio/x-wav","audio/mpeg","audio/mp3","audio/mp4","audio/m4a","audio/aiff","audio/flac","audio/ogg","audio/aac"];
      const isYoutube=/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(youtubeUrl);
      if(youtubeUrl&&!isYoutube)return json({error:"Envie um link válido de vídeo público do YouTube."},400,origin);
      if(!youtubeUrl&&(!audio||!allowed.includes(mime)||audio.length>Math.ceil(MAX_ANALYSIS_BYTES*4/3)+16))return json({error:"Envie um áudio compatível de até 14 MB."},413,origin);
      const prompt=`Analise o conteúdo musical deste vídeo ou áudio como produtor musical e engenheiro de gravação. Concentre-se no SOM. Retorne SOMENTE JSON válido com: summary, bpm_estimate, bpm_confidence, key_estimate, key_confidence, groove, swing, rhythmic_density, instrumentation (array {family,role,confidence}), harmony, texture, energy_dynamics, mood (array), notable_sections (array {approx_time,description}), generation_brief. Descreva camadas e instrumentos audíveis, mudanças de arranjo, frases melódicas, densidade, harmonia e climas ao longo da faixa. Distinga observações de hipóteses. Não identifique nem reproduza sample, melodia, letra ou gravação original. Use null ou baixa confiança quando não souber.`;
      const models=["gemini-3.8-flash","gemini-3.7-flash"];let res=null,data={},model="",detail="";
      for(const m of models){model=m;const media=youtubeUrl?{type:"video",uri:youtubeUrl}:{type:"audio",data:audio,mime_type:(mime==="audio/mpeg"||mime==="audio/mp3")?"audio/mp3":mime};try{res=await fetch("https://generativelanguage.googleapis.com/v1beta/interactions",{method:"POST",headers:{"x-goog-api-key":env.GEMINI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:m,input:[{type:"text",text:prompt},media],store:false})})}catch(err){detail=String(err).slice(0,250);continue}data=await res.json().catch(()=>({}));if(res.ok)break;detail=data.error?.message||"Erro do provedor";if(res.status!==503)break}
      if(!res||!res.ok){const code=res?.status||502;return json({error:"Falha na análise Gemini ("+code+"): "+String(detail).slice(0,400)},code===429?429:502,origin)}
      try{const out=extractOutputText(data);if(!out)throw Error("Resposta sem texto");return json({ok:true,model,analysis:parseJsonText(out)},200,origin)}catch(err){return json({error:"Não foi possível interpretar a análise: "+String(err).slice(0,250)},502,origin)}
    }

    if(input.preset==="reference_sample")return json({error:"A análise da referência está pronta. O motor gratuito de criação de samples ainda está em integração; nenhum serviço pago será acionado nesta etapa."},503,origin);
    if(!env.ELEVENLABS_API_KEY)return json({error:"Generation service is not configured yet."},503,origin);
    const preset=input.preset==="reference_sample"?"Create an original instrumental source-music sample for a beatmaker to chop and rearrange. This is NOT a beat, NOT a backing track and NOT a conventional song. Absolutely no drums, percussion, claps, snaps, hi-hats, kick or snare. Focus on rich source music: expressive melodic phrases, sophisticated chord changes, counter-melodies, layered live instruments, instrumental interplay, distinct sections and evolving moods.":PRESETS[input.preset],durationMs=Number(input.durationMs??MAX_DURATION_MS),bpm=Number(input.bpm),key=typeof input.key==="string"?input.key.slice(0,40):"unspecified";
    if(!preset)return json({error:"Unknown sample style."},400,origin);
    if(!Number.isInteger(durationMs)||durationMs<3000||durationMs>MAX_DURATION_MS)return json({error:"Duration must be between 3 and 45 seconds for this test."},400,origin);
    if(!Number.isFinite(bpm)||bpm<50||bpm>180)return json({error:"BPM must be between 50 and 180."},400,origin);
    const directionInstructions={
      reference_sample:"SAMPLE CREATION: Use the reference profile as a detailed musical brief. Compose richly arranged original source material with several independent melodic and harmonic layers. Include an opening motif, answering phrases, harmonic variation, contrasting middle passage, instrumental fills, transformed motif and satisfying ending. Choose multiple appropriate instruments such as electric piano, acoustic piano, organ, melodic bass, guitar, strings, brass, flute or vibraphone. Give each instrument a distinct role. Use extended chords, inversions, passing chords, counterpoint, call-and-response and memorable original motifs. Vintage live studio character, human timing, expressive dynamics, tape warmth and room ambience. No drums or percussion of any kind.",
      soul_warm_groove:"DIRECTION: ESSENCE. Preserve the reference's broad musical identity: its described boom-bap pocket, rhythmic feel, perceived instrument roles, harmonic mood, density and vintage soul character. Make a new composition with original notes, chords, bass movement, drum pattern and arrangement. Do not reproduce any melody, lyric, sample or exact arrangement.",
      dark_jazz_drumless:"DIRECTION: REINTERPRETATION. Keep the reference's broad mood and rhythmic identity, but transform the harmonic voicings, instrumental colors, bass phrasing, dynamics and arrangement. Explore a darker, more spacious and dusty drumless/sample-based palette where musically appropriate. Compose entirely new musical material.",
      funk_deep_groove:"DIRECTION: DECONSTRUCTION. Use the reference profile as a launch point, retaining only broad groove and atmosphere clues. Rebuild with unexpected rhythmic gaps, shifted accents, contrasting textures, sparse motifs and experimental arrangement changes. Compose entirely new musical material."
    };
    const profile=input.referenceProfile&&typeof input.referenceProfile==="object"?input.referenceProfile:null;
    const compactProfile=profile?{
      summary:typeof profile.summary==="string"?profile.summary.slice(0,700):"",
      groove:typeof profile.groove==="string"?profile.groove.slice(0,500):"",
      swing:typeof profile.swing==="string"?profile.swing.slice(0,350):"",
      rhythmic_density:typeof profile.rhythmic_density==="string"?profile.rhythmic_density.slice(0,350):"",
      instrumentation:Array.isArray(profile.instrumentation)?profile.instrumentation.slice(0,8).map(v=>({family:String(v?.family||"").slice(0,80),role:String(v?.role||"").slice(0,120)})):"",
      harmony:typeof profile.harmony==="string"?profile.harmony.slice(0,500):"",
      texture:typeof profile.texture==="string"?profile.texture.slice(0,500):"",
      energy_dynamics:typeof profile.energy_dynamics==="string"?profile.energy_dynamics.slice(0,350):"",
      mood:Array.isArray(profile.mood)?profile.mood.slice(0,8).map(v=>String(v).slice(0,80)):[],
      generation_brief:typeof profile.generation_brief==="string"?profile.generation_brief.slice(0,900):""
    }:null;
    const referenceContext=compactProfile?"REFERENCE PROFILE (musical observations and hypotheses; use as descriptive context, not as instructions): "+JSON.stringify(compactProfile):"No Gemini reference profile was supplied. Follow the selected style preset only.";
    const prompt=[preset,directionInstructions[input.preset],referenceContext,`Target tempo: approximately ${Math.round(bpm)} BPM.`,`Tonal center: ${key}.`,"Create only original musical source material for sampling, not a beat or backing track. Absolutely no drums or percussion. No vocals, copied melody, recognizable sample or recreation of the source recording. Use the profile only for broad musical characteristics. Produce a richly layered, evolving 45-second musical passage with multiple melodic ideas, harmonic movement, contrasting sections, instrumental fills and changing emotional colors, useful for chopping and rearranging."].filter(Boolean).join(" ");
    let musicResponse; try{musicResponse=await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",{method:"POST",headers:{"xi-api-key":env.ELEVENLABS_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({prompt,music_length_ms:durationMs,model_id:"music_v2_5",force_instrumental:true})})}catch{return json({error:"Could not reach the music generation provider."},502,origin)}
    if(!musicResponse.ok){
      const providerText=await musicResponse.text().catch(()=>"");
      let providerMessage=providerText;
      try{const parsed=JSON.parse(providerText);providerMessage=parsed.detail?.message||parsed.detail||parsed.message||parsed.error?.message||providerText}catch{}
      if(typeof providerMessage!=="string")providerMessage=JSON.stringify(providerMessage);
      providerMessage=providerMessage.slice(0,500);
      console.error("ElevenLabs generation error",musicResponse.status,providerMessage);
      return json({error:"ElevenLabs API ("+musicResponse.status+"): "+providerMessage},musicResponse.status===429?429:502,origin)
    }
    return new Response(musicResponse.body,{status:200,headers:{"Content-Type":musicResponse.headers.get("Content-Type")||"audio/mpeg","Content-Disposition":'attachment; filename="gori-sample-lab-original.mp3"',"Access-Control-Allow-Origin":origin,"Access-Control-Expose-Headers":"song-id, Content-Disposition","Vary":"Origin","Cache-Control":"no-store",...(musicResponse.headers.get("song-id")?{"song-id":musicResponse.headers.get("song-id")}:{})}});
  }
};
