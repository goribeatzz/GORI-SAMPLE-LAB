const ALLOWED_ORIGIN = "https://goribeatzz.github.io";
const MAX_DURATION_MS = 45000;

const PRESETS = {
  soul_warm_groove: "Create a completely original instrumental soul-jazz groove. Warm Rhodes chords with tasteful extensions, organic electric bass, live acoustic drums with relaxed swing and ghost notes, clean rhythm guitar, subtle strings and restrained brass accents. Evolving arrangement, natural band interaction, expressive dynamics, dusty analog recording character. No vocals. Do not imitate or reference any existing artist, song, recording, melody, or sample.",
  dark_jazz_drumless: "Create a completely original dark, cinematic drumless jazz instrumental. Expressive acoustic piano with rich extended harmony, upright bass, restrained tenor saxophone phrases, subtle vibraphone and intimate room ambience. No drums or percussion. Evolving arrangement, human timing, deep dynamics, warm aged recording texture. No vocals. Do not imitate or reference any existing artist, song, recording, melody, or sample.",
  funk_deep_groove: "Create a completely original deep funk instrumental. Syncopated electric bass, tight dry live acoustic drums with ghost notes, clavinet, rhythmic guitar, hand percussion and occasional restrained brass accents. Strong pocket, human interaction, fills and arrangement variations. Warm analog recording character. No vocals. Do not imitate or reference any existing artist, song, recording, melody, or sample."
};

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
      "Cache-Control": "no-store"
    }
  });
}

function corsOrigin(request) {
  const origin = request.headers.get("Origin");
  return origin === ALLOWED_ORIGIN ? origin : null;
}

export default {
  async fetch(request, env) {
    const origin = corsOrigin(request);
    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (!origin) return new Response("Forbidden", { status: 403 });
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "GORI SAMPLE LAB API",
        generationConfigured: Boolean(env.ELEVENLABS_API_KEY && env.TURNSTILE_SECRET_KEY)
      }, 200, origin);
    }

    if (request.method !== "POST" || url.pathname !== "/api/generate") {
      return json({ error: "Endpoint not found." }, 404, origin);
    }

    if (!env.ELEVENLABS_API_KEY || !env.TURNSTILE_SECRET_KEY) {
      return json({ error: "Generation service is not configured yet." }, 503, origin);
    }

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ error: "Invalid JSON request." }, 400, origin);
    }

    const preset = PRESETS[input.preset];
    const durationMs = Number(input.durationMs ?? MAX_DURATION_MS);
    const bpm = Number(input.bpm);
    const key = typeof input.key === "string" ? input.key.slice(0, 40) : "unspecified";
    const token = typeof input.turnstileToken === "string" ? input.turnstileToken : "";

    if (!preset) return json({ error: "Unknown composition preset." }, 400, origin);
    if (!Number.isInteger(durationMs) || durationMs < 3000 || durationMs > MAX_DURATION_MS) {
      return json({ error: "Duration must be between 3 and 45 seconds for this test." }, 400, origin);
    }
    if (!Number.isFinite(bpm) || bpm < 50 || bpm > 180) {
      return json({ error: "BPM must be between 50 and 180." }, 400, origin);
    }
    if (!token) return json({ error: "Security verification is required." }, 400, origin);

    const verifyForm = new FormData();
    verifyForm.set("secret", env.TURNSTILE_SECRET_KEY);
    verifyForm.set("response", token);
    const clientIp = request.headers.get("CF-Connecting-IP");
    if (clientIp) verifyForm.set("remoteip", clientIp);

    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: verifyForm
    });
    const verificationResult = await verification.json().catch(() => ({}));
    if (!verificationResult.success) {
      return json({ error: "Security verification failed. Please try again." }, 403, origin);
    }

    const prompt = [
      preset,
      `Target tempo: approximately ${Math.round(bpm)} BPM.`,
      `Tonal center: ${key}.`,
      "Create a fresh composition with a coherent beginning, development and ending. Prioritize musicality, instrument interaction and a sample-worthy 45-second excerpt."
    ].join(" ");

    let musicResponse;
    try {
      musicResponse = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192", {
        method: "POST",
        headers: {
          "xi-api-key": env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          music_length_ms: durationMs,
          model_id: "music_v2_5",
          force_instrumental: true
        })
      });
    } catch {
      return json({ error: "Could not reach the music generation provider." }, 502, origin);
    }

    if (!musicResponse.ok) {
      await musicResponse.body?.cancel();
      return json({
        error: "The music provider rejected the request. Check account access, credits and API permissions."
      }, musicResponse.status === 429 ? 429 : 502, origin);
    }

    return new Response(musicResponse.body, {
      status: 200,
      headers: {
        "Content-Type": musicResponse.headers.get("Content-Type") || "audio/mpeg",
        "Content-Disposition": 'attachment; filename="gori-sample-lab-original.mp3"',
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Expose-Headers": "song-id, Content-Disposition",
        "Vary": "Origin",
        "Cache-Control": "no-store",
        ...(musicResponse.headers.get("song-id") ? { "song-id": musicResponse.headers.get("song-id") } : {})
      }
    });
  }
};
