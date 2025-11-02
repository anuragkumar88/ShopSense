import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
 
// --- GLOBAL FIREBASE/APP VARIABLES (MANDATORY) ---
// NOTE: These variables are assumed to be defined globally in the execution environment (e.g., from a server-side script or a build process).
// For local testing, you might need to manually set them or mock a config here if you want Firebase functionality.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
 
let app, db, auth, userId = null;
let isAuthReady = false;

// --- GLOBAL UI ELEMENTS ---
// Note: We're using querySelector/getElementById here, assuming the DOM is fully loaded before this module executes (due to 'window.onload' handler in init).
const productsContainer = document.getElementById('products-container');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartCountSpan = document.getElementById('cart-count'); 
const cartTotalSpan = document.getElementById('cart-total');
const searchInput = document.getElementById('search-input-main');
const searchToggleButton = document.getElementById('search-toggle-button');
const searchContainer = document.getElementById('collapsible-search-container');
const checkoutButton = document.getElementById('checkout-button');
const loadingIndicator = document.getElementById('loading-indicator');
const cartDrawer = document.getElementById('cart-drawer');
const body = document.body;
const customCursor = document.getElementById('custom-cursor');
const allProductsHeader = document.getElementById('all-products-header');
const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

// --- CAROUSEL ELEMENTS ---
let currentSlide = 0;
const totalSlides = 3;
const carouselTrack = document.getElementById('carousel-track');
const carouselSlides = document.getElementsByClassName('carousel-slide'); // Live collection
const carouselDots = document.getElementsByClassName('carousel-indicator'); // Live collection
 
// --- APP STATE ---
let products = [];
let displayedProducts = []; 
let cartItems = [];
 
// --- MOCK CATEGORIES (FOR ENRICHMENT) ---
const MOCK_CATEGORIES = ['Electronics', 'Grocery', 'Clothing', 'Equipment'];


// --- HELPER FUNCTIONS ---

// Mobile Menu Toggle Function (Needs to be outside ShopSense object for HTML inline handler)
function toggleMobileMenu() {
    mobileMenuDrawer.classList.toggle('open');
    mobileMenuOverlay.classList.toggle('hidden');
}


const getStars = (rating) => {
    const roundedRating = Math.round(rating * 2) / 2;
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= roundedRating) {
            starsHtml += `<i data-lucide="star" class="w-4 h-4 fill-yellow-400 text-yellow-400"></i>`;
        } else if (i - 0.5 === roundedRating) {
            // Note: Half-star logic is simplified for Lucide icons, which don't have a half-star icon.
            // Using a full star or keeping it empty is the standard fallback unless a custom SVG/icon font is used.
            // Original code used a full star logic. We'll stick to full/empty star based on rounding for simplicity.
            starsHtml += `<i data-lucide="star" class="w-4 h-4 text-gray-300"></i>`; 
        } else {
            starsHtml += `<i data-lucide="star" class="w-4 h-4 text-gray-300"></i>`;
        }
    }
    return starsHtml;
};

const getSafeImageUrl = (imageArray) => {
    if (Array.isArray(imageArray) && imageArray.length > 0) {
        return imageArray[0];
    }
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23e2e8f0"%3E%3C/rect%3E%3Ctext x="50" y="50" font-size="10" fill="%23a0aec0" text-anchor="middle" dominant-baseline="middle"%3EImage Unavailable%3C/text%3E%3C/svg%3E';
};

// --- FIREBASE INITIALIZATION AND AUTH ---
async function initializeFirebase() {
    try {
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is empty. Firestore will not function.");
            return;
        }
        
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                console.log("Firebase Auth Ready. User ID:", userId);
                setupCartListener();
            } else {
                console.log("Waiting for user authentication state...");
            }
        });

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

    } catch (error) {
        console.error("Firebase initialization or authentication error:", error);
    }
}

// --- FIRESTORE CART OPERATIONS ---
function getCartDocRef() {
    if (!userId || !appId) return null;
    return doc(db, 'artifacts', appId, 'users', userId, 'carts', 'userCart');
}

function setupCartListener() {
    if (!isAuthReady) {
        console.warn("setupCartListener called before Auth Ready. Skipping listener setup.");
        return;
    }
    
    const cartRef = getCartDocRef();
    if (cartRef) {
        onSnapshot(cartRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                cartItems = data.items || [];
            } else {
                cartItems = [];
                // Create the cart document if it doesn't exist
                setDoc(cartRef, { items: [] }, { merge: true }); 
            }
            renderCart();
        }, (error) => {
            console.error("Error listening to cart changes:", error);
        });
    } else {
        console.warn("Cannot set up cart listener: Auth not ready or missing ID.");
    }
}

async function updateCartInFirestore(newCartItems) {
    if (!isAuthReady) {
        console.error("Firestore not ready. Cannot update cart.");
        return;
    }
    try {
        const cartRef = getCartDocRef();
        await setDoc(cartRef, { items: newCartItems });
    } catch (error) {
        console.error("Error updating cart in Firestore:", error);
    }
}
 
// --- DATA FETCHING ---
async function fetchProducts() {
    try {
        loadingIndicator.classList.remove('hidden');
        const response = await fetch('https://fakestoreapi.com/products?limit=20');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        
        // Filter and enrich product data with consistent keys
        products = data
            .map((p, index) => {
                const mockCategoryName = MOCK_CATEGORIES[index % MOCK_CATEGORIES.length];

                return {
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    price: p.price,
                    images: [p.image], 
                    category: { name: mockCategoryName },
                    // Use actual rating if present, otherwise mock one
                    rating: p.rating ? p.rating.rate : parseFloat((Math.random() * 2 + 3).toFixed(1)), 
                    reviews: p.rating ? p.rating.count : Math.floor(Math.random() * 490) + 10 
                };
            });
        
        displayedProducts = [...products]; 
        renderProducts(displayedProducts);
    } catch (error) {
        console.error("Error fetching products:", error);
        productsContainer.innerHTML = '<p class="text-red-500 col-span-full">Failed to load products. Please check the network connection or API status.</p>';
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

// --- RENDERING FUNCTIONS ---
function renderProducts(productsToRender) {
    productsContainer.innerHTML = '';
    if (productsToRender.length === 0) {
        productsContainer.innerHTML = '<p class="text-center col-span-full text-xl py-12 text-gray-500 dark:text-gray-400">No products found matching your search criteria.</p>';
        return;
    }

    productsToRender.forEach(product => {
        const primaryImageUrl = getSafeImageUrl(product.images);
        
        const card = document.createElement('div');
        card.className = 'product-card bg-card-light dark:bg-card-dark rounded-xl shadow-lg overflow-hidden flex flex-col transition duration-300 hover:shadow-xl cursor-pointer';
        card.onclick = () => window.shopSense.openProductDetails(product.id);
        
        card.innerHTML = `
            <div class="h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img src="${primaryImageUrl}" 
                    alt="${product.title}" 
                    onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23e2e8f0\'%3E%3C/rect%3E%3Ctext x=\'50\' y=\'50\' font-size=\'10\' fill=\'%23a0aec0\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EImage Unavailable%3C/text%3E%3C/svg%3E';" 
                    class="w-full h-full object-contain transition duration-500 ease-in-out hover:scale-105" />
            </div>
            <div class="p-5 flex flex-col flex-grow">
                <h3 class="font-bold text-lg mb-1 truncate text-text-light dark:text-text-dark">${product.title}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">${product.category?.name || 'Uncategorized'}</p>
                
                <div class="flex items-center mb-2">
                    ${getStars(product.rating)}
                    <span class="text-xs ml-2 text-gray-600 dark:text-gray-400 font-medium">${product.rating} (${product.reviews})</span>
                </div>

                <p class="font-extrabold text-xl text-primary-500 mt-auto">$${product.price.toFixed(2)}</p>
                
                <button onclick="event.stopPropagation(); window.shopSense.addToCart(${product.id}, '${product.title.replace(/'/g, "\\'")}', ${product.price})" 
                        class="mt-4 w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 rounded-lg transition duration-200 shadow-md">
                    Add to Cart
                </button>
            </div>
        `;
        productsContainer.appendChild(card);
    });
    lucide.createIcons();
}

function renderCart() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let cartItemCount = 0;

    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 p-4">Your cart is empty.</p>';
    } else {
        cartItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            cartItemCount += item.quantity;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm mb-2 cart-item';
            itemDiv.innerHTML = `
                <div class="flex-grow min-w-0 mr-3">
                    <h4 class="text-sm font-semibold truncate">${item.name}</h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">$${item.price.toFixed(2)} x ${item.quantity}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="window.shopSense.updateQuantity(${item.productId}, -1)" class="text-primary-500 hover:text-primary-600 text-lg leading-none">-</button>
                    <span class="font-bold text-sm min-w-[20px] text-center">${item.quantity}</span>
                    <button onclick="window.shopSense.updateQuantity(${item.productId}, 1)" class="text-primary-500 hover:text-primary-600 text-lg leading-none">+</button>
                    <button onclick="window.shopSense.removeFromCart(${item.productId})" class="text-red-500 hover:text-red-600 ml-2">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            cartItemsContainer.appendChild(itemDiv);
        });
    }
    
    lucide.createIcons();

    cartCountSpan.textContent = cartItemCount;
    cartTotalSpan.textContent = `$${total.toFixed(2)}`;
    checkoutButton.disabled = cartItems.length === 0;
    if (cartItems.length === 0) {
        checkoutButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        checkoutButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}
 
// --- CUSTOM CURSOR LOGIC ---
function setupCursorTracking() {
    if (window.innerWidth <= 768) return; 

    const linksAndButtons = document.querySelectorAll('a, button');

    // Move the custom cursor
    document.addEventListener('mousemove', (e) => {
        customCursor.style.left = `${e.clientX}px`;
        customCursor.style.top = `${e.clientY}px`;
    });

    // Add hover class to body when over interactive elements 
    linksAndButtons.forEach(el => {
        el.addEventListener('mouseenter', () => body.classList.add('cursor-hover-active'));
        el.addEventListener('mouseleave', () => body.classList.remove('cursor-hover-active'));
    });
}
// --- END CUSTOM CURSOR LOGIC ---

// --- CAROUSEL LOGIC ---
function moveCarousel(direction) {
    const slides = document.getElementsByClassName('carousel-slide');
    const dots = document.getElementsByClassName('carousel-indicator');

    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    
    // Remove 'active' from all slides and dots
    Array.from(slides).forEach(slide => slide.classList.remove('active'));
    Array.from(dots).forEach(dot => dot.classList.remove('bg-primary-500', 'bg-gray-400'));
    
    // Add 'active' to the current slide
    slides[currentSlide].classList.add('active');
    
    // Update the indicator dot
    dots[currentSlide].classList.add('bg-primary-500');
    dots[currentSlide].classList.remove('bg-gray-400');
    
    // Update inactive dots
    Array.from(dots).forEach((dot, index) => {
        if(index !== currentSlide) {
            dot.classList.add('bg-gray-400');
            dot.classList.remove('bg-primary-500');
        }
    });
}

function updateCarouselIndicators() {
    const slides = document.getElementsByClassName('carousel-slide');
    const dots = document.getElementsByClassName('carousel-indicator');

    // Only runs once on init to set the first slide as active
    if (slides.length > 0) {
        slides[0].classList.add('active');
    }
    if (dots.length > 0) {
        dots[0].classList.add('bg-primary-500');
        dots[0].classList.remove('bg-gray-400');
    }
}
 
function setupAutoSlide() {
    setInterval(() => moveCarousel(1), 5000);
}
// --- END CAROUSEL LOGIC ---


// --- CORE APPLICATION LOGIC (ShopSense Object) ---

const ShopSense = {
    init: async function() {
        // Ensure elements are collected now
        const carouselSlides = document.getElementsByClassName('carousel-slide');
        const carouselDots = document.getElementsByClassName('carousel-indicator');

        await initializeFirebase();
        await fetchProducts();

        setupCursorTracking();

        // Setup carousel (must be called after slides and dots are in the DOM)
        updateCarouselIndicators();
        setupAutoSlide();

        // Setup event listeners
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
        if (searchToggleButton) {
            searchToggleButton.addEventListener('click', this.toggleSearchContainer);
        }
        
        // Carousel Button Handlers
        const prevButton = document.getElementById('carousel-prev');
        const nextButton = document.getElementById('carousel-next');

        if (prevButton) prevButton.addEventListener('click', () => moveCarousel(-1));
        if (nextButton) nextButton.addEventListener('click', () => moveCarousel(1));
        
        // NAVBAR ACTION HANDLERS
        document.getElementById('dark-mode-toggle').addEventListener('click', this.toggleDarkMode);
        document.getElementById('cart-open-button').addEventListener('click', this.toggleCartDrawer);
        
        document.getElementById('cart-close-button').addEventListener('click', this.toggleCartDrawer);
        document.getElementById('checkout-button').addEventListener('click', this.simulateCheckout.bind(this));
        
        // Mobile Menu Button Handlers
        document.getElementById('mobile-menu-open-button').addEventListener('click', toggleMobileMenu);
        document.getElementById('mobile-menu-close-button').addEventListener('click', toggleMobileMenu);
        mobileMenuOverlay.addEventListener('click', toggleMobileMenu);
        
        // Contact form submission handler
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.simulateContactSubmit();
            });
        }
        
        // Setup click handlers for navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageName = e.target.getAttribute('data-page');
                this.handleNavigationClick(pageName);
                if (link.classList.contains('mobile-nav-link')) {
                    toggleMobileMenu(); 
                }
            });
        });

        // Setup carousel indicator clicks
        Array.from(carouselDots).forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentSlide = index;
                moveCarousel(0);
            });
        });

        // Hide non-home sections on initial load
        this.togglePageSections('Home');

        // Initial dark mode setup
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        lucide.createIcons();
    },
    
    togglePageSections: function(activeSection) {
        const sectionsToToggle = [
            { element: document.getElementById('about-page'), name: 'About' },
            { element: document.getElementById('contact-section'), name: 'Contact' }
        ];

        sectionsToToggle.forEach(section => {
            if (section.element) {
                if (section.name === activeSection) {
                    section.element.classList.remove('hidden');
                } else {
                    section.element.classList.add('hidden');
                }
            }
        });
        
        const heroSection = document.getElementById('hero-section');
        const productsList = document.getElementById('products-container');

        if (heroSection && productsList) {
            const isProductSectionActive = activeSection === 'Home' || activeSection === 'Trending' || activeSection === 'CategoryFilter';
            
            if (isProductSectionActive) {
                heroSection.classList.remove('hidden');
                productsList.classList.remove('hidden');
                allProductsHeader.classList.remove('hidden');
            } else {
                heroSection.classList.add('hidden');
                if (activeSection === 'About' || activeSection === 'Contact') {
                    productsList.classList.add('hidden');
                    allProductsHeader.classList.add('hidden');
                }
            }
        }
    },

    toggleDarkMode: function() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        lucide.createIcons();
    },

    toggleCartDrawer: function() {
        const isOpen = cartDrawer.classList.contains('translate-x-0');
        const overlay = document.getElementById('cart-overlay');
        if (isOpen) {
            cartDrawer.classList.remove('translate-x-0');
            cartDrawer.classList.add('translate-x-full');
            overlay.classList.add('hidden');
        } else {
            cartDrawer.classList.remove('translate-x-full');
            cartDrawer.classList.add('translate-x-0');
            overlay.classList.remove('hidden');
        }
    },
    
    toggleSearchContainer: function() {
        searchContainer.classList.toggle('hidden');
        if (!searchContainer.classList.contains('hidden')) {
            searchInput.focus();
        }
    },

    handleNavigationClick: function(pageName) {
        this.togglePageSections(pageName);
        
        let productsToShow = [...products];
        let sortMessage = '';
        
        if (pageName === 'Trending') {
            productsToShow.sort((a, b) => b.rating - a.rating);
            sortMessage = 'Trending items (sorted by highest rating) loaded.';
            allProductsHeader.textContent = 'Trending Products';
            
            const productsSection = document.getElementById('products-container');
            if (productsSection) productsSection.scrollIntoView({ behavior: 'smooth' });

        } else if (pageName === 'Home') {
            productsToShow = [...products]; 
            sortMessage = 'Home page loaded. Showing all products.';
            allProductsHeader.textContent = 'All Products';
            
            const heroSection = document.getElementById('hero-section');
            if (heroSection) heroSection.scrollIntoView({ behavior: 'smooth' });

        } else if (pageName === 'About') {
            const aboutSection = document.getElementById('about-page');
            if (aboutSection) aboutSection.scrollIntoView({ behavior: 'smooth' });
            sortMessage = 'About ShopSense section loaded.';
            this.showToast(sortMessage, false, 'bg-gray-700');
            return;

        } else if (pageName === 'Contact') {
            const contactSection = document.getElementById('contact-section');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
            }
            sortMessage = 'Contact section loaded.';
        }
        
        if (pageName === 'Home' || pageName === 'Trending') {
            displayedProducts = productsToShow;
            renderProducts(displayedProducts);
        }
        
        this.showToast(sortMessage, false, 'bg-primary-500');
    },

    handleSearch: function(event) {
        const query = event.target.value.toLowerCase();
        this.filterProducts(query);
    },
    
    filterProducts: function(query) {
        this.togglePageSections('CategoryFilter'); 

        const filtered = products.filter(product => 
            product.title.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.category?.name?.toLowerCase().includes(query)
        );
        
        allProductsHeader.textContent = query.trim() === '' ? 'All Products' : `Search Results for "${query}"`;
        
        displayedProducts = filtered;
        renderProducts(displayedProducts);
        
        searchInput.value = query;
        
        const productsSection = document.getElementById('products-container');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }
    },
    
    openProductDetails: function(productId) {
        const product = products.find(p => p.id === productId); 
        if (!product) return;

        const modal = document.getElementById('product-modal');
        const modalContent = document.getElementById('product-modal-content');

        const primaryImageUrl = getSafeImageUrl(product.images);
        
        modalContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="md:sticky md:top-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 p-4 rounded-xl">
                    <img src="${primaryImageUrl}" 
                            alt="${product.title}" 
                            onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23e2e8f0\'%3E%3C/rect%3E%3Ctext x=\'50\' y=\'50\' font-size=\'10\' fill=\'%23a0aec0\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EImage Unavailable%3C/text%3E%3C/svg%3E';"
                            class="w-full h-auto object-contain max-h-[500px] mx-auto" />
                </div>

                <div>
                    <span class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">${product.category?.name || 'Uncategorized'}</span>
                    <h3 class="text-4xl font-extrabold my-2 text-text-light dark:text-text-dark">${product.title}</h3>
                    
                    <div class="flex items-center space-x-2 mb-4">
                        <div class="flex">${getStars(product.rating)}</div>
                        <span class="text-lg font-bold text-gray-800 dark:text-gray-200">${product.rating}</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">(${product.reviews} Reviews)</span>
                    </div>

                    <p class="text-4xl font-extrabold text-primary-500 my-4">$${product.price.toFixed(2)}</p>

                    <h4 class="text-xl font-semibold mt-6 mb-2 text-text-light dark:text-text-dark">Description</h4>
                    <p class="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">${product.description}</p>
                    
                    <button onclick="window.shopSense.addToCart(${product.id}, '${product.title.replace(/'/g, "\\'")}', ${product.price}); window.shopSense.closeProductModal();" 
                            class="mt-8 w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition duration-200 shadow-lg text-lg">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
        lucide.createIcons();
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
    },
    
    closeProductModal: function() {
        const modal = document.getElementById('product-modal');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');
    },
    
    addToCart: function(productId, name, price) {
        const existingItem = cartItems.find(item => item.productId === productId);
        let newCartItems;

        if (existingItem) {
            newCartItems = cartItems.map(item => 
                item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
            );
        } else {
            newCartItems = [...cartItems, { productId, name, price, quantity: 1 }];
        }
        
        cartItems = newCartItems; 
        
        this.showToast(`${name} added to cart!`);
        renderCart();

        updateCartInFirestore(cartItems);
    },

    updateQuantity: function(productId, delta) {
        const newCartItems = cartItems.map(item => {
            if (item.productId === productId) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) };
            }
            return item;
        }).filter(item => item.quantity > 0);

        cartItems = newCartItems; 
        renderCart();
        
        updateCartInFirestore(cartItems);
    },

    removeFromCart: function(productId) {
        const itemToRemove = cartItems.find(item => item.productId === productId);
        const newCartItems = cartItems.filter(item => item.productId !== productId);
        
        cartItems = newCartItems;

        if(itemToRemove) this.showToast(`${itemToRemove.name} removed.`);
        renderCart();

        updateCartInFirestore(cartItems);
    },

    simulateCheckout: async function() {
        if (cartItems.length === 0) {
            this.showToast('Your cart is empty!', true, 'bg-red-500');
            return;
        }

        checkoutButton.textContent = 'Processing...';
        checkoutButton.disabled = true;

        await new Promise(resolve => setTimeout(resolve, 1500)); 
        
        await updateCartInFirestore([]);

        ShopSense.toggleCartDrawer();
        ShopSense.showToast('Order Placed Successfully! Thank you for shopping!', false, 'bg-green-500');
        
        checkoutButton.textContent = 'Checkout';
        checkoutButton.disabled = false;
    },
    
    simulateContactSubmit: function() {
        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        
        this.showToast(`Thank you, ${name}! Your message from ${email} has been received (simulated).`, false, 'bg-green-500');
        // Clear the form
        document.getElementById('contact-form').reset();
    },

    showToast: function(message, isError = false, bgColor = 'bg-primary-500') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-5 right-5 ${bgColor} text-white px-6 py-3 rounded-xl shadow-xl transition-opacity duration-300 z-50 transform translate-y-2 opacity-0`;
        toast.textContent = message;
        
        body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('opacity-0', 'translate-y-2');
            toast.classList.add('opacity-100', 'translate-y-0');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('opacity-100', 'translate-y-0');
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, isError ? 5000 : 3000);
    }
};

// Make the core logic globally accessible for HTML event handlers
window.shopSense = ShopSense;
 
// Start the application when the window loads
window.onload = function() {
    ShopSense.init();
};