import React, { useState, useEffect, useMemo } from 'react';
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
  updateDoc,
  deleteDoc,
  addDoc
} from 'firebase/firestore';

// ==========================================
// 1. KONFIGURASI & KONSTANTA
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'premium-member-area-prod';
const ADMIN_EMAIL = "admin@website.com"; // Ganti dengan email admin Anda

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
  // --- State Utama ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [files, setFiles] = useState([]); // Data file dari database
  const [allUsers, setAllUsers] = useState([]); 
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);
  
  // --- State UI ---
  const [authMode, setAuthMode] = useState('login'); 
  const [activeTab, setActiveTab] = useState('home'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showFileForm, setShowFileForm] = useState(false);

  // --- Form State ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Form Produk (Admin) ---
  const [fileInput, setFileInput] = useState({ name: '', size: '', reqLevel: 1, url: '' });

  // --- Nilai Turunan ---
  const currentLevel = useMemo(() => userData?.subscriptionLevel || 0, [userData]);
  const totalAccessibleFiles = useMemo(() => files.filter(f => currentLevel >= f.reqLevel).length, [files, currentLevel]);

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
      default: return 'Gagal terhubung ke sistem. Periksa config Firebase Anda.';
    }
  };

  // ==========================================
  // 2. SIDE EFFECTS (FIREBASE SYNC)
  // ==========================================
  
  // Autentikasi Awal
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

  // Sync Data Member & Produk (Berjalan jika user login)
  useEffect(() => {
    if (!user) return;

    // 1. Sinkronisasi Profil Pribadi
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    const unsubProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setProfileName(data.name || '');
        setProfilePhone(data.phone || '');
      }
    });

    // 2. Sinkronisasi Katalog File (Public)
    const filesRef = collection(db, 'artifacts', appId, 'public', 'data', 'files');
    const unsubFiles = onSnapshot(filesRef, (snapshot) => {
      setFiles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Sinkronisasi Semua User (Hanya Admin)
    let unsubRegistry = () => {};
    if (user.email === ADMIN_EMAIL) {
      const registryRef = collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry');
      unsubRegistry = onSnapshot(registryRef, (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => { unsubProfile(); unsubFiles(); unsubRegistry(); };
  }, [user]);

  // ==========================================
  // 3. LOGIKA ADMIN (MANAJEMEN DATA)
  // ==========================================
  
  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const filesRef = collection(db, 'artifacts', appId, 'public', 'data', 'files');
      await addDoc(filesRef, { ...fileInput, reqLevel: parseInt(fileInput.reqLevel) });
      setFileInput({ name: '', size: '', reqLevel: 1, url: '' });
      setShowFileForm(false);
      showToast('File produk berhasil ditambahkan!');
    } catch (err) {
      showToast('Gagal menambah file.', 'error');
    }
  };

  const handleDeleteFile = async (id) => {
    if (!window.confirm('Hapus file ini?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', id));
      showToast('File berhasil dihapus.');
    } catch (err) {
      showToast('Gagal menghapus.', 'error');
    }
  };

  const handleAdminUpdateLevel = async (targetUid, newLevel) => {
    try {
      // Update di Public Registry
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', targetUid), { subscriptionLevel: newLevel });
      // Update di Private Profile (Bisa dilakukan jika Rules mengizinkan Admin)
      await updateDoc(doc(db, 'artifacts', appId, 'users', targetUid, 'profile', 'data'), { subscriptionLevel: newLevel });
      showToast(`Akses member diperbarui ke ${levelNames[newLevel]}`);
    } catch (err) {
      showToast('Gagal update level.', 'error');
    }
  };

  // ==========================================
  // 4. LOGIKA AUTH & PROFIL
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
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
        showToast('Selamat datang kembali!');
      }
    } catch (error) {
      setAuthError(translateError(error.code));
    }
    setLoadingAuth(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updateData = { name: profileName, phone: profilePhone };
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), updateData);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), updateData);
      showToast('Profil diperbarui!');
    } catch (error) {
      showToast('Gagal menyimpan.', 'error');
    }
    setIsSaving(false);
  };

  // --- Guard Loading ---
  if (loadingInit) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div>;

  // --- UI: LOGIN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-['Plus_Jakarta_Sans'] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black font-['Outfit'] text-indigo-600 mb-1">MemberArea<span className="text-amber-500">.</span></h1>
            <p className="text-slate-500 text-sm font-medium">{authMode === 'login' ? 'Masuk untuk akses dashboard' : 'Daftar akun member baru'}</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <input type="text" value={profileName} onChange={(e)=>setProfileName(e.target.value)} placeholder="Nama Lengkap" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" required />
            )}
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" required />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" required />
            {authError && <p className="text-rose-500 text-xs font-bold px-1">{authError}</p>}
            <button type="submit" disabled={loadingAuth} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
              {loadingAuth && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
              {authMode === 'login' ? 'MASUK' : 'DAFTAR'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            {authMode === 'login' ? 
              <>Belum punya akun? <button onClick={()=>setAuthMode('register')} className="text-indigo-600 hover:underline">Register</button></> :
              <>Sudah punya akun? <button onClick={()=>setAuthMode('login')} className="text-indigo-600 hover:underline">Login</button></>
            }
          </p>
        </div>
      </div>
    );
  }

  // --- UI: DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100"><h1 className="text-2xl font-black font-['Outfit'] text-slate-800 tracking-tight">Member<span className="text-indigo-600">Area</span></h1></div>
        <div className="p-6 flex-1 flex flex-col gap-1">
          <NavItem active={activeTab === 'home'} onClick={() => {setActiveTab('home'); setIsMobileMenuOpen(false);}} label="Beranda" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          <NavItem active={activeTab === 'files'} onClick={() => {setActiveTab('files'); setIsMobileMenuOpen(false);}} label="File Master" icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" count={totalAccessibleFiles} />
          {isAdmin && <NavItem active={activeTab === 'admin'} onClick={() => {setActiveTab('admin'); setIsMobileMenuOpen(false);}} label="Kelola Data" icon="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />}
          <NavItem active={activeTab === 'profile'} onClick={() => {setActiveTab('profile'); setIsMobileMenuOpen(false);}} label="Profil Saya" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </div>
        <div className="p-6 border-t border-slate-100"><button onClick={() => signOut(auth)} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all">Keluar</button></div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-600 rounded-lg"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-none mb-1">{userData?.name || 'Member'}</p>
              <p className="text-[10px] font-black text-indigo-500 uppercase">{isAdmin ? 'ADMIN' : levelNames[currentLevel]}</p>
            </div>
            <div className="h-9 w-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-100">{userData?.name?.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
          
          {/* TOAST */}
          {toast.show && (
            <div className={`fixed bottom-6 right-6 z-[60] px-6 py-3 rounded-2xl shadow-2xl font-bold text-white transition-all transform scale-100 ${toast.type === 'error' ? 'bg-rose-500' : 'bg-indigo-600'}`}>
              {toast.message}
            </div>
          )}

          {/* TAB: BERANDA */}
          {activeTab === 'home' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -mr-20 -mt-20"></div>
                <div className="relative z-10 text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl font-black mb-3 font-['Outfit']">Halo, {userData?.name || 'Kawan'}! 👋</h2>
                  <p className="text-slate-400 text-lg">Akses master file Anda di menu File Master. Status: <span className="text-indigo-400 font-black">{levelNames[currentLevel]}</span></p>
                </div>
                <button onClick={() => setActiveTab('files')} className="relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl transition-all hover:-translate-y-1">FILE MASTER</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Member Sejak" val={new Date(userData?.joinDate).toLocaleDateString('id-ID')} icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" color="emerald" />
                <StatCard label="Akses Terbuka" val={`${totalAccessibleFiles} File`} icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" color="indigo" />
                <StatCard label="Total Katalog" val={`${files.length} File`} icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" color="amber" />
              </div>
            </div>
          )}

          {/* TAB: FILE MASTER */}
          {activeTab === 'files' && (
            <div className="animate-fadeIn">
              <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] mb-8">Katalog Produk Master</h2>
              {files.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 font-bold">Belum ada file yang ditambahkan oleh Admin.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {files.map(file => <FileCard key={file.id} file={file} currentLevel={currentLevel} />)}
                </div>
              )}
            </div>
          )}

          {/* TAB: ADMIN (KELOLA DATA) */}
          {activeTab === 'admin' && isAdmin && (
            <div className="animate-fadeIn space-y-10">
              {/* Seksi 1: Kelola Produk */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-slate-800 font-['Outfit']">1. Manajemen File Produk</h3>
                  <button onClick={()=>setShowFileForm(!showFileForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100">
                    {showFileForm ? 'Batal' : '+ Tambah File'}
                  </button>
                </div>

                {showFileForm && (
                  <form onSubmit={handleAddFile} className="bg-white p-6 rounded-3xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
                    <input type="text" placeholder="Nama File" value={fileInput.name} onChange={e=>setFileInput({...fileInput, name: e.target.value})} className="px-4 py-2 rounded-lg border bg-slate-50 outline-none focus:bg-white text-sm" required />
                    <input type="text" placeholder="Ukuran (ex: 5MB)" value={fileInput.size} onChange={e=>setFileInput({...fileInput, size: e.target.value})} className="px-4 py-2 rounded-lg border bg-slate-50 outline-none focus:bg-white text-sm" required />
                    <select value={fileInput.reqLevel} onChange={e=>setFileInput({...fileInput, reqLevel: e.target.value})} className="px-4 py-2 rounded-lg border bg-slate-50 text-sm">
                      {[1,2,3].map(lv => <option key={lv} value={lv}>Level: {levelNames[lv]}</option>)}
                    </select>
                    <input type="text" placeholder="URL Download" value={fileInput.url} onChange={e=>setFileInput({...fileInput, url: e.target.value})} className="px-4 py-2 rounded-lg border bg-slate-50 outline-none focus:bg-white text-sm" required />
                    <button type="submit" className="bg-indigo-600 text-white font-bold py-2 rounded-lg lg:col-span-4 transition-all hover:bg-indigo-700">SIMPAN PRODUK KE DATABASE</button>
                  </form>
                )}

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                      <tr><th className="px-6 py-4">Nama File</th><th className="px-6 py-4">Syarat Level</th><th className="px-6 py-4">URL</th><th className="px-6 py-4 text-center">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {files.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-bold">{f.name}</td>
                          <td className="px-6 py-4"><span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-black">{levelNames[f.reqLevel]}</span></td>
                          <td className="px-6 py-4 truncate max-w-[150px] text-xs text-slate-400">{f.url}</td>
                          <td className="px-6 py-4 text-center"><button onClick={()=>handleDeleteFile(f.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg">Hapus</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seksi 2: Kelola Member */}
              <div>
                <h3 className="text-2xl font-black text-slate-800 font-['Outfit'] mb-6">2. Manajemen Member</h3>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                      <tr><th className="px-6 py-4">Member</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-center">Ubah Akses</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allUsers.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{m.name || 'No Name'}</div>
                            <div className="text-[11px] text-slate-400">{m.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${m.subscriptionLevel === 0 ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                              {levelNames[m.subscriptionLevel]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-1.5">
                              {[1, 2, 3].map(lv => (
                                <button key={lv} onClick={() => handleAdminUpdateLevel(m.id, lv)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all ${m.subscriptionLevel === lv ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400'}`}>
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
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-2xl">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] mb-6">Informasi Akun</h2>
               <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                    <div className="h-20 w-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-100">{userData?.name?.charAt(0) || 'M'}</div>
                    <div><h3 className="text-2xl font-black text-slate-800">{userData?.name}</h3><p className="text-slate-400 font-medium">{userData?.email}</p></div>
                  </div>
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label><input type="text" value={profileName} onChange={(e)=>setProfileName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-700" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label><input type="text" value={profilePhone} onChange={(e)=>setProfilePhone(e.target.value)} placeholder="0812xxxx" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-700" /></div>
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1 disabled:opacity-50">
                      {isSaving ? 'PROSES MENYIMPAN...' : 'UPDATE PROFIL'}
                    </button>
                  </form>
               </div>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease forwards; }
        @keyframes slideInLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slideInLeft { animation: slideInLeft 0.3s ease-out; }
      `}} />
    </div>
  );
}

// ==========================================
// 5. KOMPONEN PENDUKUNG (REUSABLE UI)
// ==========================================
function NavItem({ active, onClick, label, icon, count }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-5 py-4 rounded-2xl font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-0.5' : 'text-slate-500 hover:bg-slate-50'}`}>
      <div className="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
        <span className="text-sm tracking-tight">{label}</span>
      </div>
      {count > 0 && !active && <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">{count}</span>}
    </button>
  );
}

function StatCard({ label, val, icon, color }) {
  const colors = { emerald: 'bg-emerald-100 text-emerald-600', indigo: 'bg-indigo-100 text-indigo-600', amber: 'bg-amber-100 text-amber-600' };
  return (
    <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d={icon} /></svg>
      </div>
      <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p><p className="text-xl font-black text-slate-800 font-['Outfit']">{val}</p></div>
    </div>
  );
}

function FileCard({ file, currentLevel }) {
  const isAccessible = currentLevel >= file.reqLevel;
  return (
    <div className={`bg-white rounded-[2.5rem] border ${isAccessible ? 'border-slate-200 hover:border-indigo-300 hover:shadow-2xl' : 'border-slate-200 opacity-60 bg-slate-50'} p-8 transition-all duration-300 flex flex-col h-full group`}>
      <div className="flex justify-between items-start mb-8">
        <div className={`h-14 w-14 rounded-3xl flex items-center justify-center transition-all ${isAccessible ? 'bg-indigo-100 text-indigo-600 shadow-lg shadow-indigo-100 group-hover:scale-110' : 'bg-slate-200 text-slate-400'}`}>
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        </div>
        {!isAccessible && (
          <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter flex items-center gap-1 border border-rose-200">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> TERKUNCI
          </span>
        )}
      </div>
      <h4 className="text-xl font-black text-slate-800 mb-4 font-['Outfit'] leading-tight">{file.name}</h4>
      <div className="mt-auto space-y-3 mb-8">
         <div className="flex justify-between text-xs font-bold tracking-tight"><span className="text-slate-400 uppercase">Ukuran File</span><span className="text-slate-700">{file.size}</span></div>
         <div className="flex justify-between text-xs font-bold tracking-tight"><span className="text-slate-400 uppercase">Minimal Paket</span><span className={isAccessible ? 'text-emerald-600' : 'text-rose-500'}>{levelNames[file.reqLevel]}</span></div>
      </div>
      {isAccessible ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 text-white text-center font-black py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 hover:-translate-y-1">UNDUH SEKARANG</a>
      ) : (
        <button disabled className="w-full bg-slate-100 text-slate-400 font-black py-4 rounded-2xl cursor-not-allowed">BELI AKSES {levelNames[file.reqLevel]}</button>
      )}
    </div>
  );
}