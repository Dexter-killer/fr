const list = document.getElementById('vinyl-list');

function loadData() {
    fetch('/api/vinyls')
        .then(response => response.json())
        .then(data => {
            list.innerHTML = '';
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'vinyl-card';
                div.innerHTML = `
                    <img src="${item.image}" alt="${item.title}" class="vinyl-image">
                    <h3>${item.title}</h3>
                    <span class="price-tag">${item.price} RUB</span>
                    <button class="delete-btn" onclick="deleteVinyl('${item.id}')">DELETE</button>
                `;
                list.appendChild(div);
            });
        });
}

function addVinyl() {
    const title = document.getElementById('v-title').value;
    const price = document.getElementById('v-price').value;
    const imageInput = document.getElementById('v-image');

    if (!title || !price) return;

    // Используем FormData для отправки файлов
    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    fetch('/api/vinyls', {
        method: 'POST',
        body: formData // При FormData заголовок Content-Type ставится автоматически
    }).then(() => {
        document.getElementById('v-title').value = '';
        document.getElementById('v-price').value = '';
        imageInput.value = '';
        loadData();
    });
}

function deleteVinyl(id) {
    if (!confirm('Удалить пластинку?')) return;

    fetch(`/api/vinyls/${id}`, {
        method: 'DELETE'
    }).then(() => {
        loadData();
    });
}

loadData();
