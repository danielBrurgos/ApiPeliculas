const API_KEY = '216a0268c1a9ee7c47410802f8bf62dc';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';

const main = document.getElementById('main');
const form = document.getElementById('form');
const search = document.getElementById('search');
const genreEl = document.getElementById('genres');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');

let favorites = JSON.parse(localStorage.getItem('mis_pelis_favs')) || [];
let currentPage = 1;
let currentUrl = `${BASE_URL}/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&language=es-MX`;
let isLoading = false;
let searchTimer; 
const cache = new Map();

// --- 1. CIRCUIT BREAKER AVANZADO ---
const CircuitBreaker = {
    failures: 0,
    threshold: 3,
    state: 'CLOSED',
    nextAttempt: 0,

    async call(url) {
        if (this.state === 'OPEN') {
            if (Date.now() > this.nextAttempt) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error("Modo Resiliencia");
            }
        }
        if (cache.has(url)) return cache.get(url);
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            this.success();
            cache.set(url, data);
            return data;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    },
    recordFailure() {
        this.failures++;
        this.updateIndicator('RED');
        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + 30000;
        }
    },
    success() {
        this.failures = 0;
        this.state = 'CLOSED';
        this.updateIndicator('GREEN');
    },
    updateIndicator(color) {
        const indicator = document.getElementById('api-status');
        if (indicator) {
            indicator.style.backgroundColor = color === 'RED' ? '#ef4444' : '#22c55e';
            color === 'RED' ? indicator.classList.add('animate-pulse') : indicator.classList.remove('animate-pulse');
        }
    }
};



// --- 2. AUTOCOMPLETADO Y BÚSQUEDA ---
search.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    if (query.length > 2) {
        searchTimer = setTimeout(async () => {
            try {
                const data = await CircuitBreaker.call(`${BASE_URL}/search/movie?api_key=${API_KEY}&language=es-MX&query=${query}`);
                showSuggestions(data.results.slice(0, 5));
            } catch (err) { console.warn("Offline search"); }
        }, 300);
    } else { hideSuggestions(); }
});

function showSuggestions(movies) {
    let suggContainer = document.getElementById('suggestions');
    if (!suggContainer) {
        suggContainer = document.createElement('div');
        suggContainer.id = 'suggestions';
        suggContainer.className = "absolute top-full left-0 w-full bg-zinc-900 border border-zinc-800 rounded-b-xl shadow-2xl z-50 overflow-hidden mt-1";
        search.parentElement.appendChild(suggContainer);
    }
    suggContainer.innerHTML = movies.map(m => `
        <div class="p-3 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 border-b border-zinc-800 last:border-0" 
             onclick="selectSuggestion('${m.title}')">
            ${m.title} <span class="text-zinc-500 text-[10px]">(${m.release_date ? m.release_date.split('-')[0] : 'N/A'})</span>
        </div>`).join('');
}

function selectSuggestion(title) {
    search.value = title;
    hideSuggestions();
    getMovies(`${BASE_URL}/search/movie?api_key=${API_KEY}&language=es-MX&query=${title}`);
}

function hideSuggestions() {
    const suggContainer = document.getElementById('suggestions');
    if (suggContainer) suggContainer.innerHTML = '';
}

// --- 3. CARGA DE PELÍCULAS ---
async function getMovies(url, isNextPage = false) {
    if (isLoading) return;
    isLoading = true;
    currentUrl = url;
    if (!isNextPage) { showLoadingSkeletons(); currentPage = 1; }

    try {
        const conn = url.includes('?') ? '&' : '?';
        const data = await CircuitBreaker.call(`${url}${conn}page=${currentPage}`);
        displayMovies(data.results, isNextPage);
    } catch (error) {
        if (CircuitBreaker.state === 'OPEN') {
            displayMovies(favorites);
            alert("Modo offline: Cargando tus favoritos.");
        }
    } finally { isLoading = false; }
}

function displayMovies(movies, isNextPage = false) {
    if (!isNextPage) main.innerHTML = '';
    if (!movies || movies.length === 0) return;

    movies.forEach((movie) => {
        const { title, poster_path, vote_average, id } = movie;
        const isFav = favorites.some(f => f.id === id);
        
        const movieEl = document.createElement('div');
        movieEl.className = "group relative bg-zinc-900 rounded-xl shadow-2xl transition-all cursor-pointer border border-zinc-800/50 hover:scale-105";
        
        movieEl.innerHTML = `
            <div class="overflow-hidden rounded-t-xl" onclick="showMovieDetails(${id})">
                <img src="${poster_path ? IMG_PATH + poster_path : 'https://via.placeholder.com/500x750'}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent opacity-60"></div>
            </div>
            <button id="star-${id}" onclick="event.stopPropagation(); toggleFavorite(${JSON.stringify(movie).replace(/"/g, '&quot;')})" 
                class="absolute top-3 right-3 z-10 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 hover:scale-125 transition-all ${isFav ? 'text-amber-500' : 'text-white'}">
                <i class="fas fa-star"></i>
            </button>
            <div class="p-4" onclick="showMovieDetails(${id})">
                <h3 class="font-bold text-sm truncate text-zinc-100 group-hover:text-amber-500 transition-colors">${title}</h3>
                <span class="text-amber-500 text-xs font-bold">★ ${vote_average.toFixed(1)}</span>
            </div>`;
        main.appendChild(movieEl);
    });
}

// --- 4. FAVORITOS Y DETALLES (MODAL) ---
function toggleFavorite(movie) {
    const index = favorites.findIndex(f => f.id === movie.id);
    
    if (index > -1) {
        // Si ya existe, la quitamos
        favorites.splice(index, 1);
    } else {
        // Si no existe, la agregamos
        favorites.push(movie);
    }
    
    // Guardamos en el almacenamiento local de tu navegador
    localStorage.setItem('mis_pelis_favs', JSON.stringify(favorites));
    
    // Cambiamos el color de la estrella visualmente
    const starBtn = document.getElementById(`star-${movie.id}`);
    if (starBtn) {
        starBtn.classList.toggle('text-amber-500');
        starBtn.classList.toggle('text-white');
    }
}

async function showMovieDetails(movieId) {
    try {
        const [details, credits, recommendations] = await Promise.all([
            CircuitBreaker.call(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=es-MX`),
            CircuitBreaker.call(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=es-MX`),
            CircuitBreaker.call(`${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}&language=es-MX`)
        ]);

        const director = credits.crew.find(c => c.job === 'Director');
        const actors = credits.cast.slice(0, 6);
        const similar = recommendations.results.slice(0, 6);

        modalContent.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <img src="${IMG_PATH + (details.backdrop_path || details.poster_path)}" class="rounded-xl w-full shadow-2xl border border-zinc-800">
                <div class="flex flex-col gap-5 text-left">
                    <h2 class="text-5xl font-black text-amber-500 tracking-tighter">${details.title}</h2>
                    <p class="text-xl text-zinc-300 font-light">${details.overview || 'Sin descripción.'}</p>
                    <div class="grid grid-cols-2 gap-6 mt-4 uppercase text-xs font-bold text-zinc-500">
                        <div>Director: <span class="text-white">${director ? director.name : 'N/A'}</span></div>
                        <div>Elenco: <span class="text-white">${actors.map(a => a.name).join(', ')}</span></div>
                    </div>
                </div>
            </div>
            <div class="mt-12">
                <h3 class="text-2xl font-bold text-white mb-6 border-l-4 border-amber-500 pl-4 uppercase">Recomendaciones</h3>
                <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
                    ${similar.map(m => `
                        <div class="cursor-pointer group" onclick="showMovieDetails(${m.id})">
                            <img src="${IMG_PATH + m.poster_path}" class="rounded-lg border border-zinc-800 group-hover:scale-105 transition-transform">
                            <p class="text-zinc-400 text-[10px] mt-2 truncate uppercase font-bold">${m.title}</p>
                        </div>`).join('')}
                </div>
            </div>`;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (e) { console.error(e); }
}

function closeModal() { modal.classList.add('hidden'); document.body.style.overflow = 'auto'; }

// --- 5. GOOGLE LOGIN ---
window.onload = function () {
    google.accounts.id.initialize({
        client_id: "673288422818-937e01b2kdr8co1gvhil82r4gojt8ofo.apps.googleusercontent.com",
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(document.getElementById("google_btn"), { theme: "dark", size: "large", shape: "pill" });
};

function handleCredentialResponse(response) {
    const user = JSON.parse(window.atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    localStorage.setItem('user_session', JSON.stringify(user));
    updateUI(user);
}

function updateUI(user) {
    if (user) {
        document.getElementById("google_btn").classList.add("hidden");
        document.getElementById("user_profile").classList.remove("hidden");
        document.getElementById("user_name").innerText = user.given_name;
        document.getElementById("user_img").src = user.picture;
    }
}

function logout() { localStorage.removeItem('user_session'); location.reload(); }

// --- 6. INICIO ---
function showLoadingSkeletons() {
    main.innerHTML = Array(10).fill(`
        <div class="bg-zinc-900 rounded-xl overflow-hidden animate-pulse border border-zinc-800">
            <div class="aspect-[2/3] bg-zinc-800"></div>
            <div class="p-4 space-y-3"><div class="h-4 bg-zinc-800 rounded w-3/4"></div></div>
        </div>`).join('');
}

async function getGenres() {
    const data = await CircuitBreaker.call(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=es-MX`);
    const favBtn = document.createElement('button');
    favBtn.className = "px-6 py-2 rounded-full bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-500 transition-all shadow-lg";
    favBtn.innerText = "❤️ Favoritos";
    favBtn.onclick = () => { currentUrl = 'favorites'; displayMovies(favorites); };
    genreEl.appendChild(favBtn);
    data.genres.forEach(g => {
        const btn = document.createElement('button');
        btn.className = "px-6 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs hover:border-amber-500 transition-all whitespace-nowrap";
        btn.innerText = g.name;
        btn.onclick = () => getMovies(`${BASE_URL}/discover/movie?with_genres=${g.id}&api_key=${API_KEY}&language=es-MX`);
        genreEl.appendChild(btn);
    });
}

const savedUser = JSON.parse(localStorage.getItem('user_session'));
if (savedUser) setTimeout(() => updateUI(savedUser), 100);

getGenres();
getMovies(currentUrl);