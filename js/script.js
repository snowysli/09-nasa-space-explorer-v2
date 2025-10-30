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
      // Choose fetch URL: NASA APOD API if api key provided, otherwise static JSON
      const apiKey = apiKeyInput && apiKeyInput.value.trim();
      let fetchUrl = apodData;
      if (apiKey) {
        // Fetch one APOD item using the provided API key
        fetchUrl = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Normalize data to an array so renderGallery can handle single or multiple results
      const items = Array.isArray(data) ? data : [data];

      renderGallery(items, gallery);
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
    const date = item.date || '';
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