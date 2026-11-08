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
  walk(data.output); return parts.join("\n");
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
      const audio=typeof input.audioBase64==="string"?input.audioBase64:"";
      const mime=typeof input.mimeType==="string"?input.mimeType.toLowerCase():"";
      const allowed=["audio/wav","audio/x-wav","audio/mpeg","audio/mp3","audio/mp4","audio/m4a","audio/aiff","audio/flac","audio/ogg","audio/aac"];
      if(!allowed.includes(mime))return json({error:"Formato de áudio não suportado para análise Gemini."},400,origin);
      if(!audio||audio.length>Math.ceil(MAX_ANALYSIS_BYTES*4/3)+16)return json({error:"Para a análise Gemini, use um arquivo de até 14 MB."},413,origin);
      const prompt=`Analise este áudio como um produtor musical e engenheiro de áudio. Retorne SOMENTE um objeto JSON válido, sem markdown, com estas chaves: summary (resumo curto em português), bpm_estimate (número ou null), bpm_confidence (baixa|média|alta), key_estimate (tom provável ou null), key_confidence (baixa|média|alta), groove (descrição), swing (descrição), rhythmic_density (baixa|média|alta e justificativa), instrumentation (array de objetos {family,role,confidence}), harmony (descrição cautelosa; não invente acordes específicos), texture (descrição), energy_dynamics (descrição), mood (array de termos), sample_source_hypotheses (array de pistas sobre famílias de instrumentos, épocas/estéticas e técnicas de gravação; nunca afirme identificar um sample exato), notable_sections (array de objetos {approx_time,description}), generation_brief (instruções concisas para criar uma composição inteiramente nova inspirada apenas em atributos musicais gerais). Distinga claramente observações de hipóteses. Não identifique artistas, faixas ou samples sem evidência. Se não puder determinar um campo, use null ou baixa confiança.`;
      let geminiResponse;
      try{
        geminiResponse=await fetch("https://generativelanguage.googleapis.com/v1beta/interactions",{method:"POST",headers:{"x-goog-api-key":env.GEMINI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"gemini-3.8-flash",input:[{type:"text",text:prompt},{type:"audio",data:audio,mime_type:mime}]})});
      }catch{return json({error:"Não foi possível conectar ao serviço de análise Gemini."},502,origin)}
      const payload=await geminiResponse.json().catch(()=>({}));
      if(!geminiResponse.ok)return json({error:"O Gemini recusou a análise. Verifique a disponibilidade do modelo e a cota da API."},geminiResponse.status===429?429:502,origin);
      try{return json({ok:true,analysis:parseJsonText(extractOutputText(payload))},200,origin)}catch{return json({error:"O Gemini respondeu, mas não foi possível estruturar a análise. Tente novamente."},502,origin)}
    }

    if(!env.ELEVENLABS_API_KEY)return json({error:"Generation service is not configured yet."},503,origin);
    const preset=PRESETS[input.preset],durationMs=Number(input.durationMs??MAX_DURATION_MS),bpm=Number(input.bpm),key=typeof input.key==="string"?input.key.slice(0,40):"unspecified";
    if(!preset)return json({error:"Unknown composition preset."},400,origin);
    if(!Number.isInteger(durationMs)||durationMs<3000||durationMs>MAX_DURATION_MS)return json({error:"Duration must be between 3 and 45 seconds for this test."},400,origin);
    if(!Number.isFinite(bpm)||bpm<50||bpm>180)return json({error:"BPM must be between 50 and 180."},400,origin);
    const prompt=[preset,`Target tempo: approximately ${Math.round(bpm)} BPM.`,`Tonal center: ${key}.`,"Create a fresh composition with a coherent beginning, development and ending. Prioritize musicality, instrument interaction and a sample-worthy 45-second excerpt."].join(" ");
    let musicResponse; try{musicResponse=await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",{method:"POST",headers:{"xi-api-key":env.ELEVENLABS_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({prompt,music_length_ms:durationMs,model_id:"music_v2_5",force_instrumental:true})})}catch{return json({error:"Could not reach the music generation provider."},502,origin)}
    if(!musicResponse.ok){await musicResponse.body?.cancel();return json({error:"The music provider rejected the request. Check account access, credits and API permissions."},musicResponse.status===429?429:502,origin)}
    return new Response(musicResponse.body,{status:200,headers:{"Content-Type":musicResponse.headers.get("Content-Type")||"audio/mpeg","Content-Disposition":'attachment; filename="gori-sample-lab-original.mp3"',"Access-Control-Allow-Origin":origin,"Access-Control-Expose-Headers":"song-id, Content-Disposition","Vary":"Origin","Cache-Control":"no-store",...(musicResponse.headers.get("song-id")?{"song-id":musicResponse.headers.get("song-id")}:{})}});
  }
};
