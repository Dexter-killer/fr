import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import apiClient from './api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));

  const handleLogin = (tokens) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App brutal-layout">
        <header className="brutal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>VINYL_<span>ARCHIVE</span></h1>
          <div className="nav-links">
            {!isAuthenticated ? (
              <>
                <Link to="/login" style={{ marginRight: '15px', fontWeight: 'bold', color: '#000', textDecoration: 'none' }}>ВХОД</Link>
                <Link to="/register" style={{ fontWeight: 'bold', color: '#000', textDecoration: 'none' }}>РЕГИСТРАЦИЯ</Link>
              </>
            ) : (
              <button onClick={handleLogout} className="btn-logout" style={{ marginLeft: '15px' }}>ВЫЙТИ</button>
            )}
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!isAuthenticated ? <Register onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Для теста: admin@test.com / admin123 (роль admin)
      // Для теста: seller@test.com / seller123 (роль seller)
      const res = await apiClient.post('/auth/login', { email, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    }
  };

  return (
    <div className="auth-card">
      <h2>ВХОД В СИСТЕМУ</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" placeholder="EMAIL" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="PASSWORD" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">ВОЙТИ</button>
      </form>
    </div>
  );
}

function Register({ onLogin }) {
  // Добавлено поле role для практики 11
  const [formData, setFormData] = useState({ email: '', first_name: '', last_name: '', password: '', role: 'user' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/auth/register', formData);
      const res = await apiClient.post('/auth/login', { email: formData.email, password: formData.password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  return (
    <div className="auth-card">
      <h2>РЕГИСТРАЦИЯ</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" placeholder="EMAIL" required 
               value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        <input type="text" placeholder="ИМЯ" required 
               value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
        <input type="text" placeholder="ФАМИЛИЯ" required 
               value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
        <input type="password" placeholder="ПАРОЛЬ" required 
               value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} 
                style={{ background: '#fff', border: '3px solid #000', padding: '15px', fontWeight: '800', fontFamily: 'inherit' }}>
          <option value="user">USER (Покупатель)</option>
          <option value="seller">SELLER (Продавец)</option>
          <option value="admin">ADMIN (Администратор)</option>
        </select>
        <button type="submit">ЗАРЕГИСТРИРОВАТЬСЯ</button>
      </form>
    </div>
  );
}

function Dashboard() {
  const [user, setUser] = useState(null);
  const [vinyls, setVinyls] = useState([]);
  const [usersList, setUsersList] = useState([]);
  
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const fileInputRef = useRef(null);

  // New States
  const [viewVinylId, setViewVinylId] = useState(null);
  const [editVinylData, setEditVinylData] = useState(null);
  const [editUserData, setEditUserData] = useState(null);

  useEffect(() => {
    apiClient.get('/auth/me')
      .then(res => {
        setUser(res.data);
        if (res.data.role === 'admin') loadUsers(); // Если админ, грузим юзеров
      })
      .catch(err => console.error("Не удалось загрузить пользователя", err));
    
    loadVinyls();
  }, []);

  const loadVinyls = () => {
    apiClient.get('/vinyls')
      .then(res => setVinyls(res.data))
      .catch(err => console.error(err));
  };

  const loadUsers = () => {
    apiClient.get('/users')
      .then(res => setUsersList(res.data))
      .catch(err => console.error(err));
  };

  const handleAddVinyl = async (e) => {
    e.preventDefault();
    if (!title || !price) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    if (fileInputRef.current && fileInputRef.current.files[0]) {
        formData.append('image', fileInputRef.current.files[0]);
    }

    try {
      await apiClient.post('/vinyls', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTitle('');
      setPrice('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadVinyls();
    } catch (err) {
      alert("Ошибка: Недостаточно прав для добавления!");
    }
  };

  const handleDeleteVinyl = async (id) => {
    if (!window.confirm('Удалить пластинку?')) return;
    try {
      await apiClient.delete(`/vinyls/${id}`);
      loadVinyls();
    } catch (err) {
      alert("Ошибка: Удалять может только администратор!");
    }
  };

  const handleUpdateVinyl = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', editVinylData.title);
    formData.append('price', editVinylData.price);
    if (fileInputRef.current && fileInputRef.current.files[0]) {
      formData.append('image', fileInputRef.current.files[0]);
    }
    try {
      await apiClient.put(`/vinyls/${editVinylData.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditVinylData(null);
      loadVinyls();
    } catch (err) { alert("Ошибка при обновлении!"); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Заблокировать (удалить) пользователя?')) return;
    try {
      await apiClient.delete(`/users/${id}`);
      loadUsers();
    } catch (err) {
      alert("Ошибка удаления пользователя");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/users/${editUserData.id}`, editUserData);
      setEditUserData(null);
      loadUsers();
    } catch (err) { alert("Ошибка обновления пользователя"); }
  };

  return (
    <div>
      <div className="auth-card" style={{ marginBottom: '40px', background: '#fff', textAlign: 'left' }}>
        <h2 style={{ margin: 0 }}>ПРОФИЛЬ: {user ? `${user.first_name} ${user.last_name}` : '...'}</h2>
        <p style={{ fontWeight: 'bold' }}>Email: {user?.email}</p>
        <p style={{ fontWeight: 'bold', color: '#FF66C4', textTransform: 'uppercase' }}>РОЛЬ: {user?.role}</p>
      </div>

      {/* Форма добавления винила доступна только Продавцам и Админам */}
      {(user?.role === 'seller' || user?.role === 'admin') && !editVinylData && (
        <section className="controls">
          <form className="entry-form" onSubmit={handleAddVinyl}>
              <input type="text" placeholder="ALBUM_TITLE" value={title} onChange={e => setTitle(e.target.value)} required />
              <input type="number" placeholder="PRICE" value={price} onChange={e => setPrice(e.target.value)} required />
              <input type="file" accept="image/*" ref={fileInputRef} style={{ padding: '10px' }} />
              <button type="submit">ADD_TO_DB</button>
          </form>
        </section>
      )}

      {/* Форма редактирования винила */}
      {editVinylData && (
        <section className="controls" style={{ background: '#ffeb3b', padding: '20px', border: '4px solid #000', marginBottom: '20px' }}>
          <h3>Редактирование: {editVinylData.title}</h3>
          <form className="entry-form" onSubmit={handleUpdateVinyl}>
              <input type="text" value={editVinylData.title} onChange={e => setEditVinylData({...editVinylData, title: e.target.value})} required />
              <input type="number" value={editVinylData.price} onChange={e => setEditVinylData({...editVinylData, price: e.target.value})} required />
              <input type="file" accept="image/*" ref={fileInputRef} style={{ padding: '10px' }} />
              <button type="submit">SAVE</button>
              <button type="button" onClick={() => setEditVinylData(null)}>CANCEL</button>
          </form>
        </section>
      )}

      {/* Список пользователей доступен только Админам */}
      {user?.role === 'admin' && (
        <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '40px' }}>
          <h2>УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (ADMIN ONLY)</h2>
          {editUserData ? (
             <form onSubmit={handleUpdateUser} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
               <input value={editUserData.first_name} onChange={e => setEditUserData({...editUserData, first_name: e.target.value})} required placeholder="Имя" style={{ padding: '10px', border: '3px solid #000' }} />
               <input value={editUserData.last_name} onChange={e => setEditUserData({...editUserData, last_name: e.target.value})} required placeholder="Фамилия" style={{ padding: '10px', border: '3px solid #000' }} />
               <select value={editUserData.role} onChange={e => setEditUserData({...editUserData, role: e.target.value})} style={{ padding: '10px', border: '3px solid #000', fontWeight: 'bold' }}>
                 <option value="user">User</option>
                 <option value="seller">Seller</option>
                 <option value="admin">Admin</option>
               </select>
               <button type="submit" style={{ padding: '10px 20px', background: '#000', color: '#fff', fontWeight: 'bold', border: 'none' }}>SAVE</button>
               <button type="button" onClick={() => setEditUserData(null)} style={{ padding: '10px 20px', background: '#ff3b3b', color: '#fff', fontWeight: 'bold', border: 'none' }}>CANCEL</button>
             </form>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '3px solid #000' }}>
                  <th>Email</th>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '10px 0' }}>{u.email}</td>
                    <td>{u.first_name} {u.last_name}</td>
                    <td style={{ fontWeight: 'bold', color: '#FF66C4' }}>{u.role}</td>
                    <td>
                      <button onClick={() => setEditUserData(u)} style={{ padding: '5px 10px', fontSize: '0.8rem', marginRight: '5px', background: '#ffeb3b', color: '#000' }}>EDIT</button>
                      <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '5px 10px', fontSize: '0.8rem' }}>BLOCK</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Сетка товаров */}
      <div className="vinyl-grid">
        {vinyls.map(item => (
          <div key={item.id} className="vinyl-card">
            <img src={`http://localhost:3000${item.image}`} alt={item.title} className="vinyl-image" />
            <h3>{item.title}</h3>
            <span className="price-tag">{item.price} RUB</span>
            
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => setViewVinylId(item.id)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#4caf50', color: '#000' }}>DETAILS</button>
              {(user?.role === 'seller' || user?.role === 'admin') && (
                 <button onClick={() => setEditVinylData(item)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#ffeb3b', color: '#000' }}>EDIT</button>
              )}
              {/* Кнопка удаления винила доступна только Админам */}
              {user?.role === 'admin' && (
                 <button className="delete-btn" onClick={() => handleDeleteVinyl(item.id)} style={{ padding: '5px 10px', fontSize: '0.8rem' }}>DELETE</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно детализации товара */}
      {viewVinylId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="auth-card" style={{ maxWidth: '500px', width: '90%', position: 'relative', background: '#fff', padding: '30px' }}>
            <button onClick={() => setViewVinylId(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#ff3b3b', color: '#fff', border: '4px solid #000', padding: '10px 15px', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
            {vinyls.filter(v => v.id === viewVinylId).map(v => (
              <div key={v.id} style={{ textAlign: 'center' }}>
                <img src={`http://localhost:3000${v.image}`} alt={v.title} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', border: '4px solid #000', marginBottom: '20px' }} />
                <h2 style={{ marginBottom: '10px' }}>{v.title}</h2>
                <p style={{ fontWeight: 'bold', color: '#555', marginBottom: '10px' }}>ID: {v.id}</p>
                <h3 style={{ color: '#FF66C4', fontSize: '1.5rem', marginTop: 0 }}>{v.price} RUB</h3>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;