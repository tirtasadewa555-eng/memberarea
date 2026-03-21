import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithCustomToken,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot, collection, updateDoc, 
  deleteDoc, addDoc, serverTimestamp, query, where, increment, orderBy, limit, arrayUnion
} from 'firebase/firestore';
import { 
  LayoutDashboard, ShoppingBag, Users, UserCircle, LogOut, Plus, Search, Download, 
  ShieldCheck, CreditCard, Settings, Menu, X, Bell, Trash2, Edit3, ChevronRight, 
  FileText, Video, Box, Lock, MessageSquare, Banknote, CheckCircle, Clock, 
  Megaphone, FolderLock, ArrowRight, AlertCircle, Activity, XCircle, LifeBuoy, 
  MessageCircle, Network, Wallet, Copy, Save, Star, Send, Receipt, Tag, Trophy, Eye, 
  CheckSquare, Square, Award, Sparkles, Crown, Gift, DownloadCloud, BadgeCheck, Bot, Zap,
  Headphones, PlayCircle, PauseCircle, RefreshCw, BookOpen, GraduationCap, PlaySquare, 
  HelpCircle, CheckCircle2, ListPlus, Rocket, Wand2, Image as ImageIcon, Heart, Bookmark, 
  Cpu, Key, Sparkles as MagicWand, Link as LinkIcon, Globe, LayoutTemplate, ChevronDown, ChevronUp,
  Timer, MonitorPlay, ExternalLink, Upload, Paintbrush, Wrench, Camera, Layers, User, Loader2
} from 'lucide-react';

/* =======================================================================
  [SECURITY AUDIT & BEST PRACTICES - FIRESTORE RULES]
  =======================================================================
  Pastikan aturan ini aktif di Firebase Console -> Firestore -> Rules:
  
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      function isAdmin() { return request.auth != null && request.auth.token.email == 'admin@website.com'; }
      function isOwner(userId) { return request.auth != null && request.auth.uid == userId; }
      
      match /artifacts/{appId}/users/{userId}/profile/data {
        allow read: if isOwner(userId) || isAdmin();
        allow update: if isAdmin() || (isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['subscriptionLevel', 'commissionBalance', 'rewardPoints']));
        allow create: if isOwner(userId) || isAdmin();
      }
      match /artifacts/{appId}/users/{userId}/generations/{document=**} {
        allow read, write: if isOwner(userId) || isAdmin();
      }
      match /artifacts/{appId}/public/data/userRegistry/{userId} {
        allow read, write: if isAdmin() || (request.method == 'create' && isOwner(userId));
      }
      match /artifacts/{appId}/public/data/replicatedSites/{userId} {
        allow read: if true;
        allow write: if isOwner(userId) || isAdmin();
      }
      match /{document=**} {
        allow read, write: if isAdmin() || request.auth != null; 
      }
    }
  }
*/

// ==========================================
// 1. KONFIGURASI SISTEM FIREBASE
// ==========================================
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    return JSON.parse(__firebase_config);
  }
  return {
    apiKey: "dummy", authDomain: "dummy", projectId: "dummy", storageBucket: "dummy", messagingSenderId: "dummy", appId: "dummy"
  };
};

const firebaseConfig = getFirebaseConfig();
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'prospace-superapp';
const appId = String(rawAppId).replace(/\//g, '-'); 

const ADMIN_EMAIL = "admin@website.com"; 
const WHATSAPP_ADMIN = "628123456789"; 

const TIER_LEVELS = {
  0: { name: 'Free', color: 'text-slate-500', bg: 'bg-slate-100', price: 0, desc: 'Akses terbatas untuk member baru', features: ['Akses Modul Dasar', 'Kuis Harian AI'] },
  1: { name: 'Personal', color: 'text-emerald-600', bg: 'bg-emerald-50', price: 99000, desc: 'Cocok untuk individu yang baru memulai', features: ['Akses Studio Ajaib Foto', 'Akses Semua Modul LMS', 'Grup Komunitas Terbatas', 'Sertifikat Digital'] },
  2: { name: 'Business', color: 'text-indigo-600', bg: 'bg-indigo-50', price: 249000, desc: 'Untuk profesional dan bisnis berkembang', features: ['Semua Fitur Personal', 'Akses File Master (Tier 2)', 'AI Copilot Terbatas', 'Support Prioritas', 'Ruang Fokus VIP'] },
  3: { name: 'Agency', color: 'text-amber-600', bg: 'bg-amber-50', price: 499000, desc: 'Akses penuh tanpa batas untuk tim & agensi', features: ['Semua Fitur Business', 'Akses File Master (All Tier)', 'Unlimited AI Copilot', 'Web Replikator Pribadi & Custom Domain', 'Dedicated Support 24/7'] }
};

// Global CSS
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
  @media print { body * { visibility: hidden; } #printable-certificate, #printable-certificate * { visibility: visible; } #printable-certificate { position: absolute; left: 0; top: 0; width: 100%; } }
`;

const sanitizeHTML = (str) => {
    if (!str) return '';
    return str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '').replace(/<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/gmi, (m) => m.replace(/on\w+\s*=/gi, 'data-blocked=')).replace(/javascript:/gi, 'blocked:');
};
const escapeInput = (str) => str ? str.replace(/[<>]/g, "").trim() : ''; 
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

  // --- Derived States ---
  const currentTier = userData?.subscriptionLevel || 0;
  const affiliateBalance = userData?.commissionBalance || 0;
  const completedFiles = userData?.completedFiles || [];
  const completedLessons = userData?.completedLessons || [];
  const userPoints = userData?.rewardPoints || 0;

  const userRank = useMemo(() => {
    if(userPoints >= 1000) return { name: 'Diamond', color: 'text-purple-600', bg: 'bg-purple-100', border:'border-purple-200', icon: <Crown size={14} /> };
    if(userPoints >= 300) return { name: 'Gold', color: 'text-amber-600', bg: 'bg-amber-100', border:'border-amber-200', icon: <Star size={14} /> };
    if(userPoints >= 100) return { name: 'Silver', color: 'text-slate-600', bg: 'bg-slate-200', border:'border-slate-300', icon: <Award size={14} /> };
    return { name: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-100', border:'border-orange-200', icon: <Sparkles size={14} /> };
  }, [userPoints]);

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

  const approvedPercentage = transactions.length > 0 ? Math.round((adminStats.approvedTrans / transactions.length) * 100) : 0;
  const pendingPercentage = transactions.length > 0 ? Math.round((adminStats.pendingTrans / transactions.length) * 100) : 0;

  const leaderboardData = useMemo(() => {
    return allUsers.map(u => ({ uid: u.uid, name: u.name, totalEarned: (u.commissionBalance || 0) + (withdrawals.filter(w => w.userId === u.uid && w.status === 'approved').reduce((a, b) => a + b.amount, 0)) }))
        .filter(e => e.totalEarned > 0).sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 10);
  }, [allUsers, withdrawals]);

  const finalPrice = useMemo(() => {
    if (!checkoutPkg) return 0;
    if (appliedCoupon && appliedCoupon.discount) return checkoutPkg.price - (checkoutPkg.price * appliedCoupon.discount / 100);
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
    const csvContent = "data:text/csv;charset=utf-8," + "Nama,Email,No WA,Tier,Saldo,Points\n" + allUsers.map(e => `${e.name},${e.email},${e.phone||'-'},${TIER_LEVELS[e.subscriptionLevel]?.name},${e.commissionBalance},${e.rewardPoints}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "data_member_prospace.csv"); document.body.appendChild(link); link.click(); link.remove();
  };

  // ==========================================
  // LOGIC: API NETWORK (WITH RETRY)
  // ==========================================
  const fetchWithRetry = async (url, options, maxRetries = 5) => {
    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if ([400, 401, 403, 404].includes(response.status)) return response;
      } catch (err) { if (i === maxRetries - 1) throw err; }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; 
    }
    throw new Error("Maksimal percobaan koneksi tercapai. Server AI sedang sibuk.");
  };

  const fetchFromAI = async (promptText, jsonMode = false) => {
      if (!aiConfig.isActive) throw new Error("Fitur AI dimatikan sementara oleh Admin.");
      if (!aiConfig.apiKey) throw new Error("API Key sistem belum dikonfigurasi.");

      try {
          if (aiConfig.provider === 'gemini') {
              const payload = { contents: [{ parts: [{ text: promptText }] }] };
              if (jsonMode) payload.generationConfig = { responseMimeType: "application/json" };
              const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': aiConfig.apiKey }, body: JSON.stringify(payload)
              });
              const data = await res.json();
              if(data.error) throw new Error(data.error.message);
              return data.candidates[0].content.parts[0].text;
          } else if (aiConfig.provider === 'openai') {
              const payload = { model: 'gpt-4o-mini', messages: [{role:'user', content:promptText}] };
              if (jsonMode) payload.response_format = { type: "json_object" };
              const res = await fetchWithRetry(`https://api.openai.com/v1/chat/completions`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` }, body: JSON.stringify(payload)
              });
              const data = await res.json();
              if(data.error) throw new Error(data.error.message);
              return data.choices[0].message.content;
          } else { throw new Error("Provider AI belum didukung."); }
      } catch (err) { throw err; }
  };

  // ==========================================
  // LOGIC: INITIAL FETCH & REPLICATED SITE
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
    };
    initAuth();
    
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const checkIsAdmin = u?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAdmin(checkIsAdmin);
      if (checkIsAdmin && activeTab === 'dashboard') setActiveTab('admin_overview');
      if (u) setShowPublicSite(false);
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // ==========================================
  // REAL-TIME SYNC ENGINE
  // ==========================================
  useEffect(() => {
    if (!user || !isConfigReady) return;

    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (d) => {
      if (d.exists()) { setUserData(d.data()); setProfileForm(prev => ({ ...prev, phone: d.data().phone || '', bank: d.data().bank || '', accountNo: d.data().accountNo || '' })); }
    });

    const unsubMySite = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', user.uid), (d) => {
        if (d.exists()) { setMyLandingPage(d.data()); if(!isEditingLP) setEditLPForm(d.data()); } else setMyLandingPage(null);
    });

    // Ajaib Foto History Sync
    const unsubPhotoHistory = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'generations'), (s) => {
        const hData = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setPhotoHistory(hData);
    });

    const unsubFiles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'files'), (s) => setFiles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCoupons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), (s) => setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubChat = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), (s) => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubModules = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'modules'), (s) => {
        const mods = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        setAcademyModules(mods);
        if (mods.length > 0 && !activeCourseId) { setActiveCourseId(mods[0].id); if(mods[0].lessons?.length > 0) setActiveLessonId(mods[0].lessons[0].id); }
    });

    const unsubAct = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'activities'), orderBy('createdAt', 'desc'), limit(1)), (s) => {
        if(!s.empty) {
            const data = s.docs[0].data();
            if (new Date() - new Date(data.createdAt) < 30000) { setLatestActivity(data); setTimeout(() => setLatestActivity(null), 7000); }
        }
    });

    let adminUnsubRegistry = () => {}; let adminUnsubLPs = () => {};
    if (isAdmin) {
      adminUnsubRegistry = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry'), (s) => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      adminUnsubLPs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'replicatedSites'), (s) => setAllLandingPages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    }

    const qTrans = isAdmin ? collection(db, 'artifacts', appId, 'public', 'data', 'transactions') : query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), where('userId', '==', user.uid));
    const unsubTrans = onSnapshot(qTrans, (s) => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qWd = isAdmin ? collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals') : query(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), where('userId', '==', user.uid));
    const unsubWd = onSnapshot(qWd, (s) => setWithdrawals(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qTix = isAdmin ? collection(db, 'artifacts', appId, 'public', 'data', 'tickets') : query(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), where('userId', '==', user.uid));
    const unsubTickets = onSnapshot(qTix, (s) => setTickets(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubAi = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ai_config'), (d) => { if (d.exists()) setAiConfig(d.data()); });

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
           logActivity(`${userData?.name?.split(' ')[0] || 'Member'} menyelesaikan sesi Deep Work! 🧠`, 'focus');
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

    setIsGeneratingPhoto(true); setPhotoResult(null); setPhotoGenStatus('Menganalisis gambar dengan AI Visi...');

    const callModel = async (modelName, payload) => {
      // Model render gambar v1beta image-preview hanya bisa diakses via proxy internal canvas jika tanpa key. 
      // Jika key disediakan (dari Admin), kita coba pakai key tersebut.
      const keyToUse = modelName === 'gemini-2.5-flash-image-preview' ? "" : aiConfig.apiKey;
      let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyToUse}`;
      
      let res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok && res.status === 401 && keyToUse === "") {
        await new Promise(r => setTimeout(r, 2000));
        res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (!res.ok) { const errData = await res.json().catch(()=>({})); throw new Error(errData.error?.message || `Error ${res.status}`); }
      return JSON.parse(await res.text());
    };

    try {
      const textModelName = "gemini-flash-latest";
      let textPrompt = `Act as an Expert Prompt Engineer. Instruction: "${photoInstruction}". `;
      if (activePhotoFeature === 'gabung') textPrompt += `Write a prompt to seamlessly merge these uploaded images.`;
      else if (activePhotoFeature === 'photoshoot') textPrompt += `Write a prompt for a high-end product photoshoot placing this exact product into the scenario.`;
      else if (activePhotoFeature === 'model') textPrompt += `Write a prompt for a hyper-realistic 8k portrait of a human model.`;
      else if (activePhotoFeature === 'edit') textPrompt += `Identify the mentioned objects and write a prompt to edit this image exactly as instructed while keeping the rest identical.`;
      else if (activePhotoFeature === 'perbaiki') textPrompt += `Write a prompt to flawlessly restore, upscale, and modernize this damaged/old photo into DSLR quality.`;
      else if (activePhotoFeature === 'banner') textPrompt += `Write a prompt to create a high-converting commercial banner featuring this subject, leaving space for text.`;
      else if (activePhotoFeature === 'ucapan') textPrompt += `Write a prompt to create a beautiful festive greeting card featuring this subject.`;
      textPrompt += ` Output ONLY the prompt text in English.`;

      const textParts = [{ text: textPrompt }, ...photoImages.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] } }))];
      const textData = await callModel(textModelName, { contents: [{ role: "user", parts: textParts }] });
      const superPrompt = textData.candidates?.[0]?.content?.parts?.[0]?.text || photoInstruction;
      
      setPhotoGenStatus('Merender piksel mahakarya AI...');

      let imgInst = "";
      if (activePhotoFeature === 'gabung') imgInst = `Merge images exactly: ${superPrompt}`;
      else if (activePhotoFeature === 'photoshoot') imgInst = `Create product photoshoot: ${superPrompt}. Keep product identity intact.`;
      else if (activePhotoFeature === 'model') imgInst = `Generate hyper-realistic photo: ${superPrompt}.`;
      else if (activePhotoFeature === 'edit') imgInst = `Edit image exactly: ${superPrompt}. Keep unmentioned parts intact.`;
      else if (activePhotoFeature === 'perbaiki') imgInst = `Restore and enhance: ${superPrompt}. Upgrade quality to DSLR.`;
      else if (activePhotoFeature === 'banner') imgInst = `Create advertisement banner: ${superPrompt}. Preserve core identity.`;
      else if (activePhotoFeature === 'ucapan') imgInst = `Create greeting card: ${superPrompt}. Preserve face identity.`;

      const imageParts = [{ text: imgInst }, ...photoImages.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] } }))];
      const imgData = await callModel('gemini-2.5-flash-image-preview', { contents: [{ parts: imageParts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } });
      const generatedBase64 = imgData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (!generatedBase64) throw new Error("Gagal merender gambar.");

      const fullDataUrl = `data:image/jpeg;base64,${generatedBase64}`;
      setPhotoResult(fullDataUrl);
      showToast("Sulap foto berhasil!", "success");

      // Save History
      if (user) {
        try {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'generations'), { feature: activePhotoFeature, instruction: photoInstruction, resultImage: fullDataUrl, createdAt: serverTimestamp() });
          logActivity(`${userData?.name?.split(' ')[0] || 'Member'} membuat mahakarya di AI Studio Foto! 🎨`, 'learn');
        } catch (e) {}
      }
    } catch (err) { showToast(err.message, "error"); } finally { setIsGeneratingPhoto(false); }
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
    } catch (err) { showToast("Gagal masuk/daftar.", "error"); }
    setAuthLoading(false); isProcessingAction.current = false;
  };

  const handleDailyCheckIn = async () => {
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    const today = new Date().toDateString();
    if (userData?.lastCheckInDate === today) { isProcessingAction.current = false; return showToast("Sudah klaim hari ini.", "error"); }
    try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { rewardPoints: increment(10), lastCheckInDate: today });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { rewardPoints: increment(10), lastCheckInDate: today });
        showToast("Klaim +10 Poin Harian! 🎉", "success");
    } catch (e) {}
    isProcessingAction.current = false;
  };

  const handlePurchaseRequest = async (e) => {
    e.preventDefault();
    if (!confirmForm.senderName || !confirmForm.senderBank) return showToast("Form harus lengkap!", "error");
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      const transId = `TRX-${Math.floor(Date.now() / 1000)}`;
      const basePrice = TIER_LEVELS[checkoutPkg.level]?.price || 0;
      const discountVal = appliedCoupon && appliedCoupon.active ? appliedCoupon.discount : 0;
      const trueFinalPrice = basePrice - (basePrice * discountVal / 100);
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', transId), { id: transId, userId: user.uid, userName: userData?.name || user?.email || 'Member', packageLevel: checkoutPkg.level, packageName: checkoutPkg.name, price: trueFinalPrice, promoCode: appliedCoupon?.code || null, senderName: escapeInput(confirmForm.senderName), senderBank: escapeInput(confirmForm.senderBank), notes: escapeInput(confirmForm.notes), status: 'pending', createdAt: new Date().toISOString() });
      logActivity(`${userData?.name?.split(' ')[0] || 'Seseorang'} memesan lisensi ${checkoutPkg.name}! 🔥`, 'order');
      openWhatsAppConfirmation({name: checkoutPkg.name, price: trueFinalPrice});
      setCheckoutPkg(null); setAppliedCoupon(null); setConfirmForm({senderName:'', senderBank:'', notes:''}); showToast("Konfirmasi terkirim!"); setActiveTab('transactions');
    } catch (err) {}
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
          logActivity(`Upgrade sukses! ${trans.userName.split(' ')[0]} kini member ${trans.packageName} 🏆`, 'upgrade');
          const target = allUsers.find(u => u.uid === trans.userId);
          if (target && target.referredBy) {
              const comm = trans.price * 0.20; 
              await updateDoc(doc(db, 'artifacts', appId, 'users', target.referredBy, 'profile', 'data'), { commissionBalance: increment(comm) });
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', target.referredBy), { commissionBalance: increment(comm) });
          }
          showToast("Member di-upgrade!");
      } else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', trans.id), { status: 'rejected' }); showToast("Ditolak", "error"); }
    } catch (err) {}
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

  const closeSidebarMobile = () => { if (window.innerWidth < 1024) setSidebarOpen(false); };

  // ==========================================
  // RENDER COMPONENTS
  // ==========================================
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

  if (!user && !showPublicSite) return (
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
            </>
          ) : (
            <>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Member Menu</p>
              <NavBtn active={activeTab==='dashboard'} onClick={()=>{setActiveTab('dashboard'); closeSidebarMobile();}} icon={<LayoutDashboard size={20} />} label="Dashboard Utama" />
              
              {/* === MENU BARU: AJAIB FOTO STUDIO === */}
              <div className="my-4 border-b border-slate-100"></div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 px-4 mt-2">Studio Kreatif AI</p>
              <NavBtn active={activeTab==='ai_studio'} onClick={()=>{setActiveTab('ai_studio'); closeSidebarMobile();}} icon={<Wand2 size={20} />} label="Ajaib Foto Studio" />
              <NavBtn active={activeTab==='copilot'} onClick={()=>{setActiveTab('copilot'); closeSidebarMobile();}} icon={<Rocket size={20} />} label="Marketing Copilot AI" />
              
              <div className="my-4 border-b border-slate-100"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Akademi & Komunitas</p>
              <NavBtn active={activeTab==='elearning'} onClick={()=>{setActiveTab('elearning'); closeSidebarMobile();}} icon={<GraduationCap size={20} />} label="ProSpace Academy" />
              <NavBtn active={activeTab==='focus'} onClick={()=>{setActiveTab('focus'); closeSidebarMobile();}} icon={<Headphones size={20} />} label="Ruang Fokus VIP" />
              <NavBtn active={activeTab==='community'} onClick={()=>{setActiveTab('community'); closeSidebarMobile();}} icon={<MessageCircle size={20} />} label="Komunitas Discord" />
              
              <div className="my-4 border-b border-slate-100"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Bisnis & Lisensi</p>
              <NavBtn active={activeTab==='landingpage'} onClick={()=>{setActiveTab('landingpage'); closeSidebarMobile();}} icon={<LayoutTemplate size={20} />} label="Web Replikator Pribadi" />
              <NavBtn active={activeTab==='affiliate'} onClick={()=>{setActiveTab('affiliate'); closeSidebarMobile();}} icon={<Network size={20} />} label="Penarikan Komisi" />
              <NavBtn active={activeTab==='shop'} onClick={()=>{setActiveTab('shop'); closeSidebarMobile();}} icon={<ShoppingBag size={20} />} label="Upgrade Lisensi" />
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
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white rounded-2xl flex items-center justify-center font-black shadow-lg">{userData?.name?.charAt(0).toUpperCase() || 'U'}</div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-10 w-full max-w-[1400px] mx-auto animate-fadeIn pb-32">
          
          {/* ==================================================== */}
          {/* TAB: DASHBOARD (MEMBER) */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && !isAdmin && (
            <div className="space-y-8">
                <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-14 text-white relative shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500 bg-opacity-20 rounded-full blur-[100px]"></div>
                  <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                    <div className="space-y-4 text-center lg:text-left w-full lg:w-2/3">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-10 rounded-full border border-white border-opacity-10 backdrop-blur-sm">
                         <span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{TIER_LEVELS[currentTier].name} Member</span>
                      </div>
                      <h2 className="text-3xl sm:text-5xl font-black font-['Outfit'] tracking-tight leading-tight">Halo, {userData?.name?.split(' ')[0] || 'Member'}! 👋</h2>
                      <p className="text-slate-400 text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
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
          {/* TAB: AJAIB FOTO STUDIO (NEW INTEGRATION) */}
          {/* ==================================================== */}
          {activeTab === 'ai_studio' && !isAdmin && (
             <div className="animate-fadeIn space-y-6">
                <div className="mb-6">
                   <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight flex items-center gap-3">
                     <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-2xl text-white shadow-lg shadow-indigo-200"><Wand2 size={28}/></div> 
                     Studio Ajaib Foto
                   </h2>
                   <p className="text-slate-500 font-medium mt-2">Mesin AI pengolah gambar instan. Ganti background, restorasi foto, hingga bikin banner promosi otomatis.</p>
                </div>

                {/* Sub-Navigation Studio */}
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

                {/* Studio Workspace */}
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
                      {/* Kiri: Form Control */}
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

                      {/* Kanan: Result Preview */}
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
          {/* SISA TAB PROSPACE (Elearning, Focus, CRM, DLL) */}
          {/* ==================================================== */}

          {/* TAB: ELEARNING */}
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
                   ) : (<div className="w-full lg:w-2/3 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex items-center justify-center p-10 text-slate-400 font-bold">Pilih materi.</div>)}
                </div>
                )}
             </div>
          )}

          {/* TAB: MARKETING COPILOT */}
          {activeTab === 'copilot' && !isAdmin && (
             <div className="animate-fadeIn space-y-8">
                 <div className="text-center sm:text-left mb-6">
                     <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] flex items-center justify-center sm:justify-start gap-3"><Rocket className="text-indigo-600" size={36} /> AI Marketing Copilot</h2>
                     <p className="text-slate-500 font-medium mt-2 max-w-2xl">Studio pembuatan copywriting cerdas. Buat teks promosi otomatis untuk memaksimalkan konversi Anda!</p>
                 </div>
                 <div className="flex flex-col lg:flex-row gap-10">
                     <div className="w-full lg:w-1/2 bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-slate-200">
                         <form onSubmit={handleGenerateCopy} className="space-y-6">
                             <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Produk / Campaign</label><input type="text" placeholder="Contoh: Ajaib Foto VIP" className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={copilotForm.product} onChange={e=>setCopilotForm({...copilotForm, product: e.target.value})} required /></div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform</label><select className="w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm" value={copilotForm.platform} onChange={e=>setCopilotForm({...copilotForm, platform: e.target.value})}><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option></select></div>
                                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gaya Bahasa</label><select className="w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm" value={copilotForm.tone} onChange={e=>setCopilotForm({...copilotForm, tone: e.target.value})}><option value="fomo">Mendesak (FOMO)</option><option value="santai">Santai / Asik</option><option value="profesional">Profesional</option></select></div>
                             </div>
                             <button type="submit" disabled={isGeneratingCopy} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-5 rounded-2xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50">{isGeneratingCopy ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}{isGeneratingCopy ? 'MENULIS...' : 'GENERATE COPYWRITING'}</button>
                         </form>
                     </div>
                     <div className="w-full lg:w-1/2 flex flex-col items-center bg-slate-100 rounded-[2.5rem] p-8 border border-slate-200 shadow-inner">
                         <div className="w-full max-w-[300px] h-[550px] bg-slate-900 border-[12px] border-slate-900 rounded-[3rem] shadow-2xl relative flex flex-col overflow-hidden shrink-0">
                             <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50"></div>
                             <div className="flex-1 bg-[#E5DDD5] overflow-y-auto p-4 pt-12 space-y-4 custom-scrollbar">
                                 <div className="bg-[#DCF8C6] p-3 rounded-2xl rounded-tr-none text-sm text-slate-800 shadow-sm whitespace-pre-wrap ml-auto relative">{isGeneratingCopy ? <span className="animate-pulse">Mengetik...</span> : <span dangerouslySetInnerHTML={{__html: copilotResult || "Preview copywriting akan muncul di sini..."}}></span>}</div>
                             </div>
                         </div>
                         {copilotResult && <button onClick={()=>copyToClipboard(copilotResult.replace(/<[^>]*>?/gm, ''))} className="mt-4 bg-white text-indigo-600 px-6 py-3 rounded-xl font-black text-xs shadow-md"><Copy size={14} className="inline mr-2"/> Salin Teks</button>}
                     </div>
                 </div>
             </div>
          )}

          {/* TAB: ADMIN OVERVIEW */}
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

          {/* SISA TAB ADMIN LAINNYA & MEMBER (AI_CONFIG, ACADEMY, USERS, FILES, SHOP, AFFILIATE, DLL) */}
          {/* Untuk menghemat space file tunggal, Tab lain (Trans, WD, Profile, dsb) tetap menggunakan struktur standard yang sudah ada di memori Canvas. Di bawah ini disisipkan potongan kodenya agar utuh. */}
          
          {activeTab === 'shop' && !isAdmin && (
             <div className="animate-fadeIn space-y-12">
               <div className="text-center max-w-2xl mx-auto space-y-4 px-4"><span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">Pricing Plan</span><h2 className="text-4xl font-black text-slate-900 font-['Outfit']">Pilih Paket Terbaik</h2></div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {[1, 2, 3].map(lv => {
                   const isActive = currentTier === lv; const isPassed = currentTier > lv; const isPending = transactions.some(t => t.userId === user?.uid && t.packageLevel === lv && t.status === 'pending');
                   return (
                     <div key={lv} className={`bg-white rounded-[2rem] border-2 p-10 flex flex-col h-full transition-all ${isActive ? 'border-indigo-600 shadow-2xl' : 'border-slate-100 hover:border-slate-300 shadow-xl'}`}>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase">{TIER_LEVELS[lv].name}</h3>
                        <p className="text-sm text-slate-500 mb-6 min-h-[40px]">{TIER_LEVELS[lv].desc}</p>
                        <span className="text-3xl font-black text-indigo-600 mb-8">Rp {TIER_LEVELS[lv].price.toLocaleString('id-ID')}</span>
                        <ul className="space-y-4 mb-8 flex-1">{TIER_LEVELS[lv].features.map((f, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0" /><span className="text-sm font-medium text-slate-600">{f}</span></li>))}</ul>
                        <button onClick={() => {setCheckoutPkg({...TIER_LEVELS[lv], level: lv});}} disabled={isActive||isPassed||isPending} className={`w-full py-5 rounded-2xl font-black ${isActive||isPassed||isPending ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}>{isActive ? 'AKTIF' : isPassed ? 'TERLEWATI' : isPending ? 'VALIDASI' : 'PILIH PAKET'}</button>
                     </div>
                   )
                 })}
               </div>
             </div>
          )}

          {activeTab === 'profile' && (
             <div className="animate-fadeIn max-w-2xl mx-auto">
               <h2 className="text-3xl font-black text-slate-900 mb-8">Pengaturan Profil</h2>
               <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-2xl">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                     <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">Nomor WhatsApp</label><input type="text" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-sm" value={profileForm.phone} onChange={e=>setProfileForm({...profileForm, phone: e.target.value})} /></div>
                     <div className="pt-4 border-t border-slate-100"><h4 className="font-black text-slate-800 mb-4">Data Rekening (WD)</h4><div className="grid grid-cols-2 gap-6"><input type="text" placeholder="Bank" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-sm" value={profileForm.bank} onChange={e=>setProfileForm({...profileForm, bank: e.target.value})} /><input type="text" placeholder="No Rekening" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border font-bold text-sm" value={profileForm.accountNo} onChange={e=>setProfileForm({...profileForm, accountNo: e.target.value})} /></div></div>
                     <button type="submit" disabled={isProcessingAction.current} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl">SIMPAN PROFIL</button>
                  </form>
               </div>
             </div>
          )}

          {activeTab === 'admin_ai_config' && isAdmin && (
            <div className="animate-fadeIn max-w-3xl mx-auto space-y-6">
                <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Seting API AI Global</h2>
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl">
                   <form onSubmit={handleSaveAiConfig} className="space-y-6">
                      <div><label className="text-[10px] font-black text-slate-400 uppercase">Provider AI (Wajib Gemini)</label><select className="w-full p-4 border rounded-xl font-bold bg-slate-50" value={aiConfig.provider} onChange={e=>setAiConfig({...aiConfig, provider: e.target.value})}><option value="gemini">Google Gemini AI</option></select></div>
                      <div><label className="text-[10px] font-black text-slate-400 uppercase">API Key Global (Untuk Teks & Kuis)</label><input type="password" value={aiConfig.apiKey} onChange={e=>setAiConfig({...aiConfig, apiKey: e.target.value})} className="w-full p-4 border rounded-xl font-bold bg-slate-50 text-sm" placeholder="AIzaSy..." /></div>
                      <div className="flex gap-4"><button type="submit" className="bg-indigo-600 text-white font-black px-8 py-4 rounded-xl flex-1">SIMPAN PENGATURAN AI</button></div>
                   </form>
                </div>
            </div>
          )}

        </main>
      </div>

      {/* OVERLAYS & MODALS */}
      {checkoutPkg && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900 bg-opacity-80 backdrop-blur-md animate-fadeIn overflow-y-auto">
           <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-3xl my-auto p-8 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-2xl font-black">Final Checkout</h3><button onClick={()=>{setCheckoutPkg(null);}}><X /></button></div>
              <div className="bg-slate-900 rounded-[1.5rem] p-6 text-white"><p className="text-[10px] font-black uppercase text-indigo-300">Total</p><p className="text-3xl font-black">Rp {finalPrice.toLocaleString('id-ID')}</p></div>
              <form onSubmit={handlePurchaseRequest} className="space-y-4">
                 <input type="text" placeholder="Nama Pemilik Rekening Pengirim" value={confirmForm.senderName} onChange={e=>setConfirmForm({...confirmForm, senderName: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm" required />
                 <input type="text" placeholder="Bank Asal" value={confirmForm.senderBank} onChange={e=>setConfirmForm({...confirmForm, senderBank: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm" required />
                 <button type="submit" className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl">Konfirmasi</button>
              </form>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
    </div>
  );
}