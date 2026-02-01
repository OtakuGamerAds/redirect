/**
 * Google Consent Mode v2 Logic
 */

// Define dataLayer if it doesn't exist
window.dataLayer = window.dataLayer || [];

function gtag() {
  dataLayer.push(arguments);
}

// Check localStorage for saved consent
function loadConsent() {
  const savedConsent = localStorage.getItem("consent_status");

  if (savedConsent === "granted") {
    updateConsent("granted");
  } else if (savedConsent === "denied") {
    updateConsent("denied");
  } else {
    // No consent saved, show banner
    showBanner();
  }
}

function updateConsent(status) {
  const consentMode = {
    ad_storage: status,
    ad_user_data: status,
    ad_personalization: status,
    analytics_storage: status,
  };

  gtag("consent", "update", consentMode);
  localStorage.setItem("consent_status", status);

  if (status === "granted") {
    // Microsoft Clarity
    (function (c, l, a, r, i, t, y) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", "v7nf7q9wge");
  }
}

function showBanner() {
  const banner = document.createElement("div");
  banner.id = "consent-banner";
  banner.innerHTML = `
    <div class="consent-content">
      <div style="flex: 1;">
        <p style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-weight: bold; font-size: 1.1em;">
          <i class="fas fa-cookie-bite" style="color: var(--primary-color);"></i>
          <span>ملفات تعريف الارتباط (Cookies)</span>
        </p>
        <p style="margin: 0; font-size: 0.95em; color: var(--text-light);">
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك وجمع إحصائيات الاستخدام.
          بالموافقة، فإنك تقبل <a href="/privacy/" style="color: var(--primary-color); text-decoration: underline; transition: color 0.2s;">سياسة الخصوصية</a> و <a href="/terms/" style="color: var(--primary-color); text-decoration: underline; transition: color 0.2s;">شروط الاستخدام</a> الخاصة بنا.
        </p>
      </div>
      <div class="consent-actions" style="display: flex; gap: 1rem; margin-top: 1rem;">
        <button id="consent-reject" class="btn btn-secondary" style="white-space: nowrap;">رفض الكل</button>
        <button id="consent-accept" class="btn" style="white-space: nowrap;">موافق</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById("consent-accept").addEventListener("click", () => {
    updateConsent("granted");
    hideBanner();
  });

  document.getElementById("consent-reject").addEventListener("click", () => {
    updateConsent("denied");
    hideBanner();
  });
}

function hideBanner() {
  const banner = document.getElementById("consent-banner");
  if (banner) {
    banner.remove();
  }
}

// Initialize on load
window.addEventListener("load", loadConsent);
