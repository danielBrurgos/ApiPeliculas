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

// --- INICIALIZACIÓN ---
getGenres();
getMovies(currentUrl);

// --- FUNCIONES DE CARGA ---
function showLoadingSkeletons() {
    main.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const skeletonEl = document.createElement('div');
        skeletonEl.className = "bg-zinc-900 rounded-xl overflow-hidden shadow-2xl animate-pulse border border-zinc-800";
        skeletonEl.innerHTML = `
            <div class="aspect-[2/3] bg-zinc-800"></div>
            <div class="p-4 space-y-3">
                <div class="h-4 bg-zinc-800 rounded w-3/4"></div>
                <div class="h-3 bg-zinc-800 rounded w-1/4"></div>
            </div>`;
        main.appendChild(skeletonEl);
    }
}

async function getGenres() {
    const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=es-MX`);
    const data = await res.json();
    
    const favBtn = document.createElement('button');
    favBtn.className = "px-6 py-2 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-900/20";
    favBtn.innerText = "❤️ Favoritos";
    favBtn.onclick = () => {
        currentUrl = 'favorites';
        displayMovies(favorites);
    };
    genreEl.appendChild(favBtn);

    data.genres.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = "px-6 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium hover:border-amber-500/50 hover:text-amber-500 transition-all whitespace-nowrap";
        btn.innerText = genre.name;
        btn.onclick = () => getMovies(`${BASE_URL}/discover/movie?with_genres=${genre.id}&api_key=${API_KEY}&language=es-MX`);
        genreEl.appendChild(btn);
    });
}

async function getMovies(url, isNextPage = false) {
    if (isLoading || url === 'favorites') return;
    isLoading = true;
    currentUrl = url;

    if (!isNextPage) {
        showLoadingSkeletons();
        currentPage = 1;
    }

    try {
        const connector = url.includes('?') ? '&' : '?';
        const res = await fetch(`${url}${connector}page=${currentPage}`);
        const data = await res.json();
        
        setTimeout(() => {
            displayMovies(data.results, isNextPage);
            isLoading = false;
        }, 400); 
    } catch (error) {
        console.error("Error:", error);
        isLoading = false;
    }
}

function displayMovies(movies, isNextPage = false) {
    if (!isNextPage) main.innerHTML = '';

    if (!movies || movies.length === 0) {
        if (!isNextPage) main.innerHTML = '<h2 class="text-xl text-zinc-500 col-span-full text-center py-20">No hay resultados.</h2>';
        return;
    }

    movies.forEach((movie) => {
        const { title, poster_path, vote_average, id } = movie;
        const isFav = favorites.some(f => f.id === id);
        const movieEl = document.createElement('div');
        movieEl.className = "group relative bg-zinc-900 rounded-xl overflow-hidden shadow-2xl transition-all cursor-pointer";
        
        movieEl.innerHTML = `
            <div class="aspect-[2/3] overflow-hidden" onclick="showMovieDetails(${id})">
                <img src="${poster_path ? IMG_PATH + poster_path : 'https://via.placeholder.com/500x750?text=Sin+Poster'}" class="w-full h-full object-cover transition-transform group-hover:scale-110">
                <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent opacity-60"></div>
            </div>
            <button id="heart-${id}" onclick="event.stopPropagation(); toggleFavorite(${JSON.stringify(movie).replace(/"/g, '&quot;')})" 
                class="absolute top-3 right-3 z-10 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 hover:scale-125 transition-all ${isFav ? 'heart-active' : 'text-white'}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                </svg>
            </button>
            <div class="p-4" onclick="showMovieDetails(${id})">
                <h3 class="font-bold text-sm truncate text-zinc-100 group-hover:text-amber-500 transition-colors">${title}</h3>
                <span class="text-amber-500 text-xs font-bold">★ ${vote_average.toFixed(1)}</span>
            </div>`;
        main.appendChild(movieEl);
    });
}

// --- LÓGICA DE FAVORITOS ---
function toggleFavorite(movie) {
    const index = favorites.findIndex(f => f.id === movie.id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(movie);
    }
    localStorage.setItem('mis_pelis_favs', JSON.stringify(favorites));
    const heartBtn = document.getElementById(`heart-${movie.id}`);
    if(heartBtn) heartBtn.classList.toggle('heart-active');
}

// --- MODAL Y DETALLES ---
async function showMovieDetails(movieId) {
    // Pedimos detalles, actores, videos y ahora RECOMENDACIONES al mismo tiempo
    const [details, credits, videos, recommendations] = await Promise.all([
        fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=es-MX`).then(r => r.json()),
        fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=es-MX`).then(r => r.json()),
        fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=es-MX`).then(r => r.json()),
        fetch(`${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}&language=es-MX`).then(r => r.json())
    ]);

    const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const director = credits.crew.find(c => c.job === 'Director');
    const actors = credits.cast.slice(0, 6);
    const similarMovies = recommendations.results.slice(0, 6); // Tomamos las primeras 6

    modalContent.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
                ${trailer ? `<iframe class="w-full aspect-video rounded-xl shadow-2xl border border-zinc-800" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>` 
                : `<img src="${IMG_PATH + (details.backdrop_path || details.poster_path)}" class="rounded-xl w-full shadow-2xl border border-zinc-800">`}
            </div>
            <div class="flex flex-col gap-5 text-left">
                <h2 class="text-5xl font-black text-amber-500 tracking-tighter">${details.title}</h2>
                <div class="flex gap-4 text-xs font-bold text-zinc-500 uppercase">
                    <span>${details.release_date.split('-')[0]}</span>
                    <span>${details.runtime} min</span>
                    <span class="text-amber-500">★ ${details.vote_average.toFixed(1)}</span>
                </div>
                <p class="text-xl text-zinc-300 leading-relaxed font-light">${details.overview || 'Sin descripción.'}</p>
                <div class="grid grid-cols-2 gap-6 mt-4">
                    <div>
                        <p class="text-amber-500 font-bold uppercase text-[10px] tracking-widest mb-1 text-left">Director</p>
                        <p class="text-white font-medium text-left">${director ? director.name : 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-amber-500 font-bold uppercase text-[10px] tracking-widest mb-1 text-left">Elenco</p>
                        <p class="text-white text-sm leading-tight text-left">${actors.map(a => a.name).join(', ')}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-12">
            <h3 class="text-2xl font-bold text-white mb-6 text-left border-l-4 border-amber-500 pl-4">Si te gustó esta, te recomendamos:</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                ${similarMovies.map(movie => `
                    <div class="cursor-pointer group" onclick="showMovieDetails(${movie.id})">
                        <div class="aspect-[2/3] overflow-hidden rounded-lg border border-zinc-800">
                            <img src="${movie.poster_path ? IMG_PATH + movie.poster_path : 'https://via.placeholder.com/200x300'}" 
                                 class="w-full h-full object-cover group-hover:scale-110 transition-transform">
                        </div>
                        <p class="text-zinc-400 text-[10px] mt-2 truncate font-bold uppercase tracking-tighter">${movie.title}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    // Scroll al inicio del modal por si venían de otra peli similar
    modal.scrollTo(0, 0); 
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.add('hidden');
    modalContent.innerHTML = '';
    document.body.style.overflow = 'auto';
}

// --- EVENTOS ---
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(search.value) {
        getMovies(`${BASE_URL}/search/movie?api_key=${API_KEY}&language=es-MX&query="${search.value}"`);
    }
});

window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoading && currentUrl !== 'favorites') {
        currentPage++;
        getMovies(currentUrl, true);
    }
});

// --- CONFIGURACIÓN DE GOOGLE LOGIN ---
window.onload = function () {
    google.accounts.id.initialize({
        client_id: "673288422818-937e01b2kdr8co1gvhil82r4gojt8ofo.apps.googleusercontent.com", // Aquí pondrías tu ID de Google Cloud
        callback: handleCredentialResponse
    });
    
    google.accounts.id.renderButton(
        document.getElementById("google_btn"),
        { theme: "dark", size: "large", shape: "pill" } 
    );
};

function handleCredentialResponse(response) {
    // Decodificar el token para obtener info del usuario
    const responsePayload = decodeJwtResponse(response.credential);

    // Guardar en LocalStorage para que no se pierda al refrescar
    localStorage.setItem('user_session', JSON.stringify(responsePayload));
    updateUI(responsePayload);
}

function updateUI(user) {
    if (user) {
        document.getElementById("google_btn").classList.add("hidden");
        document.getElementById("user_profile").classList.remove("hidden");
        document.getElementById("user_name").innerText = user.given_name;
        document.getElementById("user_img").src = user.picture;
    }
}

// Función simple para leer los datos del usuario (JWT)
function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
}

function logout() {
    localStorage.removeItem('user_session');
    location.reload();
}

// Revisar si ya estaba logueado al cargar la página
const savedUser = JSON.parse(localStorage.getItem('user_session'));
if (savedUser) {
    setTimeout(() => updateUI(savedUser), 100);
}