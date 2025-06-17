function formatToLocalDatetime(mysqlDateString) {
  if (!mysqlDateString) return '—';
  const localDate = new Date(mysqlDateString + 'Z'); // UTC varsayımı
  return localDate.toLocaleString(); // sistem saatine göre döner
}

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("mcq-admin-root");
  if (!root) {
    console.warn("⚠️ #mcq-admin-root bulunamadı.");
    return;
  }

  root.innerHTML = `<h2>🔄 Kullanıcılar yükleniyor...</h2>`;

  try {
let users = await fetch('/wp-json/mcq/v1/admin/users', {
  headers: {
    'X-WP-Nonce': window.WPSettings?.nonce || ''
  }
}).then(res => res.json());
// ✅ Kullanıcı istatistiklerini hesapla
const totalUsers = users.length;
const activeUsers = users.filter(u => u.inactive_days != null && u.inactive_days < 30).length;
const inactiveUsers = totalUsers - activeUsers;

// ✅ İstatistik kutusunu oluştur
let statsHTML = `
  <div style="margin: 20px 0; padding: 12px; background: #f1f5f9; border-radius: 10px;">
    <b>📊 Kullanıcı İstatistikleri:</b><br/>
    👥 Toplam: <b>${totalUsers}</b> &nbsp;&nbsp; ✅ Aktif: <b style="color:green;">${activeUsers}</b> &nbsp;&nbsp; 🔴 Pasif: <b style="color:red;">${inactiveUsers}</b>
  </div>
`;


// ✅ Kullanıcıları son girişe göre sırala (yeni en üstte)
users = users.sort((a, b) => {
  const dateA = a.last_login ? new Date(a.last_login) : 0;
  const dateB = b.last_login ? new Date(b.last_login) : 0;
  return dateB - dateA;
});


    if (!Array.isArray(users)) {
      console.error("❌ API'den beklenen dizi gelmedi:", users);
      root.innerHTML = `<p style="color:red;">API hatası: Kullanıcı listesi alınamadı.</p>`;
      return;
    }
// ✅ Önce istatistikleri ekle
let html = `
  <div style="margin: 20px 0; padding: 12px; background: #f1f5f9; border-radius: 10px;">
    <b>📊 Kullanıcı İstatistikleri:</b><br/>
    👥 Toplam: <b>${totalUsers}</b> &nbsp;&nbsp; ✅ Aktif: <b style="color:green;">${activeUsers}</b> &nbsp;&nbsp; 🔴 Pasif: <b style="color:red;">${inactiveUsers}</b>
  </div>


  <button id="openMailModalBtn" style="margin-top: 10px;">📬 Toplu Mail Gönder</button>
`;
 // tabloya istatistik kutusunu ekle
html += `<table style="width:100%; border-collapse: collapse; margin-top: 20px;">
  <thead>
    <tr>
    <th>Seç</th>
      <th>ID</th>
      <th>Email</th>
      <th>Ad</th>
      <th>Token</th>
      <th>Son Giriş</th>
      <th>Aktiflik</th>
      <th>İşlemler</th>
    </tr>
  </thead>
  <tbody>`;

   
for (const user of users) {
 const lastLogin = formatToLocalDatetime(user.last_login);

  const inactiveText = user.inactive_days != null
    ? `${user.inactive_days} gün önce`
    : 'Hiç giriş yapmamış';

  const rowStyle = user.inactive_days >= 30
    ? 'background-color: #ffe5e5;' // 🔴 açık kırmızı
    : '';

  html += `
    <tr style="${rowStyle}">
      <td style="border: 1px solid #ccc; padding: 8px;">${user.id}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${user.email}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${user.name}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">
        <input type="number" value="${user.tokens}" data-user-id="${user.id}" class="token-input" style="width: 60px;" />
      </td>
      <td style="border: 1px solid #ccc; padding: 8px;">${lastLogin}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${inactiveText}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">
        <button class="view-btn" data-id="${user.id}">👁️</button>
        <button class="delete-btn" data-id="${user.id}">🗑️</button>
        <td><input type="checkbox" class="mail-checkbox" data-email="${user.email}"></td>
      </td>
    </tr>`;
}


    html += '</tbody></table>';
    root.innerHTML = html;
    // Aç/kapat
document.getElementById("openMailModalBtn").addEventListener("click", () => {
  document.getElementById("mailModal").style.display = "flex";
});
document.getElementById("closeModalBtn").addEventListener("click", () => {
  document.getElementById("mailModal").style.display = "none";
});

// Gönderme


document.getElementById("sendMailBtn").addEventListener("click", async () => {
  const subject = document.getElementById("mailSubject").value.trim();
  const message = document.getElementById("mailBody").value.trim();
  const checkboxes = document.querySelectorAll(".mail-checkbox:checked");

  if (!subject || !message || checkboxes.length === 0) {
    return alert("⚠️ Konu, mesaj ve alıcı seçimi gerekli.");
  }

  const emails = [...checkboxes].map(cb => cb.dataset.email);
  const res = await fetch("/wp-json/mcq/v1/admin/send-mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": window.WPSettings?.nonce || ""
    },
    body: JSON.stringify({ emails, subject, message })
  });

  const result = await res.json();
  document.getElementById("mailStatus").innerHTML =
    result.success ? `✅ ${result.sent} mail gönderildi.` : `❌ Hata: ${result.error}`;
});
    // 🔄 Token güncelleme
    root.querySelectorAll(".token-input").forEach(input => {
      input.addEventListener("change", async (e) => {
        const id = e.target.dataset.userId;
        const value = e.target.value;

        const res = await fetch("/wp-json/mcq/v1/admin/update-tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.WPSettings?.nonce || ''
          },
          body: JSON.stringify({ user_id: id, tokens: value })
        });

        const result = await res.json();
        if (result.success) {
          alert("✅ Token değeri güncellendi");
        } else {
          alert("❌ Güncelleme başarısız");
        }
      });
    });

    // 🗑️ Kullanıcı silme
    root.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Bu kullanıcıyı ve tüm verilerini silmek istediğinize emin misiniz?")) return;

        const id = btn.dataset.id;
        const res = await fetch(`/wp-json/mcq/v1/admin/delete-user/${id}`, {
          method: "DELETE",
          headers: { "X-WP-Nonce": window.WPSettings?.nonce || '' }
        });

        const result = await res.json();
      if (result.success) {
  alert("✅ Kullanıcı ve tüm verileri silindi.");
  location.reload();
} else if (result.protected) {
  alert("⛔ Bu kullanıcı silinemez: nalcakar@gmail.com");
} else {
  alert("❌ Silme işlemi başarısız.");
}
      });
    });

    // 👁️ Kullanıcı detaylarını gösterme
    root.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;

        const res = await fetch(`/wp-json/mcq/v1/admin/user-details/${id}`, {
          headers: { "X-WP-Nonce": window.WPSettings?.nonce || '' }
        });

        const titles = await res.json();
        if (!Array.isArray(titles)) {
          alert("Detaylar alınamadı.");
          return;
        }
let detailHTML = `<h3>📚 Başlıklar</h3>`;
const sortedTitles = [...titles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

for (const title of sortedTitles) {
 const dateStr = formatToLocalDatetime(title.created_at);
  detailHTML += `
    <details style="margin-bottom:20px;">
      <summary style="font-size:16px; cursor:pointer;">
        <b>📌 ${title.title}</b><br/>
        <small style="color:#666;">🕒 Oluşturma: ${dateStr}</small>
      </summary>`;

  // 🔽 Metinler (yeniden eskiye)
  if (title.texts?.length > 0) {
    const sortedTexts = [...title.texts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    detailHTML += `<h4 style="margin-top:12px;">📝 Metinler (${sortedTexts.length})</h4><ul>`;
    for (const t of sortedTexts) {
      const textDate = formatToLocalDatetime(t.created_at);
      detailHTML += `<li style="margin-bottom:8px;">
        <pre style="white-space:pre-wrap;background:#f8f8f8;padding:8px;border-radius:6px;">${t.content}</pre>
        <small style="color:#999;">🕒 ${textDate}</small>
      </li>`;
    }
    detailHTML += `</ul>`;
  }

  // ❓ Sorular (yeniden eskiye)
  if (title.questions?.length > 0) {
    const sortedQuestions = [...title.questions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    detailHTML += `<h4 style="margin-top:12px;">❓ Sorular (${sortedQuestions.length})</h4><ul>`;
    for (const q of sortedQuestions) {
      const questionDate = formatToLocalDatetime(q.created_at);
      detailHTML += `<li style="margin-bottom:10px;">
        ${q.question}<br/>
        <small><b>Cevap:</b> ${q.answer}</small><br/>
        <small style="color:#999;">🕒 ${questionDate}</small>
      </li>`;
    }
    detailHTML += `</ul>`;
  }

  detailHTML += `</details>`;
}




        const win = window.open("", "_blank", "width=600,height=800");
        win.document.write(`<html><body style="font-family:sans-serif;padding:20px;">${detailHTML}</body></html>`);
      });
    });

  } catch (error) {
    console.error("❌ Hata oluştu:", error);
    root.innerHTML = `<p style="color:red;">Sunucu veya bağlantı hatası oluştu.</p>`;
  }
});

