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
import { 
  LayoutDashboard, 
  FolderLock, 
  Users, 
  UserCircle, 
  LogOut, 
  Plus, 
  Search, 
  Download, 
  ShieldCheck, 
  TrendingUp, 
  Settings,
  Menu,
  X,
  Bell,
  Trash2,
  Edit3,
  ChevronRight,
  FileText,
  Video,
  Box,
  Lock
} from 'lucide-react';

// ==========================================
// 1. KONFIGURASI SISTEM
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "", 
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const isDemoMode = !firebaseConfig || !firebaseConfig.apiKey;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'member-pro-system-v1';
const ADMIN_EMAIL = "admin@website.com"; // Email ini akan mendapatkan akses Admin otomatis

const TIER_LEVELS = {
  0: { name: 'Free', color: 'text-slate-500', bg: 'bg-slate-100', price: 0 },
  1: { name: 'Personal', color: 'text-emerald-600', bg: 'bg-emerald-50', price: 99000 },
  2: { name: 'Business', color: 'text-indigo-600', bg: 'bg-indigo-50', price: 199000 },
  3: { name: 'Agency', color: 'text-amber-600', bg: 'bg-amber-50', price: 499000 }
};

// Inisialisasi Firebase
let firebaseApp, auth, db;
if (!isDemoMode) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  } catch (e) { console.error("Firebase Init Failed", e); }
}

export default function App() {
  // --- State Utama ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  
  // --- App Flow States ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');

  // --- Form States ---
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [productForm, setProductForm] = useState({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
  const [editingProductId, setEditingProductId] = useState(null);

  // --- Perhitungan Data ---
  const currentTier = userData?.subscriptionLevel || 0;
  const stats = useMemo(() => ({
    unlocked: files.filter(f => currentTier >= f.reqLevel).length,
    total: files.length,
    members: allUsers.length
  }), [files, currentTier, allUsers]);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  // ==========================================
  // 2. FIREBASE SYNC
  // ==========================================
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email === ADMIN_EMAIL);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || isDemoMode) return;

    // Profil User
    const profileUnsub = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (d) => {
      if (d.exists()) setUserData(d.data());
    });

    // Produk (Semua Member)
    const filesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'files'), (s) => {
      setFiles(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // List Member (Hanya Admin)
    let adminUnsub = () => {};
    if (isAdmin) {
      adminUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry'), (s) => {
        setAllUsers(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => { profileUnsub(); filesUnsub(); adminUnsub(); };
  }, [user, isAdmin]);

  // ==========================================
  // 3. LOGIKA AKSI
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setUser({ email: formData.email, uid: 'demo-uid' });
      setUserData({ name: formData.name || 'Demo User', subscriptionLevel: 1, joinDate: new Date().toISOString() });
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const initData = { name: formData.name, email: formData.email, subscriptionLevel: 0, joinDate: new Date().toISOString(), uid: cred.user.uid };
        await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profile', 'data'), initData);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', cred.user.uid), initData);
        showToast('Pendaftaran sukses!');
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        showToast('Selamat datang kembali!');
      }
    } catch (err) { showToast('Email atau password salah', 'error'); }
    setAuthLoading(false);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const data = { ...productForm, reqLevel: parseInt(productForm.reqLevel), updatedAt: serverTimestamp() };
      if (editingProductId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', editingProductId), data);
        showToast('Produk diperbarui');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'files'), { ...data, createdAt: serverTimestamp() });
        showToast('Produk ditambahkan');
      }
      setProductForm({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
      setEditingProductId(null);
    } catch (err) { showToast('Gagal menyimpan data', 'error'); }
  };

  const updateMemberTier = async (uid, level) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid), { subscriptionLevel: level });
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { subscriptionLevel: level });
      showToast('Status member diperbarui');
    } catch (err) { showToast('Akses ditolak', 'error'); }
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  // --- VIEW: LOGIN / REGISTER ---
  if (!user) return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] text-slate-800">
      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
        <div className="md:w-1/2 bg-indigo-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black font-['Outfit'] mb-4 tracking-tighter">MemberArea<span className="text-amber-400">.</span></h1>
            <p className="text-indigo-100 text-lg">Solusi terbaik untuk mendistribusikan aset digital Anda secara profesional.</p>
          </div>
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10"><ShieldCheck size={20} className="text-amber-400"/> <span className="text-xs font-bold uppercase tracking-widest">Sistem Lisensi Aman</span></div>
             <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10"><TrendingUp size={20} className="text-amber-400"/> <span className="text-xs font-bold uppercase tracking-widest">Update Produk Berkala</span></div>
          </div>
        </div>
        <div className="md:w-1/2 p-10 md:p-14">
          <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl mb-8">
            <button onClick={()=>setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-[2px] transition-all ${authMode==='login'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>LOGIN</button>
            <button onClick={()=>setAuthMode('register')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-[2px] transition-all ${authMode==='register'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>REGISTER</button>
          </div>
          <h2 className="text-2xl font-black mb-1 font-['Outfit']">{authMode==='login'?'Masuk Dashboard':'Daftar Member'}</h2>
          <p className="text-slate-400 text-sm mb-8">Kelola akun dan produk digital Anda.</p>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode==='register' && (
              <input type="text" placeholder="Nama Lengkap" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required />
            )}
            <input type="email" placeholder="Alamat Email" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} required />
            <input type="password" placeholder="Password" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} required />
            <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex justify-center items-center gap-2">
              {authLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'MASUK KE SISTEM'}
            </button>
          </form>
          {isDemoMode && <p className="mt-8 text-center text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 py-2 rounded-lg border border-amber-100 animate-pulse">Running in Preview Mode</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans'] flex text-slate-800">
      
      {/* SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-all ${isSidebarOpen ? 'w-72' : 'w-20 -translate-x-full lg:translate-x-0'}`}>
        <div className="h-20 flex items-center px-8 border-b border-slate-50">
          {isSidebarOpen && <h1 className="text-xl font-black tracking-tighter text-indigo-600 font-['Outfit']">Member<span className="text-slate-900">Area</span></h1>}
          <button onClick={()=>setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 ml-auto"><Menu size={20}/></button>
        </div>
        <div className="p-6 flex-1 space-y-1">
          <NavItem active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="Beranda" expanded={isSidebarOpen} />
          <NavItem active={activeTab==='files'} onClick={()=>setActiveTab('files')} icon={<FolderLock size={20}/>} label="File Master" count={stats.unlocked} expanded={isSidebarOpen} />
          {isAdmin && <NavItem active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<Settings size={20}/>} label="Admin Panel" expanded={isSidebarOpen} />}
          <NavItem active={activeTab==='profile'} onClick={()=>setActiveTab('profile')} icon={<UserCircle size={20}/>} label="Profil Saya" expanded={isSidebarOpen} />
        </div>
        <div className="p-6 border-t border-slate-100"><button onClick={handleLogout} className="flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 w-full transition-all group"><LogOut size={20}/><span className={!isSidebarOpen ? 'hidden' : 'block'}>Keluar</span></button></div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 md:px-12 sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest hidden sm:flex items-center gap-2"><ShieldCheck size={14}/> Sistem Aktif</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none mb-1">{userData?.name || 'Member'}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'text-indigo-600' : TIER_LEVELS[currentTier].color}`}>{isAdmin ? 'SUPER ADMIN' : TIER_LEVELS[currentTier].name}</p>
            </div>
            <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-indigo-200">{userData?.name?.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full animate-fadeIn">
          {toast.show && <div className={`fixed bottom-8 right-8 z-[60] px-6 py-4 rounded-2xl shadow-2xl font-black text-white ${toast.type==='error'?'bg-rose-500':'bg-indigo-600'} animate-slideInRight`}>{toast.msg}</div>}

          {/* TAB: DASHBOARD (MEMBER & ADMIN STATS) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden shadow-3xl border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="space-y-5 text-center md:text-left">
                    <h2 className="text-4xl md:text-5xl font-black font-['Outfit'] tracking-tight">Halo, {userData?.name?.split(' ')[0]}! 👋</h2>
                    <p className="text-slate-400 text-lg max-w-md">Senang melihat Anda kembali. Akses file master produk digital Anda sekarang di menu File Master.</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                       <button onClick={()=>setActiveTab('files')} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl hover:-translate-y-1 transition-all">FILES PRODUK <ChevronRight size={18}/></button>
                       <button className="bg-white/10 backdrop-blur-md text-white border border-white/10 px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all">PANDUAN PDF</button>
                    </div>
                  </div>
                  <div className="w-56 h-56 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center gap-4 shadow-2xl backdrop-blur-xl animate-float">
                    <TrendingUp size={48} className="text-amber-400" />
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivitas Akun</p>
                      <p className="text-3xl font-black text-white">+98%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <StatCard label="Pendaftaran" val={userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('id-ID') : '-'} icon={<ShieldCheck size={28}/>} color="emerald" />
                <StatCard label="Akses Terbuka" val={`${stats.unlocked} / ${stats.total} File`} icon={<Box size={28}/>} color="indigo" />
                <StatCard label="Paket Aktif" val={TIER_LEVELS[currentTier].name} icon={<Users size={28}/>} color="amber" />
              </div>
            </div>
          )}

          {/* TAB: FILE MASTER */}
          {activeTab === 'files' && (
            <div className="animate-fadeIn space-y-10">
              <h2 className="text-3xl font-black font-['Outfit'] tracking-tight">Koleksi Produk Anda</h2>
              {files.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                   <Box size={48} className="text-slate-200 mx-auto mb-4"/>
                   <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Database file masih kosong</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {files.map(file => <ProFileCard key={file.id} file={file} currentTier={currentTier} />)}
                </div>
              )}
            </div>
          )}

          {/* TAB: ADMIN PANEL (MANAGE PRODUCTS & MEMBERS) */}
          {activeTab === 'admin' && isAdmin && (
            <div className="animate-fadeIn space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-black font-['Outfit'] tracking-tight">Panel Kontrol Administrator</h2>
                    <p className="text-slate-400 font-medium">Kelola inventaris file dan status langganan member.</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex gap-1">
                     <button onClick={()=>setSearchQuery('')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">Daftar Member</button>
                     <button onClick={()=>setActiveTab('admin')} className="px-6 py-3 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Atur Katalog</button>
                  </div>
               </div>

               {/* Add/Edit Product Form */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-1">
                   <form onSubmit={handleProductSubmit} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-6 sticky top-32">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                          {editingProductId ? <Edit3 size={24}/> : <Plus size={28}/>}
                        </div>
                        <h3 className="text-xl font-black font-['Outfit']">{editingProductId ? 'Update Produk' : 'Tambah Produk'}</h3>
                      </div>
                      <div className="space-y-4">
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Produk</label><input type="text" placeholder="..." value={productForm.name} onChange={e=>setProductForm({...productForm, name:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label><select value={productForm.category} onChange={e=>setProductForm({...productForm, category:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none"><option>Ebook</option><option>Video</option><option>Software</option></select></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ukuran</label><input type="text" placeholder="10MB" value={productForm.size} onChange={e=>setProductForm({...productForm, size:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                         </div>
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minimal Tier</label><select value={productForm.reqLevel} onChange={e=>setProductForm({...productForm, reqLevel:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none">{[1,2,3].map(lv => <option key={lv} value={lv}>{TIER_LEVELS[lv].name}</option>)}</select></div>
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Download</label><input type="text" placeholder="https://..." value={productForm.url} onChange={e=>setProductForm({...productForm, url:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">{editingProductId ? 'Update' : 'Publish'}</button>
                        {editingProductId && <button type="button" onClick={()=>{setEditingProductId(null); setProductForm({name:'', size:'', reqLevel:1, url:'', category:'Ebook'})}} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200"><X/></button>}
                      </div>
                   </form>
                 </div>

                 {/* User Registry & Active Products List */}
                 <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                       <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">Registry Member Aktif</h4> <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-black">{allUsers.length} TOTAL</span></div>
                       <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                         <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                               {allUsers.map(m => (
                                 <tr key={m.id} className="hover:bg-slate-50/80 transition-all">
                                   <td className="px-8 py-5"><p className="font-black text-slate-800 text-sm">{m.name || 'Member'}</p><p className="text-[10px] text-slate-400 font-bold">{m.email}</p></td>
                                   <td className="px-8 py-5">
                                      <div className="flex gap-1">
                                        {[1,2,3].map(lv => (
                                          <button key={lv} onClick={()=>updateMemberTier(m.id, lv)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black border transition-all ${m.subscriptionLevel === lv ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-200 hover:text-indigo-600'}`}>{TIER_LEVELS[lv].name.toUpperCase()}</button>
                                        ))}
                                      </div>
                                   </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                       </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                       <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">Inventaris Katalog</h4> <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-black">{files.length} FILE</span></div>
                       <div className="divide-y divide-slate-50">
                          {files.map(f => (
                            <div key={f.id} className="p-6 flex items-center justify-between hover:bg-slate-50 group">
                               <div className="flex items-center gap-6">
                                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                     {f.category === 'Ebook' ? <FileText size={20}/> : <Box size={20}/>}
                                  </div>
                                  <div>
                                    <h5 className="font-black text-slate-800 text-sm leading-tight">{f.name}</h5>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{f.size} • {TIER_LEVELS[f.reqLevel].name}</p>
                                  </div>
                               </div>
                               <div className="flex gap-2">
                                  <button onClick={()=>{setEditingProductId(f.id); setProductForm({name:f.name, size:f.size, reqLevel:f.reqLevel, url:f.url, category:f.category}); window.scrollTo({top:0, behavior:'smooth'})}} className="p-2.5 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all"><Edit3 size={18}/></button>
                                  <button onClick={async ()=>{if(window.confirm('Hapus file?')) await deleteDoc(doc(db,'artifacts',appId,'public','data','files',f.id)); showToast('File dihapus');}} className="p-2.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"><Trash2 size={18}/></button>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-2xl">
               <h2 className="text-3xl font-black font-['Outfit'] mb-8">Pengaturan Akun</h2>
               <div className="bg-white rounded-[3rem] border border-slate-200 p-10 md:p-14 shadow-2xl space-y-10">
                  <div className="flex flex-col sm:flex-row items-center gap-10 border-b border-slate-100 pb-10">
                    <div className="h-24 w-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-indigo-200">{userData?.name?.charAt(0).toUpperCase()}</div>
                    <div className="text-center sm:text-left">
                       <h3 className="text-3xl font-black text-slate-900 leading-none mb-2">{userData?.name || 'Member'}</h3>
                       <p className="text-slate-400 font-bold text-lg">{userData?.email}</p>
                       <div className="mt-4 flex gap-2"><span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">Status: {TIER_LEVELS[currentTier].name}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label><div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black text-slate-700 text-sm">{userData?.phone || 'Belum diatur'}</div></div>
                     <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terdaftar</label><div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black text-slate-700 text-sm">{new Date(userData?.joinDate).toLocaleDateString('id-ID')}</div></div>
                  </div>
                  <button onClick={()=>alert('Gunakan dashboard admin untuk mengubah profil')} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"><Edit3 size={20}/> UPDATE PROFIL</button>
               </div>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />
    </div>
  );
}

// ==========================================
// 4. MODULAR UI COMPONENTS
// ==========================================
function NavItem({ active, onClick, icon, label, count, expanded }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-6 py-4 rounded-2xl font-black transition-all group ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.03]' : 'text-slate-500 hover:bg-slate-50'}`}>
      <div className="flex items-center gap-4">
        <div className={`transition-all ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-indigo-600'}`}>{icon}</div>
        {expanded && <span className="text-sm tracking-tight">{label}</span>}
      </div>
      {count > 0 && !active && expanded && <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2.5 py-1 rounded-full">{count}</span>}
    </button>
  );
}

function StatCard({ label, val, icon, color }) {
  const colors = { emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100', amber: 'bg-amber-50 text-amber-600 border-amber-100' };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-8 group hover:shadow-2xl transition-all duration-500">
      <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center transition-all group-hover:rotate-6 ${colors[color]} border-2`}>{icon}</div>
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[3px] mb-2">{label}</p>
        <p className="text-2xl font-black text-slate-800 font-['Outfit'] tracking-tighter">{val}</p>
      </div>
    </div>
  );
}

function ProFileCard({ file, currentTier }) {
  const isAccessible = currentTier >= (file.reqLevel || 0);
  return (
    <div className={`bg-white rounded-[3rem] border ${isAccessible ? 'border-slate-200 hover:border-indigo-400 hover:shadow-3xl' : 'border-slate-200 opacity-60 bg-slate-50'} p-10 transition-all duration-500 flex flex-col h-full group relative overflow-hidden`}>
      {isAccessible && <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-sky-400"></div>}
      <div className="flex justify-between items-start mb-10">
        <div className={`h-16 w-16 rounded-[1.75rem] flex items-center justify-center transition-all duration-500 shadow-xl ${isAccessible ? 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
          {file.category === 'Ebook' ? <FileText size={28}/> : file.category === 'Video' ? <Video size={28}/> : <Box size={28}/>}
        </div>
        {!isAccessible && (
          <div className="bg-rose-100 text-rose-600 text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-tighter flex items-center gap-2 border border-rose-200">
            <Lock size={14}/> TERKUNCI
          </div>
        )}
      </div>
      <div className="space-y-3 mb-10 flex-1">
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[2px]">{file.category}</p>
        <h4 className="text-2xl font-black text-slate-900 font-['Outfit'] leading-[1.1] tracking-tight group-hover:text-indigo-600 transition-colors">{file.name}</h4>
      </div>
      <div className="space-y-4 mb-10">
         <div className="flex justify-between text-[11px] font-black tracking-tight"><span className="text-slate-400 uppercase">Ukuran File</span><span className="text-slate-800">{file.size}</span></div>
         <div className="flex justify-between text-[11px] font-black tracking-tight"><span className="text-slate-400 uppercase">Akses Tier</span><span className={isAccessible ? 'text-emerald-500' : 'text-rose-500'}>{TIER_LEVELS[file.reqLevel].name.toUpperCase()}</span></div>
      </div>
      {isAccessible ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 text-white text-center font-black py-5 rounded-[1.75rem] shadow-2xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:-translate-y-2 flex items-center justify-center gap-3">
          <Download size={20}/> UNDUH SEKARANG
        </a>
      ) : (
        <button disabled className="w-full bg-slate-100 text-slate-400 font-black py-5 rounded-[1.75rem] cursor-not-allowed uppercase text-[10px] tracking-widest">MINIMAL {TIER_LEVELS[file.reqLevel].name}</button>
      )}
    </div>
  );
}import React, { useState, useEffect, useMemo } from 'react';
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
import { 
  LayoutDashboard, 
  FolderLock, 
  Users, 
  UserCircle, 
  LogOut, 
  Plus, 
  Search, 
  Download, 
  ShieldCheck, 
  TrendingUp, 
  Settings,
  Menu,
  X,
  Bell,
  Trash2,
  Edit3,
  ChevronRight,
  FileText,
  Video,
  Box,
  Lock
} from 'lucide-react';

// ==========================================
// 1. KONFIGURASI SISTEM
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "", 
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const isDemoMode = !firebaseConfig || !firebaseConfig.apiKey;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'member-pro-system-v1';
const ADMIN_EMAIL = "admin@website.com"; // Email ini akan mendapatkan akses Admin otomatis

const TIER_LEVELS = {
  0: { name: 'Free', color: 'text-slate-500', bg: 'bg-slate-100', price: 0 },
  1: { name: 'Personal', color: 'text-emerald-600', bg: 'bg-emerald-50', price: 99000 },
  2: { name: 'Business', color: 'text-indigo-600', bg: 'bg-indigo-50', price: 199000 },
  3: { name: 'Agency', color: 'text-amber-600', bg: 'bg-amber-50', price: 499000 }
};

// Inisialisasi Firebase
let firebaseApp, auth, db;
if (!isDemoMode) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  } catch (e) { console.error("Firebase Init Failed", e); }
}

export default function App() {
  // --- State Utama ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  
  // --- App Flow States ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');

  // --- Form States ---
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [productForm, setProductForm] = useState({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
  const [editingProductId, setEditingProductId] = useState(null);

  // --- Perhitungan Data ---
  const currentTier = userData?.subscriptionLevel || 0;
  const stats = useMemo(() => ({
    unlocked: files.filter(f => currentTier >= f.reqLevel).length,
    total: files.length,
    members: allUsers.length
  }), [files, currentTier, allUsers]);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  // ==========================================
  // 2. FIREBASE SYNC
  // ==========================================
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email === ADMIN_EMAIL);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || isDemoMode) return;

    // Profil User
    const profileUnsub = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (d) => {
      if (d.exists()) setUserData(d.data());
    });

    // Produk (Semua Member)
    const filesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'files'), (s) => {
      setFiles(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // List Member (Hanya Admin)
    let adminUnsub = () => {};
    if (isAdmin) {
      adminUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry'), (s) => {
        setAllUsers(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => { profileUnsub(); filesUnsub(); adminUnsub(); };
  }, [user, isAdmin]);

  // ==========================================
  // 3. LOGIKA AKSI
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setUser({ email: formData.email, uid: 'demo-uid' });
      setUserData({ name: formData.name || 'Demo User', subscriptionLevel: 1, joinDate: new Date().toISOString() });
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const initData = { name: formData.name, email: formData.email, subscriptionLevel: 0, joinDate: new Date().toISOString(), uid: cred.user.uid };
        await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profile', 'data'), initData);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', cred.user.uid), initData);
        showToast('Pendaftaran sukses!');
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        showToast('Selamat datang kembali!');
      }
    } catch (err) { showToast('Email atau password salah', 'error'); }
    setAuthLoading(false);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const data = { ...productForm, reqLevel: parseInt(productForm.reqLevel), updatedAt: serverTimestamp() };
      if (editingProductId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', editingProductId), data);
        showToast('Produk diperbarui');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'files'), { ...data, createdAt: serverTimestamp() });
        showToast('Produk ditambahkan');
      }
      setProductForm({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
      setEditingProductId(null);
    } catch (err) { showToast('Gagal menyimpan data', 'error'); }
  };

  const updateMemberTier = async (uid, level) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid), { subscriptionLevel: level });
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { subscriptionLevel: level });
      showToast('Status member diperbarui');
    } catch (err) { showToast('Akses ditolak', 'error'); }
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  // --- VIEW: LOGIN / REGISTER ---
  if (!user) return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] text-slate-800">
      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
        <div className="md:w-1/2 bg-indigo-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black font-['Outfit'] mb-4 tracking-tighter">MemberArea<span className="text-amber-400">.</span></h1>
            <p className="text-indigo-100 text-lg">Solusi terbaik untuk mendistribusikan aset digital Anda secara profesional.</p>
          </div>
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10"><ShieldCheck size={20} className="text-amber-400"/> <span className="text-xs font-bold uppercase tracking-widest">Sistem Lisensi Aman</span></div>
             <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10"><TrendingUp size={20} className="text-amber-400"/> <span className="text-xs font-bold uppercase tracking-widest">Update Produk Berkala</span></div>
          </div>
        </div>
        <div className="md:w-1/2 p-10 md:p-14">
          <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl mb-8">
            <button onClick={()=>setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-[2px] transition-all ${authMode==='login'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>LOGIN</button>
            <button onClick={()=>setAuthMode('register')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-[2px] transition-all ${authMode==='register'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>REGISTER</button>
          </div>
          <h2 className="text-2xl font-black mb-1 font-['Outfit']">{authMode==='login'?'Masuk Dashboard':'Daftar Member'}</h2>
          <p className="text-slate-400 text-sm mb-8">Kelola akun dan produk digital Anda.</p>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode==='register' && (
              <input type="text" placeholder="Nama Lengkap" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required />
            )}
            <input type="email" placeholder="Alamat Email" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} required />
            <input type="password" placeholder="Password" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} required />
            <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex justify-center items-center gap-2">
              {authLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'MASUK KE SISTEM'}
            </button>
          </form>
          {isDemoMode && <p className="mt-8 text-center text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 py-2 rounded-lg border border-amber-100 animate-pulse">Running in Preview Mode</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans'] flex text-slate-800">
      
      {/* SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-all ${isSidebarOpen ? 'w-72' : 'w-20 -translate-x-full lg:translate-x-0'}`}>
        <div className="h-20 flex items-center px-8 border-b border-slate-50">
          {isSidebarOpen && <h1 className="text-xl font-black tracking-tighter text-indigo-600 font-['Outfit']">Member<span className="text-slate-900">Area</span></h1>}
          <button onClick={()=>setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 ml-auto"><Menu size={20}/></button>
        </div>
        <div className="p-6 flex-1 space-y-1">
          <NavItem active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="Beranda" expanded={isSidebarOpen} />
          <NavItem active={activeTab==='files'} onClick={()=>setActiveTab('files')} icon={<FolderLock size={20}/>} label="File Master" count={stats.unlocked} expanded={isSidebarOpen} />
          {isAdmin && <NavItem active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<Settings size={20}/>} label="Admin Panel" expanded={isSidebarOpen} />}
          <NavItem active={activeTab==='profile'} onClick={()=>setActiveTab('profile')} icon={<UserCircle size={20}/>} label="Profil Saya" expanded={isSidebarOpen} />
        </div>
        <div className="p-6 border-t border-slate-100"><button onClick={handleLogout} className="flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 w-full transition-all group"><LogOut size={20}/><span className={!isSidebarOpen ? 'hidden' : 'block'}>Keluar</span></button></div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 md:px-12 sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest hidden sm:flex items-center gap-2"><ShieldCheck size={14}/> Sistem Aktif</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none mb-1">{userData?.name || 'Member'}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'text-indigo-600' : TIER_LEVELS[currentTier].color}`}>{isAdmin ? 'SUPER ADMIN' : TIER_LEVELS[currentTier].name}</p>
            </div>
            <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-indigo-200">{userData?.name?.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full animate-fadeIn">
          {toast.show && <div className={`fixed bottom-8 right-8 z-[60] px-6 py-4 rounded-2xl shadow-2xl font-black text-white ${toast.type==='error'?'bg-rose-500':'bg-indigo-600'} animate-slideInRight`}>{toast.msg}</div>}

          {/* TAB: DASHBOARD (MEMBER & ADMIN STATS) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden shadow-3xl border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="space-y-5 text-center md:text-left">
                    <h2 className="text-4xl md:text-5xl font-black font-['Outfit'] tracking-tight">Halo, {userData?.name?.split(' ')[0]}! 👋</h2>
                    <p className="text-slate-400 text-lg max-w-md">Senang melihat Anda kembali. Akses file master produk digital Anda sekarang di menu File Master.</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                       <button onClick={()=>setActiveTab('files')} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl hover:-translate-y-1 transition-all">FILES PRODUK <ChevronRight size={18}/></button>
                       <button className="bg-white/10 backdrop-blur-md text-white border border-white/10 px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all">PANDUAN PDF</button>
                    </div>
                  </div>
                  <div className="w-56 h-56 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center gap-4 shadow-2xl backdrop-blur-xl animate-float">
                    <TrendingUp size={48} className="text-amber-400" />
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivitas Akun</p>
                      <p className="text-3xl font-black text-white">+98%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <StatCard label="Pendaftaran" val={userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('id-ID') : '-'} icon={<ShieldCheck size={28}/>} color="emerald" />
                <StatCard label="Akses Terbuka" val={`${stats.unlocked} / ${stats.total} File`} icon={<Box size={28}/>} color="indigo" />
                <StatCard label="Paket Aktif" val={TIER_LEVELS[currentTier].name} icon={<Users size={28}/>} color="amber" />
              </div>
            </div>
          )}

          {/* TAB: FILE MASTER */}
          {activeTab === 'files' && (
            <div className="animate-fadeIn space-y-10">
              <h2 className="text-3xl font-black font-['Outfit'] tracking-tight">Koleksi Produk Anda</h2>
              {files.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                   <Box size={48} className="text-slate-200 mx-auto mb-4"/>
                   <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Database file masih kosong</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {files.map(file => <ProFileCard key={file.id} file={file} currentTier={currentTier} />)}
                </div>
              )}
            </div>
          )}

          {/* TAB: ADMIN PANEL (MANAGE PRODUCTS & MEMBERS) */}
          {activeTab === 'admin' && isAdmin && (
            <div className="animate-fadeIn space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-black font-['Outfit'] tracking-tight">Panel Kontrol Administrator</h2>
                    <p className="text-slate-400 font-medium">Kelola inventaris file dan status langganan member.</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex gap-1">
                     <button onClick={()=>setSearchQuery('')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">Daftar Member</button>
                     <button onClick={()=>setActiveTab('admin')} className="px-6 py-3 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Atur Katalog</button>
                  </div>
               </div>

               {/* Add/Edit Product Form */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-1">
                   <form onSubmit={handleProductSubmit} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-6 sticky top-32">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                          {editingProductId ? <Edit3 size={24}/> : <Plus size={28}/>}
                        </div>
                        <h3 className="text-xl font-black font-['Outfit']">{editingProductId ? 'Update Produk' : 'Tambah Produk'}</h3>
                      </div>
                      <div className="space-y-4">
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Produk</label><input type="text" placeholder="..." value={productForm.name} onChange={e=>setProductForm({...productForm, name:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label><select value={productForm.category} onChange={e=>setProductForm({...productForm, category:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none"><option>Ebook</option><option>Video</option><option>Software</option></select></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ukuran</label><input type="text" placeholder="10MB" value={productForm.size} onChange={e=>setProductForm({...productForm, size:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                         </div>
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minimal Tier</label><select value={productForm.reqLevel} onChange={e=>setProductForm({...productForm, reqLevel:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none">{[1,2,3].map(lv => <option key={lv} value={lv}>{TIER_LEVELS[lv].name}</option>)}</select></div>
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Download</label><input type="text" placeholder="https://..." value={productForm.url} onChange={e=>setProductForm({...productForm, url:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">{editingProductId ? 'Update' : 'Publish'}</button>
                        {editingProductId && <button type="button" onClick={()=>{setEditingProductId(null); setProductForm({name:'', size:'', reqLevel:1, url:'', category:'Ebook'})}} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200"><X/></button>}
                      </div>
                   </form>
                 </div>

                 {/* User Registry & Active Products List */}
                 <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                       <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">Registry Member Aktif</h4> <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-black">{allUsers.length} TOTAL</span></div>
                       <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                         <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                               {allUsers.map(m => (
                                 <tr key={m.id} className="hover:bg-slate-50/80 transition-all">
                                   <td className="px-8 py-5"><p className="font-black text-slate-800 text-sm">{m.name || 'Member'}</p><p className="text-[10px] text-slate-400 font-bold">{m.email}</p></td>
                                   <td className="px-8 py-5">
                                      <div className="flex gap-1">
                                        {[1,2,3].map(lv => (
                                          <button key={lv} onClick={()=>updateMemberTier(m.id, lv)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black border transition-all ${m.subscriptionLevel === lv ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-200 hover:text-indigo-600'}`}>{TIER_LEVELS[lv].name.toUpperCase()}</button>
                                        ))}
                                      </div>
                                   </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                       </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                       <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">Inventaris Katalog</h4> <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-black">{files.length} FILE</span></div>
                       <div className="divide-y divide-slate-50">
                          {files.map(f => (
                            <div key={f.id} className="p-6 flex items-center justify-between hover:bg-slate-50 group">
                               <div className="flex items-center gap-6">
                                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                     {f.category === 'Ebook' ? <FileText size={20}/> : <Box size={20}/>}
                                  </div>
                                  <div>
                                    <h5 className="font-black text-slate-800 text-sm leading-tight">{f.name}</h5>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{f.size} • {TIER_LEVELS[f.reqLevel].name}</p>
                                  </div>
                               </div>
                               <div className="flex gap-2">
                                  <button onClick={()=>{setEditingProductId(f.id); setProductForm({name:f.name, size:f.size, reqLevel:f.reqLevel, url:f.url, category:f.category}); window.scrollTo({top:0, behavior:'smooth'})}} className="p-2.5 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all"><Edit3 size={18}/></button>
                                  <button onClick={async ()=>{if(window.confirm('Hapus file?')) await deleteDoc(doc(db,'artifacts',appId,'public','data','files',f.id)); showToast('File dihapus');}} className="p-2.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"><Trash2 size={18}/></button>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-2xl">
               <h2 className="text-3xl font-black font-['Outfit'] mb-8">Pengaturan Akun</h2>
               <div className="bg-white rounded-[3rem] border border-slate-200 p-10 md:p-14 shadow-2xl space-y-10">
                  <div className="flex flex-col sm:flex-row items-center gap-10 border-b border-slate-100 pb-10">
                    <div className="h-24 w-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-indigo-200">{userData?.name?.charAt(0).toUpperCase()}</div>
                    <div className="text-center sm:text-left">
                       <h3 className="text-3xl font-black text-slate-900 leading-none mb-2">{userData?.name || 'Member'}</h3>
                       <p className="text-slate-400 font-bold text-lg">{userData?.email}</p>
                       <div className="mt-4 flex gap-2"><span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">Status: {TIER_LEVELS[currentTier].name}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label><div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black text-slate-700 text-sm">{userData?.phone || 'Belum diatur'}</div></div>
                     <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terdaftar</label><div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black text-slate-700 text-sm">{new Date(userData?.joinDate).toLocaleDateString('id-ID')}</div></div>
                  </div>
                  <button onClick={()=>alert('Gunakan dashboard admin untuk mengubah profil')} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"><Edit3 size={20}/> UPDATE PROFIL</button>
               </div>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />
    </div>
  );
}

// ==========================================
// 4. MODULAR UI COMPONENTS
// ==========================================
function NavItem({ active, onClick, icon, label, count, expanded }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-6 py-4 rounded-2xl font-black transition-all group ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.03]' : 'text-slate-500 hover:bg-slate-50'}`}>
      <div className="flex items-center gap-4">
        <div className={`transition-all ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-indigo-600'}`}>{icon}</div>
        {expanded && <span className="text-sm tracking-tight">{label}</span>}
      </div>
      {count > 0 && !active && expanded && <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2.5 py-1 rounded-full">{count}</span>}
    </button>
  );
}

function StatCard({ label, val, icon, color }) {
  const colors = { emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100', amber: 'bg-amber-50 text-amber-600 border-amber-100' };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-8 group hover:shadow-2xl transition-all duration-500">
      <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center transition-all group-hover:rotate-6 ${colors[color]} border-2`}>{icon}</div>
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[3px] mb-2">{label}</p>
        <p className="text-2xl font-black text-slate-800 font-['Outfit'] tracking-tighter">{val}</p>
      </div>
    </div>
  );
}

function ProFileCard({ file, currentTier }) {
  const isAccessible = currentTier >= (file.reqLevel || 0);
  return (
    <div className={`bg-white rounded-[3rem] border ${isAccessible ? 'border-slate-200 hover:border-indigo-400 hover:shadow-3xl' : 'border-slate-200 opacity-60 bg-slate-50'} p-10 transition-all duration-500 flex flex-col h-full group relative overflow-hidden`}>
      {isAccessible && <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-sky-400"></div>}
      <div className="flex justify-between items-start mb-10">
        <div className={`h-16 w-16 rounded-[1.75rem] flex items-center justify-center transition-all duration-500 shadow-xl ${isAccessible ? 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
          {file.category === 'Ebook' ? <FileText size={28}/> : file.category === 'Video' ? <Video size={28}/> : <Box size={28}/>}
        </div>
        {!isAccessible && (
          <div className="bg-rose-100 text-rose-600 text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-tighter flex items-center gap-2 border border-rose-200">
            <Lock size={14}/> TERKUNCI
          </div>
        )}
      </div>
      <div className="space-y-3 mb-10 flex-1">
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[2px]">{file.category}</p>
        <h4 className="text-2xl font-black text-slate-900 font-['Outfit'] leading-[1.1] tracking-tight group-hover:text-indigo-600 transition-colors">{file.name}</h4>
      </div>
      <div className="space-y-4 mb-10">
         <div className="flex justify-between text-[11px] font-black tracking-tight"><span className="text-slate-400 uppercase">Ukuran File</span><span className="text-slate-800">{file.size}</span></div>
         <div className="flex justify-between text-[11px] font-black tracking-tight"><span className="text-slate-400 uppercase">Akses Tier</span><span className={isAccessible ? 'text-emerald-500' : 'text-rose-500'}>{TIER_LEVELS[file.reqLevel].name.toUpperCase()}</span></div>
      </div>
      {isAccessible ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 text-white text-center font-black py-5 rounded-[1.75rem] shadow-2xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:-translate-y-2 flex items-center justify-center gap-3">
          <Download size={20}/> UNDUH SEKARANG
        </a>
      ) : (
        <button disabled className="w-full bg-slate-100 text-slate-400 font-black py-5 rounded-[1.75rem] cursor-not-allowed uppercase text-[10px] tracking-widest">MINIMAL {TIER_LEVELS[file.reqLevel].name}</button>
      )}
    </div>
  );
}import React, { useState, useEffect, useMemo } from 'react';
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
import { 
  LayoutDashboard, 
  FolderLock, 
  Users, 
  UserCircle, 
  LogOut, 
  Plus, 
  Search, 
  Download, 
  ShieldCheck, 
  TrendingUp, 
  Settings,
  Menu,
  X,
  Bell,
  Trash2,
  Edit3,
  ChevronRight,
  FileText,
  Video,
  Box,
  Lock
} from 'lucide-react';

// ==========================================
// 1. KONFIGURASI SISTEM
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "", 
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const isDemoMode = !firebaseConfig || !firebaseConfig.apiKey;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'member-pro-system-v1';
const ADMIN_EMAIL = "admin@website.com"; // Email ini akan mendapatkan akses Admin otomatis

const TIER_LEVELS = {
  0: { name: 'Free', color: 'text-slate-500', bg: 'bg-slate-100', price: 0 },
  1: { name: 'Personal', color: 'text-emerald-600', bg: 'bg-emerald-50', price: 99000 },
  2: { name: 'Business', color: 'text-indigo-600', bg: 'bg-indigo-50', price: 199000 },
  3: { name: 'Agency', color: 'text-amber-600', bg: 'bg-amber-50', price: 499000 }
};

// Inisialisasi Firebase
let firebaseApp, auth, db;
if (!isDemoMode) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  } catch (e) { console.error("Firebase Init Failed", e); }
}

export default function App() {
  // --- State Utama ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  
  // --- App Flow States ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');

  // --- Form States ---
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [productForm, setProductForm] = useState({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
  const [editingProductId, setEditingProductId] = useState(null);

  // --- Perhitungan Data ---
  const currentTier = userData?.subscriptionLevel || 0;
  const stats = useMemo(() => ({
    unlocked: files.filter(f => currentTier >= f.reqLevel).length,
    total: files.length,
    members: allUsers.length
  }), [files, currentTier, allUsers]);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  // ==========================================
  // 2. FIREBASE SYNC
  // ==========================================
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email === ADMIN_EMAIL);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || isDemoMode) return;

    // Profil User
    const profileUnsub = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (d) => {
      if (d.exists()) setUserData(d.data());
    });

    // Produk (Semua Member)
    const filesUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'files'), (s) => {
      setFiles(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // List Member (Hanya Admin)
    let adminUnsub = () => {};
    if (isAdmin) {
      adminUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry'), (s) => {
        setAllUsers(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => { profileUnsub(); filesUnsub(); adminUnsub(); };
  }, [user, isAdmin]);

  // ==========================================
  // 3. LOGIKA AKSI
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setUser({ email: formData.email, uid: 'demo-uid' });
      setUserData({ name: formData.name || 'Demo User', subscriptionLevel: 1, joinDate: new Date().toISOString() });
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const initData = { name: formData.name, email: formData.email, subscriptionLevel: 0, joinDate: new Date().toISOString(), uid: cred.user.uid };
        await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profile', 'data'), initData);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', cred.user.uid), initData);
        showToast('Pendaftaran sukses!');
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        showToast('Selamat datang kembali!');
      }
    } catch (err) { showToast('Email atau password salah', 'error'); }
    setAuthLoading(false);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const data = { ...productForm, reqLevel: parseInt(productForm.reqLevel), updatedAt: serverTimestamp() };
      if (editingProductId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', editingProductId), data);
        showToast('Produk diperbarui');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'files'), { ...data, createdAt: serverTimestamp() });
        showToast('Produk ditambahkan');
      }
      setProductForm({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
      setEditingProductId(null);
    } catch (err) { showToast('Gagal menyimpan data', 'error'); }
  };

  const updateMemberTier = async (uid, level) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid), { subscriptionLevel: level });
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { subscriptionLevel: level });
      showToast('Status member diperbarui');
    } catch (err) { showToast('Akses ditolak', 'error'); }
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  // --- VIEW: LOGIN / REGISTER ---
  if (!user) return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] text-slate-800">
      <div className="max-w-4xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
        <div className="md:w-1/2 bg-indigo-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black font-['Outfit'] mb-4 tracking-tighter">MemberArea<span className="text-amber-400">.</span></h1>
            <p className="text-indigo-100 text-lg">Solusi terbaik untuk mendistribusikan aset digital Anda secara profesional.</p>
          </div>
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10"><ShieldCheck size={20} className="text-amber-400"/> <span className="text-xs font-bold uppercase tracking-widest">Sistem Lisensi Aman</span></div>
             <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10"><TrendingUp size={20} className="text-amber-400"/> <span className="text-xs font-bold uppercase tracking-widest">Update Produk Berkala</span></div>
          </div>
        </div>
        <div className="md:w-1/2 p-10 md:p-14">
          <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl mb-8">
            <button onClick={()=>setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-[2px] transition-all ${authMode==='login'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>LOGIN</button>
            <button onClick={()=>setAuthMode('register')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-[2px] transition-all ${authMode==='register'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>REGISTER</button>
          </div>
          <h2 className="text-2xl font-black mb-1 font-['Outfit']">{authMode==='login'?'Masuk Dashboard':'Daftar Member'}</h2>
          <p className="text-slate-400 text-sm mb-8">Kelola akun dan produk digital Anda.</p>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode==='register' && (
              <input type="text" placeholder="Nama Lengkap" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required />
            )}
            <input type="email" placeholder="Alamat Email" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} required />
            <input type="password" placeholder="Password" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} required />
            <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex justify-center items-center gap-2">
              {authLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'MASUK KE SISTEM'}
            </button>
          </form>
          {isDemoMode && <p className="mt-8 text-center text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 py-2 rounded-lg border border-amber-100 animate-pulse">Running in Preview Mode</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans'] flex text-slate-800">
      
      {/* SIDEBAR */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-all ${isSidebarOpen ? 'w-72' : 'w-20 -translate-x-full lg:translate-x-0'}`}>
        <div className="h-20 flex items-center px-8 border-b border-slate-50">
          {isSidebarOpen && <h1 className="text-xl font-black tracking-tighter text-indigo-600 font-['Outfit']">Member<span className="text-slate-900">Area</span></h1>}
          <button onClick={()=>setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 ml-auto"><Menu size={20}/></button>
        </div>
        <div className="p-6 flex-1 space-y-1">
          <NavItem active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="Beranda" expanded={isSidebarOpen} />
          <NavItem active={activeTab==='files'} onClick={()=>setActiveTab('files')} icon={<FolderLock size={20}/>} label="File Master" count={stats.unlocked} expanded={isSidebarOpen} />
          {isAdmin && <NavItem active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<Settings size={20}/>} label="Admin Panel" expanded={isSidebarOpen} />}
          <NavItem active={activeTab==='profile'} onClick={()=>setActiveTab('profile')} icon={<UserCircle size={20}/>} label="Profil Saya" expanded={isSidebarOpen} />
        </div>
        <div className="p-6 border-t border-slate-100"><button onClick={handleLogout} className="flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 w-full transition-all group"><LogOut size={20}/><span className={!isSidebarOpen ? 'hidden' : 'block'}>Keluar</span></button></div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 md:px-12 sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest hidden sm:flex items-center gap-2"><ShieldCheck size={14}/> Sistem Aktif</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none mb-1">{userData?.name || 'Member'}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'text-indigo-600' : TIER_LEVELS[currentTier].color}`}>{isAdmin ? 'SUPER ADMIN' : TIER_LEVELS[currentTier].name}</p>
            </div>
            <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-indigo-200">{userData?.name?.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full animate-fadeIn">
          {toast.show && <div className={`fixed bottom-8 right-8 z-[60] px-6 py-4 rounded-2xl shadow-2xl font-black text-white ${toast.type==='error'?'bg-rose-500':'bg-indigo-600'} animate-slideInRight`}>{toast.msg}</div>}

          {/* TAB: DASHBOARD (MEMBER & ADMIN STATS) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden shadow-3xl border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="space-y-5 text-center md:text-left">
                    <h2 className="text-4xl md:text-5xl font-black font-['Outfit'] tracking-tight">Halo, {userData?.name?.split(' ')[0]}! 👋</h2>
                    <p className="text-slate-400 text-lg max-w-md">Senang melihat Anda kembali. Akses file master produk digital Anda sekarang di menu File Master.</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                       <button onClick={()=>setActiveTab('files')} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl hover:-translate-y-1 transition-all">FILES PRODUK <ChevronRight size={18}/></button>
                       <button className="bg-white/10 backdrop-blur-md text-white border border-white/10 px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all">PANDUAN PDF</button>
                    </div>
                  </div>
                  <div className="w-56 h-56 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center gap-4 shadow-2xl backdrop-blur-xl animate-float">
                    <TrendingUp size={48} className="text-amber-400" />
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivitas Akun</p>
                      <p className="text-3xl font-black text-white">+98%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <StatCard label="Pendaftaran" val={userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('id-ID') : '-'} icon={<ShieldCheck size={28}/>} color="emerald" />
                <StatCard label="Akses Terbuka" val={`${stats.unlocked} / ${stats.total} File`} icon={<Box size={28}/>} color="indigo" />
                <StatCard label="Paket Aktif" val={TIER_LEVELS[currentTier].name} icon={<Users size={28}/>} color="amber" />
              </div>
            </div>
          )}

          {/* TAB: FILE MASTER */}
          {activeTab === 'files' && (
            <div className="animate-fadeIn space-y-10">
              <h2 className="text-3xl font-black font-['Outfit'] tracking-tight">Koleksi Produk Anda</h2>
              {files.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                   <Box size={48} className="text-slate-200 mx-auto mb-4"/>
                   <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Database file masih kosong</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {files.map(file => <ProFileCard key={file.id} file={file} currentTier={currentTier} />)}
                </div>
              )}
            </div>
          )}

          {/* TAB: ADMIN PANEL (MANAGE PRODUCTS & MEMBERS) */}
          {activeTab === 'admin' && isAdmin && (
            <div className="animate-fadeIn space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-black font-['Outfit'] tracking-tight">Panel Kontrol Administrator</h2>
                    <p className="text-slate-400 font-medium">Kelola inventaris file dan status langganan member.</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex gap-1">
                     <button onClick={()=>setSearchQuery('')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">Daftar Member</button>
                     <button onClick={()=>setActiveTab('admin')} className="px-6 py-3 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Atur Katalog</button>
                  </div>
               </div>

               {/* Add/Edit Product Form */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-1">
                   <form onSubmit={handleProductSubmit} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-6 sticky top-32">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                          {editingProductId ? <Edit3 size={24}/> : <Plus size={28}/>}
                        </div>
                        <h3 className="text-xl font-black font-['Outfit']">{editingProductId ? 'Update Produk' : 'Tambah Produk'}</h3>
                      </div>
                      <div className="space-y-4">
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Produk</label><input type="text" placeholder="..." value={productForm.name} onChange={e=>setProductForm({...productForm, name:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label><select value={productForm.category} onChange={e=>setProductForm({...productForm, category:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none"><option>Ebook</option><option>Video</option><option>Software</option></select></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ukuran</label><input type="text" placeholder="10MB" value={productForm.size} onChange={e=>setProductForm({...productForm, size:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                         </div>
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minimal Tier</label><select value={productForm.reqLevel} onChange={e=>setProductForm({...productForm, reqLevel:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none">{[1,2,3].map(lv => <option key={lv} value={lv}>{TIER_LEVELS[lv].name}</option>)}</select></div>
                         <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Download</label><input type="text" placeholder="https://..." value={productForm.url} onChange={e=>setProductForm({...productForm, url:e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" required /></div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">{editingProductId ? 'Update' : 'Publish'}</button>
                        {editingProductId && <button type="button" onClick={()=>{setEditingProductId(null); setProductForm({name:'', size:'', reqLevel:1, url:'', category:'Ebook'})}} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200"><X/></button>}
                      </div>
                   </form>
                 </div>

                 {/* User Registry & Active Products List */}
                 <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                       <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">Registry Member Aktif</h4> <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-black">{allUsers.length} TOTAL</span></div>
                       <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                         <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                               {allUsers.map(m => (
                                 <tr key={m.id} className="hover:bg-slate-50/80 transition-all">
                                   <td className="px-8 py-5"><p className="font-black text-slate-800 text-sm">{m.name || 'Member'}</p><p className="text-[10px] text-slate-400 font-bold">{m.email}</p></td>
                                   <td className="px-8 py-5">
                                      <div className="flex gap-1">
                                        {[1,2,3].map(lv => (
                                          <button key={lv} onClick={()=>updateMemberTier(m.id, lv)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black border transition-all ${m.subscriptionLevel === lv ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-200 hover:text-indigo-600'}`}>{TIER_LEVELS[lv].name.toUpperCase()}</button>
                                        ))}
                                      </div>
                                   </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                       </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                       <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between"><h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">Inventaris Katalog</h4> <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-black">{files.length} FILE</span></div>
                       <div className="divide-y divide-slate-50">
                          {files.map(f => (
                            <div key={f.id} className="p-6 flex items-center justify-between hover:bg-slate-50 group">
                               <div className="flex items-center gap-6">
                                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                     {f.category === 'Ebook' ? <FileText size={20}/> : <Box size={20}/>}
                                  </div>
                                  <div>
                                    <h5 className="font-black text-slate-800 text-sm leading-tight">{f.name}</h5>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{f.size} • {TIER_LEVELS[f.reqLevel].name}</p>
                                  </div>
                               </div>
                               <div className="flex gap-2">
                                  <button onClick={()=>{setEditingProductId(f.id); setProductForm({name:f.name, size:f.size, reqLevel:f.reqLevel, url:f.url, category:f.category}); window.scrollTo({top:0, behavior:'smooth'})}} className="p-2.5 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all"><Edit3 size={18}/></button>
                                  <button onClick={async ()=>{if(window.confirm('Hapus file?')) await deleteDoc(doc(db,'artifacts',appId,'public','data','files',f.id)); showToast('File dihapus');}} className="p-2.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"><Trash2 size={18}/></button>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-2xl">
               <h2 className="text-3xl font-black font-['Outfit'] mb-8">Pengaturan Akun</h2>
               <div className="bg-white rounded-[3rem] border border-slate-200 p-10 md:p-14 shadow-2xl space-y-10">
                  <div className="flex flex-col sm:flex-row items-center gap-10 border-b border-slate-100 pb-10">
                    <div className="h-24 w-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-indigo-200">{userData?.name?.charAt(0).toUpperCase()}</div>
                    <div className="text-center sm:text-left">
                       <h3 className="text-3xl font-black text-slate-900 leading-none mb-2">{userData?.name || 'Member'}</h3>
                       <p className="text-slate-400 font-bold text-lg">{userData?.email}</p>
                       <div className="mt-4 flex gap-2"><span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">Status: {TIER_LEVELS[currentTier].name}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label><div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black text-slate-700 text-sm">{userData?.phone || 'Belum diatur'}</div></div>
                     <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terdaftar</label><div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black text-slate-700 text-sm">{new Date(userData?.joinDate).toLocaleDateString('id-ID')}</div></div>
                  </div>
                  <button onClick={()=>alert('Gunakan dashboard admin untuk mengubah profil')} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"><Edit3 size={20}/> UPDATE PROFIL</button>
               </div>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />
    </div>
  );
}

// ==========================================
// 4. MODULAR UI COMPONENTS
// ==========================================
function NavItem({ active, onClick, icon, label, count, expanded }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-6 py-4 rounded-2xl font-black transition-all group ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.03]' : 'text-slate-500 hover:bg-slate-50'}`}>
      <div className="flex items-center gap-4">
        <div className={`transition-all ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-indigo-600'}`}>{icon}</div>
        {expanded && <span className="text-sm tracking-tight">{label}</span>}
      </div>
      {count > 0 && !active && expanded && <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2.5 py-1 rounded-full">{count}</span>}
    </button>
  );
}

function StatCard({ label, val, icon, color }) {
  const colors = { emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100', amber: 'bg-amber-50 text-amber-600 border-amber-100' };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-8 group hover:shadow-2xl transition-all duration-500">
      <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center transition-all group-hover:rotate-6 ${colors[color]} border-2`}>{icon}</div>
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[3px] mb-2">{label}</p>
        <p className="text-2xl font-black text-slate-800 font-['Outfit'] tracking-tighter">{val}</p>
      </div>
    </div>
  );
}

function ProFileCard({ file, currentTier }) {
  const isAccessible = currentTier >= (file.reqLevel || 0);
  return (
    <div className={`bg-white rounded-[3rem] border ${isAccessible ? 'border-slate-200 hover:border-indigo-400 hover:shadow-3xl' : 'border-slate-200 opacity-60 bg-slate-50'} p-10 transition-all duration-500 flex flex-col h-full group relative overflow-hidden`}>
      {isAccessible && <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-sky-400"></div>}
      <div className="flex justify-between items-start mb-10">
        <div className={`h-16 w-16 rounded-[1.75rem] flex items-center justify-center transition-all duration-500 shadow-xl ${isAccessible ? 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
          {file.category === 'Ebook' ? <FileText size={28}/> : file.category === 'Video' ? <Video size={28}/> : <Box size={28}/>}
        </div>
        {!isAccessible && (
          <div className="bg-rose-100 text-rose-600 text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-tighter flex items-center gap-2 border border-rose-200">
            <Lock size={14}/> TERKUNCI
          </div>
        )}
      </div>
      <div className="space-y-3 mb-10 flex-1">
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[2px]">{file.category}</p>
        <h4 className="text-2xl font-black text-slate-900 font-['Outfit'] leading-[1.1] tracking-tight group-hover:text-indigo-600 transition-colors">{file.name}</h4>
      </div>
      <div className="space-y-4 mb-10">
         <div className="flex justify-between text-[11px] font-black tracking-tight"><span className="text-slate-400 uppercase">Ukuran File</span><span className="text-slate-800">{file.size}</span></div>
         <div className="flex justify-between text-[11px] font-black tracking-tight"><span className="text-slate-400 uppercase">Akses Tier</span><span className={isAccessible ? 'text-emerald-500' : 'text-rose-500'}>{TIER_LEVELS[file.reqLevel].name.toUpperCase()}</span></div>
      </div>
      {isAccessible ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 text-white text-center font-black py-5 rounded-[1.75rem] shadow-2xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:-translate-y-2 flex items-center justify-center gap-3">
          <Download size={20}/> UNDUH SEKARANG
        </a>
      ) : (
        <button disabled className="w-full bg-slate-100 text-slate-400 font-black py-5 rounded-[1.75rem] cursor-not-allowed uppercase text-[10px] tracking-widest">MINIMAL {TIER_LEVELS[file.reqLevel].name}</button>
      )}
    </div>
  );
}