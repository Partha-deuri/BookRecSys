document.addEventListener('DOMContentLoaded', () => {
    // const apiUrl = 'https://bookrecsys-dneq.onrender.com';
    const apiUrl = 'http://localhost:5000/';

    // Inline SVG placeholder for book covers
    const _svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='440' viewBox='0 0 300 440' preserveAspectRatio='none'>
        <rect width='100%' height='100%' fill='#f1f5f9'/>
        <g fill='#cbd5e1' font-family='Arial, Helvetica, sans-serif' font-size='16' text-anchor='middle'>
            <text x='50%' y='48%' fill='#94a3b8'>No Cover</text>
        </g>
    </svg>`;
    const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(_svg);

    // Helper function to prevent HTML injection
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ===================================================================
    // LOGIC FOR LANDING PAGE (index.html)
    // ===================================================================
    const btnReturning = document.getElementById('btn-returning-user');
    const btnNew = document.getElementById('btn-new-user');
    const btnGuest = document.getElementById('btn-guest');
    const returningUserForm = document.getElementById('returning-user-form');
    const userIdInput = document.getElementById('user-id-input');
    const btnSubmitUserId = document.getElementById('btn-submit-userid');

    if (btnReturning) {
        btnReturning.addEventListener('click', () => {
            returningUserForm.classList.remove('hidden');
        });
    }
    if (btnNew) {
        btnNew.addEventListener('click', () => {
            alert('This feature will be implemented in the future!');
        });
    }
    if (btnGuest) {
        btnGuest.addEventListener('click', () => {
            // MODIFIED: Redirects directly to the file
            window.location.href = './home.html';
        });
    }
    // Add helper functions for user ID management
    function setUserId(userId) {
        localStorage.setItem('bookRecUserId', userId);
    }

    function getUserId() {
        return localStorage.getItem('bookRecUserId');
    }

    if (btnSubmitUserId) {
        btnSubmitUserId.addEventListener('click', () => {
            const userId = userIdInput.value.trim();
            if (userId) {
                setUserId(userId); // Store user ID
                window.location.href = './home.html';
            } else {
                alert('Please enter a User ID.');
            }
        });
    }
    // Check for stored user ID on index page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/v3-g/frontend/') {
        const storedUserId = getUserId();
        if (storedUserId) {
            // If user ID exists, redirect to home
            window.location.href = './home.html';
        }
    }

    // ===================================================================
    // LOGIC FOR HOME PAGE (home.html)
    // ===================================================================
    const userRecsSection = document.getElementById('user-recommendations-section');
    const userRecsGrid = document.getElementById('user-recommendations-grid');

    // Modify home page logic
    if (window.location.pathname.includes('home')) {
        const storedUserId = getUserId();
        if (storedUserId) {
            // If we have a stored user ID, show and fetch recommendations
            if (userRecsSection) {
                userRecsSection.classList.remove('hidden');
            }
            fetchUserRecommendations(storedUserId);
        }
    }

    // USER RECOMMENDATIONS on home.html
    // Update fetchUserRecommendations to use stored user ID if none provided
    async function fetchUserRecommendations(userId = null) {
        if (!userRecsSection || !userRecsGrid) return;

        const actualUserId = userId || getUserId();
        if (!actualUserId) return;

        userRecsSection.classList.remove('hidden');
        try {
            const response = await fetch(`${apiUrl}/recommend/${encodeURIComponent(actualUserId)}`);
            if (!response.ok) throw new Error('Network response not ok');
            const data = await response.json();

            userRecsGrid.innerHTML = '';
            if (data.error || !data.recommendations || data.recommendations.length === 0) {
                userRecsGrid.innerHTML = '<div class="col-span-full py-8 text-center text-slate-500">Could not find new recommendations for you at this time.</div>';
                return;
            }

            // Render book cards
            for (const rec of data.recommendations) {
                const isObj = rec && typeof rec === 'object';
                const cover = isObj ? (rec.cover_url || rec.cover || placeholder) : placeholder;
                const title = isObj ? (rec.title || 'Untitled') : (rec || 'Untitled');
                const author = isObj ? (rec.author || '') : '';
                const isbn = isObj ? (rec.isbn || rec.ISBN || '') : '';

                const tagName = isbn ? 'a' : 'div';
                const card = document.createElement(tagName);
                if (isbn) card.href = `book.html?isbn=${encodeURIComponent(isbn)}`;
                card.className = 'book-card group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 border border-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-100';
                card.setAttribute('title', title);

                card.innerHTML = `
                    <div class="w-full h-56 overflow-hidden bg-slate-100">
                        <img src="${cover}" alt="${escapeHtml(title)} cover" class="w-full h-full object-contain object-center" onerror="this.onerror=null;this.src='${placeholder}'">
                    </div>
                    <div class="p-4">
                        <h3 class="font-semibold text-slate-800 text-sm md:text-base leading-tight truncate">${escapeHtml(title)}</h3>
                        <p class="text-slate-500 text-xs mt-1 truncate">${escapeHtml(author)}</p>
                    </div>
                `;
                userRecsGrid.appendChild(card);
            }
        } catch (error) {
            userRecsGrid.innerHTML = '<div class="col-span-full py-8 text-center text-red-500">Error loading your recommendations.</div>';
            console.error('Error fetching user recommendations:', error);
        }
    }

    // On home page load, check for a user_id in the URL
    // Accept both "home" and "home.html" so redirects from index.html/home.html work
    if (window.location.pathname.includes('home') || window.location.href.includes('home.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        if (userId) {
            fetchUserRecommendations(userId);
        }
    }

    // ------ INDEX / HOME PAGE ------
    const topBooksGrid = document.getElementById('top-books-grid');
    const topAuthorsGrid = document.getElementById('top-authors-grid');
    const searchInput = document.getElementById('search');
    const searchBtn = document.getElementById('searchBtn');

    // Fetches popular books or search results (using the /similar/ endpoint)
    async function fetchTopBooks(q = '') {
        if (!topBooksGrid) return;
        try {
            topBooksGrid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400">Loading books...</div>';
            const url = q ? `${apiUrl}/similar/${encodeURIComponent(q)}` : `${apiUrl}/popular`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            topBooksGrid.innerHTML = '';
            const books = data.books || data || [];
            if (!Array.isArray(books) || books.length === 0) {
                topBooksGrid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400">No books found.</div>';
                return;
            }

            books.forEach(book => {
                const cover = book.cover_url || book.cover || placeholder;
                const title = book.title || 'Untitled';
                const author = book.author || 'Unknown';
                const isbn = book.isbn || book.ISBN || '';

                const card = document.createElement('a');
                card.href = `book.html?isbn=${encodeURIComponent(isbn)}`;
                card.className = 'book-card group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 border border-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-100';
                card.setAttribute('title', title);

                card.innerHTML = `
                    <div class="w-full h-56 overflow-hidden bg-slate-100">
                        <img src="${cover}" alt="${escapeHtml(title)} cover" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='${placeholder}'">
                    </div>
                    <div class="p-4">
                        <h3 class="font-semibold text-slate-800 text-sm md:text-base leading-tight truncate">${escapeHtml(title)}</h3>
                        <p class="text-slate-500 text-xs mt-1 truncate">${escapeHtml(author)}</p>
                    </div>
                `;
                topBooksGrid.appendChild(card);
            });
        } catch (error) {
            topBooksGrid.innerHTML = '<div class="col-span-full py-12 text-center text-red-500">Could not load books. Is the backend running?</div>';
            console.error('Error fetching books:', error);
        }
    }

    // Fetches top authors
    async function fetchTopAuthors() {
        if (!topAuthorsGrid) return;
        try {
            topAuthorsGrid.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400">Loading authors...</div>';
            const response = await fetch(`${apiUrl}/top_authors`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            topAuthorsGrid.innerHTML = '';
            const authors = data.authors || [];
            if (authors.length === 0) {
                topAuthorsGrid.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400">No authors found.</div>';
                return;
            }

            authors.forEach(author => {
                const name = author.name || 'Unknown';
                const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                const booksCount = author.books_count || null;

                const a = document.createElement('a');
                a.href = `author.html?name=${encodeURIComponent(name)}`;
                a.className = 'group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 border border-slate-100 p-4';
                a.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center">
                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-semibold">${escapeHtml(initials)}</div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(name)}</div>
                            <div class="mt-1 text-xs text-slate-500">${booksCount ? `${booksCount} popular books` : ''}</div>
                        </div>
                    </div>
                `;
                topAuthorsGrid.appendChild(a);
            });
        } catch (error) {
            topAuthorsGrid.innerHTML = '<div class="col-span-full py-8 text-center text-red-500">Could not load authors.</div>';
            console.error('Error fetching top authors:', error);
        }
    }

    // Wire up search functionality for the homepage
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => fetchTopBooks(searchInput.value.trim()));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') fetchTopBooks(searchInput.value.trim());
        });
    }

    // Initial data loads for the homepage
    if (topBooksGrid) fetchTopBooks();
    if (topAuthorsGrid) fetchTopAuthors();

    // ------ BOOK DETAILS PAGE ------
    const bookDetailsContent = document.getElementById('book-details-content');
    const recommendationsGrid = document.getElementById('recommendations-grid');

    async function fetchBookDetails() {
        if (!bookDetailsContent) return;
        const urlParams = new URLSearchParams(window.location.search);
        const isbn = urlParams.get('isbn');
        if (!isbn) {
            bookDetailsContent.innerHTML = '<p class="text-red-500">No book specified.</p>';
            return;
        }

        try {
            // Step 1: Fetch the main book's details
            bookDetailsContent.innerHTML = '<p class="text-gray-500">Loading book details...</p>';
            const response = await fetch(`${apiUrl}/book/${encodeURIComponent(isbn)}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const book = await response.json();
            if (book.error) {
                bookDetailsContent.innerHTML = `<p class="text-red-500">${escapeHtml(book.error)}</p>`;
                return;
            }

            const cover = book.cover_url || placeholder;
            const title = book.title || 'Untitled';
            const author = book.author || 'Unknown';
            bookDetailsContent.innerHTML = `
                <div class="md:flex gap-6">
                    <div class="md:w-1/5 mb-6 md:mb-0">
                        <img src="${cover}" alt="${escapeHtml(title)} cover" class="w-full rounded-lg shadow" onerror="this.onerror=null;this.src='${placeholder}'">
                    </div>
                    <div class="md:flex-1">
                        <h1 class="text-3xl font-bold text-slate-800">${escapeHtml(title)}</h1>
                        <div class="text-slate-600 mt-2">${escapeHtml(author)}</div>
                    </div>
                </div>
            `;

            // Step 2: Fetch recommendations using the ISBN with the /similar/ endpoint
            if (recommendationsGrid) {
                const recResp = await fetch(`${apiUrl}/similar/${encodeURIComponent(isbn)}`);
                if (recResp.ok) {
                    const recs = await recResp.json();
                    recommendationsGrid.innerHTML = '';
                    if (!Array.isArray(recs) || recs.length === 0) {
                        recommendationsGrid.innerHTML = '<p class="col-span-full text-gray-500">No recommendations available.</p>';
                    } else {
                        recs.forEach(r => {
                            const rcover = r.cover_url || r.cover || placeholder;
                            const rtitle = r.title || 'Untitled';
                            const rauthor = r.author || 'Unknown';
                            const risbn = r.isbn || r.ISBN || '';
                            const card = document.createElement('a');
                            card.href = `book.html?isbn=${encodeURIComponent(risbn)}`;
                            card.className = 'book-card group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl';
                            card.innerHTML = `<div class="w-full h-64 overflow-hidden bg-slate-100 rounded"><img src="${rcover}" alt="${escapeHtml(rtitle)} cover" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='${placeholder}'"></div><div class="p-2"><div class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(rtitle)}</div><div class="text-xs text-slate-500 truncate">${escapeHtml(rauthor)}</div></div>`;
                            recommendationsGrid.appendChild(card);
                        });
                    }
                }
            }
        } catch (error) {
            bookDetailsContent.innerHTML = '<p class="text-red-500">Could not load book details.</p>';
            console.error('Error fetching book details:', error);
        }
    }

    if (bookDetailsContent) fetchBookDetails();

    // ------ AUTHOR PAGE ------
    const authorNameEl = document.getElementById('author-name');
    const authorBooksGrid = document.getElementById('author-books-grid');

    async function fetchAuthorBooks(name) {
        if (!authorBooksGrid) return;
        try {
            authorBooksGrid.innerHTML = '<p class="text-gray-500">Loading books...</p>';
            const response = await fetch(`${apiUrl}/author/${encodeURIComponent(name)}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            authorBooksGrid.innerHTML = '';
            const books = data.books || [];
            if (books.length === 0) {
                authorBooksGrid.innerHTML = '<p>No popular books found for this author in our list.</p>';
                return;
            }

            books.forEach(book => {
                const cover = book.cover_url || book.cover || placeholder;
                const title = book.title || 'Untitled';
                const isbn = book.isbn || book.ISBN || '';
                const card = document.createElement('a');
                card.href = `book.html?isbn=${encodeURIComponent(isbn)}`;
                card.className = 'book-card group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl';
                card.innerHTML = `<div class="w-full h-60 overflow-hidden bg-slate-100 rounded"><img src="${cover}" alt="${escapeHtml(title)} cover" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='${placeholder}'"></div><div class="p-2"><div class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(title)}</div></div>`;
                authorBooksGrid.appendChild(card);
            });
        } catch (error) {
            authorBooksGrid.innerHTML = '<p class="text-red-500">Could not load books.</p>';
            console.error('Error fetching author books:', error);
        }
    }

    if (authorNameEl) {
        const params = new URLSearchParams(window.location.search);
        const authorName = params.get('name');
        if (authorName) {
            authorNameEl.textContent = `Top Books by ${authorName}`;
            fetchAuthorBooks(authorName);
        } else {
            authorNameEl.textContent = 'Author not found.';
        }
    }

    // Add logout functionality
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('bookRecUserId'); // Clear stored user ID
            window.location.href = 'index.html'; // Redirect to landing page
        });
    }
});
