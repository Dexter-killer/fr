import React, { useState, useEffect } from 'react';
import './App.css'; // Подключаем стили

function App() {
  const [vinyls, setVinyls] = useState([]);
  const [form, setForm] = useState({ title: '', price: '' });

  // Загрузка данных с сервера
  const fetchVinyls = async () => {
    try {
      const res = await fetch('http://localhost:5050/api/vinyls');
      const data = await res.json();
      setVinyls(data);
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  useEffect(() => {
    fetchVinyls();
  }, []);

  // Добавление
  const handleAdd = async () => {
    await fetch('http://localhost:5050/api/vinyls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm({ title: '', price: '' });
    fetchVinyls();
  };

  // Удаление
  const handleDelete = async (id) => {
    await fetch(`http://localhost:5050/api/vinyls/${id}`, {
      method: 'DELETE'
    });
    fetchVinyls();
  };

  return (
    <div className="app-container">
      <h1>Vinyl Shop </h1>
      
      <div className="form-box">
        <input 
          placeholder="Album Title" 
          value={form.title}
          onChange={e => setForm({...form, title: e.target.value})}
        />
        <input 
          placeholder="Price" 
          type="number"
          value={form.price}
          onChange={e => setForm({...form, price: e.target.value})}
        />
        <button onClick={handleAdd}>ADD</button>
      </div>

      <div className="grid">
        {vinyls.map(item => (
          <div key={item.id} className="card">
            <h3>{item.title}</h3>
            <p>{item.price} RUB</p>
            <button className="del-btn" onClick={() => handleDelete(item.id)}>DELETE</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
