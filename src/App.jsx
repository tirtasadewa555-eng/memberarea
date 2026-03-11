import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
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
  updateDoc
} from 'firebase/firestore';

// ==========================================
// 1. DATA KONSTAN (Didefinisikan di luar agar stabil)
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "demo-key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123456:web:123456"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'premium-member-area';
const ADMIN_EMAIL = "admin@website.com"; 

const availableFiles = [
  { id: 1, name: 'Ebook Panduan Setup Website (PDF)', size: '2.4 MB', reqLevel: 1, reqLevelName: 'Personal' },
  { id: 2, name: 'Plugin Optimasi Kecepatan Premium (ZIP)', size: '15 MB', reqLevel: 2, reqLevelName: 'Bisnis' },
  { id: 3, name: '10 Template Landing Page Tambahan (ZIP)', size: '45 MB', reqLevel: 2, reqLevelName: 'Bisnis' },
  { id: 4, name: 'Lisensi PLR & File Master Source Code (ZIP)', size: '120 MB', reqLevel: 3, reqLevelName: 'Agensi' }
];

const levelNames = {
  0: 'Gratis',
  1: 'Personal',
  2: 'Bisnis',
  3: 'Agensi'
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  // --- Deklarasi State ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState([]); 
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);
  
  const [authMode, setAuthMode] = useState('login'); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Perhitungan Nilai Turunan (Selalu didefinisikan sebelum return manapun) ---
  const currentLevel = userData?.subscriptionLevel || 0;
  const totalAccessibleFiles = availableFiles.filter(f => currentLevel >= f.reqLevel).length;

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const translateError = (errorCode) => {
    switch(errorCode) {
      case 'auth/email-already-in-use': return 'Email sudah terdaftar.';
      case 'auth/invalid-email': return 'Format email tidak valid.';
      case 'auth/weak-password': return 'Password minimal 6 karakter.';
      case 'auth/user-not-found': return 'Akun tidak ditemukan.';
      case 'auth/wrong-password': return 'Password salah.';
      case 'auth/invalid-credential': return 'Email atau password salah.';
      default: return 'Gagal terhubung ke sistem.';
    }
  };

  // ==========================================
  // 2. LOGIKA AUTENTIKASI & ROLE
  // ==========================================
  useEffect(() => {
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

  // Sinkronisasi Profil User
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setName(data.name || '');
        setPhone(data.phone || '');
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Sinkronisasi Semua User (Khusus Admin)
  useEffect(() => {
    if (!user || !isAdmin) return;
    const registryRef = collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry');
    const unsubscribe = onSnapshot(registryRef, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersList);
    }, (err) => console.error("Admin Registry Error:", err));
    return () => unsubscribe();
  }, [user, isAdmin]);

  // ==========================================
  // 3. HANDLER AKSI
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoadingAuth(true);

    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        const initialData = {
          name: name,
          email: email,
          phone: '',
          subscriptionLevel: 0,
          joinDate: new Date().toISOString()
        };

        await setDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), initialData);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid), {
          uid: uid,
          ...initialData
        });
        
        showToast('Pendaftaran Berhasil!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Berhasil Masuk!', 'success');
      }
    } catch (error) {
      setAuthError(translateError(error.code));
    }
    setLoadingAuth(false);
  };

  const handleAdminUpdateLevel = async (targetUid, newLevel) => {
    try {
      const registryRef = doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', targetUid);
      await updateDoc(registryRef, { subscriptionLevel: newLevel });
      const userRef = doc(db, 'artifacts', appId, 'users', targetUid, 'profile', 'data');
      await updateDoc(userRef, { subscriptionLevel: newLevel });
      showToast(`Level member berhasil diperbarui!`, 'success');
    } catch (err) {
      showToast('Gagal update. Periksa aturan database.', 'error');
    }
  };

  const handleLogout = () => signOut(auth).then(() => {
    setAuthMode('login');
    setActiveTab('home');
    showToast('Sampai jumpa kembali!');
  });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await setDoc(userRef, { name: name, phone: phone }, { merge: true });
      showToast('Profil berhasil diperbarui!', 'success');
    } catch (error) {
      showToast('Gagal menyimpan profil.', 'error');
    }
    setIsSaving(false);
  };

  // --- Guard Loading ---
  if (loadingInit) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div>;

  // --- Render Login Screen ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-['Plus_Jakarta_Sans'] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black font-['Outfit'] text-indigo-600 mb-2">MemberArea<span className="text-amber-500">.</span></h1>
            <p className="text-slate-500 font-medium">{authMode === 'login' ? 'Selamat datang kembali!' : 'Daftar sekarang untuk akses file.'}</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <input type="text" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nama Lengkap" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" required />
            )}
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" required />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" required />
            
            {authError && <p className="text-rose-500 text-xs font-bold px-1">{authError}</p>}
            
            <button type="submit" disabled={loadingAuth} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
              {loadingAuth && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
              {authMode === 'login' ? 'MASUK SEKARANG' : 'DAFTAR SEKARANG'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm font-bold text-slate-400">
            {authMode === 'login' ? 
              <p>Baru di sini? <button onClick={()=>setAuthMode('register')} className="text-indigo-600 hover:underline font-black">Buat Akun</button></p> :
              <p>Sudah punya akun? <button onClick={()=>setAuthMode('login')} className="text-indigo-600 hover:underline font-black">Masuk</button></p>
            }
          </div>
        </div>
      </div>
    );
  }

  // --- Render Dashboard Screen ---
  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] flex flex-col md:flex-row relative">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100"><h1 className="text-2xl font-black font-['Outfit'] text-slate-800">Member<span className="text-indigo-600">Area</span></h1></div>
        <div className="p-6 flex-1 flex flex-col gap-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-3">Menu Member</p>
          <NavItem active={activeTab === 'home'} onClick={() => {setActiveTab('home'); setIsMobileMenuOpen(false);}} label="Beranda" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          <NavItem active={activeTab === 'files'} onClick={() => {setActiveTab('files'); setIsMobileMenuOpen(false);}} label="File Master" icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" count={totalAccessibleFiles} />
          
          {isAdmin && (
            <>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[2px] mt-6 mb-3">Administrator</p>
              <NavItem active={activeTab === 'admin'} onClick={() => {setActiveTab('admin'); setIsMobileMenuOpen(false);}} label="Kelola Member" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
            </>
          )}

          <NavItem active={activeTab === 'profile'} onClick={() => {setActiveTab('profile'); setIsMobileMenuOpen(false);}} label="Profil Saya" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </div>
        <div className="p-6 border-t border-slate-100"><button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-rose-600 hover:bg-rose-50 w-full transition-all text-sm">Keluar</button></div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{userData?.name || 'Member'}</p>
              <p className="text-[10px] font-black text-indigo-500 uppercase">{isAdmin ? 'ADMIN' : levelNames[currentLevel]}</p>
            </div>
            <div className="h-9 w-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm">{userData?.name ? userData.name.charAt(0).toUpperCase() : 'M'}</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {/* VIEW: BERANDA */}
          {activeTab === 'home' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-8 border border-white/5">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -mr-20 -mt-20"></div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-3">Selamat Datang, {userData?.name || 'Kawan'}!</h2>
                  <p className="text-slate-400 text-lg max-w-lg">Status paket Anda saat ini: <span className="text-indigo-400 font-black">{levelNames[currentLevel]}</span></p>
                </div>
                <button onClick={() => setActiveTab('files')} className="relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black transition-all">FILE MASTER</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Status Lisensi" val="Aktif" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="emerald" />
                <StatCard label="File Tersedia" val={`${totalAccessibleFiles} / ${availableFiles.length}`} icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" color="indigo" />
                <StatCard label="Akses Role" val={isAdmin ? 'ADMIN' : 'MEMBER'} icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" color="amber" />
              </div>

              {/* Sandbox Simulator */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-8">
                <h3 className="text-indigo-900 font-bold text-lg mb-2">Pilih Paket Demo (Simulasi)</h3>
                <div className="flex flex-wrap bg-white rounded-lg p-1 border border-indigo-200 w-fit">
                   {[1, 2, 3].map(lv => (
                     <button key={lv} onClick={() => simulateUpgrade(lv)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${currentLevel === lv ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                       {levelNames[lv]}
                     </button>
                   ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: FILE MASTER */}
          {activeTab === 'files' && (
            <div className="animate-fadeIn">
              <div className="mb-10"><h2 className="text-3xl font-black text-slate-900">File Produk Digital</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {availableFiles.map(file => <FileCard key={file.id} file={file} currentLevel={currentLevel} />)}
              </div>
            </div>
          )}

          {/* VIEW: ADMIN PANEL */}
          {activeTab === 'admin' && isAdmin && (
            <div className="animate-fadeIn space-y-8">
              <h2 className="text-3xl font-black text-slate-900">Manajemen Member</h2>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Member</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Status Paket</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allUsers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{m.name}</div>
                          <div className="text-xs text-slate-400">{m.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${m.subscriptionLevel === 0 ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                            {levelNames[m.subscriptionLevel]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {[1, 2, 3].map(lv => (
                              <button key={lv} onClick={() => handleAdminUpdateLevel(m.id, lv)} className={`px-2 py-1 rounded border text-[10px] font-bold ${m.subscriptionLevel === lv ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-slate-500 hover:border-indigo-400'}`}>
                                {levelNames[lv]}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-2xl">
               <h2 className="text-3xl font-black text-slate-900 mb-6">Profil Saya</h2>
               <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                    <div className="h-20 w-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white">{userData?.name?.charAt(0) || 'M'}</div>
                    <div><h3 className="text-2xl font-black text-slate-800">{userData?.name}</h3><p className="text-slate-400 font-medium">{userData?.email}</p></div>
                  </div>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">Nama Lengkap</label><input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" /></div>
                      <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">WhatsApp</label><input type="text" value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" /></div>
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl">SIMPAN PERUBAHAN</button>
                  </form>
               </div>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInLeft { 0% { transform: translateX(100%); opacity: 0; } 10% { transform: translateX(0); opacity: 1; } 90% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
        .animate-slideInLeft { animation: slideInLeft 3s ease forwards; }
        .animate-fadeIn { animation: fadeIn 0.5s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

function NavItem({ active, onClick, label, icon, count }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
      <div className="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
        <span className="text-sm">{label}</span>
      </div>
      {count > 0 && !active && <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{count}</span>}
    </button>
  );
}

function StatCard({ label, val, icon, color }) {
  const colors = { emerald: 'bg-emerald-100 text-emerald-600', indigo: 'bg-indigo-100 text-indigo-600', amber: 'bg-amber-100 text-amber-600' };
  return (
    <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d={icon} /></svg>
      </div>
      <div><p className="text-slate-400 text-xs font-black uppercase mb-1">{label}</p><p className="text-2xl font-black text-slate-800">{val}</p></div>
    </div>
  );
}

function FileCard({ file, currentLevel }) {
  const isAccessible = currentLevel >= file.reqLevel;
  return (
    <div className={`bg-white rounded-[2rem] border ${isAccessible ? 'border-slate-200 hover:shadow-2xl' : 'border-slate-200 opacity-60 bg-slate-50'} p-7 transition-all flex flex-col h-full`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${isAccessible ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        </div>
        {!isAccessible && <span className="text-rose-500 font-black text-[10px] uppercase">TERKUNCI</span>}
      </div>
      <h4 className="text-xl font-black text-slate-800 mb-4">{file.name}</h4>
      <div className="mt-auto space-y-2 mb-6">
         <div className="flex justify-between text-xs font-bold text-slate-400"><span>UKURAN</span><span className="text-slate-700">{file.size}</span></div>
         <div className="flex justify-between text-xs font-bold text-slate-400"><span>AKSES</span><span className={isAccessible ? 'text-emerald-600' : 'text-rose-500'}>{file.reqLevelName}</span></div>
      </div>
      {isAccessible ? (
        <button onClick={()=>alert('Mendownload...')} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl">UNDUH SEKARANG</button>
      ) : (
        <button disabled className="w-full bg-slate-200 text-slate-400 font-black py-4 rounded-2xl">AKSES DITOLAK</button>
      )}
    </div>
  );
}