import express from "express";
import cors from "cors";
import dotenv from "dotenv";

app.use(cors({
  origin: ["https://vediotech.com", "http://vediotech.com"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.get("/", (req, res) => res.send("✅ Backend working and CORS enabled"));


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.static("public")); // serves index.html

// Helper: build the instruction for tone
function toneDirective(tone) {
  const map = {
    fun: "Playful, lively, light humor.",
    accurate: "Factual and precise; suitable for blogs and captions that describe content accurately.",
    alt: "Accessibility ALT text describing key visual elements for a screen reader; one sentence.",
    filename: "Return SEO-friendly hyphenated filename-like captions (kebab-case, 4–8 words, no symbols).",
    joke: "Comedic, witty punchlines.",
    serious: "Neutral, composed, and objective.",
    happy: "Cheerful and optimistic.",
    formal: "Polite, refined, and formal.",
    professional: "Crisp, brand-safe, and professional.",
    sad: "Melancholic and reflective.",
    excited: "High energy, enthusiastic.",
    romantic: "Warm, affectionate, and romantic.",
    inspirational: "Motivational and uplifting.",
    mysterious: "Vague, intriguing, and curious.",
    adventurous: "Bold, outdoorsy, and daring.",
    relaxed: "Chill, easygoing, and calm.",
    sarcastic: "Ironic, tongue-in-cheek sarcasm."
  };
  return map[tone] || "Neutral social-media style.";
}

app.post("/api/generate", async (req, res) => {
  try {
    const { imageBase64, tone, language, extra } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Build a careful prompt
    const style = toneDirective(tone);
    const lang = language || "English";
    const extraLine = extra ? `Additional context from user: ${extra}` : "No extra context.";

    const userPrompt = `
You are a caption generator for images.

Language: ${lang}
Tone guideline: ${style}
Task: Generate 5 distinct captions for the image. 
Each caption should be about ~20 words (aim for 18–22). 
Avoid hashtags unless they are meaningful; keep captions natural for social media.
${tone === "filename" ? "IMPORTANT: For 'filename' tone return 5 short hyphenated filenames (kebab-case), 4–8 words each, no punctuation except hyphens." : ""}
${tone === "alt" ? "IMPORTANT: For 'alt' tone write accessibility ALT text (one sentence, clear and descriptive, ~20 words)." : ""}
${extraLine}
Return results as numbered lines (1. ... 2. ... 3. ... 4. ... 5. ...).
    `.trim();

    // Use Node 18+ native fetch
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        messages: [
          { role: "system", content: "You turn images into captions following user instructions precisely." },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: `data:image/jpeg;base64,${imageBase64}` }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: "OpenAI request failed", details: data });
    }

    const raw = data?.choices?.[0]?.message?.content || "";
    const lines = raw
      .split(/\n+/)
      .map(l => l.replace(/^\s*\d+\.\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);

    // Final safety: normalize to about ~20 words (except filename tone)
    const norm = lines.map(l => {
      if (tone === "filename") return l; // keep kebab-case short
      const words = l.split(/\s+/);
      if (words.length > 22) return words.slice(0, 22).join(" ") + "…";
      return l;
    });

    res.json({ captions: norm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});


