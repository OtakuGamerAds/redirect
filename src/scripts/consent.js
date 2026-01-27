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
  const savedConsent = localStorage.getItem('consent_status');

  if (savedConsent === 'granted') {
    updateConsent('granted');
  } else if (savedConsent === 'denied') {
    updateConsent('denied');
  } else {
    // No consent saved, show banner
    showBanner();
  }
}

function updateConsent(status) {
  const consentMode = {
    'ad_storage': status,
    'ad_user_data': status,
    'ad_personalization': status,
    'analytics_storage': status
  };

  gtag('consent', 'update', consentMode);
  localStorage.setItem('consent_status', status);
  
  if (status === 'granted') {
    // Microsoft Clarity
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "v7nf7q9wge");
  }
}

function showBanner() {
  const banner = document.createElement('div');
  banner.id = 'consent-banner';
  banner.innerHTML = `
    <div class="consent-content">
      <p>
        🍪 <strong>ملفات تعريف الارتباط (Cookies)</strong><br>
        نستخدم ملفات تعريف الارتباط لتحسين تجربتك وجمع إحصائيات الاستخدام. هل توافق؟
      </p>
      <div class="consent-actions">
        <button id="consent-reject" class="btn btn-secondary">رفض</button>
        <button id="consent-accept" class="btn">موافق</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('consent-accept').addEventListener('click', () => {
    updateConsent('granted');
    hideBanner();
  });

  document.getElementById('consent-reject').addEventListener('click', () => {
    updateConsent('denied');
    hideBanner();
  });
}

function hideBanner() {
  const banner = document.getElementById('consent-banner');
  if (banner) {
    banner.remove();
  }
}

// Initialize on load
window.addEventListener('load', loadConsent);
