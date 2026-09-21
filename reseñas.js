const SUPABASE_URL = 'https://txhtydinzgvdhjzllpye.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aHR5ZGluemd2ZGhqemxscHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzExMjMsImV4cCI6MjEwNTU0NzEyM30.0ts3lZcKR4nooFVu3LUpUZ83yKROXpvZhHA0Rd5fW_0';
const reviewForm = document.querySelector('#review-form');
const reviewList = document.querySelector('#reviews-list');
const reviewCount = document.querySelector('#review-count');
const formStatus = document.querySelector('#form-status');
const isConfigured = !SUPABASE_URL.startsWith('PEGA_AQUI') && !SUPABASE_ANON_KEY.startsWith('PEGA_AQUI');
const supabaseClient = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
}[character]));

const formatDate = (date) => new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
}).format(new Date(date));

const renderReviews = (reviews) => {
    reviewCount.textContent = `${reviews.length} ${reviews.length === 1 ? 'reseña' : 'reseñas'}`;

    if (!reviews.length) {
        reviewList.innerHTML = '<p class="empty-reviews">Aún no hay reseñas. Sé el primero en compartir tu experiencia.</p>';
        return;
    }

    reviewList.innerHTML = reviews.map((review) => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        return `<article class="review-card"><div class="review-card-top"><div><h3>${escapeHtml(review.name)}</h3><time datetime="${new Date(review.created_at).toISOString()}">${formatDate(review.created_at)}</time></div><span class="review-stars" aria-label="${review.rating} de 5 estrellas">${stars}</span></div><p>${escapeHtml(review.message)}</p></article>`;
    }).join('');
};

const loadReviews = async () => {
    const { data, error } = await supabaseClient
        .from('reviews')
        .select('id, name, rating, message, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        formStatus.textContent = 'No se pudieron cargar las reseñas. Revisa la tabla y las políticas de Supabase.';
        return;
    }

    renderReviews(data || []);
};

if (!isConfigured) {
    formStatus.textContent = 'Configura SUPABASE_URL y SUPABASE_ANON_KEY en reseñas.js.';
    renderReviews([]);
} else {
    loadReviews();
    supabaseClient
        .channel('reviews-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, loadReviews)
        .subscribe();
}

reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!isConfigured) {
        formStatus.textContent = 'Primero configura las credenciales de Supabase.';
        return;
    }

    const formData = new FormData(reviewForm);
    const name = formData.get('name').trim();
    const message = formData.get('message').trim();
    const rating = Number(formData.get('rating'));

    if (!name || !message || rating < 1 || rating > 5) {
        formStatus.textContent = 'Completa todos los campos antes de publicar.';
        return;
    }

    const { error } = await supabaseClient.from('reviews').insert({ name, rating, message });

    if (error) {
        formStatus.textContent = 'No se pudo publicar la reseña. Revisa las políticas de inserción.';
        return;
    }

    reviewForm.reset();
    formStatus.textContent = 'Tu reseña se publicó correctamente.';
    await loadReviews();
});
