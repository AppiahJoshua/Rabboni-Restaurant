/* ============================================================
   RABBONI RESTAURANT — Database Seeder
   Run: node db/seed.js
   ============================================================ */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDB, getDB } = require('./database');

initDB();
const db = getDB();

const MENU_ITEMS = [
  // Breakfast
  { name:'Full Rabboni Breakfast', category:'breakfast', price:45, emoji:'🍳', description:'Eggs, toast, sausage, baked beans, grilled tomato & more.', popular:1 },
  { name:'Rabboni Standard',       category:'breakfast', price:30, emoji:'🥚', description:'Fried eggs with bread and a hot beverage.', popular:0 },
  { name:'Quick Oat',              category:'breakfast', price:15, emoji:'🥣', description:'Warm oatmeal porridge with milk and honey.', popular:0 },
  { name:'Quick Tom Brown',        category:'breakfast', price:15, emoji:'🌾', description:'Nourishing roasted corn porridge, a Ghanaian morning staple.', popular:0 },

  // Rice
  { name:'Jollof Rice (Plain)',      category:'rice', price:25, emoji:'🍛', description:'Classic perfectly spiced Ghanaian Jollof rice.', popular:1 },
  { name:'Jollof Rice + Chicken',   category:'rice', price:45, emoji:'🍗', description:'Signature Jollof with succulent grilled or fried chicken.', popular:1 },
  { name:'Fried Rice (Plain)',       category:'rice', price:25, emoji:'🍚', description:'Wok-tossed fried rice with mixed vegetables and seasoning.', popular:0 },
  { name:'Fried Rice + Chicken',    category:'rice', price:45, emoji:'🍗', description:'Fried rice served with your choice of chicken.', popular:0 },
  { name:'Assorted Rice',           category:'rice', price:50, emoji:'🥘', description:'A hearty combo with rice, assorted meats and vegetables.', popular:0 },
  { name:'Special Fried Rice',      category:'rice', price:55, emoji:'⭐', description:'Premium fried rice with prawns, egg and assorted proteins.', popular:0 },
  { name:'Rabboni Special Fried Rice', category:'rice', price:60, emoji:'👑', description:"Chef's signature recipe — the ultimate fried rice experience.", popular:1 },

  // Local
  { name:'Banku & Tilapia',  category:'local', price:55, emoji:'🐟', description:'Fresh grilled tilapia with smooth fermented banku and pepper sauce.', popular:1 },
  { name:'Fufu & Soup',      category:'local', price:40, emoji:'🫕', description:'Hand-pounded fufu served with choice of light, palm nut or groundnut soup.', popular:0 },
  { name:'Omotuo & Soup',    category:'local', price:35, emoji:'🍚', description:'Rice balls served with rich, aromatic Ghanaian soup.', popular:0 },
  { name:'Ampesi',           category:'local', price:30, emoji:'🥗', description:'Boiled yam or plantain with garden egg stew or kontomire.', popular:0 },
  { name:'Kenkey & Fish',    category:'local', price:30, emoji:'🌯', description:'Classic fermented corn dough with fried fish and pepper.', popular:0 },

  // Salads
  { name:'Garden Salad',    category:'salads', price:25, emoji:'🥗', description:'Fresh seasonal vegetables with house vinaigrette dressing.', popular:0 },
  { name:'Caesar Salad',    category:'salads', price:35, emoji:'🥬', description:'Crisp romaine, parmesan croutons and Caesar dressing.', popular:0 },
  { name:'Coleslaw',        category:'salads', price:20, emoji:'🥙', description:'Creamy homemade coleslaw — a perfect side or starter.', popular:0 },
  { name:'Protein Salad',   category:'salads', price:45, emoji:'🥑', description:'Mixed greens with grilled chicken, egg and avocado.', popular:0 },

  // Chinese
  { name:'Sweet & Sour Chicken',   category:'chinese', price:55, emoji:'🍜', description:'Tender chicken in a tangy sweet and sour sauce with pineapple.', popular:0 },
  { name:'Chinese Fried Chicken',  category:'chinese', price:50, emoji:'🥢', description:'Crispy, golden fried chicken with Chinese five-spice seasoning.', popular:0 },
  { name:'Spring Rolls (6 pcs)',   category:'chinese', price:30, emoji:'🥟', description:'Crispy vegetable and chicken spring rolls with dipping sauce.', popular:0 },
  { name:'Pepper Soup',            category:'chinese', price:45, emoji:'🍲', description:'Aromatic spiced broth with chicken or fish — warming and light.', popular:0 },

  // Pasta & Noodles
  { name:'Spaghetti Bolognese', category:'pasta', price:45, emoji:'🍝', description:'Al dente spaghetti with rich minced beef tomato sauce.', popular:0 },
  { name:'Stir Fry Noodles',    category:'pasta', price:40, emoji:'🍜', description:'Egg noodles wok-tossed with vegetables and choice of protein.', popular:0 },
  { name:'Mac & Cheese',        category:'pasta', price:35, emoji:'🧀', description:'Creamy, cheesy macaroni — a comfort classic done right.', popular:0 },
  { name:'Pasta Arrabiata',     category:'pasta', price:40, emoji:'🍝', description:'Penne pasta in spicy tomato and garlic sauce.', popular:0 },

  // Burgers
  { name:'Beef Burger',        category:'burgers', price:40, emoji:'🍔', description:'Juicy beef patty with lettuce, tomato, onion and house sauce.', popular:1 },
  { name:'Chicken Burger',     category:'burgers', price:35, emoji:'🍗', description:'Grilled or crispy chicken fillet burger with coleslaw.', popular:0 },
  { name:'Club Sandwich',      category:'burgers', price:30, emoji:'🥪', description:'Triple-decker toasted sandwich with chicken, egg and veggies.', popular:0 },
  { name:'Double Beef Burger', category:'burgers', price:55, emoji:'🍔', description:'Double the patty, double the joy — fully loaded.', popular:0 },

  // Grills
  { name:'Grilled Chicken', category:'grills', price:55, emoji:'🍖', description:'Half chicken marinated in house spices, slow-grilled to perfection.', popular:1 },
  { name:'Grilled Fish',    category:'grills', price:60, emoji:'🐟', description:'Whole tilapia or kingfish seasoned and charcoal-grilled.', popular:0 },
  { name:'BBQ Ribs',        category:'grills', price:75, emoji:'🥩', description:'Slow-cooked pork ribs glazed with smoky BBQ sauce.', popular:0 },
  { name:'Suya Skewers',    category:'grills', price:40, emoji:'🍢', description:'West African-style spiced beef skewers with groundnut rub.', popular:0 },
  { name:'Grilled Prawns',  category:'grills', price:70, emoji:'🦐', description:'King prawns grilled with garlic butter and herbs.', popular:0 },

  // Pizza
  { name:'Margherita Pizza',   category:'pizza', price:50, emoji:'🍕', description:'Classic tomato base, mozzarella and fresh basil.', popular:0 },
  { name:'Chicken Pizza',      category:'pizza', price:60, emoji:'🍗', description:'Tomato base, mozzarella, seasoned chicken and peppers.', popular:1 },
  { name:'Meat Lovers Pizza',  category:'pizza', price:70, emoji:'🥩', description:'Loaded with beef, chicken, sausage and pepperoni.', popular:0 },
  { name:'Spicy Veggie Pizza', category:'pizza', price:55, emoji:'🌶️', description:'Tomato base, mozzarella, mixed peppers, onion and jalapeños.', popular:0 },

  // Drinks
  { name:'Malt Drink',              category:'drinks', price:12, emoji:'🥤', description:'Chilled Malta or Club malt — a Ghanaian favourite.', popular:0 },
  { name:'Soft Drink (Cola/Fanta)', category:'drinks', price:10, emoji:'🥤', description:'Ice-cold soft drinks, your choice of flavour.', popular:0 },
  { name:'Bottled Water',           category:'drinks', price:5,  emoji:'💧', description:'Chilled pure water — still or sparkling.', popular:0 },
  { name:'Fresh Fruit Juice',       category:'drinks', price:20, emoji:'🍊', description:'Freshly blended seasonal fruit juice — no added sugar.', popular:0 },
  { name:'Beer (Local)',            category:'drinks', price:20, emoji:'🍺', description:'Chilled Star, Club, or ABC stout.', popular:0 },
  { name:'Tea / Coffee',            category:'drinks', price:15, emoji:'☕', description:'Hot beverage — your choice of tea or filtered coffee.', popular:0 },
  { name:'Sobolo / Bissap',         category:'drinks', price:12, emoji:'🧃', description:'Hibiscus flower drink — the classic West African favourite.', popular:0 },
];

// Clear and re-seed menu
const existing = db.prepare('SELECT COUNT(*) as c FROM menu_items').get();
if (existing.c > 0) {
  console.log(`ℹ️  Menu already has ${existing.c} items. Skipping seed. Run with --force to reseed.`);
  if (!process.argv.includes('--force')) process.exit(0);
  db.prepare('DELETE FROM menu_items').run();
  console.log('🗑️  Cleared existing menu items.');
}

const insert = db.prepare(`
  INSERT INTO menu_items (name, category, price, emoji, description, popular, available)
  VALUES (@name, @category, @price, @emoji, @description, @popular, 1)
`);

const insertMany = db.transaction((items) => {
  for (const item of items) insert.run(item);
});

insertMany(MENU_ITEMS);
console.log(`✅  Seeded ${MENU_ITEMS.length} menu items.`);

// Seed sample reviews
const reviewCount = db.prepare('SELECT COUNT(*) as c FROM reviews').get();
if (reviewCount.c === 0) {
  const reviewInsert = db.prepare(`
    INSERT INTO reviews (customer_name, rating, review_text, favourite_dish, status)
    VALUES (?,?,?,?,?)
  `);
  const sampleReviews = [
    ['Ama Koduah', 5, 'The Jollof rice here is absolutely incredible — easily the best in Techiman. The service was warm and attentive. Will definitely be coming back!', 'Jollof Rice with Chicken', 'approved'],
    ['Kwame Boateng', 4, 'Brought the whole family for a Sunday lunch. The Banku and Tilapia was super fresh and the atmosphere was perfect. The kids loved it!', 'Banku & Tilapia', 'approved'],
    ['Efua Sarpong', 5, 'Had the Full Rabboni Breakfast and it was divine! Great value for money. The staff went above and beyond.', 'Full Rabboni Breakfast', 'approved'],
    ['Michael Asante', 5, 'The Special Fried Rice was exceptional. Ordered delivery and it arrived hot and well-packaged. Very fair pricing.', 'Rabboni Special Fried Rice', 'approved'],
    ['Nana Achiaa', 4, 'Celebrated my husband\'s birthday here. The couple\'s package was wonderful and the live music was a beautiful touch!', 'Couple\'s Package', 'approved'],
  ];
  for (const r of sampleReviews) reviewInsert.run(...r);
  console.log('✅  Seeded 5 sample reviews.');
}

console.log('\n🎉  Database seeding complete!\n');
process.exit(0);
