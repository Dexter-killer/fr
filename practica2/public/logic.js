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
                    <h3>${item.title}</h3>
                    <span class="price-tag">${item.price} RUB</span>
                `;
                list.appendChild(div);
            });
        });
}

function addVinyl() {
    const title = document.getElementById('v-title').value;
    const price = document.getElementById('v-price').value;

    if (!title || !price) return;

    fetch('/api/vinyls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, price })
    }).then(() => {
        document.getElementById('v-title').value = '';
        document.getElementById('v-price').value = '';
        loadData();
    });
}

loadData();
