const reviewStorageKey = 'winter-pact-reviews';
const reviewForm = document.querySelector('#review-form');
const reviewList = document.querySelector('#reviews-list');
const reviewCount = document.querySelector('#review-count');
const formStatus = document.querySelector('#form-status');

const getReviews = () => {
    try {
        const reviews = JSON.parse(localStorage.getItem(reviewStorageKey) || '[]');
        return Array.isArray(reviews) ? reviews : [];
    } catch {
        return [];
    }
};

const saveReviews = (reviews) => localStorage.setItem(reviewStorageKey, JSON.stringify(reviews));

const formatDate = (date) => new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
}).format(new Date(date));

const renderReviews = () => {
    const reviews = getReviews().sort((first, second) => second.createdAt - first.createdAt);
    reviewCount.textContent = `${reviews.length} ${reviews.length === 1 ? 'reseña' : 'reseñas'}`;

    if (!reviews.length) {
        reviewList.innerHTML = '<p class="empty-reviews">Aún no hay reseñas. Sé el primero en compartir tu experiencia.</p>';
        return;
    }

    reviewList.innerHTML = reviews.map((review) => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        return `<article class="review-card"><div class="review-card-top"><div><h3>${escapeHtml(review.name)}</h3><time datetime="${new Date(review.createdAt).toISOString()}">${formatDate(review.createdAt)}</time></div><span class="review-stars" aria-label="${review.rating} de 5 estrellas">${stars}</span></div><p>${escapeHtml(review.message)}</p></article>`;
    }).join('');
};

const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
}[character]));

reviewForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(reviewForm);
    const name = formData.get('name').trim();
    const message = formData.get('message').trim();
    const rating = Number(formData.get('rating'));

    if (!name || !message || rating < 1 || rating > 5) {
        formStatus.textContent = 'Completa todos los campos antes de publicar.';
        return;
    }

    const reviews = getReviews();
    reviews.push({ name, message, rating, createdAt: Date.now() });
    saveReviews(reviews);
    reviewForm.reset();
    formStatus.textContent = 'Tu reseña se publicó correctamente.';
    renderReviews();
});

renderReviews();
