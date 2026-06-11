/* ============================================================
   RABBONI — Gallery JavaScript
   ============================================================ */

const GALLERY = [
  { id:1,  cat:'food',     emoji:'🍛', title:'Jollof Rice with Chicken', height:220 },
  { id:2,  cat:'interior', emoji:'🪑', title:'Main Dining Hall',         height:300 },
  { id:3,  cat:'food',     emoji:'🐟', title:'Banku & Tilapia',          height:200 },
  { id:4,  cat:'events',   emoji:'🎉', title:'Birthday Celebration',     height:260 },
  { id:5,  cat:'food',     emoji:'🍕', title:'Chicken Pizza',            height:190 },
  { id:6,  cat:'music',    emoji:'🎵', title:'Live Music Night',         height:280 },
  { id:7,  cat:'outdoor',  emoji:'🌿', title:'Outdoor Seating Area',     height:230 },
  { id:8,  cat:'food',     emoji:'🍳', title:'Full Rabboni Breakfast',   height:200 },
  { id:9,  cat:'moments',  emoji:'😊', title:'Happy Customers',          height:250 },
  { id:10, cat:'food',     emoji:'🥘', title:'Assorted Rice Platter',    height:210 },
  { id:11, cat:'interior', emoji:'✨', title:'VIP Dining Area',          height:270 },
  { id:12, cat:'events',   emoji:'💑', title:"Couple's Dinner",          height:240 },
  { id:13, cat:'food',     emoji:'🍔', title:'Beef Burger',              height:190 },
  { id:14, cat:'music',    emoji:'🎸', title:'Weekend Band Performance', height:300 },
  { id:15, cat:'moments',  emoji:'🥂', title:'Celebration Toast',        height:220 },
  { id:16, cat:'food',     emoji:'🍖', title:'BBQ Ribs Platter',         height:200 },
  { id:17, cat:'outdoor',  emoji:'🌅', title:'Sunset Terrace View',      height:260 },
  { id:18, cat:'food',     emoji:'🥗', title:'Fresh Garden Salad',       height:190 },
  { id:19, cat:'events',   emoji:'🎂', title:'Birthday Cake Cutting',    height:240 },
  { id:20, cat:'interior', emoji:'🕯️', title:'Romantic Table Setup',     height:220 },
  { id:21, cat:'food',     emoji:'🍝', title:'Spaghetti Bolognese',      height:200 },
  { id:22, cat:'moments',  emoji:'👨‍👩‍👧', title:'Family Lunch',           height:250 },
  { id:23, cat:'food',     emoji:'🦐', title:'Grilled Prawns',           height:190 },
  { id:24, cat:'music',    emoji:'🎤', title:'Vocalist on Stage',        height:280 },
];

let activeCat = 'all';
let lightboxIdx = 0;
let visibleItems = [];

function renderGallery() {
  visibleItems = activeCat === 'all' ? GALLERY : GALLERY.filter(i => i.cat === activeCat);
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = visibleItems.map((item, idx) => `
    <div class="masonry-item" onclick="openLightbox(${idx})" style="opacity:0;transform:scale(.94);transition:opacity .4s ease ${idx*40}ms,transform .4s ease ${idx*40}ms">
      <div class="gallery-thumb-placeholder" style="height:${item.height}px">${item.emoji}</div>
      <div class="gallery-overlay">
        <div class="gallery-overlay-title">${item.title}</div>
        <div class="gallery-overlay-cat">${item.cat.charAt(0).toUpperCase()+item.cat.slice(1)}</div>
      </div>
      <div class="gallery-expand">🔍</div>
    </div>
  `).join('');

  requestAnimationFrame(() => {
    grid.querySelectorAll('.masonry-item').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
  });
}

function openLightbox(idx) {
  lightboxIdx = idx;
  updateLightbox();
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function lightboxNav(dir) {
  lightboxIdx = (lightboxIdx + dir + visibleItems.length) % visibleItems.length;
  updateLightbox();
}

function updateLightbox() {
  const item = visibleItems[lightboxIdx];
  document.getElementById('lightboxImg').textContent = item.emoji;
  document.getElementById('lightboxImg').style.fontSize = '8rem';
  document.getElementById('lightboxTitle').textContent = item.title;
  document.getElementById('lightboxCat').textContent = item.cat.charAt(0).toUpperCase() + item.cat.slice(1);
}

// Filters
document.querySelectorAll('.gal-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gal-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    renderGallery();
  });
});

// Close on overlay click
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});

// Keyboard nav
document.addEventListener('keydown', (e) => {
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
});

// Init
renderGallery();
