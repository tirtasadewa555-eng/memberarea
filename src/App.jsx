import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// 1. INISIALISASI FIREBASE YANG AMAN
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "demo-key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123456:web:123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'premium-member-area';

export default function App() {
  // State Autentikasi & Data
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State UI
  const [showLogin, setShowLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // home, files, profile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // State Form Profile
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dummy Data Produk Download
  const availableFiles = [
    { id: 1, name: 'Ebook Panduan Setup Website (PDF)', size: '2.4 MB', reqLevel: 1, reqLevelName: 'Personal', url: '#' },
    { id: 2, name: 'Plugin Optimasi Kecepatan Premium (ZIP)', size: '15 MB', reqLevel: 2, reqLevelName: 'Bisnis', url: '#' },
    { id: 3, name: '10 Template Landing Page Tambahan (ZIP)', size: '45 MB', reqLevel: 2, reqLevelName: 'Bisnis', url: '#' },
    { id: 4, name: 'Lisensi PLR & File Master Source Code (ZIP)', size: '120 MB', reqLevel: 3, reqLevelName: 'Agensi', url: '#' },
    { id: 5, name: 'Grup VIP & Akses Konsultasi Private (Link)', size: 'Link Akses', reqLevel: 3, reqLevelName: 'Agensi', url: '#' }
  ];

  const levelNames = {
    0: 'Belum Langganan',
    1: 'Personal',
    2: 'Bisnis',
    3: 'Agensi'
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // ==========================================
  // 2. LOGIKA AUTENTIKASI & DATABASE
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || showLogin) return;

    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setEditName(data.name || '');
          setEditPhone(data.phone || '');
        } else {
          const initialData = { 
            name: 'Member Premium', 
            email: user.email || 'guest@member.com',
            phone: '',
            subscriptionLevel: 1, 
            joinDate: new Date().toISOString()
          };
          setDoc(userRef, initialData, { merge: true });
          setUserData(initialData);
          setEditName(initialData.name);
        }
      },
      (error) => {
        console.error("Firestore Listen Error:", error);
        setUserData({ name: 'Demo Member', subscriptionLevel: 1 });
      }
    );
    return () => unsubscribe();
  }, [user, showLogin]);

  // ==========================================
  // 3. HANDLER FUNGSI-FUNGSI
  // ==========================================
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (email.includes('@') && password.length >= 6) {
      setShowLogin(false);
      showToast('Login berhasil! Selamat datang.', 'success');
    } else {
      setLoginError('Email harus valid dan password minimal 6 karakter.');
    }
  };

  const handleLogout = () => {
    setShowLogin(true);
    setActiveTab('home');
    setEmail('');
    setPassword('');
    showToast('Anda telah keluar dari sistem.', 'success');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await setDoc(userRef, { name: editName, phone: editPhone }, { merge: true });
      showToast('Profil berhasil diperbarui!', 'success');
    } catch (error) {
      showToast('Gagal menyimpan profil.', 'error');
    }
    setIsSaving(false);
  };

  const simulateUpgrade = async (newLevel) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await setDoc(userRef, { subscriptionLevel: newLevel }, { merge: true });
      showToast(`Paket berhasil diupgrade ke ${levelNames[newLevel]}!`, 'success');
    } catch (error) {
      showToast('Gagal mengubah paket.', 'error');
    }
  };

  // ==========================================
  // 4. RENDER KOMPONEN UI
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  // Laman Login
  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-['Plus_Jakarta_Sans'] p-4">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Sisi Kiri - Branding */}
          <div className="md:w-5/12 bg-gradient-to-br from-indigo-600 to-indigo-900 p-10 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-400 opacity-20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <h1 className="text-3xl font-black font-['Outfit'] tracking-tight mb-2">MemberArea<span className="text-amber-400">.</span></h1>
              <p className="text-indigo-200">Akses seluruh produk digital Anda di satu tempat yang aman.</p>
            </div>
            
            <div className="relative z-10">
              <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
                <p className="italic text-sm text-indigo-100">"Sistem member area yang sangat memanjakan mata dan mudah digunakan. Download file jadi sangat cepat!"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center font-bold text-xs">BP</div>
                  <div className="text-xs">
                    <p className="font-bold">Budi Pratama</p>
                    <p className="text-indigo-300">Pengguna Agensi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sisi Kanan - Form */}
          <div className="md:w-7/12 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
            <div className="md:hidden text-center mb-8">
              <h1 className="text-3xl font-black font-['Outfit'] text-indigo-600 tracking-tight">MemberArea<span className="text-amber-400">.</span></h1>
            </div>
            
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2 font-['Outfit']">Selamat Datang Kembali</h2>
              <p className="text-slate-500">Silakan masuk menggunakan email terdaftar Anda.</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                  </span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Lupa password?</a>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  </span>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    placeholder="Minimal 6 karakter"
                  />
                </div>
              </div>
              
              {loginError && (
                <div className="text-rose-600 text-sm font-medium p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {loginError}
                </div>
              )}
              
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-200 mt-2"
              >
                Masuk ke Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN DASHBOARD MEMBER
  const currentLevel = userData?.subscriptionLevel || 0;
  const totalAccessibleFiles = availableFiles.filter(f => currentLevel >= f.reqLevel).length;

  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] flex flex-col md:flex-row relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-slideInLeft text-white ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
          {toast.type === 'success' ? 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
          {toast.message}
        </div>
      )}

      {/* Sidebar (Desktop) & Mobile Drawer */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <h1 className="text-2xl font-black font-['Outfit'] text-slate-800 tracking-tight">Member<span className="text-indigo-600">Area</span></h1>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu Utama</p>
          
          <button onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'home' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Beranda
          </button>
          
          <button onClick={() => { setActiveTab('files'); setIsMobileMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'files' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              File Master
            </div>
            {totalAccessibleFiles > 0 && <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalAccessibleFiles}</span>}
          </button>
          
          <button onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Pengaturan Akun
          </button>
        </div>

        <div className="p-6 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-rose-600 hover:bg-rose-50 w-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Overlay Mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Mobile/Desktop */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <div className="flex items-center gap-3 ml-auto cursor-pointer" onClick={() => setActiveTab('profile')}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-tight">{userData?.name}</p>
              <p className="text-xs text-slate-500 font-medium">{levelNames[currentLevel]}</p>
            </div>
            <div className="h-9 w-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'M'}
            </div>
          </div>
        </header>

        {/* Dynamic Views */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-6xl mx-auto w-full">
          
          {/* TAB: BERANDA */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Banner Welcome */}
              <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-black font-['Outfit'] mb-2">Halo, {userData?.name}! 👋</h2>
                  <p className="text-slate-300 text-lg">Senang melihat Anda kembali. Anda saat ini berlangganan paket <strong className="text-white bg-white/10 px-2 py-0.5 rounded ml-1 border border-white/20">{levelNames[currentLevel]}</strong></p>
                </div>
                <button onClick={() => setActiveTab('files')} className="relative z-10 bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-xl font-bold transition-colors whitespace-nowrap shadow-lg shadow-indigo-500/30">
                  Lihat File Saya
                </button>
              </div>

              {/* Grid Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Status Akun</p>
                    <p className="text-2xl font-black text-slate-800 font-['Outfit']">Aktif</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                  <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">File Terbuka</p>
                    <p className="text-2xl font-black text-slate-800 font-['Outfit']">{totalAccessibleFiles} <span className="text-base font-medium text-slate-400">/ {availableFiles.length}</span></p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => setActiveTab('profile')}>
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Profil Anda</p>
                    <p className="text-2xl font-black text-slate-800 font-['Outfit']">{userData?.phone ? 'Lengkap' : '50%'}</p>
                  </div>
                </div>
              </div>

              {/* Sandbox Simulator */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-indigo-900 font-bold text-lg">Simulator Hak Akses (Khusus Demo)</h3>
                    <p className="text-indigo-700 text-sm">Ubah status langganan di bawah ini untuk melihat bagaimana file di tab "File Master" akan terbuka atau terkunci otomatis.</p>
                  </div>
                  <div className="flex bg-white rounded-lg p-1 border border-indigo-200 shrink-0">
                    <button onClick={() => simulateUpgrade(1)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${currentLevel === 1 ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Personal</button>
                    <button onClick={() => simulateUpgrade(2)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${currentLevel === 2 ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Bisnis</button>
                    <button onClick={() => simulateUpgrade(3)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${currentLevel === 3 ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Agensi</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FILE MASTER */}
          {activeTab === 'files' && (
            <div className="animate-fadeIn">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] mb-2">File Master Produk</h2>
                <p className="text-slate-500 text-lg">Silakan unduh file yang tersedia sesuai dengan hak akses paket Anda.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {availableFiles.map((file) => {
                  const isAccessible = currentLevel >= file.reqLevel;

                  return (
                    <div key={file.id} className={`bg-white rounded-3xl border ${isAccessible ? 'border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1' : 'border-slate-200 bg-slate-50 opacity-75'} p-6 transition-all duration-300 flex flex-col justify-between`}>
                      <div>
                        <div className="flex justify-between items-start mb-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isAccessible ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                            {file.name.includes('PDF') ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            ) : file.name.includes('ZIP') ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            )}
                          </div>
                          {!isAccessible && (
                            <span className="bg-slate-200 text-slate-600 text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                              Terkunci
                            </span>
                          )}
                        </div>
                        <h4 className={`text-xl font-bold mb-3 leading-tight font-['Outfit'] ${!isAccessible ? 'text-slate-500' : 'text-slate-800'}`}>{file.name}</h4>
                        
                        <div className="space-y-2 mb-8">
                          <p className="text-sm flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Ukuran:</span>
                            <span className="font-bold text-slate-700">{file.size}</span>
                          </p>
                          <p className="text-sm flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Syarat Akses:</span>
                            <span className={`font-bold ${isAccessible ? 'text-emerald-600' : 'text-rose-500'}`}>{file.reqLevelName}</span>
                          </p>
                        </div>
                      </div>
                      
                      {isAccessible ? (
                        <a 
                          href={file.url}
                          onClick={(e) => { e.preventDefault(); showToast('Proses download dimulai...', 'success'); }}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold py-3.5 px-4 rounded-xl transition-colors duration-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Unduh File
                        </a>
                      ) : (
                        <button 
                          onClick={() => simulateUpgrade(file.reqLevel)}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg"
                        >
                          Upgrade ke {file.reqLevelName}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: PROFILE PENGATURAN */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-3xl">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] mb-2">Pengaturan Akun</h2>
                <p className="text-slate-500 text-lg">Perbarui informasi profil dan kontak Anda di sini.</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center gap-6">
                  <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-3xl border-4 border-white shadow-md shrink-0">
                    {userData?.name ? userData.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{userData?.name}</h3>
                    <p className="text-slate-500">{userData?.email}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nomor WhatsApp</label>
                      <input 
                        type="tel" 
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                        placeholder="0812xxxxxx"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Alamat Email (Akun Utama)</label>
                    <input 
                      type="email" 
                      value={userData?.email || ''}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-2">*Email tidak dapat diubah karena merupakan identitas login utama.</p>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-70 flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Menyimpan...
                        </>
                      ) : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      <style dangerouslySetInline={{__html: `
        @keyframes slideInLeft {
          0% { transform: translateX(100%); opacity: 0; }
          10% { transform: translateX(0); opacity: 1; }
          90% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .animate-slideInLeft { animation: slideInLeft 3s ease forwards; }
        .animate-fadeIn { animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}