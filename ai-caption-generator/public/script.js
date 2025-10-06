const fileInput = document.getElementById("fileInput");
const previewImage = document.getElementById("previewImage");
const uploadBox = document.getElementById("uploadBox");
const uploadInner = document.getElementById("uploadInner");
const removeBtn = document.getElementById("removeBtn");
const generateBtn = document.getElementById("generateBtn");
const results = document.getElementById("results");
const tone = document.getElementById("tone");
const language = document.getElementById("language");
const extra = document.getElementById("extra");

// UX: click or keyboard to open file chooser
uploadBox.addEventListener("click", () => fileInput.click());
uploadBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

// Drag & drop
["dragenter","dragover"].forEach(evt =>
  uploadBox.addEventListener(evt, e => { e.preventDefault(); uploadBox.classList.add("drag"); })
);
["dragleave","drop"].forEach(evt =>
  uploadBox.addEventListener(evt, e => { e.preventDefault(); uploadBox.classList.remove("drag"); })
);
uploadBox.addEventListener("drop", e => {
  const f = e.dataTransfer.files?.[0];
  if (f) handleFile(f);
});

fileInput.addEventListener("change", e => {
  const f = e.target.files?.[0];
  if (f) handleFile(f);
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    previewImage.src = ev.target.result;
    previewImage.style.display = "block";
    uploadInner.style.display = "none";
    removeBtn.style.display = "block";
  };
  reader.readAsDataURL(file);
}

removeBtn.addEventListener("click", () => {
  previewImage.src = "";
  previewImage.style.display = "none";
  uploadInner.style.display = "block";
  removeBtn.style.display = "none";
  fileInput.value = "";
  results.innerHTML = "";
});

generateBtn.addEventListener("click", async () => {
  if (!previewImage.src) {
    alert("Please upload an image first!");
    return;
  }

  // Loading state (spinner inside button)
  generateBtn.classList.add("loading");
  generateBtn.disabled = true;
  results.innerHTML = "";

  const base64 = previewImage.src.split(",")[1]; // strip data: prefix

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64,
        tone: tone.value,
        language: language.value,
        extra: extra.value
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed");

    const caps = Array.isArray(data.captions) ? data.captions : [];
    if (!caps.length) throw new Error("No captions returned");

    results.innerHTML = caps
      .map(c => `<div class="result-item"><div class="result-text">${escapeHtml(c)}</div><button class="copy-btn">Copy</button></div>`)
      .join("");

  } catch (err) {
    console.error(err);
    results.innerHTML = `<div class="result-item">⚠️ Error generating captions. Please try again.</div>`;
  } finally {
    generateBtn.classList.remove("loading");
    generateBtn.disabled = false;
  }
});

// Copy functionality (event delegation)
results.addEventListener("click", e => {
  if (e.target.classList.contains("copy-btn")) {
    const text = e.target.parentElement.querySelector(".result-text").textContent;
    navigator.clipboard.writeText(text).then(() => {
      e.target.textContent = "Copied!";
      setTimeout(() => (e.target.textContent = "Copy"), 900);
    });
  }
});

function escapeHtml(str){
  return str.replace(/[&<>"]/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" }[m]));
}
