import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

// ==========================================
// 1. KONFIGURASI (Auto-detect Demo Mode)
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "", // Masukkan API Key Anda di sini
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Cek apakah config masih kosong
const isDemoMode = !firebaseConfig || !firebaseConfig.apiKey;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'premium-member-area-v2';
const ADMIN_EMAIL = "admin@website.com"; 

const levelNames = {
  0: 'Gratis',
  1: 'Personal',
  2: 'Bisnis',
  3: 'Agensi'
};

// Inisialisasi aman (Singleton Pattern)
let app, auth, db;
if (!isDemoMode) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
  }
}

export default function App() {
  // --- State Utama ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [files, setFiles] = useState([]); 
  const [allUsers, setAllUsers] = useState([]); 
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);
  
  // --- State UI ---
  const [authMode, setAuthMode] = useState('login'); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [adminSubTab, setAdminSubTab] = useState('users');

  // --- Form State ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Form Produk (Admin) ---
  const [editingFileId, setEditingFileId] = useState(null);
  const [fileInput, setFileInput] = useState({ name: '', size: '', reqLevel: 1, url: '' });

  // --- Perhitungan Nilai Aman ---
  const currentLevel = useMemo(() => userData?.subscriptionLevel || 0, [userData]);
  const totalAccessibleFiles = useMemo(() => {
    if (!files || !Array.isArray(files)) return 0;
    return files.filter(f => currentLevel >= (f.reqLevel || 0)).length;
  }, [files, currentLevel]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const translateError = (errorCode) => {
    switch(errorCode) {
      case 'auth/email-already-in-use': return 'Email sudah terdaftar.';
      case 'auth/weak-password': return 'Password minimal 6 karakter.';
      case 'auth/invalid-credential': return 'Email atau password salah.';
      default: return 'Gagal terhubung ke sistem.';
    }
  };

  // ==========================================
  // 2. FIREBASE SYNC
  // ==========================================
  
  useEffect(() => {
    // Jika tidak ada Auth, langsung matikan loading (Mode Demo)
    if (!auth) {
      setLoadingInit(false);
      return;
    }

    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) {}
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdmin(currentUser.email === ADMIN_EMAIL);
      }
      setLoadingInit(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Mode Demo: Gunakan data palsu jika "Login" diklik
    if (isDemoMode && user) {
      setUserData({ 
        name: profileName || "Pengguna Demo", 
        subscriptionLevel: 1, 
        joinDate: new Date().toISOString() 
      });
      setFiles([
        { id: '1', name: 'Panduan Sukses Bisnis (Ebook)', size: '2MB', reqLevel: 1, url: '#' },
        { id: '2', name: 'Plugin Elementor Pro (ZIP)', size: '15MB', reqLevel: 2, url: '#' },
        { id: '3', name: 'Master Template Agensi (ZIP)', size: '120MB', reqLevel: 3, url: '#' }
      ]);
      return;
    }

    // Jika Firebase belum siap, jangan jalankan listener
    if (!user || !db) return;

    // Sinkronisasi Profil Pribadi
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    const unsubProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setProfileName(data.name || '');
        setProfilePhone(data.phone || '');
      }
    }, (err) => console.warn("Profile sync error:", err));

    // Katalog File (Public)
    const filesRef = collection(db, 'artifacts', appId, 'public', 'data', 'files');
    const unsubFiles = onSnapshot(filesRef, (snapshot) => {
      setFiles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Files sync error:", err));

    // Registrasi User (Hanya Admin)
    let unsubRegistry = () => {};
    if (isAdmin) {
      const registryRef = collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry');
      unsubRegistry = onSnapshot(registryRef, (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.warn("Registry sync error:", err));
    }

    return () => { unsubProfile(); unsubFiles(); unsubRegistry(); };
  }, [user, isAdmin]);

  // ==========================================
  // 3. HANDLERS
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    
    // Logic untuk Mode Demo
    if (isDemoMode) {
      setLoadingAuth(true);
      setTimeout(() => {
        setUser({ email: email, uid: "demo-user-123" });
        setLoadingAuth(false);
        showToast("Masuk dalam Mode Demo (Bukan Real DB)");
      }, 800);
      return;
    }

    setAuthError('');
    setLoadingAuth(true);
    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const initialData = { name: profileName, email, phone: '', subscriptionLevel: 0, joinDate: new Date().toISOString() };
        await setDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), initialData);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid), { uid, ...initialData });
        showToast('Akun berhasil dibuat!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Berhasil masuk!');
      }
    } catch (error) {
      setAuthError(translateError(error.code));
    }
    setLoadingAuth(false);
  };

  const handleLogout = () => {
    if (!isDemoMode && auth) {
      signOut(auth);
    }
    setUser(null);
    setUserData(null);
    showToast("Berhasil keluar");
  };

  const handleAdminUpdateLevel = async (targetUid, newLevel) => {
    if (isDemoMode) return showToast("Fungsi ini dinonaktifkan di Mode Demo");
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', targetUid), { subscriptionLevel: newLevel });
      await updateDoc(doc(db, 'artifacts', appId, 'users', targetUid, 'profile', 'data'), { subscriptionLevel: newLevel });
      showToast(`Akses member diperbarui.`);
    } catch (err) {
      showToast('Gagal update.', 'error');
    }
  };

  // --- Render Utama ---
  if (loadingInit) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  // --- UI: LOGIN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-['Plus_Jakarta_Sans'] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
          {isDemoMode && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[10px] font-black text-center uppercase tracking-widest">
              ⚠️ Running in Preview Mode
            </div>
          )}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-1">MemberArea<span className="text-indigo-600">.</span></h1>
            <p className="text-slate-400 text-sm font-medium">{authMode === 'login' ? 'Masuk ke dashboard member' : 'Buat akun member baru'}</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <input type="text" value={profileName} onChange={(e)=>setProfileName(e.target.value)} placeholder="Nama Lengkap" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold" required />
            )}
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Alamat Email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold" required />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold" required />
            {authError && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg">{authError}</div>}
            <button type="submit" disabled={loadingAuth} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
              {loadingAuth && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
              {authMode === 'login' ? 'MASUK SEKARANG' : 'DAFTAR SEKARANG'}
            </button>
          </form>
          <div className="mt-8 text-center">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-slate-400 text-xs font-black hover:text-indigo-600 uppercase tracking-widest transition-all">
              {authMode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- UI: DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-20 flex items-center px-8 border-b border-slate-100"><h1 className="text-xl font-black text-slate-800">Member<span className="text-indigo-600">Area</span></h1></div>
        <div className="p-6 flex-1 flex flex-col gap-1 overflow-y-auto">
          <NavItem active={activeTab === 'home'} onClick={() => {setActiveTab('home'); setIsMobileMenuOpen(false);}} label="Dashboard" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          <NavItem active={activeTab === 'files'} onClick={() => {setActiveTab('files'); setIsMobileMenuOpen(false);}} label="File Master" icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" count={totalAccessibleFiles} />
          {isAdmin && <NavItem active={activeTab === 'admin'} onClick={() => {setActiveTab('admin'); setIsMobileMenuOpen(false);}} label="Panel Admin" icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />}
          <NavItem active={activeTab === 'profile'} onClick={() => {setActiveTab('profile'); setIsMobileMenuOpen(false);}} label="Pengaturan" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </div>
        <div className="p-6 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg> Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 sticky top-0 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 mb-1 leading-none">{userData?.name || 'Member'}</p>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{isAdmin ? 'ADMIN' : levelNames[currentLevel]}</p>
            </div>
            <div className="h-10 w-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-xl shadow-indigo-100">
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'M'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
          {toast.show && <div className="fixed bottom-8 right-8 z-[60] px-6 py-4 rounded-2xl shadow-2xl font-bold text-white bg-indigo-600 animate-slideInLeft">{toast.message}</div>}

          {/* VIEW: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] -mr-20 -mt-20"></div>
                <div className="relative z-10 text-center md:text-left">
                  <h2 className="text-3xl md:text-5xl font-black mb-4 font-['Outfit'] tracking-tight">Halo, {userData?.name?.split(' ')[0] || 'Member'}!</h2>
                  <p className="text-slate-400 text-lg">Kelola akun dan akses semua file produk Anda di halaman File Master.</p>
                </div>
                <button onClick={() => setActiveTab('files')} className="relative z-10 bg-white text-indigo-900 px-10 py-5 rounded-[1.5rem] font-black shadow-2xl transition-all hover:scale-105">FILE MASTER</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Member Sejak" val={userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('id-ID') : '-'} icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" color="emerald" />
                <StatCard label="File Dibuka" val={`${totalAccessibleFiles} / ${files.length}`} icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" color="indigo" />
                <StatCard label="Status Paket" val={levelNames[currentLevel]} icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 21.248a11.955 11.955 0 01-9.618-7.016 11.955 11.955 0 010-9.464A11.955 11.955 0 0112 2.752a11.955 11.955 0 019.618 7.016z" color="amber" />
              </div>
            </div>
          )}

          {/* VIEW: FILES */}
          {activeTab === 'files' && (
            <div className="animate-fadeIn">
              <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] mb-8">Katalog Produk</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {files.map(file => <FileCard key={file.id} file={file} currentLevel={currentLevel} />)}
              </div>
            </div>
          )}

          {/* VIEW: ADMIN PANEL */}
          {activeTab === 'admin' && isAdmin && (
            <div className="animate-fadeIn space-y-10">
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
                <button onClick={()=>setAdminSubTab('users')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${adminSubTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>MEMBER</button>
                <button onClick={()=>setAdminSubTab('products')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${adminSubTab === 'products' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>PRODUK</button>
              </div>
              {adminSubTab === 'users' ? (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest"><tr className="px-8"><th className="px-8 py-5">Nama & Email</th><th className="px-8 py-5">Akses</th><th className="px-8 py-5 text-center">Ubah Paket</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {allUsers.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="px-8 py-5"><p className="font-bold text-slate-900">{m.name}</p><p className="text-xs text-slate-400">{m.email}</p></td>
                          <td className="px-8 py-5"><span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black">{levelNames[m.subscriptionLevel]}</span></td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex justify-center gap-1">
                              {[1,2,3].map(lv => <button key={lv} onClick={()=>handleAdminUpdateLevel(m.id, lv)} className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${m.subscriptionLevel === lv ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>{levelNames[lv]}</button>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 font-bold">Menu produk dapat diisi melalui Firebase atau integrasi API Firestore.</div>
              )}
            </div>
          )}

          {/* VIEW: PROFILE */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-2xl">
              <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] mb-8">Informasi Akun</h2>
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl space-y-8">
                <div className="flex items-center gap-8 pb-8 border-b border-slate-100">
                  <div className="h-24 w-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-indigo-200">{userData?.name?.charAt(0).toUpperCase() || 'M'}</div>
                  <div><h3 className="text-3xl font-black text-slate-900">{userData?.name || 'Member'}</h3><p className="text-slate-400 font-bold">{userData?.email}</p></div>
                </div>
                <button onClick={() => isDemoMode ? showToast("Fitur update aktif di mode real DB", "error") : alert("Update Profile Logic Here")} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-indigo-100 transition-all hover:-translate-y-1">UPDATE PROFIL</button>
              </div>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes slideInLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slideInLeft { animation: slideInLeft 0.3s ease-out; }
      `}} />
    </div>
  );
}

function NavItem({ active, onClick, label, icon, count }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-6 py-4 rounded-2xl font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}>
      <div className="flex items-center gap-4">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d={icon} /></svg>
        <span className="text-sm tracking-tight">{label}</span>
      </div>
      {count !== undefined && !active && <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2.5 py-1 rounded-full">{count}</span>}
    </button>
  );
}

function StatCard({ label, val, icon, color }) {
  const colors = { emerald: 'bg-emerald-100 text-emerald-600', indigo: 'bg-indigo-100 text-indigo-600', amber: 'bg-amber-100 text-amber-600' };
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all">
      <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-all group-hover:scale-110 ${colors[color]}`}>
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d={icon} /></svg>
      </div>
      <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5">{label}</p><p className="text-xl font-black text-slate-900 font-['Outfit']">{val}</p></div>
    </div>
  );
}

function FileCard({ file, currentLevel }) {
  const isAccessible = currentLevel >= (file.reqLevel || 0);
  return (
    <div className={`bg-white rounded-[2.5rem] border ${isAccessible ? 'border-slate-200 hover:border-indigo-400 hover:shadow-2xl' : 'border-slate-200 opacity-60 bg-slate-50'} p-10 transition-all duration-500 flex flex-col h-full group relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-8">
        <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${isAccessible ? 'bg-indigo-100 text-indigo-600 shadow-xl shadow-indigo-50 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        </div>
        {!isAccessible && <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-4 py-2 rounded-full uppercase flex items-center gap-2 border border-rose-200"><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> TERKUNCI</span>}
      </div>
      <h4 className="text-2xl font-black text-slate-900 mb-4 font-['Outfit'] leading-tight tracking-tight">{file.name}</h4>
      <div className="mt-auto space-y-3 mb-10">
         <div className="flex justify-between text-[11px] font-black tracking-tight"><span className="text-slate-400 uppercase">Size File</span><span className="text-slate-900">{file.size}</span></div>
         <div className="flex justify-between text-[11px] font-black tracking-tight"><span className="text-slate-400 uppercase">Minimal Paket</span><span className={isAccessible ? 'text-emerald-600' : 'text-rose-500'}>{levelNames[file.reqLevel]}</span></div>
      </div>
      {isAccessible ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 text-white text-center font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:-translate-y-1 active:scale-95">DOWNLOAD</a>
      ) : (
        <button disabled className="w-full bg-slate-100 text-slate-400 font-black py-5 rounded-[1.5rem] cursor-not-allowed uppercase text-xs">Hanya Paket {levelNames[file.reqLevel]}</button>
      )}
    </div>
  );
}