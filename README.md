
-----

## 🛍️ ShopSense: Personalized E-Commerce Platform

A modern, responsive e-commerce front-end built with **Vanilla JavaScript**, **Firebase/Firestore** for real-time cart persistence, and **Tailwind CSS** for rapid styling.

-----

## ✨ Features

  * **Responsive UI:** Mobile-first design using Tailwind CSS.
  * **Dark Mode Toggle:** User-friendly light/dark theme switcher.
  * **Real-time Cart:** Utilizes **Firebase Firestore** (simulated access) to persist cart items across sessions and synchronize updates instantly.
  * **Dynamic Product Listing:** Fetches product data from a mock external API (FakeStoreAPI).
  * **Search & Navigation:** Instant search filtering and navigation between Home, Trending (sorted by rating), About, and Contact pages.
  * **Custom Cursor:** A modern, interactive custom cursor experience (on desktop).
  * **Cart Drawer:** Non-intrusive sidebar for managing cart items.
  * **Carousel Hero:** Auto-sliding banner showcasing top promotions.

-----

## 🛠️ Tech Stack

| Technology | Purpose | Link |
| :--- | :--- | :--- |
| **HTML5** | Core structure (`index.html`) | |
| **Tailwind CSS (CDN)** | Utility-first styling and responsiveness | `https://cdn.tailwindcss.com` |
| **Vanilla JavaScript (ESM)** | Application logic and DOM manipulation (`script.js`) | |
| **Firebase (Auth & Firestore)**| Authentication and Real-time Cart Data Persistence | `https://firebase.google.com/` |
| **Lucide Icons (CDN)** | Modern, accessible SVG icons | `https://lucide.dev/` |
| **FakeStoreAPI** | Mock product data source | `https://fakestoreapi.com/` |

-----

## 🚀 Getting Started

To run this project locally, you need to set up your files and, optionally, your Firebase configuration if you want the cart functionality to work against a real database.

### Prerequisites

You only need a modern web browser to view the HTML file.

### Installation

1.  **Clone the Repository:**

    ```bash
    git clone [YOUR-REPO-URL]
    cd shopsense
    ```

2.  **Save the Files:** Ensure you have the following three files in your root directory:

      * `index.html` (The main structure)
      * `style.css` (The custom CSS overrides)
      * `script.js` (The core JavaScript logic)

3.  **Run Locally:** Open the `index.html` file directly in your web browser.

    ```bash
    open index.html 
    # OR 
    start index.html
    ```

### ⚙️ Firebase Configuration (Optional)

The `script.js` file relies on global variables for Firebase setup. For the cart feature to work with *your* Firebase project, you must define these variables *before* the main script runs.

In your **`index.html`**, immediately before `<script type="module" src="script.js"></script>`, add a setup script like this:

```html
<script>
    // Replace with your actual Firebase configuration
    const __firebase_config = JSON.stringify({
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        // ... other config values
    });
    const __app_id = "YOUR_APP_ID"; // A unique identifier for your app/artifact
    const __initial_auth_token = null; // Use null for anonymous sign-in
</script>
<script type="module" src="script.js"></script>
```

-----

## 💡 Project Context & Contribution

This project is currently a front-end demonstration built by **Anurag Kumar**.

> **Note:** This is a **simple prototype** quickly created for a college club project submission at the last moment. It showcases core functionality rather than production readiness.

Feel free to **explore, fork, and adapt** the code for your own purposes\!

**Developer:** Anurag Kumar

  * [LinkedIn Profile](https://www.linkedin.com/in/anuragkumar80/)
  * [GitHub Profile](https://github.com/anuragkumar88/)

-----

## 📝 License

This project is open source and available under the [MIT License](https://www.google.com/search?q=LICENSE).

-----

