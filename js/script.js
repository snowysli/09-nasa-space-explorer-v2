// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

/*
  Beginner-friendly script:
  - When the "Fetch Space Images" button (#getImageBtn) is clicked, fetch APOD data.
  - If the page has an input with id="api-key" and it contains a key, use the NASA APOD API.
  - Otherwise fall back to the static JSON (apodData) bundled with the project.
  - Display each item as a gallery card with image (when available), title and date.
*/

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('getImageBtn');
  const gallery = document.getElementById('gallery');
  const didYouKnow = document.getElementById('didYouKnow');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  // Optional API key input (not required by the starter HTML).
  const apiKeyInput = document.getElementById('api-key');

  if (!button || !gallery) {
    console.error('Missing #getImageBtn button or #gallery container in the HTML.');
    return;
  }

  // The Did You Know fact will be shown when the user clicks the button.

  // Click handler: fetch data and render gallery
  button.addEventListener('click', async () => {
    // Save original label and disable button while loading
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Loading...';

    // Show a random 'Did you know?' space fact when the button is pressed.
    if (didYouKnow) {
      const facts = [
        'A day on Venus is longer than a year on Venus.',
        'There are more trees on Earth than stars in the Milky Way.',
        'Neutron stars can spin up to 600 times per second.',
        'Footprints on the Moon will likely stay for millions of years—there is no wind to erode them.',
        'Saturn could float in water because it is mostly made of gas.',
        'The largest volcano in the solar system is Olympus Mons on Mars.',
        'Space is not completely empty — it contains tiny amounts of gas, dust, and radiation.'
      ];

      const fact = facts[Math.floor(Math.random() * facts.length)];
      didYouKnow.innerHTML = `
        <div class="did-you-know-inner">
          <strong>Did you know?</strong>
          <span class="fact-text"> ${escapeHtml(fact)}</span>
        </div>
      `;
    }

    // Show a short loading message in the gallery while the fetch runs
    // This gives immediate feedback before the gallery content is rendered.
    gallery.innerHTML = `
      <div class="placeholder" aria-live="polite" aria-busy="true">
        <div class="placeholder-icon">🔄</div>
        <p>Fetching the stars &gt;&gt;&gt;</p>
      </div>
    `;

    try {
      // Determine date range user requested (if any)
      const startVal = startDateInput && startDateInput.value ? startDateInput.value : '';
      const endVal = endDateInput && endDateInput.value ? endDateInput.value : '';

      // Helper: robust date parsing. Accepts YYYY-MM-DD, ISO strings, or other Date-parsable values.
      // Returns a Date set to UTC midnight for the parsed day, or null if parsing fails.
      function parseAnyDate(str) {
        if (!str) return null;
        // Fast path: strict YYYY-MM-DD from input elements
        const ymd = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(str);
        if (ymd) {
          const y = Number(ymd[1]);
          const m = Number(ymd[2]);
          const d = Number(ymd[3]);
          return new Date(Date.UTC(y, m - 1, d));
        }

        // Try Date parsing for ISO or other formats
        const parsed = new Date(str);
        if (isNaN(parsed.getTime())) return null;
        return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
      }

      // Helper: format Date -> YYYY-MM-DD (UTC)
      function formatDateYMD(date) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }

      function addDays(date, days) {
        const d = new Date(date.getTime());
        d.setUTCDate(d.getUTCDate() + days);
        return d;
      }

      // Compute a sensible range for requests. If user supplied only one date, expand to 9 days.
  let startDate = parseAnyDate(startVal);
  let endDate = parseAnyDate(endVal);
      if (startDate && !endDate) {
        endDate = addDays(startDate, 8);
      } else if (!startDate && endDate) {
        startDate = addDays(endDate, -8);
      }

      // If both supplied but start > end, swap them
      if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        const tmp = startDate; startDate = endDate; endDate = tmp;
      }
      // For debugging/informative message - human readable dates for the range
      const startDisplay = startDate ? formatDateYMD(startDate) : '';
      const endDisplay = endDate ? formatDateYMD(endDate) : '';
      // Choose fetch URL: NASA APOD API if api key provided, otherwise static JSON
      const apiKey = apiKeyInput && apiKeyInput.value.trim();

      // If we have a NASA API key, and a date range, request that range. Otherwise fall back to static JSON.
      let items = [];
      if (apiKey) {
        // Build NASA APOD URL. If we have a start & end, use start_date/end_date (returns array).
        let fetchUrl = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}`;
        if (startDate && endDate) {
          fetchUrl += `&start_date=${formatDateYMD(startDate)}&end_date=${formatDateYMD(endDate)}`;
        } else if (startDate && !endDate) {
          fetchUrl += `&date=${formatDateYMD(startDate)}`;
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        items = Array.isArray(data) ? data : [data];

      } else {
        // Use bundled static JSON: fetch the file and then filter by date range if provided
        const response = await fetch(apodData);
        if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        let all = Array.isArray(data) ? data : [data];
        if (startDate || endDate) {
          // Filter between startDate and endDate (inclusive). If only one side defined, treat missing side as open.
          items = all.filter((it) => {
            if (!it.date) return false;
            const d = parseAnyDate(it.date);
            if (!d) return false;
            if (startDate && d.getTime() < startDate.getTime()) return false;
            if (endDate && d.getTime() > endDate.getTime()) return false;
            return true;
          });
        } else {
          items = all;
        }
      }

      // We need to present up to 9 items. If there are more than 9, pick 9 at random so user sees a sample from the range.
      // Shuffle helper (Fisher-Yates) - will randomize order in-place.
      function shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      const desired = 9;
      // Shuffle items so each fetch has a randomized order. Then take up to `desired` items.
      if (items && items.length > 0) {
        shuffleInPlace(items);
        if (items.length > desired) items = items.slice(0, desired);
      }

      // If there are no items in the chosen range, show a helpful message including the requested range
      console.debug('APOD: items found', items.length, 'for range', startDisplay, endDisplay);
      if (!items || items.length === 0) {
        gallery.innerHTML = `
          <div class="placeholder">
            <p>No images found for the selected date range (${startDisplay || 'any'} — ${endDisplay || 'any'}). Try a wider range or remove the dates.</p>
          </div>
        `;
      } else {
        renderGallery(items, gallery);
        // Insert a small results info line at the top of the gallery so users know how many images were shown
        try {
          const infoText = `Showing ${items.length} image${items.length === 1 ? '' : 's'} from ${startDisplay || 'any'} — ${endDisplay || 'any'}`;
          const infoEl = document.createElement('div');
          infoEl.className = 'results-info';
          infoEl.textContent = infoText;
          gallery.insertAdjacentElement('afterbegin', infoEl);
        } catch (e) {
          // non-fatal
          console.debug('Could not insert results info', e);
        }
      }
    } catch (err) {
      gallery.innerHTML = `
        <div class="placeholder">
          <p>Sorry, something went wrong loading images.</p>
        </div>
      `;
      console.error(err);
    } finally {
      button.disabled = false;
      button.textContent = originalLabel || 'Fetch Space Images';
    }
  });
});

/* Helper: format a date string to 'Month day, Year' (e.g. "October 30, 2025").
   Accepts ISO strings, YYYY-MM-DD, or other Date-parsable values. Returns original
   value if parsing fails. */
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  // Try Date parsing first
  let d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // Try YYYY-MM-DD specifically
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (m) {
      d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    }
  }

  if (isNaN(d.getTime())) return dateStr; // fallback

  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Render a gallery of APOD items into the given container.
 * Each item shows an image (when available), a title, and a date.
 *
 * @param {Array} items - Array of APOD objects from the JSON file or NASA API.
 * @param {HTMLElement} container - DOM element to fill with gallery items.
 */
function renderGallery(items, container) {
  // Clear existing content
  container.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = '<div class="placeholder"><p>No images available.</p></div>';
    return;
  }

  const frag = document.createDocumentFragment();

  items.forEach((item) => {
    // Read values with safe defaults
    const title = item.title || 'Untitled';
  const rawDate = item.date || '';
  const date = formatDateDisplay(rawDate);
    const mediaType = item.media_type || 'image';
    const url = item.hdurl || item.url || '';

    const card = document.createElement('article');
    card.className = 'gallery-item';
  // Make cards focusable for keyboard users so hover effects and Enter/Space activation work.
  card.tabIndex = 0;

    if (mediaType === 'image' && url) {
      // Image card: image, title, date
      card.innerHTML = `
        <img src="${escapeAttr(url)}" alt="${escapeHtml(title)}" loading="lazy" />
        <p><strong>${escapeHtml(title)}</strong></p>
        <p>${escapeHtml(date)}</p>
      `;
    } else {
      // Non-image (video etc): title/date and link to media
      const safeUrl = url || '#';
      card.innerHTML = `
        <p><strong>${escapeHtml(title)}</strong></p>
        <p>${escapeHtml(date)}</p>
        <p><a href="${escapeAttr(safeUrl)}" target="_blank" rel="noopener">View media</a></p>
      `;
    }

    // Store explanation text and full-size url on the DOM node dataset so the modal can use them.
    // Using dataset keeps template markup simple and avoids HTML injection risks.
  card.dataset.explanation = item.explanation || '';
  card.dataset.fullUrl = url || '';
  card.dataset.title = title;
  // Store the formatted display date so modal shows the friendly format
  card.dataset.date = date;

    // When a user clicks a gallery card, open the modal with the larger image + details.
    card.addEventListener('click', () => {
      openModal({
        url: card.dataset.fullUrl,
        title: card.dataset.title,
        date: card.dataset.date,
        explanation: card.dataset.explanation
      });
    });

    // Allow keyboard activation: Enter or Space opens the modal.
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Prevent page scroll on Space
        e.preventDefault();
        openModal({
          url: card.dataset.fullUrl,
          title: card.dataset.title,
          date: card.dataset.date,
          explanation: card.dataset.explanation
        });
      }
    });

    frag.appendChild(card);
  });

  container.appendChild(frag);
}

/* Helper: escape text for safe insertion into HTML */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/* Helper: escape attributes (keeps quotes out of URLs) */
function escapeAttr(text) {
  return escapeHtml(String(text));
}

/* Modal: create once and reuse */
const modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.innerHTML = `
  <div class="modal" role="dialog" aria-modal="true" aria-label="Image details">
    <button class="modal-close" aria-label="Close">✕</button>
    <img class="modal-img" src="" alt="" />
    <div class="modal-content">
      <h2 class="modal-title"></h2>
      <p class="modal-date"></p>
      <p class="modal-explanation"></p>
    </div>
  </div>
`;
document.body.appendChild(modal);

const modalClose = modal.querySelector('.modal-close');
const modalImg = modal.querySelector('.modal-img');
const modalTitle = modal.querySelector('.modal-title');
const modalDate = modal.querySelector('.modal-date');
const modalExplanation = modal.querySelector('.modal-explanation');

/* Open the modal with provided data */
function openModal({ url, title, date, explanation }) {
  // If there's no image URL, don't open modal (could be a video-only item)
  if (!url) return;

  modalImg.src = url;
  modalImg.alt = title || 'Space image';
  modalTitle.textContent = title || '';
  modalDate.textContent = date || '';
  modalExplanation.textContent = explanation || '';

  modal.classList.add('open');
  // Prevent background scroll while modal is open
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}

/* Close the modal and clear content */
function closeModal() {
  modal.classList.remove('open');
  modalImg.src = '';
  modalImg.alt = '';
  modalTitle.textContent = '';
  modalDate.textContent = '';
  modalExplanation.textContent = '';
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

/* Close handlers: button, click outside modal, Escape key */
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});