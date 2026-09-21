const SUPABASE_URL = 'https://txhtydinzgvdhjzllpye.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4aHR5ZGluemd2ZGhqemxscHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzExMjMsImV4cCI6MjEwNTU0NzEyM30.0ts3lZcKR4nooFVu3LUpUZ83yKROXpvZhHA0Rd5fW_0';
const galleryForm = document.querySelector('#gallery-form');
const galleryGrid = document.querySelector('#gallery-grid');
const galleryCount = document.querySelector('#gallery-count');
const galleryStatus = document.querySelector('#gallery-status');
const lightbox = document.querySelector('#gallery-lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const lightboxTitle = document.querySelector('#lightbox-title');
const isConfigured = !SUPABASE_URL.startsWith('PEGA_AQUI') && !SUPABASE_ANON_KEY.startsWith('PEGA_AQUI');
const supabaseClient = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const escapeGalleryText = (value) => value.replace(/[&<>'"]/g, (character) => ({
    '&': '&#38;', '<': '&#60;', '>': '&#62;', "'": '&#39;', '"': '&#34;'
}[character]));

const formatDate = (date) => new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
}).format(new Date(date));

const renderGallery = (posts) => {
    galleryCount.textContent = `${posts.length} ${posts.length === 1 ? 'recuerdo' : 'recuerdos'}`;
    galleryGrid.innerHTML = posts.length ? posts.map((post) => `<article class="gallery-card"><img class="gallery-card-image" src="${escapeGalleryText(post.image_url)}" alt="Recuerdo publicado por ${escapeGalleryText(post.name)}" tabindex="0" role="button" title="Ver imagen ampliada"><div class="gallery-card-copy"><strong>${escapeGalleryText(post.name)}</strong><p>${escapeGalleryText(post.caption)}</p><time datetime="${new Date(post.created_at).toISOString()}">${formatDate(post.created_at)}</time></div></article>`).join('') : '<p class="gallery-empty">Todavía no hay recuerdos publicados. Sé el primero.</p>';
};

const closeLightbox = () => {
    lightbox.hidden = true;
    lightboxImage.src = '';
    document.body.classList.remove('lightbox-open');
};

const openLightbox = (image) => {
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxTitle.textContent = 'Toca fuera de la imagen o pulsa × para cerrar';
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    document.querySelector('.gallery-lightbox-close').focus();
};

galleryGrid.addEventListener('click', (event) => {
    const image = event.target.closest('.gallery-card-image');
    if (image) openLightbox(image);
});

galleryGrid.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.gallery-card-image')) {
        event.preventDefault();
        openLightbox(event.target);
    }
});

lightbox.addEventListener('click', (event) => {
    if (event.target.matches('[data-lightbox-close]')) closeLightbox();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

const loadGallery = async () => {
    const { data, error } = await supabaseClient
        .from('gallery_posts')
        .select('id, name, caption, image_url, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        galleryStatus.textContent = `No se pudieron cargar las publicaciones: ${error.message}`;
        return;
    }

    renderGallery(data || []);
};

if (!isConfigured) {
    galleryStatus.textContent = 'Configura las credenciales de Supabase en galeria.js.';
    renderGallery([]);
} else {
    loadGallery();
    supabaseClient
        .channel('gallery-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gallery_posts' }, loadGallery)
        .subscribe();
}

galleryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isConfigured) {
        galleryStatus.textContent = 'Primero configura las credenciales de Supabase.';
        return;
    }

    const formData = new FormData(galleryForm);
    const name = formData.get('name').trim();
    const caption = formData.get('caption').trim();
    const imageFile = formData.get('image');

    if (!name || !caption || !imageFile?.size) {
        galleryStatus.textContent = 'Completa el nombre, el texto y selecciona una imagen.';
        return;
    }

    if (!imageFile.type.startsWith('image/')) {
        galleryStatus.textContent = 'El archivo seleccionado debe ser una imagen.';
        return;
    }

    galleryStatus.textContent = 'Publicando recuerdo...';
    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const filePath = `${uniqueId}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { error: uploadError } = await supabaseClient.storage
        .from('gallery-images')
        .upload(filePath, imageFile, { upsert: false, contentType: imageFile.type });

    if (uploadError) {
        galleryStatus.textContent = `No se pudo subir la imagen: ${uploadError.message}`;
        return;
    }

    const { data: publicImage } = supabaseClient.storage.from('gallery-images').getPublicUrl(filePath);
    const { error: insertError } = await supabaseClient.from('gallery_posts').insert({ name, caption, image_url: publicImage.publicUrl });

    if (insertError) {
        galleryStatus.textContent = `La imagen subió, pero no se pudo guardar la publicación: ${insertError.message}`;
        return;
    }

    galleryForm.reset();
    galleryStatus.textContent = 'El recuerdo se publicó correctamente.';
    await loadGallery();
});