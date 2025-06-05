async function generate() {
  const generateBtn = document.getElementById("generateBtn");
  generateBtn.innerHTML = `⏳ Generating... <span class="spinner"></span>`;
  generateBtn.classList.add("disabled-button");

  document.getElementById("printBtn").style.display = "none";
  document.getElementById("saveSection").style.display = "none";
  const saveStatus = document.getElementById("saveStatus");
  if (saveStatus && saveStatus.textContent.trim() !== "") {
    saveStatus.textContent = "";
  }

  const text = document.getElementById('textInput').value.trim();
  const output = document.getElementById('outputContainer');
  output.innerHTML = "";

  if (!text || text.length < 2) {
    alert("⚠️ Please upload a file or enter some text.");
    return;
  }

  // ✅ Kullanıcının dosya yükleyip yüklemediğini kontrol et
  const isFromFile = !!window.lastUploadedFileText;

  const selectedQuestionCount = parseInt(document.getElementById("questionCount").value);
  const selectedOptionCount = parseInt(document.getElementById("optionCount").value);
  const questionType = document.getElementById("questionType")?.value || "mcq";

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      isFromFile, // 👈 dosyadan mı girildi bilgisi
      questionCount: selectedQuestionCount,
      optionCount: selectedOptionCount,
      questionType
    })
  });

  const data = await res.json();

  if (!res.ok || !data.questions || !Array.isArray(data.questions)) {
    alert("❌ Failed to generate questions. Please try a longer or clearer topic.");
    return;
  }

  const questions = data.questions;

  if (questions.length > 0) {
    const success = await deductTokens(questions.length);
    if (!success) return;
    loadUserTokenBadge();
  }

  // 🎯 Soru kartlarını oluştur
  questions.forEach((q, i) => {
    // senin render() fonksiyonun aynen çalışmaya devam edebilir
    // (kısalık için burada yeniden eklenmedi)
  });

  document.getElementById("printBtn").style.display = "inline-block";
  document.getElementById("saveSection").style.display = "block";
  document.getElementById("downloadBtn").style.display = "inline-block";
  generateBtn.innerHTML = `✨ Generate`;
  generateBtn.classList.remove("disabled-button");
}
