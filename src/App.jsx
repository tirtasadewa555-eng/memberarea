import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, signInWithCustomToken, signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot, collection, updateDoc, 
  deleteDoc, addDoc, serverTimestamp, increment, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  LayoutDashboard, ShoppingBag, Users, LogOut, Plus, Search, Download, 
  ShieldCheck, Settings, Menu, X, Trash2, Edit3, 
  FileText, Video, Box, Lock, MessageSquare, Banknote, Clock, 
  Megaphone, FolderLock, AlertCircle, Activity, XCircle, LifeBuoy, 
  MessageCircle, Network, Wallet, Copy, Save, Star, Tag, Trophy, 
  Award, Sparkles, Crown, Gift, DownloadCloud, Bot, Zap,
  Headphones, RefreshCw, BookOpen, GraduationCap, PlaySquare, 
  HelpCircle, CheckCircle2, Rocket, Wand2, Image as ImageIcon, 
  Cpu, Globe, LayoutTemplate, Timer, MonitorPlay, Upload, Paintbrush, Wrench, Camera, Layers, User, Loader2,
  Send, CheckCircle
} from 'lucide-react';

// ==========================================
// 1. KONFIGURASI SISTEM FIREBASE
// ==========================================
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) return JSON.parse(__firebase_config);
  return {
    apiKey: "AIzaSyC_go5YDW885EE1LUyeMBppyC-Zt18jYdQ",
    authDomain: "memberarea-websiteku.firebaseapp.com",
    projectId: "memberarea-websiteku",
    storageBucket: "memberarea-websiteku.firebasestorage.app",
    messagingSenderId: "9418923099",
    appId: "1:9418923099:web:f0275b81b802c08bb3737e",
    measurementId: "G-RQBKYLD4K5"
  };
};

const firebaseConfig = getFirebaseConfig();
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'prospace-superapp';
const appId = String(rawAppId).replace(/\//g, '-'); 

const ADMIN_EMAIL = "admin@website.com"; 
const WHATSAPP_ADMIN = "628123456789"; 

// PENYEMPURNAAN PAKET & KOMISI DINAMIS
const TIER_LEVELS = {
  0: { name: 'Free', color: 'text-slate-500', bg: 'bg-slate-100', price: 0, comm: 0.10, desc: 'Akses terbatas untuk member baru', features: ['Akses Modul Dasar', 'Kuis Harian AI', 'Komisi Afiliasi 10%'] },
  1: { name: 'Personal', color: 'text-emerald-600', bg: 'bg-emerald-50', price: 99000, comm: 0.20, desc: 'Cocok untuk individu yang baru memulai', features: ['Akses Studio Ajaib Foto', 'Akses Semua Modul LMS', 'Komisi Afiliasi 20%'] },
  2: { name: 'Business', color: 'text-indigo-600', bg: 'bg-indigo-50', price: 249000, comm: 0.30, desc: 'Untuk profesional dan bisnis berkembang', features: ['Semua Fitur Personal', 'Akses AI Copilot Marketing', 'Ruang Fokus VIP', 'Komisi Afiliasi 30%'] },
  3: { name: 'Agency', color: 'text-amber-600', bg: 'bg-amber-50', price: 499000, comm: 0.40, desc: 'Akses penuh tanpa batas untuk tim & agensi', features: ['Semua Fitur Business', 'Web Replikator Pribadi', 'Akses Katalog Semua File', 'Komisi Afiliasi 40%'] },
  4: { name: 'Ultimate VIP', color: 'text-rose-600', bg: 'bg-rose-50', price: 990000, comm: 0.50, desc: 'Spesial: Kasta Tertinggi Marketer Elit', features: ['Semua Fitur Agency', 'Komisi Afiliasi Maksimal 50%', 'Priority Support Helpdesk', 'Exclusive VIP Badge'] }
};

const GLOBAL_CSS = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
  @keyframes gradient-x { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
  .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
  .animate-slideUp { animation: slideUp 0.4s ease-out; }
  .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-gradient { background-size: 200% 200%; animation: gradient-x 5s ease infinite; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  @media print { body * { visibility: hidden; } #printable-certificate, #printable-certificate * { visibility: visible; } #printable-certificate { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 9999; background: white; } }
`;

// Helper Pengaman Error Render "Blank Screen"
const getFirstName = (nameStr) => {
  if (!nameStr) return 'Member';
  return nameStr.split(' ')[0] || 'Member';
};

const sanitizeHTML = (str) => {
    if (!str) return '';
    return str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '').replace(/<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/gmi, (m) => m.replace(/on\w+\s*=/gi, 'data-blocked=')).replace(/javascript:/gi, 'blocked:');
};
const escapeInput = (str) => str ? String(str).replace(/[<>]/g, "").trim() : ''; 
const safeJSONParse = (str) => {
    try { let cleanStr = str.replace(/```json/gi, '').replace(/```/g, '').trim(); const startIdx = cleanStr.indexOf('{'); const endIdx = cleanStr.lastIndexOf('}'); if (startIdx !== -1 && endIdx !== -1) cleanStr = cleanStr.substring(startIdx, endIdx + 1); return JSON.parse(cleanStr); } catch (e) { return null; }
};

let firebaseApp, auth, db;
const isConfigReady = firebaseConfig && firebaseConfig.apiKey !== "dummy";

if (isConfigReady) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  } catch (e) { console.error("Firebase Init Failed", e); }
}

export default function App() {
  // --- States Utama ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [publicSiteData, setPublicSiteData] = useState(null);
  const [showPublicSite, setShowPublicSite] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // --- Data States (Firebase Sync) ---
  const [files, setFiles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]); 
  const [withdrawals, setWithdrawals] = useState([]); 
  const [coupons, setCoupons] = useState([]); 
  const [chatMessages, setChatMessages] = useState([]); 
  const [latestActivity, setLatestActivity] = useState(null);
  const [academyModules, setAcademyModules] = useState([]);
  const [myLandingPage, setMyLandingPage] = useState(null);
  const [allLandingPages, setAllLandingPages] = useState([]); 

  // --- UI States ---
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [checkoutPkg, setCheckoutPkg] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null); 
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const [replyTicketText, setReplyTicketText] = useState('');
  const [showCertificate, setShowCertificate] = useState(false); 
  
  // --- Form States ---
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [authMode, setAuthMode] = useState('login');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ senderName: '', senderBank: '', notes: '' });
  const [profileForm, setProfileForm] = useState({ phone: '', bank: '', accountNo: '' });
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
  const [productForm, setProductForm] = useState({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
  const [couponForm, setCouponForm] = useState({ code: '', discount: '' });
  const [chatInput, setChatInput] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchFileQuery, setSearchFileQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isEditingLP, setIsEditingLP] = useState(false);
  const [editLPForm, setEditLPForm] = useState(null);
  const [isGeneratingLP, setIsGeneratingLP] = useState(false);

  // --- AI States ---
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', text: 'Halo! Saya ProSpace AI Mentor. Butuh panduan belajar, komisi, atau teknis?' }]);
  const [copilotForm, setCopilotForm] = useState({ product: 'ProSpace VIP', platform: 'whatsapp', tone: 'fomo' });
  const [copilotResult, setCopilotResult] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [aiConfig, setAiConfig] = useState({ provider: 'gemini', apiKey: '', isActive: true });
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [aiQuiz, setAiQuiz] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [isQuizProcessing, setIsQuizProcessing] = useState(false);

  // --- Ajaib Foto (Image Studio) States ---
  const [activePhotoFeature, setActivePhotoFeature] = useState('ucapan');
  const [photoImages, setPhotoImages] = useState([]);
  const [photoInstruction, setPhotoInstruction] = useState('');
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [photoGenStatus, setPhotoGenStatus] = useState('');
  const [photoResult, setPhotoResult] = useState(null);
  const [photoHistory, setPhotoHistory] = useState([]);
  const fileInputRef = useRef(null);

  // --- Focus & E-Learning States ---
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusMode, setFocusMode] = useState('work'); 
  const [activeCourseId, setActiveCourseId] = useState('');
  const [activeLessonId, setActiveLessonId] = useState('');
  const [quizSelection, setQuizSelection] = useState(null);
  const [modulTitle, setModulTitle] = useState('');
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [targetModulId, setTargetModulId] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', type: 'video', content: '', desc: '', points: 15, question: '', options: ['', '', '', ''], answer: 0, exp: '' });
  const [editUserForm, setEditUserForm] = useState({});

  const focusStartTimeRef = useRef(null);
  const chatEndRef = useRef(null);
  const aiEndRef = useRef(null);
  const isProcessingAction = useRef(false);

  // --- Derived States & Safe Fallbacks ---
  const rawTier = userData?.subscriptionLevel || 0;
  const currentTier = TIER_LEVELS[rawTier] ? rawTier : 0; 
  
  const affiliateBalance = userData?.commissionBalance || 0;
  const completedFiles = userData?.completedFiles || [];
  const completedLessons = userData?.completedLessons || [];
  const userPoints = userData?.rewardPoints || 0;
  const userFirstName = getFirstName(userData?.name);

  const userRank = useMemo(() => {
    if(currentTier >= 4) return { name: 'VIP ELITE', color: 'text-rose-600', bg: 'bg-rose-100', border:'border-rose-200', icon: <Crown size={14} /> };
    if(userPoints >= 1000) return { name: 'Diamond', color: 'text-purple-600', bg: 'bg-purple-100', border:'border-purple-200', icon: <Crown size={14} /> };
    if(userPoints >= 300) return { name: 'Gold', color: 'text-amber-600', bg: 'bg-amber-100', border:'border-amber-200', icon: <Star size={14} /> };
    if(userPoints >= 100) return { name: 'Silver', color: 'text-slate-600', bg: 'bg-slate-200', border:'border-slate-300', icon: <Award size={14} /> };
    return { name: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-100', border:'border-orange-200', icon: <Sparkles size={14} /> };
  }, [userPoints, currentTier]);

  const filteredUsers = useMemo(() => {
    let list = [...allUsers];
    if (searchUserQuery) {
        const q = escapeInput(searchUserQuery.toLowerCase());
        list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.joinDate || 0) - new Date(a.joinDate || 0));
  }, [allUsers, searchUserQuery]);

  const filteredFiles = useMemo(() => {
    if (!searchFileQuery) return files;
    const q = escapeInput(searchFileQuery.toLowerCase());
    return files.filter(f => f.name?.toLowerCase().includes(q));
  }, [files, searchFileQuery]);

  const sortedChat = useMemo(() => [...chatMessages].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)), [chatMessages]);
  const accessibleFiles = useMemo(() => files.filter(f => currentTier >= f.reqLevel), [files, currentTier]);
  
  const progressData = useMemo(() => {
    if(accessibleFiles.length === 0) return 0;
    const count = completedFiles.filter(id => accessibleFiles.some(f => f.id === id)).length;
    return Math.round((count / accessibleFiles.length) * 100);
  }, [accessibleFiles, completedFiles]);

  const activeLesson = useMemo(() => {
      const mod = academyModules.find(m => m.id === activeCourseId);
      return mod?.lessons?.find(l => l.id === activeLessonId) || null;
  }, [academyModules, activeCourseId, activeLessonId]);
  
  const isLessonCompleted = activeLesson ? completedLessons.includes(activeLesson.id) : false;

  const adminStats = useMemo(() => {
    const approved = transactions.filter(t => t.status === 'approved');
    const totalRev = approved.reduce((acc, curr) => acc + curr.price, 0);
    return { 
        totalRev, pendingTrans: transactions.filter(t => t.status === 'pending').length,
        approvedTrans: approved.length, openTickets: tickets.filter(t => t.status === 'open').length,
        pendingWd: withdrawals.filter(w => w.status === 'pending').length 
    };
  }, [transactions, tickets, withdrawals]);

  const leaderboardData = useMemo(() => {
    return allUsers.map(u => ({ uid: u.uid, name: u.name, totalEarned: (u.commissionBalance || 0) + (withdrawals.filter(w => w.userId === u.uid && w.status === 'approved').reduce((a, b) => a + b.amount, 0)) }))
        .filter(e => e.totalEarned > 0).sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 10);
  }, [allUsers, withdrawals]);

  const finalPrice = useMemo(() => {
    if (!checkoutPkg) return 0;
    if (appliedCoupon && appliedCoupon.active) return checkoutPkg.price - (checkoutPkg.price * appliedCoupon.discount / 100);
    return checkoutPkg.price;
  }, [checkoutPkg, appliedCoupon]);

  // ==========================================
  // UTILITY & HELPERS
  // ==========================================
  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3500); };
  const copyToClipboard = (text) => { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); try { document.execCommand('copy'); showToast("Berhasil disalin ke clipboard!"); } catch(err) { showToast("Gagal menyalin.", "error"); } document.body.removeChild(el); };
  const downloadImage = (url, filename = 'ajaibfoto-result.jpg') => { const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
  
  const openWhatsAppConfirmation = (data) => {
    const text = `Halo Admin, saya ingin konfirmasi pembayaran.%0A%0APaket: ${data.name}%0AHarga: Rp ${data.price.toLocaleString('id-ID')}%0A%0A_Berikut saya lampirkan bukti transfer:_`;
    window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${text}`, '_blank');
  };

  const logActivity = async (text, type) => {
    try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activities'), { text: escapeInput(text), type, createdAt: new Date().toISOString() }); } catch (e) {}
  };

  const handleExportCSV = () => {
    if(!isAdmin) return;
    const csvContent = "data:text/csv;charset=utf-8," + "Nama,Email,No WA,Tier,Saldo,Points\n" + allUsers.map(e => `${e.name},${e.email},${e.phone||'-'},${TIER_LEVELS[e.subscriptionLevel]?.name || 'Unknown'},${e.commissionBalance},${e.rewardPoints}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "data_member_prospace.csv"); document.body.appendChild(link); link.click(); link.remove();
  };

  // ==========================================
  // LOGIC: API NETWORK (PERFECTED FOR GEMINI FREE TIER)
  // ==========================================
  const fetchWithRetry = async (url, options, maxRetries = 4) => {
    let delay = 1500; // Mulai dengan delay 1.5 detik untuk mitigasi limit
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        // Jika sukses atau error yang bukan karena server/rate limit
        if (response.ok || [400, 401, 403, 404].includes(response.status)) return response;
        
        // Tangkap error 429 (Too Many Requests - Sering terjadi di Free Tier)
        if (response.status === 429) {
          console.warn(`Rate Limit Gemini API tercapai. Mencoba lagi dalam ${delay}ms...`);
        }
      } catch (err) { 
        if (i === maxRetries - 1) throw err; 
      }
      // Exponential backoff untuk mengatasi limit 15 RPM Free Tier
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; 
    }
    throw new Error("Server AI sedang sibuk (Rate Limit). Silakan coba beberapa saat lagi.");
  };

  const callGeminiAPI = async (payload, type = 'text', forceInternalKey = false) => {
      const keyToUse = aiConfig.apiKey ? aiConfig.apiKey.trim() : "";
      
      if (!keyToUse) {
          throw new Error("API Key Gemini belum diatur. Masuk sebagai Admin ke menu Pengaturan API & AI.");
      }
      
      let url = "";
      // FIX: Gunakan gemini-2.0-flash (Paling stabil untuk Text & Vision di Free Tier)
      if (type === 'text' || type === 'vision') {
          url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyToUse}`;
      } else if (type === 'image_gen' || type === 'image_edit') {
          // KHUSUS FREE TIER: Google API Key standar tidak punya akses ke Imagen model.
          // Kita akan force trigger Error agar sistem langsung lari ke Seamless Fallback (Pollinations).
          throw new Error("IMAGE_MODEL_RESTRICTED"); 
      }
      
      const res = await fetchWithRetry(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
          const errData = await res.json().catch(()=>({}));
          let errorMsg = errData.error?.message || `Error API: ${res.status}`;
          throw new Error(errorMsg);
      }
      return await res.json();
  };

  const fetchFromAI = async (promptText, jsonMode = false) => {
      const payload = { contents: [{ parts: [{ text: promptText }] }] };
      if (jsonMode) {
          payload.generationConfig = { responseMimeType: "application/json" };
      }
      const data = await callGeminiAPI(payload, 'text');
      return data.candidates[0].content.parts[0].text;
  };

  // ==========================================
  // LOGIC: INITIAL FETCH & REALTIME SYNC
  // ==========================================
  useEffect(() => {
    if (!isConfigReady) { setLoading(false); return; }

    const checkPublicSite = async () => {
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref') || params.get('aff');
        if (refCode && /^[a-zA-Z0-9_-]{5,50}$/.test(refCode)) {
            localStorage.setItem('affiliate_ref_v14', refCode);
            try {
                const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', refCode));
                if (docSnap.exists()) { setPublicSiteData(docSnap.data()); setShowPublicSite(true); }
            } catch(e) {}
        }
    };
    checkPublicSite();

    const initAuth = async () => { 
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {} } 
      else { try { await signInAnonymously(auth); } catch(e) {} }
    };
    initAuth();
    
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if(u && !u.isAnonymous) {
          setUser(u);
          const checkIsAdmin = u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          setIsAdmin(checkIsAdmin);
          if (checkIsAdmin && activeTab === 'dashboard') setActiveTab('admin_overview');
      } else {
          setUser(null);
          setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  const isEditingLPRef = useRef(isEditingLP);
  useEffect(() => { isEditingLPRef.current = isEditingLP; }, [isEditingLP]);

  useEffect(() => {
    if (!user || !isConfigReady) return;
    const errHandler = (e) => console.error("Firestore Error:", e);

    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (d) => {
      if (d.exists()) { setUserData(d.data()); setProfileForm(prev => ({ ...prev, phone: d.data().phone || '', bank: d.data().bank || '', accountNo: d.data().accountNo || '' })); }
    }, errHandler);

    const unsubMySite = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', user.uid), (d) => {
        if (d.exists()) { setMyLandingPage(d.data()); if(!isEditingLPRef.current) setEditLPForm(d.data()); } else setMyLandingPage(null);
    }, errHandler);

    const unsubPhotoHistory = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'generations'), (s) => {
        const hData = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
           const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
           const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
           return timeB - timeA;
        });
        setPhotoHistory(hData);
    }, errHandler);

    const unsubFiles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'files'), (s) => setFiles(s.docs.map(d => ({ id: d.id, ...d.data() }))), errHandler);
    const unsubCoupons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), (s) => setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))), errHandler);
    const unsubChat = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), (s) => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))), errHandler);
    const unsubModules = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'modules'), (s) => {
        const mods = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        setAcademyModules(mods);
        setActiveCourseId(prev => (!prev && mods.length > 0) ? mods[0].id : prev);
        setActiveLessonId(prev => (!prev && mods.length > 0 && mods[0].lessons?.length > 0) ? mods[0].lessons[0].id : prev);
    }, errHandler);

    const unsubAct = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'activities'), (s) => {
        const allAct = s.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        if(allAct.length > 0) {
            const data = allAct[0];
            if (new Date() - new Date(data.createdAt) < 30000) { setLatestActivity(data); setTimeout(() => setLatestActivity(null), 7000); }
        }
    }, errHandler);

    let adminUnsubRegistry = () => {}; let adminUnsubLPs = () => {};
    if (isAdmin) {
      adminUnsubRegistry = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry'), (s) => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))), errHandler);
      adminUnsubLPs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'replicatedSites'), (s) => setAllLandingPages(s.docs.map(d => ({ id: d.id, ...d.data() }))), errHandler);
    }

    const unsubTrans = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), (s) => {
       const allT = s.docs.map(d => ({ id: d.id, ...d.data() }));
       setTransactions(isAdmin ? allT : allT.filter(t => t.userId === user.uid));
    }, errHandler);
    
    const unsubWd = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), (s) => {
       const allW = s.docs.map(d => ({ id: d.id, ...d.data() }));
       setWithdrawals(isAdmin ? allW : allW.filter(w => w.userId === user.uid));
    }, errHandler);
    
    const unsubTickets = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), (s) => {
       const allT = s.docs.map(d => ({ id: d.id, ...d.data() }));
       setTickets(isAdmin ? allT : allT.filter(t => t.userId === user.uid));
    }, errHandler);

    const unsubAi = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ai_config'), (d) => { if (d.exists()) setAiConfig(d.data()); }, errHandler);

    return () => { unsubProfile(); unsubFiles(); unsubCoupons(); unsubChat(); unsubModules(); unsubAct(); unsubTrans(); unsubTickets(); unsubWd(); unsubAi(); unsubMySite(); adminUnsubRegistry(); adminUnsubLPs(); unsubPhotoHistory(); };
  }, [user, isAdmin]);

  // --- Pomodoro Timer Engine ---
  useEffect(() => {
    let interval;
    if (isFocusing && focusTimeLeft > 0) {
      if(!focusStartTimeRef.current) focusStartTimeRef.current = Date.now();
      interval = setInterval(() => { setFocusTimeLeft(prev => prev - 1); }, 1000);
    } else if (isFocusing && focusTimeLeft <= 0) { setIsFocusing(false); handleFocusComplete(); }
    if(!isFocusing) focusStartTimeRef.current = null;
    return () => clearInterval(interval);
  }, [isFocusing, focusTimeLeft]);

  const handleFocusComplete = async () => {
    if (focusMode === 'work') {
       const timeElapsedMs = Date.now() - (focusStartTimeRef.current || Date.now());
       if (timeElapsedMs < 24 * 60 * 1000 && focusTimeLeft <= 0) { showToast("Aktivitas tidak wajar terdeteksi.", "error"); setFocusMode('work'); setFocusTimeLeft(25 * 60); return; }
       try {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { rewardPoints: increment(25) });
           await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { rewardPoints: increment(25) });
           showToast("Sesi Fokus Selesai! Anda mendapatkan +25 Poin Reward 🏆", "success");
           logActivity(`${userFirstName} menyelesaikan sesi Deep Work! 🧠`, 'focus');
           setFocusMode('break'); setFocusTimeLeft(5 * 60); 
       } catch(e) {}
    } else { showToast("Waktu istirahat habis. Saatnya kembali fokus!", "success"); setFocusMode('work'); setFocusTimeLeft(25 * 60); }
  };
  const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  useEffect(() => { if (activeTab === 'community') chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sortedChat, activeTab]);
  useEffect(() => { if (isAIOpen) aiEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages, isAIOpen]);

  // ==========================================
  // LOGIC ACTIONS: AJAIB FOTO (IMAGE STUDIO)
  // ==========================================
  const photoPresets = {
    photoshoot: ["Studio Minimalis dengan pencahayaan dramatis", "Di atas batu karang pantai saat matahari terbenam (Golden Hour)", "Panggung podium marmer dengan aksen daun tropis", "Gaya Cyberpunk dengan lampu neon ungu dan biru"],
    model: ["Wanita Asia profesional, 25 tahun, memakai jas kantoran elegan, rambut sebahu, tersenyum simpul, latar blur studio", "Pria atletis, memakai pakaian olahraga futuristik, sedang berlari di taman kota pagi hari, pencahayaan sinematik"],
    edit: ["Ubah warna baju menjadi biru navy yang elegan", "Ubah latar belakang menjadi suasana pegunungan bersalju", "Tambahkan kacamata hitam gaya retro pada wajah"],
    perbaiki: ["Restorasi foto jadul ini menjadi tajam, detail 8k, dan berwarna alami", "Perjelas wajah yang buram menjadi kualitas kamera studio DSLR", "Hilangkan goresan dan noise, pertahankan keaslian wajah model"],
    banner: ["Banner promo gaya modern minimalis dengan ruang kosong di kiri untuk teks diskon", "Iklan Instagram post gaya pop-art warna-warni cerah yang menarik perhatian"],
    ucapan: ["Kartu ucapan Idul Fitri elegan dengan nuansa hijau emerald, ornamen lentera emas, dan siluet masjid", "Kartu ucapan Ramadhan/Lebaran bergaya cat air (watercolor) yang lembut dan estetik"]
  };

  const getPhotoFeatureTexts = () => {
    if (activePhotoFeature === 'photoshoot') return { title: 'Unggah Foto Produk', desc: 'Unggah 1 foto produk Anda.', max: 1 };
    if (activePhotoFeature === 'model') return { title: 'Foto Referensi (Opsional)', desc: 'Bisa kosong. Unggah gambar jika ingin meniru pose.', max: 1 };
    if (activePhotoFeature === 'edit') return { title: 'Unggah Foto Asli', desc: 'Sistem memproses area edit otomatis!', max: 1 };
    if (activePhotoFeature === 'perbaiki') return { title: 'Unggah Foto Jadul/Rusak', desc: 'Sistem akan merestorasinya menjadi HD.', max: 1 };
    if (activePhotoFeature === 'banner') return { title: 'Unggah Foto Objek', desc: 'Sistem akan menyulapnya menjadi banner iklan.', max: 1 };
    if (activePhotoFeature === 'ucapan') return { title: 'Unggah Foto Subjek', desc: 'Sistem akan menyulapnya menjadi kartu ucapan.', max: 1 };
    return { title: 'Unggah Gambar (Maks 5)', desc: 'Pilih 2-5 gambar untuk digabungkan.', max: 5 };
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > height) { if (width > 800) { height *= 800 / width; width = 800; } } 
          else { if (height > 800) { width *= 800 / height; height = 800; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8)); 
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const txts = getPhotoFeatureTexts();
    if (photoImages.length + files.length > txts.max) return showToast(`Maksimal ${txts.max} gambar.`, "error");
    const compressed = await Promise.all(files.map(f => compressImage(f)));
    setPhotoImages(prev => [...prev, ...compressed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGeneratePhoto = async () => {
    if (!aiConfig.isActive) return showToast("Fitur AI sedang dinonaktifkan oleh Admin.", "error");
    if (currentTier < 1 && !isAdmin) return showToast("Akses Ditolak. Minimal lisensi paket Personal.", "error");
    
    const txts = getPhotoFeatureTexts();
    if (photoImages.length === 0 && txts.max > 0 && activePhotoFeature !== 'model') return showToast("Unggah gambar dulu.", "error");
    if (activePhotoFeature === 'gabung' && photoImages.length < 2) return showToast("Minimal 2 gambar.", "error");
    if (!photoInstruction.trim()) return showToast("Tulis instruksi.", "error");

    setIsGeneratingPhoto(true); setPhotoResult(null); setPhotoGenStatus('Menganalisis prompt dengan Gemini AI...');

    try {
      // 1. OLAHKAN PROMPT DENGAN GEMINI TEXT (Free Tier Sangat Cepat untuk ini)
      let textPrompt = `Act as an Expert Midjourney/DALL-E Prompt Engineer. Rewrite this instruction into a highly detailed, professional english image generation prompt: "${photoInstruction}". `;
      if (activePhotoFeature === 'gabung') textPrompt += `Make sure the prompt describes merging the core subjects of the uploaded concept.`;
      else if (activePhotoFeature === 'photoshoot') textPrompt += `Make it a high-end product photoshoot prompt.`;
      else if (activePhotoFeature === 'model') textPrompt += `Make it a hyper-realistic 8k portrait prompt.`;
      else if (activePhotoFeature === 'perbaiki') textPrompt += `Make it a prompt describing a perfectly restored, 8k DSLR quality image of the subject.`;
      else if (activePhotoFeature === 'banner') textPrompt += `Make it a prompt for a high-converting commercial banner.`;
      textPrompt += ` Output ONLY the final english prompt text. No explanations.`;

      let superPrompt = photoInstruction; // Default jika gagal

      try {
          const textParts = [{ text: textPrompt }];
          if (photoImages.length > 0) {
              // Jika ada gambar, gunakan kapabilitas Vision Gemini Flash
              textParts.push(...photoImages.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] } })));
          }
          const textData = await callGeminiAPI({ contents: [{ role: "user", parts: textParts }] }, 'vision');
          superPrompt = textData.candidates?.[0]?.content?.parts?.[0]?.text || photoInstruction;
      } catch (promptErr) {
          console.warn("Gagal enhace prompt dengan Gemini, menggunakan prompt asli.", promptErr);
      }
      
      setPhotoGenStatus('Memproses rendering gambar (Seamless Server)...');

      // 2. GENERATE GAMBAR (MENGGUNAKAN SEAMLESS FALLBACK POLLINATIONS)
      // Karena Free Tier API Key Gemini tidak bisa Imagen 4, kita bypass dan langsung ke solusi gratis tanpa batas.
      const randomSeed = Math.floor(Math.random() * 1000000);
      let imgInst = encodeURIComponent(superPrompt.substring(0, 800)); // Limit karakter
      
      let finalImageUrl = `https://image.pollinations.ai/prompt/${imgInst}?seed=${randomSeed}&width=800&height=800&nologo=true`;
      
      // Ambil gambar dan jadikan Base64 agar bisa di-download dan di-save ke Firebase (CORS Bypass)
      let fullDataUrl = "";
      try {
          const imgRes = await fetch(finalImageUrl);
          const blob = await imgRes.blob();
          fullDataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
          });
      } catch(e) { 
          // Jika konversi base64 gagal karena CORS browser, pakai URL asli (fallback terakhir)
          fullDataUrl = finalImageUrl; 
      }

      setPhotoResult(fullDataUrl);
      showToast("Sulap foto berhasil!", "success");

      if (user && fullDataUrl.startsWith('data:')) {
        try {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'generations'), { feature: activePhotoFeature, instruction: photoInstruction, resultImage: fullDataUrl, createdAt: serverTimestamp() });
          logActivity(`${userFirstName} membuat mahakarya di AI Studio Foto! 🎨`, 'learn');
        } catch (e) {
          console.warn("Ukuran Base64 terlalu besar untuk Firestore, gambar tidak disimpan di history.");
        }
      }
    } catch (err) { 
      showToast(err.message, "error"); 
    } finally { 
      setIsGeneratingPhoto(false); 
    }
  };

  const deletePhotoHistory = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'generations', id)); showToast("Karya dihapus."); } catch (e) {}
  };


  // ==========================================
  // LOGIC ACTIONS: CORE SYSTEM
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!isConfigReady) return showToast("Config Firebase belum diisi!", "error");
    if (isProcessingAction.current) return;
    isProcessingAction.current = true; setAuthLoading(true);
    try {
      const safeEmail = formData.email.trim().toLowerCase();
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, safeEmail, formData.password);
        const storedRef = localStorage.getItem('affiliate_ref_v14'); 
        const init = { name: escapeInput(formData.name), email: safeEmail, subscriptionLevel: 0, joinDate: new Date().toISOString(), uid: cred.user.uid, commissionBalance: 0, referredBy: storedRef || null, completedFiles: [], completedLessons: [], rewardPoints: 0, lastCheckInDate: '', lastQuizDate: '' };
        await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profile', 'data'), init);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', cred.user.uid), init);
        localStorage.removeItem('affiliate_ref_v14'); logActivity(`${escapeInput(formData.name)} baru saja bergabung! 👋`, 'join'); showToast("Registrasi Berhasil!");
      } else { await signInWithEmailAndPassword(auth, safeEmail, formData.password); showToast("Selamat Datang!"); }
    } catch (err) { showToast("Gagal masuk/daftar. Cek kredensial Anda.", "error"); }
    setAuthLoading(false); isProcessingAction.current = false;
  };

  const handlePurchaseRequest = async (e) => {
    e.preventDefault();
    if (isProcessingAction.current) return;

    const basePrice = checkoutPkg.price || 0;
    const discountVal = appliedCoupon && appliedCoupon.active ? appliedCoupon.discount : 0;
    const trueFinalPrice = basePrice - (basePrice * discountVal / 100);

    // AUTO APPROVE untuk Paket Free (0) atau Diskon 100%
    if (trueFinalPrice <= 0) {
        isProcessingAction.current = true;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { subscriptionLevel: checkoutPkg.level });
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { subscriptionLevel: checkoutPkg.level });
            logActivity(`${userFirstName} beralih ke paket ${checkoutPkg.name} 🔄`, 'upgrade');
            showToast(`Berhasil beralih ke paket ${checkoutPkg.name}!`, "success");
            setCheckoutPkg(null); setAppliedCoupon(null); setConfirmForm({senderName:'', senderBank:'', notes:''});
        } catch(err) { showToast("Gagal memproses paket gratis.", "error"); }
        isProcessingAction.current = false;
        return;
    }

    if (!confirmForm.senderName || !confirmForm.senderBank) return showToast("Form konfirmasi transfer harus lengkap!", "error");
    
    isProcessingAction.current = true;
    try {
      const transId = `TRX-${Math.floor(Date.now() / 1000)}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', transId), { id: transId, userId: user.uid, userName: userData?.name || user?.email || 'Member', packageLevel: checkoutPkg.level, packageName: checkoutPkg.name, price: trueFinalPrice, promoCode: appliedCoupon?.code || null, senderName: escapeInput(confirmForm.senderName), senderBank: escapeInput(confirmForm.senderBank), notes: escapeInput(confirmForm.notes), status: 'pending', createdAt: new Date().toISOString() });
      logActivity(`${userFirstName} memesan lisensi ${checkoutPkg.name}! 🔥`, 'order');
      openWhatsAppConfirmation({name: checkoutPkg.name, price: trueFinalPrice});
      setCheckoutPkg(null); setAppliedCoupon(null); setConfirmForm({senderName:'', senderBank:'', notes:''}); showToast("Konfirmasi terkirim!"); setActiveTab('transactions');
    } catch (err) { showToast("Gagal memproses transaksi.", "error"); }
    isProcessingAction.current = false;
  };

  const handleTransactionAction = async (trans, action) => {
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      if (action === 'approve') {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', trans.id), { status: 'approved' });
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', trans.userId), { subscriptionLevel: trans.packageLevel });
          await updateDoc(doc(db, 'artifacts', appId, 'users', trans.userId, 'profile', 'data'), { subscriptionLevel: trans.packageLevel });
          logActivity(`Upgrade sukses! ${getFirstName(trans.userName)} kini member ${trans.packageName} 🏆`, 'upgrade');
          
          // PENYEMPURNAAN: Hitung Komisi Afiliasi berdasarkan Tier Referrer!
          const target = allUsers.find(u => u.uid === trans.userId);
          if (target && target.referredBy) {
              const referrerData = allUsers.find(u => u.uid === target.referredBy);
              const refTier = referrerData?.subscriptionLevel || 0;
              const commRate = TIER_LEVELS[refTier]?.comm || 0.10;
              const comm = trans.price * commRate; 
              
              await updateDoc(doc(db, 'artifacts', appId, 'users', target.referredBy, 'profile', 'data'), { commissionBalance: increment(comm) });
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', target.referredBy), { commissionBalance: increment(comm) });
          }
          showToast("Member di-upgrade dan fitur langsung terbuka!");
      } else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', trans.id), { status: 'rejected' }); showToast("Ditolak", "error"); }
    } catch (err) { showToast("Terjadi kesalahan sistem.", "error");}
    isProcessingAction.current = false;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      const safeProfile = { phone: escapeInput(profileForm.phone), bank: escapeInput(profileForm.bank), accountNo: escapeInput(profileForm.accountNo) };
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), safeProfile);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), safeProfile);
      showToast("Profil diperbarui!");
    } catch(err) {}
    isProcessingAction.current = false;
  };

  const handleCompleteLearning = async (lesson, isQuiz, selectedIdx) => {
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      if (isQuiz && selectedIdx !== lesson.answer) {
        showToast("Jawaban kurang tepat. Coba lagi!", "error");
        isProcessingAction.current = false;
        return;
      }
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
        completedLessons: arrayUnion(lesson.id),
        rewardPoints: increment(lesson.points)
      });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), {
        rewardPoints: increment(lesson.points)
      });
      showToast(`Modul Selesai! +${lesson.points} Poin`, "success");
      logActivity(`${userFirstName} menyelesaikan materi ${lesson.title}! 📚`, 'learn');
      
      const allLessonsIds = academyModules.flatMap(m => m.lessons?.map(l => l.id) || []);
      const newCompleted = [...completedLessons, lesson.id];
      const hasAll = allLessonsIds.every(id => newCompleted.includes(id));
      if(hasAll && allLessonsIds.length > 0) {
        setShowCertificate(true);
      }
    } catch(e) { console.error(e); showToast("Gagal menyimpan progress.", "error"); }
    isProcessingAction.current = false;
  };

  const handleGenerateAIQuiz = async () => {
    if (isProcessingAction.current || isGeneratingQuiz) return;
    setIsGeneratingQuiz(true); setAiQuiz(null); setSelectedQuizAnswer(null);
    try {
      const prompt = `Buatkan 1 pertanyaan kuis pilihan ganda tentang digital marketing atau bisnis online untuk pemula. Berikan response hanya dalam format JSON valid dengan struktur: {"q": "pertanyaan", "options": ["opsi1", "opsi2", "opsi3", "opsi4"], "answer": 0_sd_3_index_jawaban_benar, "exp": "penjelasan_singkat"}`;
      const res = await fetchFromAI(prompt, true);
      const parsed = safeJSONParse(res);
      if(parsed && parsed.q) setAiQuiz(parsed);
      else throw new Error("Format AI tidak sesuai");
    } catch(e) { showToast("Gagal memuat kuis AI.", "error"); }
    setIsGeneratingQuiz(false);
  };

  const handleAnswerQuiz = async (idx) => {
    if (isQuizProcessing || selectedQuizAnswer !== null) return;
    setIsQuizProcessing(true);
    setSelectedQuizAnswer(idx);
    if(idx === aiQuiz.answer) {
      const today = new Date().toDateString();
      if(userData?.lastQuizDate !== today) {
        try {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { rewardPoints: increment(20), lastQuizDate: today });
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { rewardPoints: increment(20), lastQuizDate: today });
          showToast("Jawaban Benar! +20 Poin", "success");
        } catch(e) {}
      } else {
        showToast("Jawaban Benar! (Poin hari ini sudah diklaim)", "success");
      }
    } else {
      showToast("Jawaban kurang tepat. Coba lagi besok!", "error");
    }
    setIsQuizProcessing(false);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if(!chatInput.trim() || isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), {
        text: escapeInput(chatInput),
        userId: user.uid,
        userName: userData?.name || 'Member',
        isAdmin: isAdmin,
        createdAt: new Date().toISOString()
      });
      setChatInput('');
    } catch(e) { showToast("Gagal mengirim pesan", "error"); }
    isProcessingAction.current = false;
  };

  const handleDeleteChat = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'globalChat', id)); } catch(e) {}
  };

  const handleToggleFileProgress = async (id, name) => {
    try {
        const isCompleted = completedFiles.includes(id);
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
            completedFiles: isCompleted ? arrayRemove(id) : arrayUnion(id)
        });
        showToast(isCompleted ? "Tandai belum dibaca" : "Ditandai selesai!", "success");
    } catch(e) {}
  };

  const handleGenerateLandingPage = async () => {
    if(isGeneratingLP) return;
    setIsGeneratingLP(true);
    try {
       const initialLP = { ownerId: user.uid, ownerName: userData?.name, customDomain: '', heroHeadline: `Selamat Datang di Portal Bisnis ${userData?.name}` };
       await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', user.uid), initialLP);
       showToast("Web Replikator Berhasil Dibuat!", "success");
    } catch(e) { showToast("Gagal membuat web", "error"); }
    setIsGeneratingLP(false);
  };

  const handleUpdateLandingPage = async (e) => {
    e.preventDefault();
    if(isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', user.uid), editLPForm);
       showToast("Perubahan web disimpan!", "success");
       setIsEditingLP(false);
    } catch(e) { showToast("Gagal menyimpan web", "error"); }
    isProcessingAction.current = false;
  };

  const handleGenerateCopy = async (e) => {
    e.preventDefault();
    if(isGeneratingCopy || !aiConfig.isActive) return;
    setIsGeneratingCopy(true);
    try {
      const prompt = `Buatkan copywriting marketing untuk platform ${copilotForm.platform} dengan gaya bahasa ${copilotForm.tone} untuk memasarkan produk: ${copilotForm.product}. Format hasil dengan HTML dasar (seperti <br> untuk baris baru, <b> untuk tebal).`;
      const res = await fetchFromAI(prompt);
      setCopilotResult(res);
      logActivity(`${userFirstName} menggunakan AI Copilot untuk ${copilotForm.platform}! 🚀`, 'learn');
    } catch(e) { showToast("Gagal generate copy.", "error"); }
    setIsGeneratingCopy(false);
  };

  const handleRequestWithdrawal = async () => {
    if (isProcessingAction.current) return;
    if (!profileForm.bank || !profileForm.accountNo) return showToast("Lengkapi profil bank terlebih dahulu!", "error");
    if (affiliateBalance < 50000) return showToast("Minimal penarikan Rp 50.000", "error");
    
    isProcessingAction.current = true;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { commissionBalance: 0 });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { commissionBalance: 0 });
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), {
         userId: user.uid, userName: userData?.name, amount: affiliateBalance, bank: profileForm.bank, accountNo: profileForm.accountNo, status: 'pending', createdAt: new Date().toISOString()
      });
      showToast("Permintaan penarikan dikirim!", "success");
    } catch(e) { showToast("Gagal request WD", "error"); }
    isProcessingAction.current = false;
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), {
         userId: user.uid, userName: userData?.name, subject: ticketForm.subject, message: ticketForm.message, status: 'open', createdAt: new Date().toISOString(), adminReply: null
      });
      setTicketForm({subject: '', message: ''});
      showToast("Tiket bantuan terkirim!", "success");
    } catch(e) { showToast("Gagal mengirim tiket", "error"); }
    isProcessingAction.current = false;
  };

  const handleAdminWithdrawalAction = async (id, status, uid, amount) => {
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', id), { status });
      if (status === 'rejected') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { commissionBalance: increment(amount) });
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid), { commissionBalance: increment(amount) });
      }
      showToast(`Withdrawal ${status}`);
    } catch(e) {}
    isProcessingAction.current = false;
  };

  const handleDeleteWithdrawal = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', id)); } catch(e) {}
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', couponForm.code), { code: couponForm.code, discount: parseInt(couponForm.discount), active: true });
      setCouponForm({code:'', discount:''}); showToast("Kupon ditambahkan!");
    } catch(e) {}
  };

  const handleDeleteCoupon = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', id)); } catch(e) {}
  };

  const handleDeleteTicket = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', id)); } catch(e) {}
  };

  const handleAdminReplyTicket = async (e) => {
    e.preventDefault();
    if(!selectedTicketDetail) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', selectedTicketDetail.id), {
         adminReply: replyTicketText, status: 'closed'
      });
      setSelectedTicketDetail(null); setReplyTicketText(''); showToast("Balasan terkirim!");
    } catch(e) {}
  };

  const openUserCRMDetail = (m) => {
    setEditUserForm({...m});
    setSelectedUserDetail(m);
  };

  const handleAdminUpdateUserCRM = async (e) => {
    e.preventDefault();
    if(isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      const payload = {
         name: editUserForm.name, phone: editUserForm.phone, bank: editUserForm.bank, accountNo: editUserForm.accountNo,
         rewardPoints: parseInt(editUserForm.rewardPoints), commissionBalance: parseInt(editUserForm.commissionBalance), subscriptionLevel: parseInt(editUserForm.subscriptionLevel)
      };
      await updateDoc(doc(db, 'artifacts', appId, 'users', editUserForm.uid, 'profile', 'data'), payload);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', editUserForm.uid), payload);
      setSelectedUserDetail(null); showToast("Data member diperbarui!");
    } catch(e) { showToast("Gagal update data.", "error"); }
    isProcessingAction.current = false;
  };

  const deleteMemberData = async (uid) => {
    if(!window.confirm("Yakin hapus data member ini permanen?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid));
      showToast("Data registrasi dihapus (Auth tetap ada).");
    } catch(e) {}
  };

  const handleAdminDeleteLP = async (uid) => {
    if(!window.confirm("Hapus Landing Page ini?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', uid)); } catch(e) {}
  };

  const handleAdminUpdateLP = async (e, uid) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', uid), { customDomain: editLPForm.customDomain });
      setEditLPForm(null); showToast("Domain web replikator diupdate.");
    } catch(e) {}
  };

  const handleAdminAddModul = async (e) => {
    e.preventDefault();
    try {
       await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'modules'), { title: modulTitle, lessons: [], createdAt: new Date().toISOString() });
       setModulTitle(''); showToast("Modul dibuat!");
    } catch(e) {}
  };

  const handleAdminDeleteModul = async (id) => {
    if(!window.confirm("Hapus modul beserta isinya?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'modules', id)); } catch(e) {}
  };

  const handleAdminDeleteLesson = async (modulId, lessonId) => {
    if(!window.confirm("Hapus materi ini?")) return;
    try {
       const mod = academyModules.find(m => m.id === modulId);
       const updatedLessons = mod.lessons.filter(l => l.id !== lessonId);
       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'modules', modulId), { lessons: updatedLessons });
    } catch(e) {}
  };

  const handleAdminSaveLesson = async (e) => {
    e.preventDefault();
    try {
       const mod = academyModules.find(m => m.id === targetModulId);
       const newLesson = { id: `lsn_${Date.now()}`, title: lessonForm.title, type: lessonForm.type, content: lessonForm.content, points: parseInt(lessonForm.points), question: lessonForm.question, options: lessonForm.options, answer: lessonForm.answer, exp: lessonForm.exp };
       const updatedLessons = [...(mod.lessons || []), newLesson];
       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'modules', targetModulId), { lessons: updatedLessons });
       setLessonModalOpen(false); setLessonForm({ title: '', type: 'video', content: '', desc: '', points: 15, question: '', options: ['', '', '', ''], answer: 0, exp: '' }); showToast("Materi ditambah!");
    } catch(e) {}
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if(isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      if(editingId) {
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', editingId), productForm);
         setEditingId(null);
      } else {
         await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'files'), {...productForm, createdAt: new Date().toISOString()});
      }
      setProductForm({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
      showToast("File berhasil disimpan!");
    } catch(e) {}
    isProcessingAction.current = false;
  };

  const handleSaveAiConfig = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ai_config'), aiConfig);
      showToast("Seting AI Disimpan!");
    } catch(e) {}
  };

  const handleTestApiConnection = async () => {
    setIsTestingApi(true);
    try {
       await fetchFromAI("Say 'API Connect OK'");
       showToast("Koneksi API Berhasil!", "success");
    } catch(e) { showToast(`Koneksi Gagal: ${e.message}`, "error"); }
    setIsTestingApi(false);
  };

  const closeSidebarMobile = () => { if (window.innerWidth < 1024) setSidebarOpen(false); };

  // ==========================================
  // RENDER COMPONENTS
  // ==========================================
  
  // LOGIKA HALAMAN PUBLIK / REFERRAL LINK (WEB REPLIKATOR)
  if (!user && showPublicSite && publicSiteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans']">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 bg-opacity-20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500 bg-opacity-20 rounded-full blur-[100px]"></div>
        
        <div className="max-w-2xl w-full bg-white rounded-[3rem] p-10 sm:p-14 text-center shadow-2xl relative z-10 animate-slideUp border border-slate-100">
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
            <Rocket size={48} className="text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 font-['Outfit'] leading-tight tracking-tight">
            {publicSiteData.heroHeadline || 'Selamat Datang di ProSpace'}
          </h1>
          <p className="text-slate-500 text-lg sm:text-xl mb-12 leading-relaxed">
            Anda telah diundang secara eksklusif oleh <strong className="text-indigo-600">{publicSiteData.ownerName || 'Member VIP'}</strong>. Bergabunglah sekarang untuk mendapatkan akses ke seluruh modul dan alat AI digital marketing.
          </p>
          <button 
            onClick={() => setShowPublicSite(false)} 
            className="w-full sm:w-auto bg-slate-900 text-white px-12 py-5 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all text-sm tracking-widest uppercase hover:bg-indigo-600"
          >
            TERIMA UNDANGAN & GABUNG
          </button>
        </div>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </div>
    );
  }

  // KOMPONEN UNTUK MENGUNCI FITUR YANG BELUM DIBELI
  const FeatureLockScreen = ({ title, reqTier, icon: Icon }) => (
    <div className="animate-fadeIn max-w-4xl mx-auto text-center space-y-8 py-20 px-6">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-100 text-slate-400 rounded-full mb-4 shadow-inner">
            <Lock size={48} />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Akses {title} Terkunci</h2>
        <p className="text-slate-500 text-lg max-w-lg mx-auto">Fitur ini eksklusif untuk member <strong>{TIER_LEVELS[reqTier]?.name || 'VIP'}</strong> ke atas. Upgrade lisensi Anda sekarang untuk membuka potensi penuh bisnis Anda.</p>
        <button onClick={() => setActiveTab('shop')} className="bg-indigo-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all inline-flex items-center gap-3">
            <Zap size={20} /> UPGRADE LISENSI
        </button>
    </div>
  );

  const ProFileCard = ({ file, currentTier, isCompleted, onToggleProgress, isAdminCard }) => {
    const isLocked = currentTier < file.reqLevel && !isAdmin;
    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    {file.category === 'Video' ? <Video size={24} /> : file.category === 'Asset' ? <Box size={24} /> : <FileText size={24} />}
                </div>
                {isLocked ? <Lock className="text-slate-400" size={20} /> : <button onClick={onToggleProgress} className={`${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}><CheckCircle size={24} /></button>}
            </div>
            <h4 className="font-black text-lg text-slate-800 mb-1 line-clamp-1">{file.name}</h4>
            <p className="text-xs font-bold text-slate-500 mb-6">Min. {TIER_LEVELS[file.reqLevel]?.name || 'Free'}</p>
            {isAdminCard ? (
                <div className="flex gap-2">
                    <button onClick={() => { setEditingId(file.id); setProductForm(file); window.scrollTo(0,0); }} className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-black text-xs hover:bg-indigo-100">EDIT</button>
                    <button onClick={async () => { if(window.confirm('Hapus file?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', file.id)); }} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-xs hover:bg-rose-100">HAPUS</button>
                </div>
            ) : (
                <button onClick={() => !isLocked && window.open(file.url, '_blank')} disabled={isLocked} className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white shadow-lg hover:bg-indigo-600 hover:-translate-y-1'}`}>
                    <DownloadCloud size={18} /> {isLocked ? 'TERKUNCI' : 'DOWNLOAD'}
                </button>
            )}
        </div>
    );
  };

  const NavBtn = ({ active, onClick, icon, label, count }) => (
    <button onClick={onClick} className={`flex items-center justify-between px-5 py-4 w-full rounded-2xl font-black transition-all group ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.03] active:scale-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
      <div className="flex items-center gap-4"><div className={`transition-transform ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-indigo-600'}`}>{icon}</div><span className="text-sm tracking-tight">{label}</span></div>
      {count !== undefined && count > 0 && !active && <span className="bg-rose-500 text-white shadow-lg text-[10px] font-black px-2.5 py-1 rounded-full">{count}</span>}
    </button>
  );

  const StatCard = ({ label, val, icon, color }) => {
    const colors = { emerald: 'bg-emerald-50 text-emerald-600', indigo: 'bg-indigo-50 text-indigo-600', amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600' };
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-transform group-hover:rotate-6 ${colors[color]}`}>{icon}</div>
        <div className="min-w-0"><p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p><p className="text-xl font-black text-slate-800 font-['Outfit'] truncate">{val}</p></div>
      </div>
    );
  };

  // ==========================================
  // SCREEN: LOGIN / REGISTER
  // ==========================================
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      {toast.show && <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl font-black text-sm shadow-2xl animate-slideUp border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{toast.msg}</div>}
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-fadeIn relative z-10">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-100"><ShieldCheck size={32} className="text-white" /></div>
             <h1 className="text-2xl font-black font-['Outfit'] text-slate-800 uppercase tracking-tighter">Pro<span className="text-indigo-600">Space</span></h1>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button onClick={()=>setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${authMode==='login'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>MASUK</button>
            <button onClick={()=>setAuthMode('register')} className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${authMode==='register'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>DAFTAR</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode==='register' && <input type="text" placeholder="Nama Lengkap" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold text-sm" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required />}
            <input type="email" placeholder="Alamat Email" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold text-sm" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} required />
            <input type="password" placeholder="Password" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold text-sm" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} required />
            <button type="submit" disabled={authLoading || isProcessingAction.current} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
               {authLoading ? <RefreshCw size={18} className="animate-spin" /> : (authMode==='login' ? 'MASUK KE DASHBOARD' : 'DAFTAR SEKARANG')}
            </button>
          </form>
      </div>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
    </div>
  );

  // ==========================================
  // SCREEN: MAIN DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] flex text-slate-800 relative">
      
      {/* GLOBAL TOAST & NOTIFICATIONS */}
      {toast.show && <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl font-black text-sm shadow-2xl animate-slideUp border flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{toast.type==='success'?<CheckCircle2 size={18}/>:<AlertCircle size={18}/>}{toast.msg}</div>}
      
      {latestActivity && (
        <div className="fixed bottom-6 left-6 z-[200] max-w-sm bg-white rounded-2xl shadow-3xl border border-slate-100 p-4 flex items-center gap-4 animate-slideInRight">
           <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${latestActivity.type === 'order' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}><Zap size={20} className="animate-pulse" /></div>
           <p className="text-xs font-bold text-slate-700 leading-tight">{latestActivity.text}</p>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900 bg-opacity-40 backdrop-blur-sm z-40 lg:hidden transition-opacity" onClick={()=>setSidebarOpen(false)}></div>}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-8 border-b border-slate-100 shrink-0">
          <h1 className="text-2xl font-black text-indigo-600 font-['Outfit'] flex items-center gap-2"><ShieldCheck size={24} /> ProSpace</h1>
          <button onClick={()=>setSidebarOpen(false)} className="lg:hidden text-slate-400"><X /></button>
        </div>
        <div className="p-6 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {isAdmin ? (
            <>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 px-4 mt-2">Admin Panel Master</p>
              <NavBtn active={activeTab==='admin_overview'} onClick={()=>{setActiveTab('admin_overview'); closeSidebarMobile();}} icon={<Activity size={20} />} label="Overview Visual" />
              <NavBtn active={activeTab==='admin_trans'} onClick={()=>{setActiveTab('admin_trans'); closeSidebarMobile();}} icon={<CheckCircle size={20} />} label="Validasi Bayar" count={adminStats.pendingTrans} />
              <NavBtn active={activeTab==='admin_wd'} onClick={()=>{setActiveTab('admin_wd'); closeSidebarMobile();}} icon={<Wallet size={20} />} label="Pencairan Dana" count={adminStats.pendingWd} />
              <NavBtn active={activeTab==='admin_users'} onClick={()=>{setActiveTab('admin_users'); closeSidebarMobile();}} icon={<Users size={20} />} label="Data Member CRM" />
              <NavBtn active={activeTab==='admin_support'} onClick={()=>{setActiveTab('admin_support'); closeSidebarMobile();}} icon={<MessageCircle size={20} />} label="Support Helpdesk" count={adminStats.openTickets} />
              
              <div className="my-4 border-b border-slate-100"></div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 px-4 mt-2">Sistem AI & Edukasi</p>
              <NavBtn active={activeTab==='admin_ai_config'} onClick={()=>{setActiveTab('admin_ai_config'); closeSidebarMobile();}} icon={<Cpu size={20} />} label="Pengaturan API & AI" />
              <NavBtn active={activeTab==='admin_academy'} onClick={()=>{setActiveTab('admin_academy'); closeSidebarMobile();}} icon={<GraduationCap size={20} />} label="Kelola Academy LMS" />
              <NavBtn active={activeTab==='admin_files'} onClick={()=>{setActiveTab('admin_files'); closeSidebarMobile();}} icon={<Plus size={20} />} label="Kelola Master File" />
              <NavBtn active={activeTab==='admin_coupons'} onClick={()=>{setActiveTab('admin_coupons'); closeSidebarMobile();}} icon={<Tag size={20} />} label="Kelola Kupon" />
              <NavBtn active={activeTab==='admin_lps'} onClick={()=>{setActiveTab('admin_lps'); closeSidebarMobile();}} icon={<MonitorPlay size={20} />} label="Data Landing Page" />
            </>
          ) : (
            <>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Member Menu</p>
              <NavBtn active={activeTab==='dashboard'} onClick={()=>{setActiveTab('dashboard'); closeSidebarMobile();}} icon={<LayoutDashboard size={20} />} label="Dashboard Utama" />
              
              <div className="my-4 border-b border-slate-100"></div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 px-4 mt-2">Studio Kreatif AI</p>
              <NavBtn active={activeTab==='ai_studio'} onClick={()=>{setActiveTab('ai_studio'); closeSidebarMobile();}} icon={<Wand2 size={20} />} label="Studio Ajaib Foto" />
              <NavBtn active={activeTab==='copilot'} onClick={()=>{setActiveTab('copilot'); closeSidebarMobile();}} icon={<Rocket size={20} />} label="Marketing Copilot AI" />
              
              <div className="my-4 border-b border-slate-100"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Akademi & Komunitas</p>
              <NavBtn active={activeTab==='elearning'} onClick={()=>{setActiveTab('elearning'); closeSidebarMobile();}} icon={<GraduationCap size={20} />} label="ProSpace Academy" />
              <NavBtn active={activeTab==='focus'} onClick={()=>{setActiveTab('focus'); closeSidebarMobile();}} icon={<Headphones size={20} />} label="Ruang Fokus VIP" />
              <NavBtn active={activeTab==='quiz'} onClick={()=>{setActiveTab('quiz'); closeSidebarMobile();}} icon={<BookOpen size={20} />} label="Kuis AI Dinamis" />
              <NavBtn active={activeTab==='community'} onClick={()=>{setActiveTab('community'); closeSidebarMobile();}} icon={<MessageCircle size={20} />} label="Komunitas VIP" />
              
              <div className="my-4 border-b border-slate-100"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Bisnis & Lisensi</p>
              <NavBtn active={activeTab==='files'} onClick={()=>{setActiveTab('files'); closeSidebarMobile();}} icon={<FolderLock size={20} />} label="Katalog Master File" count={files.filter(f=>currentTier>=f.reqLevel).length} />
              <NavBtn active={activeTab==='landingpage'} onClick={()=>{setActiveTab('landingpage'); closeSidebarMobile();}} icon={<LayoutTemplate size={20} />} label="Web Replikator Pribadi" />
              <NavBtn active={activeTab==='affiliate'} onClick={()=>{setActiveTab('affiliate'); closeSidebarMobile();}} icon={<Network size={20} />} label="Penarikan Komisi" />
              <NavBtn active={activeTab==='leaderboard'} onClick={()=>{setActiveTab('leaderboard'); closeSidebarMobile();}} icon={<Trophy size={20} />} label="Peringkat Marketer" />
              <NavBtn active={activeTab==='shop'} onClick={()=>{setActiveTab('shop'); closeSidebarMobile();}} icon={<ShoppingBag size={20} />} label="Kelola Lisensi (Upgrade/Downgrade)" />
              <NavBtn active={activeTab==='transactions'} onClick={()=>{setActiveTab('transactions'); closeSidebarMobile();}} icon={<Banknote size={20} />} label="Riwayat Order" count={[...transactions].filter(t=>t.userId === user?.uid && t.status==='pending').length} />
              <NavBtn active={activeTab==='support'} onClick={()=>{setActiveTab('support'); closeSidebarMobile();}} icon={<LifeBuoy size={20} />} label="Tiket Bantuan" />
            </>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 shrink-0">
          <NavBtn active={activeTab==='profile'} onClick={()=>{setActiveTab('profile'); closeSidebarMobile();}} icon={<Settings size={20} />} label="Pengaturan Profil" />
          <button onClick={()=>signOut(auth)} className="flex items-center gap-4 px-5 py-4 w-full rounded-2xl font-bold text-rose-500 hover:bg-rose-50 group transition-all mt-2">
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /><span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative custom-scrollbar bg-slate-50">
        
        <header className="h-20 bg-white bg-opacity-80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-[100] shrink-0">
          <button onClick={()=>setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 bg-slate-100 rounded-xl"><Menu /></button>
          <div className="flex items-center gap-6 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-tight">{userData?.name || 'Member'}</p>
              {isAdmin ? (
                 <div className="text-[9px] px-2 py-0.5 rounded-full uppercase font-black inline-flex items-center gap-1 mt-1 bg-indigo-100 text-indigo-600 border border-indigo-200">SUPER ADMIN</div>
              ) : (
                 <div className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black inline-block mt-1 ${userRank.bg} ${userRank.color} border ${userRank.border}`}>{userRank.icon} {userRank.name} RANK</div>
              )}
            </div>
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white rounded-2xl flex items-center justify-center font-black shadow-lg">
              {(userData?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-10 w-full max-w-[1400px] mx-auto animate-fadeIn pb-32">
          
          {/* ==================================================== */}
          {/* TAB: DASHBOARD (MEMBER) */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && !isAdmin && (
            <div className="space-y-8">
                <div className={`rounded-[3rem] p-8 sm:p-14 text-white relative shadow-2xl overflow-hidden ${currentTier >= 4 ? 'bg-gradient-to-r from-rose-600 to-orange-600' : 'bg-slate-900'}`}>
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white bg-opacity-20 rounded-full blur-[100px]"></div>
                  <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                    <div className="space-y-4 text-center lg:text-left w-full lg:w-2/3">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-10 rounded-full border border-white border-opacity-10 backdrop-blur-sm">
                         <span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-[10px] font-black uppercase tracking-widest text-white">{TIER_LEVELS[currentTier].name} Member</span>
                      </div>
                      <h2 className="text-3xl sm:text-5xl font-black font-['Outfit'] tracking-tight leading-tight">Halo, {userFirstName}! 👋</h2>
                      <p className={`text-base max-w-xl mx-auto lg:mx-0 leading-relaxed ${currentTier >= 4 ? 'text-rose-100' : 'text-slate-400'}`}>
                        Akses modul interaktif di ProSpace Academy dan gunakan Ajaib Foto Studio untuk meroketkan bisnis digital Anda hari ini.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                         <button onClick={()=>setActiveTab('ai_studio')} className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all text-sm flex items-center justify-center gap-2"><Wand2 size={18} /> BUKA STUDIO AJAIB</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Reward Points" val={userPoints + " PTS"} icon={<Award size={28} />} color="purple" />
                  <StatCard label="Materi Selesai" val={`${completedLessons.length} Modul`} icon={<CheckCircle2 size={28} />} color="indigo" />
                  <StatCard label="Gelar Rank" val={userRank.name} icon={<Trophy size={28} />} color="emerald" />
                  <StatCard label="Saldo Komisi" val={`Rp ${affiliateBalance.toLocaleString('id-ID')}`} icon={<Wallet size={28} />} color="amber" />
                </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: AJAIB FOTO STUDIO */}
          {/* ==================================================== */}
          {activeTab === 'ai_studio' && !isAdmin && (
             currentTier < 1 ? <FeatureLockScreen title="Studio Ajaib Foto" reqTier={1} /> :
             <div className="animate-fadeIn space-y-6">
                <div className="mb-6">
                   <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight flex items-center gap-3">
                     <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-2xl text-white shadow-lg shadow-indigo-200"><Wand2 size={28}/></div> 
                     Studio Ajaib Foto
                   </h2>
                   <p className="text-slate-500 font-medium mt-2">Mesin AI pengolah gambar instan. Ganti background, restorasi foto, hingga bikin banner promosi otomatis.</p>
                </div>

                <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                   {[
                      { id: 'ucapan', label: 'Kartu Ucapan', icon: Gift },
                      { id: 'banner', label: 'Bikin Banner', icon: Megaphone },
                      { id: 'perbaiki', label: 'Perbaiki Foto', icon: Wrench },
                      { id: 'edit', label: 'Edit Foto', icon: Paintbrush },
                      { id: 'model', label: 'Buat Model AI', icon: User },
                      { id: 'photoshoot', label: 'Photoshoot', icon: Camera },
                      { id: 'gabung', label: 'Gabung Foto', icon: Layers },
                      { id: 'gallery', label: 'Galeri Saya', icon: ImageIcon }
                   ].map(item => (
                     <button key={item.id} onClick={() => { setActivePhotoFeature(item.id); setPhotoImages([]); setPhotoInstruction(''); setPhotoResult(null); }} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all whitespace-nowrap border-2 ${activePhotoFeature === item.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200 hover:text-indigo-600'}`}>
                        <item.icon size={16} /> {item.label}
                     </button>
                   ))}
                </div>

                {activePhotoFeature === 'gallery' ? (
                   <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-xl min-h-[500px]">
                      {photoHistory.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                           <ImageIcon size={64} className="mb-4 opacity-30" />
                           <p className="font-bold">Belum ada karya yang disimpan. Buat sekarang!</p>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                            {photoHistory.map(item => (
                               <div key={item.id} className="bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden group">
                                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                                     <img src={item.resultImage} alt="Karya AI" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                     <div className="absolute inset-0 bg-slate-900 bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-3">
                                        <button onClick={()=>downloadImage(item.resultImage)} className="p-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50"><Download size={18}/></button>
                                        <button onClick={()=>deletePhotoHistory(item.id)} className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600"><Trash2 size={18}/></button>
                                     </div>
                                  </div>
                                  <div className="p-4">
                                     <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">{item.feature}</span>
                                     <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic font-medium">"{item.instruction}"</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                ) : (
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-5 space-y-6">
                         <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                               <h3 className="font-black text-slate-800 text-lg">{getPhotoFeatureTexts().title}</h3>
                               {activePhotoFeature !== 'model' && <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{photoImages.length} / {getPhotoFeatureTexts().max}</span>}
                            </div>
                            <p className="text-xs text-slate-500 font-medium mb-6">{getPhotoFeatureTexts().desc}</p>
                            
                            {photoImages.length > 0 && (
                               <div className="grid grid-cols-2 gap-4 mb-6">
                                  {photoImages.map((img, i) => (
                                     <div key={i} className="aspect-square rounded-2xl border border-slate-200 relative overflow-hidden group">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button onClick={() => setPhotoImages(photoImages.filter((_, idx)=>idx!==i))} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={14}/></button>
                                     </div>
                                  ))}
                               </div>
                            )}

                            {photoImages.length < getPhotoFeatureTexts().max && (
                               <div onClick={()=>fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all">
                                  <div className="bg-white p-3 rounded-xl shadow-sm mb-3"><Upload size={24} className="text-indigo-400"/></div>
                                  <p className="text-xs font-bold text-slate-600">Klik untuk upload foto (JPG/PNG)</p>
                                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/jpeg, image/png" multiple={activePhotoFeature==='gabung'} className="hidden" />
                               </div>
                            )}
                         </div>

                         <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl">
                            <h3 className="font-black text-slate-800 text-lg mb-4">Instruksi AI (Prompt)</h3>
                            {activePhotoFeature !== 'gabung' && (
                               <div className="flex flex-wrap gap-2 mb-4">
                                  {(photoPresets[activePhotoFeature] || photoPresets['edit']).map((preset, idx) => (
                                     <button key={idx} onClick={()=>setPhotoInstruction(preset)} className="text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-all text-left line-clamp-1 max-w-full">{preset}</button>
                                  ))}
                               </div>
                            )}
                            <textarea value={photoInstruction} onChange={e=>setPhotoInstruction(e.target.value)} placeholder="Deskripsikan dengan jelas apa yang ingin Anda buat atau ubah pada foto..." className="w-full h-32 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium resize-none custom-scrollbar" />
                            
                            <button onClick={handleGeneratePhoto} disabled={isGeneratingPhoto || (activePhotoFeature==='gabung' && photoImages.length<2) || (['photoshoot','edit','perbaiki','banner','ucapan'].includes(activePhotoFeature) && photoImages.length<1) || !photoInstruction.trim()} className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-105 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:scale-100">
                               {isGeneratingPhoto ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                               {isGeneratingPhoto ? 'MEMPROSES AI...' : 'SULAP SEKARANG'}
                            </button>
                         </div>
                      </div>

                      <div className="lg:col-span-7 bg-white rounded-[3rem] border border-slate-200 p-8 shadow-xl flex flex-col min-h-[600px]">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><ImageIcon className="text-indigo-500" size={20}/> Kanvas Hasil</h3>
                            {photoResult && <button onClick={()=>downloadImage(photoResult)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-1 hover:bg-indigo-100"><Download size={14}/> Download HD</button>}
                         </div>
                         <div className="flex-1 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                            {isGeneratingPhoto ? (
                               <div className="flex flex-col items-center text-center p-8">
                                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                                  <h4 className="font-black text-slate-800 text-lg">{photoGenStatus}</h4>
                                  <p className="text-xs font-bold text-slate-400 mt-2 max-w-xs">Dual-Model AI Engine sedang bekerja memproses resolusi tinggi...</p>
                               </div>
                            ) : photoResult ? (
                               <img src={photoResult} alt="Hasil AI" className="w-full h-full object-contain p-4" />
                            ) : (
                               <div className="flex flex-col items-center text-slate-300">
                                  <Paintbrush size={64} className="mb-4 opacity-50" />
                                  <p className="font-bold text-sm">Area preview kosong. Mulai instruksikan AI di sebelah kiri.</p>
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                )}
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ELEARNING */}
          {/* ==================================================== */}
          {activeTab === 'elearning' && (
             <div className="animate-fadeIn space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">ProSpace Academy</h2>
                    <p className="text-slate-500 font-medium">Platform e-learning interaktif. Pelajari materi, kerjakan kuis, dan kumpulkan poin.</p>
                  </div>
                </div>
                {academyModules.length === 0 ? (
                    <div className="bg-white p-12 rounded-[2.5rem] border text-center text-slate-400 font-bold shadow-xl">
                        <GraduationCap size={48} className="mx-auto mb-4 opacity-50" /> Belum ada modul.
                    </div>
                ) : (
                <div className="flex flex-col lg:flex-row gap-8">
                   <div className="w-full lg:w-1/3 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 h-max">
                     <h3 className="font-black text-lg mb-6 text-slate-800">Kurikulum</h3>
                     {academyModules.map(mod => (
                        <div key={mod.id} className="mb-6">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">{mod.title}</h4>
                          <div className="space-y-2">
                            {mod.lessons?.map(lesson => {
                               const isDone = completedLessons.includes(lesson.id);
                               const isActive = activeLessonId === lesson.id;
                               return (
                                 <button key={lesson.id} onClick={() => {setActiveCourseId(mod.id); setActiveLessonId(lesson.id); setQuizSelection(null);}} className={`w-full text-left flex items-center justify-between p-3.5 rounded-xl transition-all ${isActive ? 'bg-indigo-50 border-indigo-200 border text-indigo-700 shadow-sm' : 'hover:bg-slate-50 border border-transparent text-slate-600'}`}>
                                   <div className="flex items-center gap-3"><div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{lesson.type === 'video' ? <PlaySquare size={16} /> : lesson.type === 'quiz' ? <HelpCircle size={16} /> : <FileText size={16} />}</div><span className="text-sm font-bold truncate pr-2">{lesson.title}</span></div>
                                   {isDone && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
                                 </button>
                               )
                            })}
                          </div>
                        </div>
                     ))}
                   </div>
                   {activeLesson ? (
                     <div className="w-full lg:w-2/3 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-max">
                        {activeLesson.type === 'video' && (<div className="w-full aspect-video bg-slate-900 relative"><iframe width="100%" height="100%" src={activeLesson.content} title="Video Player" frameBorder="0" allowFullScreen></iframe></div>)}
                        <div className="p-8 sm:p-12 flex-1 flex flex-col">
                           <div className="mb-8">
                              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase tracking-widest rounded-full mb-4 inline-block">Materi Pembelajaran</span>
                              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-4">{activeLesson.title}</h2>
                              {activeLesson.type !== 'quiz' && (<div className="text-slate-600 leading-relaxed text-lg font-medium" dangerouslySetInnerHTML={{__html: sanitizeHTML(activeLesson.desc || activeLesson.content)}}></div>)}
                              {activeLesson.type === 'quiz' && (
                                 <div className="mt-4">
                                    <p className="text-lg font-bold text-slate-800 mb-6">{activeLesson.question}</p>
                                    <div className="space-y-3">
                                       {activeLesson.options?.map((opt, idx) => (
                                          <button key={idx} onClick={() => setQuizSelection(idx)} disabled={isLessonCompleted} className={`w-full text-left p-5 rounded-2xl border-2 font-bold text-sm sm:text-base transition-all ${quizSelection === idx ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'} ${isLessonCompleted && activeLesson.answer === idx ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : ''}`}>
                                             <span className="inline-block w-8 h-8 bg-slate-100 text-slate-500 rounded-full text-center leading-8 mr-4">{['A','B','C','D'][idx]}</span>{opt}{isLessonCompleted && activeLesson.answer === idx && <CheckCircle2 className="inline float-right text-emerald-500 mt-1" size={20} />}
                                          </button>
                                       ))}
                                    </div>
                                    {isLessonCompleted && (<div className="mt-8 bg-indigo-50 p-6 rounded-2xl border border-indigo-100"><p className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-2">Penjelasan:</p><p className="text-slate-700 font-medium">{activeLesson.exp}</p></div>)}
                                 </div>
                              )}
                           </div>
                           <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
                              <p className="text-slate-500 font-bold text-sm flex items-center gap-2"><Award className="text-amber-500" size={18} /> Hadiah +{activeLesson.points} Poin</p>
                              {isLessonCompleted ? (<button disabled className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-not-allowed"><CheckCircle2 size={18} /> MATERI SELESAI</button>) : (<button disabled={isProcessingAction.current} onClick={() => handleCompleteLearning(activeLesson, activeLesson.type === 'quiz', quizSelection)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50">{activeLesson.type === 'quiz' ? 'KIRIM JAWABAN' : 'TANDAI SELESAI'}</button>)}
                           </div>
                        </div>
                     </div>
                   ) : (<div className="w-full lg:w-2/3 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex items-center justify-center p-10 text-slate-400 font-bold">Pilih materi di kurikulum untuk mulai belajar.</div>)}
                </div>
                )}
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: RUANG FOKUS VIP (POMODORO) */}
          {/* ==================================================== */}
          {activeTab === 'focus' && !isAdmin && (
             currentTier < 2 ? <FeatureLockScreen title="Ruang Fokus VIP" reqTier={2} /> :
             <div className="animate-fadeIn max-w-2xl mx-auto space-y-8 text-center">
                 <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full mb-2 shadow-lg shadow-indigo-100"><Timer size={40} /></div>
                 <h2 className="text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Ruang Fokus VIP</h2>
                 <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Tingkatkan produktivitas Anda dengan teknik Pomodoro. Fokus selama 25 menit untuk mendapatkan <strong className="text-indigo-600">+25 Poin Reward</strong>.</p>
                 <div className={`bg-white rounded-[3rem] p-12 border ${focusMode === 'work' ? 'border-indigo-200 shadow-[0_20px_60px_rgba(79,70,229,0.15)]' : 'border-emerald-200 shadow-[0_20px_60px_rgba(16,185,129,0.15)]'} transition-all duration-500`}>
                     <div className="flex justify-center gap-4 mb-10">
                         <span className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest ${focusMode === 'work' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Sesi Fokus</span>
                         <span className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest ${focusMode === 'break' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Istirahat</span>
                     </div>
                     <div className={`text-8xl sm:text-9xl font-black font-['Outfit'] mb-12 tracking-tighter ${focusMode === 'work' ? 'text-indigo-900' : 'text-emerald-900'}`}>{formatTime(focusTimeLeft)}</div>
                     <div className="flex justify-center gap-4">
                         {!isFocusing ? (
                             <button onClick={() => setIsFocusing(true)} className={`px-12 py-5 rounded-2xl font-black text-white shadow-xl hover:scale-105 transition-all text-lg ${focusMode === 'work' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>MULAI {focusMode === 'work' ? 'FOKUS' : 'ISTIRAHAT'}</button>
                         ) : (
                             <>
                                 <button onClick={() => setIsFocusing(false)} className="px-8 py-5 rounded-2xl font-black bg-amber-500 text-white shadow-xl hover:bg-amber-600 transition-all text-lg">JEDA</button>
                                 <button onClick={() => {setIsFocusing(false); setFocusTimeLeft(focusMode === 'work' ? 25*60 : 5*60);}} className="px-8 py-5 rounded-2xl font-black bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all text-lg">RESET</button>
                             </>
                         )}
                     </div>
                 </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: KUIS AI DINAMIS EDUKASI */}
          {/* ==================================================== */}
          {activeTab === 'quiz' && !isAdmin && (
             <div className="animate-fadeIn max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-3 mb-10">
                   <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-2 shadow-lg shadow-blue-100"><BookOpen size={32} /></div>
                   <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Kuis Pintar AI</h2>
                   <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Jawab benar untuk <strong className="text-emerald-600">+20 Poin Reward</strong> hari ini.</p>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-slate-200 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col justify-center">
                    {!aiQuiz && !isGeneratingQuiz && (
                        <div className="text-center">
                            <button onClick={handleGenerateAIQuiz} className="bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto"><Bot size={20} /> MINTA AI BUATKAN KUIS SEKARANG</button>
                        </div>
                    )}
                    {isGeneratingQuiz && (
                        <div className="text-center space-y-4"><div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div><p className="font-bold text-indigo-600 animate-pulse">AI sedang meracik pertanyaan khusus untuk Anda...</p></div>
                    )}
                    {aiQuiz && !isGeneratingQuiz && (
                        <div className="animate-fadeIn">
                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-8 leading-relaxed">{aiQuiz.q}</h3>
                            <div className="space-y-3">
                                {aiQuiz.options.map((opt, idx) => (
                                    <button key={idx} onClick={() => handleAnswerQuiz(idx)} disabled={isQuizProcessing || selectedQuizAnswer !== null} className={`w-full text-left p-5 rounded-2xl border-2 font-bold text-sm sm:text-base transition-all ${selectedQuizAnswer === idx ? (idx === aiQuiz.answer ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50') : 'border-slate-200 bg-white hover:border-indigo-600'} ${selectedQuizAnswer !== null && idx === aiQuiz.answer ? 'border-emerald-500 bg-emerald-50' : ''}`}>
                                        <span className="inline-block w-8 h-8 bg-slate-100 text-slate-500 rounded-full text-center leading-8 mr-4">{['A','B','C','D'][idx]}</span>{opt}
                                    </button>
                                ))}
                            </div>
                            {selectedQuizAnswer !== null && !isQuizProcessing && (
                                <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-slideUp">
                                    <p className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-2">Penjelasan AI:</p><p className="text-slate-700 font-medium leading-relaxed">{aiQuiz.exp}</p>
                                    <button onClick={handleGenerateAIQuiz} className="mt-6 text-sm font-black text-indigo-600 hover:underline flex items-center gap-1"><RefreshCw size={14} /> GENERATE KUIS LAIN (LATIHAN)</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: COMMUNITY (LIVE CHAT) */}
          {/* ==================================================== */}
          {activeTab === 'community' && (
             <div className="animate-fadeIn h-[calc(100vh-140px)] flex flex-col">
                <div className="mb-6 shrink-0"><h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight text-slate-900 leading-none">Komunitas VIP</h2></div>
                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col overflow-hidden relative">
                   <div className="flex-1 p-6 overflow-y-auto bg-slate-50 flex flex-col gap-4 custom-scrollbar">
                      {sortedChat.map(msg => {
                         const isMe = msg.userId === user?.uid;
                         return (
                             <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                 <div className={`max-w-[80%] rounded-2xl p-4 relative ${msg.isAdmin ? 'bg-indigo-600 text-white rounded-tl-none shadow-lg' : isMe ? 'bg-emerald-500 text-white rounded-tr-none shadow-lg' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'}`}>
                                    {isAdmin && !isMe && (<button onClick={()=>handleDeleteChat(msg.id)} className="absolute -right-8 top-0 p-1 text-rose-300 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>)}
                                    {!isMe && (<div className="flex items-center gap-2 mb-1.5"><span className={`text-[10px] font-black ${msg.isAdmin ? 'text-indigo-200' : 'text-slate-500'}`}>{msg.userName}</span></div>)}
                                    <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{__html: sanitizeHTML(msg.text)}}></p>
                                 </div>
                             </div>
                         )
                      })}
                      <div ref={chatEndRef} />
                   </div>
                   <form onSubmit={handleSendChat} className="p-4 bg-white border-t flex gap-2 shrink-0">
                       <input type="text" placeholder="Ketik pesan..." className="flex-1 px-5 py-4 bg-slate-100 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-indigo-500" value={chatInput} onChange={e=>setChatInput(e.target.value)} required />
                       <button type="submit" disabled={isProcessingAction.current} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"><Send size={20} /></button>
                   </form>
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: FILES (MASTER FILES) */}
          {/* ==================================================== */}
          {activeTab === 'files' && !isAdmin && (
             <div className="space-y-10 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Katalog Master File</h2>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input type="text" placeholder="Cari materi..." value={searchFileQuery} onChange={e=>setSearchFileQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                   {filteredFiles.map(f => (
                     <ProFileCard key={f.id} file={f} currentTier={currentTier} isCompleted={completedFiles.includes(f.id)} onToggleProgress={() => handleToggleFileProgress(f.id, f.name)} isAdminCard={false} />
                   ))}
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: WEB REPLIKATOR PRIBADI (MEMBER) */}
          {/* ==================================================== */}
          {activeTab === 'landingpage' && !isAdmin && (
             currentTier < 3 ? <FeatureLockScreen title="Web Replikator" reqTier={3} /> :
             <div className="animate-fadeIn space-y-8 max-w-4xl mx-auto">
                 <div className="text-center space-y-4 mb-10">
                     <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-2 shadow-lg shadow-blue-100"><LayoutTemplate size={32} /></div>
                     <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Web Replikator AI</h2>
                 </div>
                 <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-8 sm:p-12 overflow-hidden">
                     {!myLandingPage ? (
                         <div className="text-center py-10"><button onClick={handleGenerateLandingPage} disabled={isGeneratingLP} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black px-10 py-5 rounded-2xl shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-3 mx-auto disabled:opacity-50">{isGeneratingLP ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Wand2 size={24} />}{isGeneratingLP ? 'MERAKIT...' : 'GENERATE LANDING PAGE'}</button></div>
                     ) : (
                         <div className="space-y-10">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                 <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status Web</p><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span><span className="font-black text-slate-800 text-lg">ONLINE</span></div></div>
                                 <div className="flex gap-3 w-full sm:w-auto">
                                    <button onClick={() => window.open(`https://member.bagihosting.com/?ref=${user?.uid}`, '_blank')} className="flex-1 sm:flex-none bg-slate-900 text-white font-black px-6 py-3.5 rounded-xl hover:bg-indigo-600 transition-all text-sm flex items-center justify-center gap-2 shadow-lg"><Globe size={18} /> KUNJUNGI WEB</button>
                                    <button onClick={() => setIsEditingLP(!isEditingLP)} className={`flex-1 sm:flex-none font-black px-6 py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 border-2 ${isEditingLP ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}><Edit3 size={18} /> {isEditingLP ? 'TUTUP EDITOR' : 'EDIT KONTEN'}</button>
                                 </div>
                             </div>
                             <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden"><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 relative z-10">Link Referal</p><div className="flex bg-white border border-indigo-200 rounded-xl p-2 items-center relative z-10 shadow-sm"><input type="text" readOnly value={`https://member.bagihosting.com/?ref=${user?.uid}`} className="bg-transparent flex-1 outline-none text-sm font-bold text-slate-700 px-3 truncate" /><button onClick={() => copyToClipboard(`https://member.bagihosting.com/?ref=${user?.uid}`)} className="bg-indigo-600 text-white px-5 py-3 rounded-lg font-black text-xs hover:bg-indigo-700 transition-colors shadow-md">COPY LINK</button></div></div>
                             {isEditingLP && (
                                 <form onSubmit={handleUpdateLandingPage} className="border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 bg-white animate-slideUp relative">
                                    <h3 className="font-black text-lg text-slate-800 mb-6 border-b border-slate-100 pb-4">Edit Konten Halaman</h3>
                                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headline Utama</label><textarea rows="2" value={editLPForm?.heroHeadline || ''} onChange={e=>setEditLPForm({...editLPForm, heroHeadline: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm resize-none"></textarea></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Domain</label><input type="text" value={editLPForm?.customDomain || ''} onChange={e=>setEditLPForm({...editLPForm, customDomain: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" placeholder="Tanpa https:// (misal: www.webku.com)" /></div>
                                    <div className="pt-6 border-t border-slate-100 flex gap-4"><button type="submit" disabled={isProcessingAction.current} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex justify-center items-center gap-2"><Save size={18} /> SIMPAN</button></div>
                                 </form>
                             )}
                         </div>
                     )}
                 </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: MARKETING COPILOT */}
          {/* ==================================================== */}
          {activeTab === 'copilot' && !isAdmin && (
             currentTier < 2 ? <FeatureLockScreen title="Marketing Copilot AI" reqTier={2} /> :
             <div className="animate-fadeIn space-y-8">
                 <div className="text-center sm:text-left mb-6">
                     <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] flex items-center justify-center sm:justify-start gap-3"><Rocket className="text-indigo-600" size={36} /> AI Marketing Copilot</h2>
                 </div>
                 <div className="flex flex-col lg:flex-row gap-10">
                     <div className="w-full lg:w-1/2 bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-slate-200">
                         <form onSubmit={handleGenerateCopy} className="space-y-6">
                             <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Produk / Campaign</label><input type="text" className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={copilotForm.product} onChange={e=>setCopilotForm({...copilotForm, product: e.target.value})} required /></div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform</label><select className="w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm" value={copilotForm.platform} onChange={e=>setCopilotForm({...copilotForm, platform: e.target.value})}><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option></select></div>
                                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gaya Bahasa</label><select className="w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm" value={copilotForm.tone} onChange={e=>setCopilotForm({...copilotForm, tone: e.target.value})}><option value="fomo">Mendesak (FOMO)</option><option value="santai">Santai / Asik</option><option value="profesional">Profesional</option></select></div>
                             </div>
                             <button type="submit" disabled={isGeneratingCopy} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-5 rounded-2xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50">{isGeneratingCopy ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}{isGeneratingCopy ? 'MENULIS...' : 'GENERATE COPYWRITING'}</button>
                         </form>
                     </div>
                     <div className="w-full lg:w-1/2 flex flex-col items-center bg-slate-100 rounded-[2.5rem] p-8 border border-slate-200 shadow-inner">
                         <div className="w-full max-w-[300px] h-[550px] bg-slate-900 border-[12px] border-slate-900 rounded-[3rem] shadow-2xl relative flex flex-col overflow-hidden shrink-0">
                             <div className="flex-1 bg-[#E5DDD5] overflow-y-auto p-4 pt-12 space-y-4 custom-scrollbar">
                                 <div className="bg-[#DCF8C6] p-3 rounded-2xl rounded-tr-none text-sm text-slate-800 shadow-sm whitespace-pre-wrap ml-auto relative">{isGeneratingCopy ? <span className="animate-pulse">Mengetik...</span> : <span dangerouslySetInnerHTML={{__html: copilotResult || "Preview copywriting akan muncul di sini..."}}></span>}</div>
                             </div>
                         </div>
                         {copilotResult && <button onClick={()=>copyToClipboard(copilotResult.replace(/<[^>]*>?/gm, ''))} className="mt-4 bg-white text-indigo-600 px-6 py-3 rounded-xl font-black text-xs shadow-md"><Copy size={14} className="inline mr-2"/> Salin Teks</button>}
                     </div>
                 </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: AFFILIATE (MEMBER) */}
          {/* ==================================================== */}
          {activeTab === 'affiliate' && !isAdmin && (
             <div className="animate-fadeIn space-y-10">
                <h2 className="text-3xl font-black text-slate-900">Program Afiliasi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className={`rounded-[2rem] p-10 text-white shadow-xl ${currentTier >= 4 ? 'bg-gradient-to-r from-rose-600 to-orange-600' : 'bg-indigo-600'}`}>
                      <p className="text-[10px] font-black uppercase text-white opacity-80">Saldo Komisi Aktif (Bagi Hasil {TIER_LEVELS[currentTier]?.comm * 100}%)</p>
                      <p className="text-5xl font-black mt-2 font-['Outfit']">Rp {affiliateBalance.toLocaleString('id-ID')}</p>
                      <button onClick={handleRequestWithdrawal} disabled={isProcessingAction.current} className={`mt-8 px-6 py-4 rounded-xl font-black text-sm shadow-lg hover:scale-105 transition-transform disabled:opacity-50 ${currentTier >= 4 ? 'bg-white text-rose-600' : 'bg-white text-indigo-600'}`}>TARIK SALDO KE REKENING</button>
                   </div>
                   <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Link Referral Anda</p>
                      <div className="flex bg-slate-50 border rounded-xl p-2 items-center">
                         <input type="text" readOnly value={`https://member.bagihosting.com/?ref=${user?.uid}`} className="bg-transparent flex-1 outline-none text-sm font-bold text-slate-600 px-3 truncate" />
                         <button onClick={()=>copyToClipboard(`https://member.bagihosting.com/?ref=${user?.uid}`)} className="bg-indigo-100 text-indigo-600 p-3 rounded-lg hover:bg-indigo-200"><Copy size={16} /></button>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: LEADERBOARD */}
          {/* ==================================================== */}
          {activeTab === 'leaderboard' && (
             <div className="animate-fadeIn space-y-10">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                   <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border-4 border-amber-100"><Trophy size={40} /></div>
                   <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Top Affiliate Leaderboard</h2>
                </div>
                <div className="max-w-3xl mx-auto bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl p-6">
                   {leaderboardData.map((lb, index) => (
                      <div key={lb.uid} className={`flex items-center p-4 sm:p-6 mb-3 rounded-2xl border ${index<3 ? 'bg-amber-50 border-amber-200 shadow-md transform scale-[1.01]' : 'bg-white border-slate-100'}`}>
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${index === 0 ? 'bg-amber-400 text-white shadow-lg' : index === 1 ? 'bg-slate-300 text-white shadow-lg' : index === 2 ? 'bg-orange-300 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>#{index + 1}</div>
                         <div className="ml-4 flex-1 min-w-0">
                            <h4 className="font-black text-slate-900 text-lg truncate">{isAdmin ? (lb.name||'Member') : (lb.name ? lb.name.split(' ')[0] + ' ***' : 'Member ***')}</h4>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Total Komisi</p>
                            <p className="font-black text-lg sm:text-xl text-slate-800">Rp {lb.totalEarned.toLocaleString('id-ID')}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: SHOP / UPGRADE / DOWNGRADE LISENSI */}
          {/* ==================================================== */}
          {activeTab === 'shop' && !isAdmin && (
             <div className="animate-fadeIn space-y-12">
               <div className="text-center max-w-2xl mx-auto space-y-4 px-4"><span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">Pricing Plan</span><h2 className="text-4xl font-black text-slate-900 font-['Outfit']">Kelola Paket & Lisensi</h2></div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                 {[0, 1, 2, 3, 4].map(lv => {
                   const isActive = currentTier === lv; 
                   const isUpgrade = currentTier < lv;
                   const isDowngrade = currentTier > lv;
                   const hasPendingAny = transactions.some(t => t.userId === user?.uid && t.status === 'pending');
                   const isThisPending = transactions.some(t => t.userId === user?.uid && t.packageLevel === lv && t.status === 'pending');
                   const isVIP = lv === 4;

                   let btnText = "PILIH PAKET";
                   if (isActive) btnText = "AKTIF SAAT INI";
                   else if (isThisPending) btnText = "MENUNGGU VALIDASI";
                   else if (hasPendingAny) btnText = "TUNGGU VALIDASI LAIN";
                   else if (isUpgrade) btnText = "UPGRADE KE SINI";
                   else if (isDowngrade) btnText = "DOWNGRADE KE SINI";

                   return (
                     <div key={lv} className={`bg-white rounded-[2rem] border-2 p-6 flex flex-col h-full transition-all relative ${isVIP ? 'border-amber-400 shadow-[0_20px_50px_rgba(251,191,36,0.2)] scale-[1.02] z-10' : isActive ? 'border-emerald-500 shadow-2xl scale-[1.02] z-10' : 'border-slate-100 hover:border-slate-300 shadow-xl'}`}>
                        {isActive && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black tracking-widest flex items-center gap-1 shadow-md whitespace-nowrap"><CheckCircle2 size={12}/> PAKET AKTIF</div>}
                        {!isActive && isVIP && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-[9px] font-black tracking-widest flex items-center gap-1 shadow-md whitespace-nowrap"><Crown size={12}/> BEST VALUE</div>}
                        
                        <h3 className={`text-xl font-black mb-1 uppercase ${isVIP ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-500' : 'text-slate-900'}`}>{TIER_LEVELS[lv].name}</h3>
                        <p className="text-[11px] text-slate-500 mb-4 min-h-[34px] font-medium leading-tight">{TIER_LEVELS[lv].desc}</p>
                        <span className={`text-2xl font-black mb-6 ${isVIP ? 'text-rose-600' : isActive ? 'text-emerald-600' : 'text-indigo-600'}`}>Rp {TIER_LEVELS[lv].price.toLocaleString('id-ID')}</span>
                        <ul className="space-y-3 mb-6 flex-1">{TIER_LEVELS[lv].features.map((f, i) => (<li key={i} className="flex items-start gap-2"><CheckCircle2 size={16} className={`${isVIP ? 'text-rose-500' : isActive ? 'text-emerald-500' : 'text-indigo-500'} shrink-0`} /><span className="text-[13px] font-medium text-slate-600 leading-tight">{f}</span></li>))}</ul>
                        <button onClick={() => {setCheckoutPkg({...TIER_LEVELS[lv], level: lv}); setAppliedCoupon(null); setCouponInput(''); window.scrollTo(0,0);}} disabled={isActive||hasPendingAny} className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest ${isActive||hasPendingAny ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : isVIP ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:scale-105 shadow-lg' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-md transition-transform hover:-translate-y-1'}`}>{btnText}</button>
                     </div>
                   )
                 })}
               </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: TRANSACTIONS (MEMBER VIEW) */}
          {/* ==================================================== */}
          {activeTab === 'transactions' && !isAdmin && (
            <div className="animate-fadeIn space-y-10">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Riwayat Transaksi Lisensi</h2>
               <div className="grid grid-cols-1 gap-4">
                 {[...transactions].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                       <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.status === 'pending' ? 'bg-amber-50 text-amber-500' : t.status === 'rejected' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}><Clock size={28} /></div>
                          <div><h4 className="text-lg font-black text-slate-800">Paket {t.packageName}</h4><p className="text-xs font-bold text-slate-500 mt-1">Rp {t.price.toLocaleString('id-ID')}</p></div>
                       </div>
                       <div className="text-right">
                          <p className={`font-black uppercase text-xs ${t.status === 'pending' ? 'text-amber-500' : t.status === 'rejected' ? 'text-rose-500' : 'text-emerald-500'}`}>{t.status}</p>
                          {t.status === 'pending' && <button onClick={()=>openWhatsAppConfirmation({name: t.packageName, price: t.price})} className="mt-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg">Info WA</button>}
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: TIKET BANTUAN (MEMBER VIEW) */}
          {/* ==================================================== */}
          {activeTab === 'support' && !isAdmin && (
              <div className="animate-fadeIn space-y-10 max-w-4xl mx-auto">
                 <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Pusat Bantuan</h2>
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                    <h3 className="font-black text-lg text-slate-800 mb-6">Buat Tiket Baru</h3>
                    <form onSubmit={handleCreateTicket} className="space-y-4">
                        <input type="text" required value={ticketForm.subject} onChange={e=>setTicketForm({...ticketForm, subject: e.target.value})} placeholder="Subjek Masalah" className="w-full px-5 py-4 rounded-xl border focus:ring-2 outline-none font-bold text-sm" />
                        <textarea required value={ticketForm.message} onChange={e=>setTicketForm({...ticketForm, message: e.target.value})} placeholder="Jelaskan masalah Anda..." rows="4" className="w-full px-5 py-4 rounded-xl border focus:ring-2 outline-none font-medium text-sm custom-scrollbar"></textarea>
                        <button type="submit" disabled={isProcessingAction.current} className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-black text-sm shadow-md hover:bg-indigo-700">KIRIM TIKET</button>
                    </form>
                 </div>
                 <div className="space-y-4">
                    <h3 className="font-black text-xl text-slate-800">Riwayat Tiket Saya</h3>
                    {tickets.map(t => (
                        <div key={t.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div><h4 className="font-black text-slate-800 text-lg">{t.subject}</h4></div>
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${t.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{t.status}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 whitespace-pre-wrap">{t.message}</div>
                            {t.adminReply && (
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Balasan Admin:</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: t.adminReply}}></p>
                                </div>
                            )}
                        </div>
                    ))}
                 </div>
              </div>
          )}

          {/* ==================================================== */}
          {/* TAB: PROFILE (MEMBER & ADMIN) */}
          {/* ==================================================== */}
          {activeTab === 'profile' && (
             <div className="animate-fadeIn max-w-2xl mx-auto">
               <h2 className="text-3xl font-black text-slate-900 mb-8">Pengaturan Profil</h2>
               <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-2xl">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                     <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">Nomor WhatsApp</label><input type="text" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-sm" value={profileForm.phone} onChange={e=>setProfileForm({...profileForm, phone: e.target.value})} /></div>
                     <div className="pt-4 border-t border-slate-100"><h4 className="font-black text-slate-800 mb-4">Data Rekening (WD)</h4><div className="grid grid-cols-2 gap-6"><input type="text" placeholder="Bank" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-sm" value={profileForm.bank} onChange={e=>setProfileForm({...profileForm, bank: e.target.value})} /><input type="text" placeholder="No Rekening" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border font-bold text-sm" value={profileForm.accountNo} onChange={e=>setProfileForm({...profileForm, accountNo: e.target.value})} /></div></div>
                     <button type="submit" disabled={isProcessingAction.current} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-600 transition-all">SIMPAN PROFIL</button>
                  </form>
               </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN OVERVIEW */}
          {/* ==================================================== */}
          {activeTab === 'admin_overview' && isAdmin && (
            <div className="space-y-8 animate-fadeIn">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">Admin Dashboard Visual</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative shadow-xl overflow-hidden"><p className="text-[10px] font-black uppercase text-indigo-200 relative z-10">Pendapatan Bersih</p><p className="text-4xl font-black mt-2 relative z-10">Rp {adminStats.totalRev.toLocaleString('id-ID')}</p></div>
                 <div className="bg-white rounded-[2.5rem] p-10 border shadow-sm"><p className="text-[10px] font-black uppercase text-slate-400">Total Member</p><p className="text-4xl font-black mt-2 text-slate-800">{allUsers.length}</p></div>
                 <div className="bg-amber-50 rounded-[2.5rem] p-10 border border-amber-200 cursor-pointer" onClick={()=>setActiveTab('admin_trans')}><p className="text-[10px] font-black uppercase text-amber-600">Validasi Pending</p><p className="text-4xl font-black mt-2 text-amber-600">{adminStats.pendingTrans}</p></div>
                 <div className="bg-rose-50 rounded-[2.5rem] p-10 border border-rose-200 cursor-pointer" onClick={()=>setActiveTab('admin_wd')}><p className="text-[10px] font-black uppercase text-rose-600">Request WD</p><p className="text-4xl font-black mt-2 text-rose-600">{adminStats.pendingWd}</p></div>
               </div>
               <button onClick={handleExportCSV} className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 uppercase tracking-widest"><DownloadCloud size={20} /> Download DB Member</button>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN TRANS */}
          {/* ==================================================== */}
          {activeTab === 'admin_trans' && isAdmin && (
            <div className="space-y-10 animate-fadeIn">
               <h2 className="text-3xl font-black text-slate-900">Validasi Pembayaran</h2>
               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                       <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr><th className="px-8 py-5">Invoice & User</th><th className="px-8 py-5">Data Konfirmasi</th><th className="px-8 py-5">Tagihan</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {transactions.filter(t => t.status==='pending').map(t => (
                            <tr key={t.id}>
                               <td className="px-8 py-6"><p className="font-black text-slate-900 text-sm">{t.userName}</p><p className="text-[10px] text-slate-400 font-mono">{t.id}</p></td>
                               <td className="px-8 py-6"><div className="bg-slate-100 p-3 rounded-xl text-xs font-bold"><p>Pengirim: {t.senderName}</p><p>Bank: {t.senderBank}</p>{t.notes && <p className="mt-1 italic font-medium text-slate-500">Catatan: {t.notes}</p>}</div></td>
                               <td className="px-8 py-6 font-black text-indigo-600">Rp {t.price.toLocaleString('id-ID')}</td>
                               <td className="px-8 py-6 text-center">
                                  <div className="flex justify-center gap-2">
                                     <button onClick={()=>handleTransactionAction(t, 'approve')} disabled={isProcessingAction.current} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-50">TERIMA</button>
                                     <button onClick={()=>handleTransactionAction(t, 'reject')} disabled={isProcessingAction.current} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase disabled:opacity-50"><XCircle size={14} /></button>
                                  </div>
                               </td>
                            </tr>
                          ))}
                          {transactions.filter(t => t.status==='pending').length === 0 && <tr><td colSpan="4" className="text-center py-10 text-slate-400 font-bold">Tidak ada transaksi pending.</td></tr>}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN WITHDRAWAL */}
          {/* ==================================================== */}
          {activeTab === 'admin_wd' && isAdmin && (
            <div className="space-y-10 animate-fadeIn">
               <h2 className="text-3xl font-black text-slate-900">Kelola Pencairan Dana (WD)</h2>
               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                       <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr><th className="px-8 py-5">Afiliator</th><th className="px-8 py-5">Data Rekening Tujuan</th><th className="px-8 py-5">Nominal Tarik</th><th className="px-8 py-5 text-center">Tindakan Admin</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {withdrawals.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(w => (
                            <tr key={w.id} className="hover:bg-slate-50 transition-all">
                               <td className="px-8 py-6"><p className="font-black text-slate-900 text-sm">{w.userName}</p><p className="text-[10px] text-slate-400 mt-1">{new Date(w.createdAt).toLocaleString('id-ID')}</p></td>
                               <td className="px-8 py-6"><p className="font-black text-indigo-600 text-sm">{w.bank}</p><p className="font-mono text-slate-700 font-bold text-xs mt-0.5">{w.accountNo}</p></td>
                               <td className="px-8 py-6"><p className="font-black text-slate-900 text-base">Rp {w.amount.toLocaleString('id-ID')}</p><p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${w.status === 'pending' ? 'text-amber-500' : w.status === 'approved' ? 'text-emerald-500' : 'text-rose-500'}`}>{w.status}</p></td>
                               <td className="px-8 py-6 text-center">
                                  <div className="flex justify-center gap-2">
                                    {w.status === 'pending' && (<><button onClick={()=>handleAdminWithdrawalAction(w.id, 'approved', w.userId, w.amount)} disabled={isProcessingAction.current} className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-lg hover:bg-emerald-600 disabled:opacity-50"><CheckCircle size={16} /></button><button onClick={()=>handleAdminWithdrawalAction(w.id, 'rejected', w.userId, w.amount)} disabled={isProcessingAction.current} className="bg-amber-100 text-amber-600 p-2.5 rounded-xl hover:bg-amber-200 disabled:opacity-50"><XCircle size={16} /></button></>)}
                                    <button onClick={()=>handleDeleteWithdrawal(w.id)} disabled={isProcessingAction.current} className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100 disabled:opacity-50"><Trash2 size={16} /></button>
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

          {/* ==================================================== */}
          {/* TAB: ADMIN KELOLA KUPON */}
          {/* ==================================================== */}
          {activeTab === 'admin_coupons' && isAdmin && (
              <div className="animate-fadeIn space-y-10 max-w-4xl">
                 <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Kelola Kupon Diskon</h2>
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                    <form onSubmit={handleCreateCoupon} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2"><label className="text-xs font-bold text-slate-500">Kode Kupon</label><input type="text" required value={couponForm.code} onChange={e=>setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} className="w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none font-bold text-sm uppercase" /></div>
                        <div className="w-32 space-y-2"><label className="text-xs font-bold text-slate-500">Diskon (%)</label><input type="number" min="1" max="100" required value={couponForm.discount} onChange={e=>setCouponForm({...couponForm, discount: e.target.value})} className="w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none font-bold text-sm" /></div>
                        <button type="submit" className="bg-indigo-600 text-white px-6 py-3 h-[46px] rounded-xl font-black text-sm shadow-md hover:bg-indigo-700"><Plus size={18} /></button>
                    </form>
                 </div>
                 <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr><th className="px-8 py-5">Kode Kupon</th><th className="px-8 py-5 text-center">Diskon</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {coupons.map(c => (
                                <tr key={c.id}>
                                    <td className="px-8 py-6 font-black text-lg text-indigo-600 tracking-wider">{c.code}</td>
                                    <td className="px-8 py-6 text-center font-bold text-slate-700">{c.discount}%</td>
                                    <td className="px-8 py-6 text-center"><button onClick={()=>handleDeleteCoupon(c.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
              </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN SUPPORT HELPDESK */}
          {/* ==================================================== */}
          {activeTab === 'admin_support' && isAdmin && (
              <div className="animate-fadeIn space-y-10">
                 <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Support Helpdesk</h2>
                 <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-left min-w-[900px]">
                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr><th className="px-8 py-5">Pengirim</th><th className="px-8 py-5">Subjek / Tanggal</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {tickets.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-8 py-6 font-bold text-sm text-slate-800">{t.userName}</td>
                                        <td className="px-8 py-6"><p className="font-black text-slate-900">{t.subject}</p><p className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleString('id-ID')}</p></td>
                                        <td className="px-8 py-6"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${t.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{t.status}</span></td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={()=>{setSelectedTicketDetail(t); setReplyTicketText(t.adminReply?.replace(/<[^>]+>/g, '') || ''); window.scrollTo({top:0, behavior:'smooth'});}} className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-100"><MessageSquare size={16} /></button>
                                                <button onClick={()=>handleDeleteTicket(t.id)} className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>

                 {selectedTicketDetail && (
                     <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-200 shadow-2xl relative animate-slideUp">
                         <button onClick={()=>setSelectedTicketDetail(null)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500"><X /></button>
                         <h3 className="font-black text-xl text-slate-800 mb-2">Balas Tiket</h3>
                         <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 mb-6 border border-slate-100">
                             <p className="font-black mb-1">{selectedTicketDetail.subject}</p>
                             <p>{selectedTicketDetail.message}</p>
                         </div>
                         <form onSubmit={handleAdminReplyTicket} className="space-y-4">
                             <textarea required rows="4" value={replyTicketText} onChange={e=>setReplyTicketText(e.target.value)} placeholder="Ketik balasan untuk member..." className="w-full px-5 py-4 rounded-xl border focus:ring-2 outline-none font-medium text-sm custom-scrollbar"></textarea>
                             <button type="submit" disabled={isProcessingAction.current} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-sm shadow-md hover:bg-indigo-700">KIRIM BALASAN</button>
                         </form>
                     </div>
                 )}
              </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN USERS CRM */}
          {/* ==================================================== */}
          {activeTab === 'admin_users' && isAdmin && (
            <div className="animate-fadeIn space-y-10">
               <h2 className="text-3xl font-black text-slate-900">Member CRM Database</h2>
               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                        <tr><th className="px-8 py-5">Identitas</th><th className="px-8 py-5">Tier</th><th className="px-8 py-5 text-center">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredUsers.map(m => (
                           <tr key={m.uid} className="hover:bg-slate-50">
                             <td className="px-8 py-6"><p className="font-black text-slate-900">{m.name}</p><p className="text-[11px] text-slate-500">{m.email}</p></td>
                             <td className="px-8 py-6 uppercase font-black text-indigo-600 text-[10px]">{TIER_LEVELS[m.subscriptionLevel]?.name || 'Unknown'}</td>
                             <td className="px-8 py-6 text-center">
                                <div className="flex justify-center gap-2">
                                  <button onClick={()=>openUserCRMDetail(m)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl" title="Edit Member CRM"><Edit3 size={16} /></button>
                                  <button onClick={()=>deleteMemberData(m.uid)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl" title="Hapus Permanen"><Trash2 size={16} /></button>
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

          {/* ==================================================== */}
          {/* TAB BARU: ADMIN LANDING PAGES (REPLICATED SITES) */}
          {/* ==================================================== */}
          {activeTab === 'admin_lps' && isAdmin && (
            <div className="animate-fadeIn space-y-10">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Data Landing Page (Web Replikator)</h2>
               </div>
               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                       <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr><th className="px-8 py-5">Pemilik Web</th><th className="px-8 py-5">Custom Domain / Status</th><th className="px-8 py-5">Affiliate Link System</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {allLandingPages.map(lp => (
                            <tr key={lp.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-8 py-6"><p className="font-black text-slate-900 text-sm">{lp.ownerName}</p></td>
                               <td className="px-8 py-6">
                                  {lp.customDomain ? (<div className="flex flex-col gap-1"><span className="font-bold text-indigo-600 text-sm">{lp.customDomain}</span></div>) : (<span className="text-xs text-slate-400 italic">Belum Set Domain</span>)}
                               </td>
                               <td className="px-8 py-6"><div className="flex bg-slate-100 p-2 rounded-lg items-center gap-2 w-max"><span className="text-xs font-bold text-slate-500 truncate max-w-[150px]">?ref={lp.ownerId}</span></div></td>
                               <td className="px-8 py-6 text-center">
                                  <div className="flex justify-center gap-2">
                                     <button onClick={()=>{setEditLPForm({...lp}); window.scrollTo({top:0, behavior:'smooth'});}} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"><Edit3 size={16} /></button>
                                     <button onClick={()=>handleAdminDeleteLP(lp.ownerId)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"><Trash2 size={16} /></button>
                                  </div>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
               </div>

               {editLPForm && (
                  <div className="bg-white rounded-[2rem] border border-indigo-200 shadow-xl p-8 relative animate-slideUp">
                      <button onClick={()=>setEditLPForm(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500"><X /></button>
                      <h3 className="text-xl font-black text-slate-800 mb-6">Edit Data Web: {editLPForm.ownerName}</h3>
                      <form onSubmit={(e) => handleAdminUpdateLP(e, editLPForm.ownerId)} className="space-y-4 max-w-lg">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500">Custom Domain</label>
                              <input type="text" value={editLPForm.customDomain || ''} onChange={e => setEditLPForm({...editLPForm, customDomain: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-bold" />
                          </div>
                          <button type="submit" disabled={isProcessingAction.current} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-md hover:bg-indigo-700">SIMPAN PERUBAHAN</button>
                      </form>
                  </div>
               )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN KELOLA ACADEMY LMS */}
          {/* ==================================================== */}
          {activeTab === 'admin_academy' && isAdmin && (
              <div className="animate-fadeIn space-y-10">
                 <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Kelola Academy (LMS)</h2>
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl max-w-2xl">
                    <h3 className="font-black text-lg text-slate-800 mb-6">Tambah Modul Utama</h3>
                    <form onSubmit={handleAdminAddModul} className="flex gap-4">
                        <input type="text" required value={modulTitle} onChange={e=>setModulTitle(e.target.value)} placeholder="Nama Modul" className="flex-1 px-5 py-3.5 rounded-xl border focus:ring-2 outline-none font-bold text-sm" />
                        <button type="submit" disabled={isProcessingAction.current} className="bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-black text-sm shadow-md hover:bg-indigo-700">TAMBAH</button>
                    </form>
                 </div>
                 <div className="space-y-6">
                    {academyModules.map(mod => (
                        <div key={mod.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm relative group">
                            <button onClick={()=>handleAdminDeleteModul(mod.id)} className="absolute top-6 right-6 p-2 text-rose-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            <h4 className="font-black text-xl text-slate-800 mb-6 pr-10">{mod.title}</h4>
                            <div className="space-y-3 mb-6">
                                {mod.lessons?.map((lesson, idx) => (
                                    <div key={lesson.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">{lesson.type === 'video' ? <Video size={14}/> : <FileText size={14}/>}</div>
                                            <span className="font-bold text-sm text-slate-700">{idx+1}. {lesson.title}</span>
                                        </div>
                                        <button onClick={()=>handleAdminDeleteLesson(mod.id, lesson.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={()=>{setTargetModulId(mod.id); setLessonModalOpen(true);}} className="text-sm font-black text-indigo-600 flex items-center gap-1 hover:underline"><Plus size={16}/> MATERI BARU</button>
                        </div>
                    ))}
                 </div>
                 {lessonModalOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900 bg-opacity-80 backdrop-blur-md">
                        <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 bg-slate-900 text-white flex justify-between items-center"><h3 className="text-xl font-black">Tambah Materi Pembelajaran</h3><button onClick={()=>{setLessonModalOpen(false); setTargetModulId(null);}}><X /></button></div>
                            <form onSubmit={handleAdminSaveLesson} className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-xs font-bold text-slate-500">Judul Materi</label><input type="text" required value={lessonForm.title} onChange={e=>setLessonForm({...lessonForm, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border font-bold text-sm" /></div><div className="space-y-2"><label className="text-xs font-bold text-slate-500">Poin Reward Penyelesaian</label><input type="number" required value={lessonForm.points} onChange={e=>setLessonForm({...lessonForm, points: e.target.value})} className="w-full px-4 py-3 rounded-xl border font-bold text-sm" /></div></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Tipe Materi</label><select value={lessonForm.type} onChange={e=>setLessonForm({...lessonForm, type: e.target.value})} className="w-full px-4 py-3 rounded-xl border font-bold text-sm"><option value="video">Video Embed</option><option value="text">Artikel / Teks (HTML)</option><option value="quiz">Kuis</option></select></div>
                                {lessonForm.type === 'video' && (<div className="space-y-2"><label className="text-xs font-bold text-slate-500">Link URL Embed Video</label><input type="url" required value={lessonForm.content} onChange={e=>setLessonForm({...lessonForm, content: e.target.value})} placeholder="https://www.youtube.com/embed/..." className="w-full px-4 py-3 rounded-xl border font-medium text-sm" /></div>)}
                                {lessonForm.type === 'text' && (<div className="space-y-2"><label className="text-xs font-bold text-slate-500">Konten Artikel (HTML)</label><textarea required rows="8" value={lessonForm.content} onChange={e=>setLessonForm({...lessonForm, content: e.target.value})} className="w-full px-4 py-3 rounded-xl border font-medium text-sm"></textarea></div>)}
                                {lessonForm.type === 'quiz' && (
                                    <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Pertanyaan Kuis</label><input type="text" required value={lessonForm.question} onChange={e=>setLessonForm({...lessonForm, question: e.target.value})} className="w-full px-4 py-3 rounded-xl border font-bold text-sm" /></div>
                                        <div className="grid grid-cols-2 gap-4">{[0,1,2,3].map(i => (<div key={i} className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400">Opsi {['A','B','C','D'][i]}</label><input type="text" required value={lessonForm.options[i]} onChange={e=>{const newOpts=[...lessonForm.options]; newOpts[i]=e.target.value; setLessonForm({...lessonForm, options: newOpts})}} className="w-full px-3 py-2 rounded-lg border text-sm font-medium" /></div>))}</div>
                                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Jawaban Benar</label><select value={lessonForm.answer} onChange={e=>setLessonForm({...lessonForm, answer: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border font-bold text-sm"><option value={0}>Opsi A</option><option value={1}>Opsi B</option><option value={2}>Opsi C</option><option value={3}>Opsi D</option></select></div>
                                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Penjelasan</label><textarea required rows="2" value={lessonForm.exp} onChange={e=>setLessonForm({...lessonForm, exp: e.target.value})} className="w-full px-4 py-3 rounded-xl border font-medium text-sm"></textarea></div>
                                    </div>
                                )}
                                <button type="submit" disabled={isProcessingAction.current} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700">SIMPAN MATERI</button>
                            </form>
                        </div>
                    </div>
                 )}
              </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN KELOLA MASTER FILES */}
          {/* ==================================================== */}
          {activeTab === 'admin_files' && isAdmin && (
              <div className="space-y-10 animate-fadeIn">
                 <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Kelola Master File</h2>
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
                     <h3 className="font-black text-lg text-slate-800 mb-6 border-b border-slate-100 pb-4">{editingId ? 'Edit File' : 'Tambah File Baru'}</h3>
                     <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Nama File</label><input type="text" required value={productForm.name} onChange={e=>setProductForm({...productForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none font-bold text-sm" /></div>
                         <div className="space-y-2"><label className="text-xs font-bold text-slate-500">URL / Link Download</label><input type="url" required value={productForm.url} onChange={e=>setProductForm({...productForm, url: e.target.value})} className="w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none font-bold text-sm" /></div>
                         <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Kategori</label><select value={productForm.category} onChange={e=>setProductForm({...productForm, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none font-bold text-sm"><option value="Ebook">Ebook</option><option value="Video">Video / Course</option><option value="Asset">Asset Grafis / Code</option></select></div>
                         <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Minimal Tier Akses</label><select value={productForm.reqLevel} onChange={e=>setProductForm({...productForm, reqLevel: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none font-bold text-sm">{[0,1,2,3,4].map(lv => <option key={lv} value={lv}>Tier {lv} - {TIER_LEVELS[lv].name}</option>)}</select></div>
                         <div className="col-span-full pt-4">
                            <button type="submit" disabled={isProcessingAction.current} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-sm shadow-md hover:bg-indigo-700">{editingId ? 'SIMPAN PERUBAHAN' : 'TAMBAH MASTER FILE'}</button>
                            {editingId && <button type="button" onClick={() => {setEditingId(null); setProductForm({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });}} className="ml-4 px-8 py-3 rounded-xl font-black text-sm text-slate-500 hover:bg-slate-100">BATAL</button>}
                         </div>
                     </form>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                   {files.map(f => (<ProFileCard key={f.id} file={f} currentTier={5} isCompleted={false} onToggleProgress={()=>{}} isAdminCard={true} />))}
                 </div>
              </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN AI CONFIGURATION */}
          {/* ==================================================== */}
          {activeTab === 'admin_ai_config' && isAdmin && (
            <div className="animate-fadeIn max-w-3xl mx-auto space-y-6">
                <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Seting API AI Global</h2>
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl">
                   <form onSubmit={handleSaveAiConfig} className="space-y-6">
                      <div><label className="text-[10px] font-black text-slate-400 uppercase">Provider AI (Wajib Gemini)</label><select className="w-full p-4 border rounded-xl font-bold bg-slate-50" value={aiConfig.provider} onChange={e=>setAiConfig({...aiConfig, provider: e.target.value})}><option value="gemini">Google Gemini AI</option></select></div>
                      <div><label className="text-[10px] font-black text-slate-400 uppercase flex justify-between"><span>API Key Global (Kosongkan bila sistem Canvas berjalan)</span> <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Dapatkan Key Disini</a></label><input type="password" value={aiConfig.apiKey} onChange={e=>setAiConfig({...aiConfig, apiKey: e.target.value})} className="w-full p-4 border rounded-xl font-bold bg-slate-50 text-sm" placeholder="AIzaSy... (Opsional)" /></div>
                      <div className="flex gap-4">
                         <button type="button" onClick={handleTestApiConnection} className="bg-slate-100 text-slate-600 font-black px-8 py-4 rounded-xl flex-1 hover:bg-slate-200">TEST KONEKSI</button>
                         <button type="submit" className="bg-indigo-600 text-white font-black px-8 py-4 rounded-xl flex-1 hover:bg-indigo-700">SIMPAN PENGATURAN</button>
                      </div>
                   </form>
                </div>
            </div>
          )}

        </main>
      </div>

      {/* ==================================================== */}
      {/* OVERLAYS & MODALS (Admin CRM Edit) */}
      {/* ==================================================== */}
      {selectedUserDetail && isAdmin && (
         <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900 bg-opacity-80 backdrop-blur-md animate-fadeIn">
            <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                  <div><h3 className="text-2xl font-black">Edit Member CRM</h3><p className="text-indigo-300 font-bold text-sm">{selectedUserDetail.email}</p></div>
                  <button onClick={()=>setSelectedUserDetail(null)} className="p-2 bg-white bg-opacity-10 rounded-xl hover:bg-rose-500 transition-colors"><X /></button>
               </div>
               <form onSubmit={handleAdminUpdateUserCRM} className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={editUserForm.name} onChange={e=>setEditUserForm({...editUserForm, name: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No WhatsApp</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={editUserForm.phone} onChange={e=>setEditUserForm({...editUserForm, phone: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Bank</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={editUserForm.bank} onChange={e=>setEditUserForm({...editUserForm, bank: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No Rekening</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={editUserForm.accountNo} onChange={e=>setEditUserForm({...editUserForm, accountNo: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Reward Poin</label><input type="number" className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 font-black text-sm text-indigo-700" value={editUserForm.rewardPoints} onChange={e=>setEditUserForm({...editUserForm, rewardPoints: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Saldo Komisi (Rp)</label><input type="number" className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 font-black text-sm text-emerald-700" value={editUserForm.commissionBalance} onChange={e=>setEditUserForm({...editUserForm, commissionBalance: e.target.value})} /></div>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Level Lisensi (Tier)</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" value={editUserForm.subscriptionLevel} onChange={e=>setEditUserForm({...editUserForm, subscriptionLevel: e.target.value})}>
                          {[0,1,2,3,4].map(lv => <option key={lv} value={lv}>{TIER_LEVELS[lv].name}</option>)}
                      </select>
                  </div>
                  <button type="submit" disabled={isProcessingAction.current} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"><Save size={18} /> UPDATE DATA MEMBER</button>
               </form>
            </div>
         </div>
      )}

      {/* ==================================================== */}
      {/* MODAL CHECKOUT */}
      {/* ==================================================== */}
      {checkoutPkg && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900 bg-opacity-80 backdrop-blur-md animate-fadeIn overflow-y-auto">
           <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-3xl my-auto p-8 sm:p-12 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-2xl font-black">{finalPrice > 0 ? 'Final Checkout' : 'Konfirmasi Paket'}</h3><button onClick={()=>{setCheckoutPkg(null);}}><X /></button></div>
              
              {/* FITUR: Form Input Kupon (FIXED - Sebelumnya Terpotong) */}
              {finalPrice > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Punya Kode Kupon?</p>
                      <div className="flex gap-2">
                          <input type="text" placeholder="Kode Promo" value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                          <button type="button" onClick={() => {
                              const found = coupons.find(c => c.code === couponInput);
                              if(found && found.active) { setAppliedCoupon(found); showToast("Kupon berhasil diterapkan!", "success"); }
                              else { showToast("Kupon tidak valid / tidak aktif", "error"); setAppliedCoupon(null); }
                          }} className="bg-slate-900 text-white px-4 py-3 rounded-xl text-xs font-black hover:bg-indigo-600 transition-colors">APPLY</button>
                      </div>
                      {appliedCoupon && <p className="text-emerald-600 text-xs font-bold mt-2 flex items-center gap-1"><CheckCircle2 size={14}/> Diskon {appliedCoupon.discount}% diterapkan!</p>}
                  </div>
              )}

              <div className="bg-slate-900 rounded-[1.5rem] p-6 text-white"><p className="text-[10px] font-black uppercase text-indigo-300">Total Tagihan</p><p className="text-3xl font-black">Rp {finalPrice.toLocaleString('id-ID')}</p></div>
              <form onSubmit={handlePurchaseRequest} className="space-y-4">
                 {finalPrice > 0 ? (
                     <>
                         <input type="text" placeholder="Nama Pemilik Rekening Pengirim" value={confirmForm.senderName} onChange={e=>setConfirmForm({...confirmForm, senderName: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
                         <input type="text" placeholder="Bank Asal (Contoh: BCA, Mandiri)" value={confirmForm.senderBank} onChange={e=>setConfirmForm({...confirmForm, senderBank: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
                         {/* FIX: Input Notes ditambahkan agar variable confirmForm.notes tidak error */}
                         <input type="text" placeholder="Catatan Tambahan (Opsional)" value={confirmForm.notes} onChange={e=>setConfirmForm({...confirmForm, notes: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                         <button type="submit" disabled={isProcessingAction.current} className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs flex justify-center items-center gap-2">{isProcessingAction.current ? <Loader2 size={16} className="animate-spin" /> : null} Konfirmasi Pembayaran</button>
                     </>
                 ) : (
                     <button type="submit" disabled={isProcessingAction.current} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs flex justify-center items-center gap-2">{isProcessingAction.current ? <Loader2 size={16} className="animate-spin" /> : null} Aktivasi Paket Sekarang</button>
                 )}
              </form>
           </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL SERTIFIKAT KELULUSAN */}
      {/* ==================================================== */}
      {showCertificate && (
        <div className="fixed inset-0 z-[400] bg-slate-900 bg-opacity-90 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] max-w-4xl w-full text-center relative shadow-2xl" id="printable-certificate">
                <button onClick={() => setShowCertificate(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 print:hidden"><X size={32}/></button>
                <div className="border-[16px] border-double border-slate-100 p-10 relative overflow-hidden bg-slate-50">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-5 blur-[80px] rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 opacity-5 blur-[80px] rounded-full"></div>
                    <ShieldCheck size={64} className="mx-auto text-indigo-200 mb-6" />
                    <h1 className="text-4xl sm:text-5xl font-black text-indigo-600 mb-2 font-['Outfit'] uppercase tracking-widest">Sertifikat Kelulusan</h1>
                    <p className="text-slate-500 font-bold mb-12 tracking-widest">PROSPACE ACADEMY</p>
                    <p className="text-slate-600 mb-2 font-medium">Diberikan dengan bangga kepada:</p>
                    <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-12 border-b-4 border-indigo-100 inline-block px-12 pb-4 font-['Outfit']">{userData?.name || 'Member ProSpace'}</h2>
                    <p className="text-slate-600 mb-16 max-w-xl mx-auto leading-relaxed text-lg font-medium">Atas dedikasi, komitmen, dan keberhasilannya menyelesaikan seluruh modul kurikulum pembelajaran digital pada platform ProSpace Academy.</p>
                    <div className="flex justify-between items-end mt-12 px-8">
                        <div className="text-left border-t-2 border-slate-200 pt-4 w-48">
                            <p className="font-black text-slate-800 text-lg">Administrator</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">ProSpace Edu</p>
                        </div>
                        <div className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center border-8 border-amber-100 text-amber-500 shadow-xl transform rotate-12 relative z-10"><Award size={48} /></div>
                        <div className="text-right border-t-2 border-slate-200 pt-4 w-48">
                            <p className="font-black text-slate-800 text-lg">{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tanggal Kelulusan</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => window.print()} className="mt-8 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black print:hidden shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 mx-auto uppercase tracking-widest text-sm"><DownloadCloud size={20}/> CETAK / SIMPAN PDF</button>
            </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
    </div>
  );
}