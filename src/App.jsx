import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Cpu, Key, Sparkles as MagicWand, Link as LinkIcon, Globe, LayoutTemplate, Link, ChevronDown, ChevronUp
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
      match /artifacts/{appId}/public/data/userRegistry/{userId} {
        allow read, write: if isAdmin() || (request.method == 'create' && isOwner(userId));
      }
      match /artifacts/{appId}/public/data/replicatedSites/{userId} {
        allow read: if true;
        allow write: if isOwner(userId) || isAdmin();
      }
      match /{document=**} {
        allow read, write: if isAdmin(); // Admin full access
      }
    }
  }
*/

// ==========================================
// 1. KONFIGURASI SISTEM FIREBASE
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyC_go5YDW885EE1LUyeMBppyC-Zt18jYdQ",
  authDomain: "memberarea-websiteku.firebaseapp.com",
  projectId: "memberarea-websiteku",
  storageBucket: "memberarea-websiteku.firebasestorage.app",
  messagingSenderId: "9418923099",
  appId: "1:9418923099:web:f0275b81b802c08bb3737e"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'membership-v14-system';
const ADMIN_EMAIL = "admin@website.com"; 
const WHATSAPP_ADMIN = "628123456789"; 

const TIER_LEVELS = {
  0: { name: 'Free', color: 'text-slate-500', bg: 'bg-slate-100', price: 0, desc: 'Akses terbatas untuk member baru', features: ['Akses Modul Dasar', 'Kuis Harian AI'] },
  1: { name: 'Personal', color: 'text-emerald-600', bg: 'bg-emerald-50', price: 99000, desc: 'Cocok untuk individu yang baru memulai', features: ['Semua Akses Free', 'Akses Semua Modul', 'Grup Komunitas Terbatas', 'Sertifikat Digital'] },
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

// Fungsi Keamanan: Pembersih HTML (Sanitizer) Dasar anti XSS
const sanitizeHTML = (str) => {
    if (!str) return '';
    return str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
              .replace(/<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/gmi, (m) => m.replace(/on\w+\s*=/gi, 'data-blocked='))
              .replace(/javascript:/gi, 'blocked:');
};

// Fungsi Keamanan: Escape Input Strings
const escapeInput = (str) => str ? str.replace(/[<>"']/g, "").trim() : ''; // Izinkan slash / untuk URL

// Validasi Parsing JSON Aman
const safeJSONParse = (str) => {
    try {
        let cleanJson = str.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Gagal parsing JSON AI:", e);
        return null;
    }
};

let firebaseApp, auth, db;
const isConfigReady = firebaseConfig && firebaseConfig.apiKey;

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
  
  // --- States Public View (Fitur Baru Replicated Site) ---
  const [publicSiteData, setPublicSiteData] = useState(null);
  const [showPublicSite, setShowPublicSite] = useState(false);
  
  // --- Data States (Firebase Sync) ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]); 
  const [withdrawals, setWithdrawals] = useState([]); 
  const [coupons, setCoupons] = useState([]); 
  const [chatMessages, setChatMessages] = useState([]); 
  const [latestActivity, setLatestActivity] = useState(null);
  const [academyModules, setAcademyModules] = useState([]);
  
  // Fitur Replicated Site Member State
  const [myLandingPage, setMyLandingPage] = useState(null);
  const [isGeneratingLP, setIsGeneratingLP] = useState(false);
  const [editLPForm, setEditLPForm] = useState(null);
  const [isEditingLP, setIsEditingLP] = useState(false);

  // --- UI States ---
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [checkoutPkg, setCheckoutPkg] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null); 
  const [showCertificate, setShowCertificate] = useState(false); 
  
  // --- AI Mentor States ---
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', text: 'Halo! Saya ProSpace AI Mentor. Butuh panduan belajar, komisi, atau teknis?' }]);

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

  // --- Fitur AI Marketing Copilot States ---
  const [copilotForm, setCopilotForm] = useState({ product: 'ProSpace VIP', platform: 'whatsapp', tone: 'fomo' });
  const [copilotResult, setCopilotResult] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  // --- Fitur Admin AI Configuration ---
  const [aiConfig, setAiConfig] = useState({ provider: 'gemini', apiKey: '', isActive: true });
  const [isTestingApi, setIsTestingApi] = useState(false);

  // --- Fitur AI Kuis Pintar Edukasi ---
  const [aiQuiz, setAiQuiz] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [isQuizProcessing, setIsQuizProcessing] = useState(false);

  // --- Ruang Fokus VIP States ---
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusMode, setFocusMode] = useState('work'); 
  const focusStartTimeRef = useRef(null);

  // --- E-Learning Academy States ---
  const [activeCourseId, setActiveCourseId] = useState('');
  const [activeLessonId, setActiveLessonId] = useState('');
  const [quizSelection, setQuizSelection] = useState(null);
  
  // --- Admin E-Learning & CRM Forms ---
  const [modulTitle, setModulTitle] = useState('');
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [targetModulId, setTargetModulId] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', type: 'video', content: '', desc: '', points: 15, question: '', options: ['', '', '', ''], answer: 0, exp: '' });
  const [editUserForm, setEditUserForm] = useState({});

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

  const adminStats = useMemo(() => {
    const approved = transactions.filter(t => t.status === 'approved');
    const totalRev = approved.reduce((acc, curr) => acc + curr.price, 0);
    return { 
        totalRev, 
        pendingTrans: transactions.filter(t => t.status === 'pending').length,
        approvedTrans: approved.length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        pendingWd: withdrawals.filter(w => w.status === 'pending').length 
    };
  }, [transactions, tickets, withdrawals]);

  const approvedPercentage = transactions.length > 0 ? Math.round((adminStats.approvedTrans / transactions.length) * 100) : 0;
  const pendingPercentage = transactions.length > 0 ? Math.round((adminStats.pendingTrans / transactions.length) * 100) : 0;

  const leaderboardData = useMemo(() => {
    return allUsers
        .map(u => ({ uid: u.uid, name: u.name, totalEarned: (u.commissionBalance || 0) + (withdrawals.filter(w => w.userId === u.uid && w.status === 'approved').reduce((a, b) => a + b.amount, 0)) }))
        .filter(e => e.totalEarned > 0)
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 10);
  }, [allUsers, withdrawals]);

  const finalPrice = useMemo(() => {
    if (!checkoutPkg) return 0;
    if (appliedCoupon && appliedCoupon.discount) return checkoutPkg.price - (checkoutPkg.price * appliedCoupon.discount / 100);
    return checkoutPkg.price;
  }, [checkoutPkg, appliedCoupon]);

  // ==========================================
  // UTILITY & HELPERS
  // ==========================================
  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3500);
  };

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
       document.execCommand('copy');
       showToast("Berhasil disalin ke clipboard!");
    } catch(err) {
       showToast("Gagal menyalin.", "error");
    }
    document.body.removeChild(el);
  };

  const openWhatsAppConfirmation = (data) => {
    const text = `Halo Admin, saya ingin konfirmasi pembayaran.%0A%0APaket: ${data.name}%0AHarga: Rp ${data.price.toLocaleString('id-ID')}%0A%0A_Berikut saya lampirkan bukti transfer:_`;
    window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${text}`, '_blank');
  };

  const logActivity = async (text, type) => {
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activities'), {
            text: escapeInput(text), type, createdAt: new Date().toISOString()
        });
    } catch (e) {}
  };

  // ==========================================
  // LOGIC: DYNAMIC AI CALL HANDLER
  // ==========================================
  const fetchFromAI = async (promptText, jsonMode = false) => {
      if (!aiConfig.isActive) throw new Error("Fitur AI dimatikan sementara oleh Admin.");
      if (!aiConfig.apiKey) throw new Error("API Key sistem belum dikonfigurasi.");

      try {
          if (aiConfig.provider === 'gemini') {
              const payload = { contents: [{ parts: [{ text: promptText }] }] };
              if (jsonMode) {
                  payload.generationConfig = { responseMimeType: "application/json" };
              }
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': aiConfig.apiKey },
                  body: JSON.stringify(payload)
              });
              const data = await res.json();
              if(data.error) throw new Error(data.error.message);
              return data.candidates[0].content.parts[0].text;
              
          } else if (aiConfig.provider === 'openai') {
              const payload = { model: 'gpt-4o-mini', messages: [{role:'user', content:promptText}] };
              if (jsonMode) payload.response_format = { type: "json_object" };
              const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
                  body: JSON.stringify(payload)
              });
              const data = await res.json();
              if(data.error) throw new Error(data.error.message);
              return data.choices[0].message.content;
          } else {
             throw new Error("Provider AI belum didukung sistem.");
          }
      } catch (err) {
          throw err;
      }
  };

  // ==========================================
  // LOGIC: INITIAL FETCH & REPLICATED SITE (PUBLIC)
  // ==========================================
  useEffect(() => {
    if (!isConfigReady) { setLoading(false); return; }

    // Memeriksa Parameter Referral & Membuka Landing Page Publik (Replicated Site)
    const checkPublicSite = async () => {
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref') || params.get('aff');
        
        if (refCode && /^[a-zA-Z0-9_-]{5,50}$/.test(refCode)) {
            localStorage.setItem('affiliate_ref_v14', refCode);
            try {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', refCode);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setPublicSiteData(docSnap.data());
                    setShowPublicSite(true); 
                }
            } catch(e) { console.error("Gagal memuat landing page affiliate"); }
        }
    };
    checkPublicSite();

    const initAuth = async () => { 
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {} 
      } 
    };
    initAuth();
    
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const checkIsAdmin = u?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAdmin(checkIsAdmin);
      if (checkIsAdmin && activeTab === 'dashboard') setActiveTab('admin_overview');
      // Tutup otomatis public site jika user sudah login (biar fokus ke dashboard)
      if (u) setShowPublicSite(false);
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // ==========================================
  // REAL-TIME SYNC ENGINE (DATA MEMBER)
  // ==========================================
  useEffect(() => {
    if (!user || !isConfigReady) return;

    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (d) => {
      if (d.exists()) {
          setUserData(d.data());
          setProfileForm(prev => ({ ...prev, phone: d.data().phone || '', bank: d.data().bank || '', accountNo: d.data().accountNo || '' }));
      }
    });

    // Ambil data Replicated Site milik Member yang sedang login
    const unsubMySite = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', user.uid), (d) => {
        if (d.exists()) {
            setMyLandingPage(d.data());
            if(!isEditingLP) setEditLPForm(d.data()); // Sinkronisasi form edit jika sedang tidak mengedit
        }
    });

    const unsubFiles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'files'), (s) => setFiles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAnnounce = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), (s) => setAnnouncements(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCoupons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), (s) => setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubChat = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), (s) => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubModules = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'modules'), (s) => {
        const mods = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        setAcademyModules(mods);
        if (mods.length > 0 && !activeCourseId) {
            setActiveCourseId(mods[0].id);
            if(mods[0].lessons?.length > 0) setActiveLessonId(mods[0].lessons[0].id);
        }
    });

    const unsubAct = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'activities'), orderBy('createdAt', 'desc'), limit(1)), (s) => {
        if(!s.empty) {
            const data = s.docs[0].data();
            if (new Date() - new Date(data.createdAt) < 30000) {
               setLatestActivity(data);
               setTimeout(() => setLatestActivity(null), 7000); 
            }
        }
    });

    let adminUnsub = () => {};
    if (isAdmin) {
      adminUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry'), (s) => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    }

    const qTrans = isAdmin ? collection(db, 'artifacts', appId, 'public', 'data', 'transactions') : query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), where('userId', '==', user.uid));
    const unsubTrans = onSnapshot(qTrans, (s) => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qWd = isAdmin ? collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals') : query(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), where('userId', '==', user.uid));
    const unsubWd = onSnapshot(qWd, (s) => setWithdrawals(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qTix = isAdmin ? collection(db, 'artifacts', appId, 'public', 'data', 'tickets') : query(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), where('userId', '==', user.uid));
    const unsubTickets = onSnapshot(qTix, (s) => setTickets(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubAi = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ai_config'), (d) => {
        if (d.exists()) setAiConfig(d.data());
    });

    return () => { unsubProfile(); unsubFiles(); unsubAnnounce(); unsubCoupons(); unsubChat(); unsubModules(); unsubAct(); unsubTrans(); unsubTickets(); unsubWd(); unsubAi(); unsubMySite(); adminUnsub(); };
  }, [user, isAdmin]);

  // --- Pomodoro Timer Engine ---
  useEffect(() => {
    let interval;
    if (isFocusing && focusTimeLeft > 0) {
      if(!focusStartTimeRef.current) focusStartTimeRef.current = Date.now();
      interval = setInterval(() => { setFocusTimeLeft(prev => prev - 1); }, 1000);
    } else if (isFocusing && focusTimeLeft <= 0) {
      setIsFocusing(false);
      handleFocusComplete();
    }
    if(!isFocusing) focusStartTimeRef.current = null;
    return () => clearInterval(interval);
  }, [isFocusing, focusTimeLeft]);

  const handleFocusComplete = async () => {
    if (focusMode === 'work') {
       const timeElapsedMs = Date.now() - (focusStartTimeRef.current || Date.now());
       if (timeElapsedMs < 24 * 60 * 1000) {
           showToast("Aktivitas tidak wajar terdeteksi. Poin sesi dibatalkan.", "error");
           setFocusMode('work'); setFocusTimeLeft(25 * 60); return;
       }
       try {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { rewardPoints: increment(25) });
           await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { rewardPoints: increment(25) });
           showToast("Sesi Fokus Selesai! Anda mendapatkan +25 Poin Reward 🏆", "success");
           logActivity(`${userData?.name?.split(' ')[0] || 'Member'} menyelesaikan sesi Deep Work! 🧠`, 'focus');
           setFocusMode('break'); setFocusTimeLeft(5 * 60); 
       } catch(e) { showToast("Gagal menyimpan poin sesi", "error"); }
    } else {
       showToast("Waktu istirahat habis. Saatnya kembali fokus!", "success");
       setFocusMode('work'); setFocusTimeLeft(25 * 60); 
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Scroll UI Handlers ---
  useEffect(() => {
    if (activeTab === 'community') chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedChat, activeTab]);

  useEffect(() => {
    if (isAIOpen) aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, isAIOpen]);

  // ==========================================
  // LOGIC ACTIONS (MEMBER & ADMIN)
  // ==========================================
  
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!isConfigReady) return showToast("Config Firebase belum diisi!", "error");
    if (isProcessingAction.current) return;
    
    isProcessingAction.current = true;
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, escapeInput(formData.email), formData.password);
        const storedRef = localStorage.getItem('affiliate_ref_v14'); 
        
        const init = { 
            name: escapeInput(formData.name), email: escapeInput(formData.email), subscriptionLevel: 0, 
            joinDate: new Date().toISOString(), uid: cred.user.uid, commissionBalance: 0,
            referredBy: storedRef || null, completedFiles: [], completedLessons: [], rewardPoints: 0, lastCheckInDate: '', lastQuizDate: ''
        };
        await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profile', 'data'), init);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', cred.user.uid), init);
        localStorage.removeItem('affiliate_ref_v14');
        logActivity(`${escapeInput(formData.name)} baru saja bergabung! 👋`, 'join');
        showToast("Registrasi Berhasil!");
      } else {
        await signInWithEmailAndPassword(auth, escapeInput(formData.email), formData.password);
        showToast("Selamat Datang!");
      }
    } catch (err) { showToast("Gagal masuk/daftar. Cek kredensial Anda.", "error"); }
    setAuthLoading(false);
    isProcessingAction.current = false;
  };

  const handleDailyCheckIn = async () => {
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    const today = new Date().toDateString();
    
    if (userData?.lastCheckInDate === today) {
        isProcessingAction.current = false; 
        return showToast("Sudah klaim hari ini.", "error");
    }
    try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { rewardPoints: increment(10), lastCheckInDate: today });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { rewardPoints: increment(10), lastCheckInDate: today });
        showToast("Klaim +10 Poin Harian! 🎉", "success");
    } catch (e) { showToast("Error klaim poin", "error"); }
    isProcessingAction.current = false;
  };

  const handleGenerateAIQuiz = async () => {
      if (isGeneratingQuiz) return;
      setIsGeneratingQuiz(true); setAiQuiz(null); setSelectedQuizAnswer(null);
      try {
          const prompt = `Buatkan 1 soal kuis pilihan ganda yang sangat edukatif tentang digital marketing, bisnis online, affiliate, atau teknologi web. Wajib direturn murni dalam format JSON valid. Struktur: {"q": "pertanyaan", "options": ["A", "B", "C", "D"], "answer": 0_sampai_3, "exp": "penjelasan singkat"}`;
          const rawResult = await fetchFromAI(prompt, true);
          const quizData = safeJSONParse(rawResult);
          
          if(!quizData || !quizData.q || !quizData.options) throw new Error("Format AI tidak valid.");
          
          setAiQuiz(quizData);
          showToast("Kuis baru berhasil dibuat oleh AI!", "success");
      } catch(e) { showToast("Gagal generate kuis. Periksa API Key / Model.", "error"); }
      setIsGeneratingQuiz(false);
  };

  const handleAnswerQuiz = async (selectedIndex) => {
      if (isQuizProcessing || !aiQuiz) return;
      const today = new Date().toDateString();
      const hasAnsweredToday = userData?.lastQuizDate === today;
      
      setIsQuizProcessing(true); setSelectedQuizAnswer(selectedIndex);
      const isCorrect = selectedIndex === aiQuiz.answer;
      const pointEarned = isCorrect ? 20 : 5;

      setTimeout(async () => {
          if (!hasAnsweredToday) {
              try {
                 await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { rewardPoints: increment(pointEarned), lastQuizDate: today });
                 await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { rewardPoints: increment(pointEarned), lastQuizDate: today });
                 if (isCorrect) {
                     showToast(`Tepat Sekali! Anda dapat +${pointEarned} Poin`, 'success');
                     logActivity(`${userData?.name?.split(' ')[0]} menjawab Kuis AI Harian dengan Benar! 🧠`, 'quiz');
                 } else { showToast(`Jawaban Kurang Tepat. +${pointEarned} Poin partisipasi`, 'error'); }
              } catch(e) {}
          } else {
              if (isCorrect) showToast("Tepat Sekali! Latihan kuis yang bagus.", "success");
              else showToast("Kurang tepat. Jangan menyerah!", "error");
          }
          setIsQuizProcessing(false);
      }, 1000);
  };

  // --- LOGIC BARU: GENERATE & EDIT AI LANDING PAGE ---
  const handleGenerateLandingPage = async () => {
      if (currentTier < 2 && !isAdmin) return showToast("Minimal paket Business untuk membuat Web Replikator AI.", "error");
      if (isGeneratingLP) return;
      setIsGeneratingLP(true);

      try {
          const ownerName = escapeInput(userData?.name) || 'Member';
          const prompt = `Anda adalah expert copywriter pembuat Landing Page berkonversi tinggi. Buatkan isi website promosi untuk produk digital "ProSpace Membership" yang dimiliki oleh afiliate bernama "${ownerName}". Target audiens: orang awam, karyawan, pebisnis & marketer yang ingin mencari uang tambahan lewat internet. 
          Berikan HANYA format JSON valid tanpa markdown tambahan: 
          {
            "heroHeadline": "Judul bombastis, memikat, max 10 kata", 
            "heroSub": "Subjudul yang menjelaskan solusi, max 20 kata", 
            "vslUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
            "features": [
              {"t": "Nama Fitur 1", "d": "Deskripsi singkat"},
              {"t": "Nama Fitur 2", "d": "Deskripsi singkat"},
              {"t": "Nama Fitur 3", "d": "Deskripsi singkat"}
            ],
            "testimonials": [
              {"n": "Budi Santoso", "t": "Komentar positif dan antusias!"},
              {"n": "Siti Aminah", "t": "Komentar tentang kemudahan penggunaan."}
            ],
            "faq": [
              {"q": "Pertanyaan 1", "a": "Jawaban jelas 1"},
              {"q": "Pertanyaan 2", "a": "Jawaban jelas 2"}
            ]
          }`;
          
          const rawResult = await fetchFromAI(prompt, true);
          const lpData = safeJSONParse(rawResult);
          if(!lpData || !lpData.heroHeadline) throw new Error("Format AI terpotong atau gagal.");

          const siteData = {
              ownerName: ownerName,
              ownerId: user.uid,
              customDomain: myLandingPage?.customDomain || '', // Pertahankan custom domain jika sudah ada
              heroHeadline: sanitizeHTML(lpData.heroHeadline),
              heroSub: sanitizeHTML(lpData.heroSub),
              vslUrl: escapeInput(lpData.vslUrl) || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              features: lpData.features || [],
              testimonials: lpData.testimonials || [],
              faq: lpData.faq || [],
              updatedAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', user.uid), siteData);
          setEditLPForm(siteData);
          showToast("Landing Page AI berhasil dirakit & mengudara! 🚀", "success");
      } catch (err) {
          showToast("Gagal men-generate website. Silakan coba lagi.", "error");
      }
      setIsGeneratingLP(false);
  };

  const handleUpdateLandingPage = async (e) => {
      e.preventDefault();
      if (isProcessingAction.current || !editLPForm) return;
      isProcessingAction.current = true;
      try {
          // Bersihkan URL domain
          let cleanDomain = escapeInput(editLPForm.customDomain).toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
          
          const updatedData = {
              ...editLPForm,
              customDomain: cleanDomain,
              heroHeadline: sanitizeHTML(editLPForm.heroHeadline),
              heroSub: sanitizeHTML(editLPForm.heroSub),
              vslUrl: escapeInput(editLPForm.vslUrl),
              updatedAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'replicatedSites', user.uid), updatedData);
          showToast("Pengaturan Landing Page berhasil disimpan!", "success");
          setIsEditingLP(false);
      } catch(err) {
          showToast("Gagal menyimpan perubahan.", "error");
      }
      isProcessingAction.current = false;
  };


  const handleCompleteLearning = async (lesson, isQuiz = false, selectedOpt = null) => {
    if (completedLessons.includes(lesson.id)) return showToast("Sudah diselesaikan sebelumnya.", "error");
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    
    if (isQuiz) {
        if (selectedOpt !== lesson.answer) { isProcessingAction.current = false; return showToast(`Jawaban Kurang Tepat! ${lesson.exp}`, "error"); }
        showToast(`Jawaban Tepat! +${lesson.points} Poin. ${lesson.exp}`, "success");
    } else { showToast(`Materi Selesai! +${lesson.points} Poin Reward.`, "success"); }
    
    try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { completedLessons: arrayUnion(lesson.id), rewardPoints: increment(lesson.points) });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { rewardPoints: increment(lesson.points) });
        logActivity(`${userData?.name?.split(' ')[0] || 'Member'} menyelesaikan materi Academy "${lesson.title}" 🎓`, 'learn');
        setQuizSelection(null); 
    } catch (e) {}
    isProcessingAction.current = false;
  };

  const handleToggleFileProgress = async (fileId, fileName) => {
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
        const isDoneNow = !completedFiles.includes(fileId);
        const newArr = isDoneNow ? [...completedFiles, fileId] : completedFiles.filter(id => id !== fileId);
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { completedFiles: newArr });
        if(isDoneNow) { showToast("File ditandai selesai! +50 Poin Reward", "success"); logActivity(`${userData?.name?.split(' ')[0] || 'Member'} mendownload master file: ${fileName} 📦`, 'learn'); }
    } catch(e) {}
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
    } catch(err) { showToast("Gagal update profil", "error"); }
    isProcessingAction.current = false;
  };

  // --- ADMIN ACADEMY CRUD ---
  const handleAdminAddModul = async (e) => {
      e.preventDefault();
      if(!modulTitle || isProcessingAction.current) return;
      isProcessingAction.current = true;
      try {
          const modId = `modul_${Date.now()}`;
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'modules', modId), { id: modId, title: escapeInput(modulTitle), lessons: [], createdAt: new Date().toISOString() });
          setModulTitle(''); showToast("Modul Kelas berhasil ditambahkan!");
      } catch(e) {}
      isProcessingAction.current = false;
  };
  const handleAdminDeleteModul = async (modId) => {
      if(!window.confirm("Hapus seluruh Modul ini beserta isinya?")) return;
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'modules', modId)); showToast("Modul Dihapus"); } catch(e) {}
  };
  const handleAdminSaveLesson = async (e) => {
      e.preventDefault();
      if(!targetModulId || isProcessingAction.current) return;
      isProcessingAction.current = true;
      try {
          const modRef = doc(db, 'artifacts', appId, 'public', 'data', 'modules', targetModulId);
          const targetMod = academyModules.find(m => m.id === targetModulId);
          const newLesson = {
              id: `lsn_${Date.now()}`, title: escapeInput(lessonForm.title), type: lessonForm.type,
              points: parseInt(lessonForm.points) || 10, content: sanitizeHTML(lessonForm.content), desc: sanitizeHTML(lessonForm.desc),
              question: escapeInput(lessonForm.question), options: lessonForm.options.map(o => escapeInput(o)), answer: parseInt(lessonForm.answer), exp: escapeInput(lessonForm.exp)
          };
          const updatedLessons = [...(targetMod.lessons || []), newLesson];
          await updateDoc(modRef, { lessons: updatedLessons });
          setLessonModalOpen(false); setTargetModulId(null);
          setLessonForm({ title: '', type: 'video', content: '', desc: '', points: 15, question: '', options: ['', '', '', ''], answer: 0, exp: '' });
          showToast("Materi berhasil dimasukkan ke Modul!");
      } catch (err) {}
      isProcessingAction.current = false;
  };
  const handleAdminDeleteLesson = async (modId, lessonId) => {
      if(!window.confirm("Hapus materi ini?")) return;
      try {
          const modRef = doc(db, 'artifacts', appId, 'public', 'data', 'modules', modId);
          const targetMod = academyModules.find(m => m.id === modId);
          const updatedLessons = targetMod.lessons.filter(l => l.id !== lessonId);
          await updateDoc(modRef, { lessons: updatedLessons }); showToast("Materi dihapus");
      } catch(e) {}
  };

  // --- ADMIN CRM USER ---
  const openUserCRMDetail = (u) => {
      setSelectedUserDetail(u);
      setEditUserForm({ name: u.name || '', phone: u.phone || '', bank: u.bank || '', accountNo: u.accountNo || '', rewardPoints: u.rewardPoints || 0, commissionBalance: u.commissionBalance || 0, subscriptionLevel: u.subscriptionLevel || 0 });
  };
  const handleAdminUpdateUserCRM = async (e) => {
      e.preventDefault();
      if(!selectedUserDetail || isProcessingAction.current) return;
      isProcessingAction.current = true;
      try {
          const updateData = { name: escapeInput(editUserForm.name), phone: escapeInput(editUserForm.phone), bank: escapeInput(editUserForm.bank), accountNo: escapeInput(editUserForm.accountNo), rewardPoints: parseInt(editUserForm.rewardPoints), commissionBalance: parseInt(editUserForm.commissionBalance), subscriptionLevel: parseInt(editUserForm.subscriptionLevel) };
          await updateDoc(doc(db, 'artifacts', appId, 'users', selectedUserDetail.uid, 'profile', 'data'), updateData);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', selectedUserDetail.uid), updateData);
          showToast("Data Member CRM Berhasil Diupdate!"); setSelectedUserDetail(null);
      } catch(err) {}
      isProcessingAction.current = false;
  };
  const deleteMemberData = async (uid) => {
    if(!window.confirm("HAPUS DATA MEMBER PERMANEN DARI REGISTRY?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid)); showToast('Data Dihapus', 'error'); } catch (err) {}
  };

  // --- TRANSACTIONS & WITHDRAWALS ---
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

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', transId), {
        id: transId, userId: user.uid, userName: userData?.name || user?.email || 'Member', 
        packageLevel: checkoutPkg.level, packageName: checkoutPkg.name, price: trueFinalPrice, promoCode: appliedCoupon?.code || null, 
        senderName: escapeInput(confirmForm.senderName), senderBank: escapeInput(confirmForm.senderBank), notes: escapeInput(confirmForm.notes), status: 'pending', createdAt: new Date().toISOString()
      });
      logActivity(`${userData?.name?.split(' ')[0] || 'Seseorang'} memesan lisensi ${checkoutPkg.name}! 🔥`, 'order');
      openWhatsAppConfirmation({name: checkoutPkg.name, price: trueFinalPrice});
      setCheckoutPkg(null); setAppliedCoupon(null); setConfirmForm({senderName:'', senderBank:'', notes:''});
      showToast("Konfirmasi terkirim! Admin akan memvalidasi."); setActiveTab('transactions');
    } catch (err) {}
    isProcessingAction.current = false;
  };

  const handleTransactionAction = async (trans, action) => {
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      if (action === 'approve') {
          if(!window.confirm(`Setujui pembayaran dari ${trans.senderName}?`)) { isProcessingAction.current = false; return; }
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
          showToast("Member berhasil di-upgrade!");
      } else {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', trans.id), { status: 'rejected' }); showToast("Ditolak", "error");
      }
    } catch (err) {}
    isProcessingAction.current = false;
  };

  const handleRequestWithdrawal = async () => {
    if (!userData?.bank || !userData?.accountNo) return showToast("Lengkapi profil bank dulu!", "error");
    if (affiliateBalance < 100000) return showToast("Min penarikan Rp 100.000", "error");
    if (withdrawals.some(w => w.status === 'pending')) return showToast("Ada penarikan pending.", "error");
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      const amountToWithdraw = affiliateBalance;
      if (amountToWithdraw <= 0) { isProcessingAction.current = false; return; }
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), {
        userId: user.uid, userName: userData?.name || user?.email || 'Member', bank: userData.bank, accountNo: userData.accountNo, amount: amountToWithdraw, status: 'pending', createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { commissionBalance: increment(-amountToWithdraw) });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { commissionBalance: increment(-amountToWithdraw) });
      logActivity(`${userData?.name?.split(' ')[0]} menarik komisi Rp ${amountToWithdraw.toLocaleString()} 💸`, 'withdraw');
      showToast("Permintaan WD terkirim!");
    } catch(e) {}
    isProcessingAction.current = false;
  };

  const handleAdminWithdrawalAction = async (wdId, action, userId, amount) => {
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', wdId), { status: action, updatedAt: new Date().toISOString() });
      if (action === 'rejected') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data'), { commissionBalance: increment(amount) });
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', userId), { commissionBalance: increment(amount) });
         showToast("Pencairan ditolak. Saldo dikembalikan.", "error");
      } else { showToast("Pencairan dana SELESAI."); }
    } catch(e) {}
    isProcessingAction.current = false;
  }
  const handleDeleteWithdrawal = async (wdId) => {
      if(!window.confirm("Hapus riwayat penarikan dana ini permanen?")) return;
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', wdId)); showToast('Data WD Dihapus!'); } catch(e) {}
  };

  // --- COUPONS ---
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if(!couponForm.code || !couponForm.discount) return;
    try {
       const codeUpper = escapeInput(couponForm.code.toUpperCase().split(' ').join(''));
       await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', codeUpper), { id: codeUpper, code: codeUpper, discount: parseInt(couponForm.discount), active: true, createdAt: new Date().toISOString() });
       setCouponForm({code: '', discount: ''}); showToast("Kupon Diskon berhasil dibuat!");
    } catch(err) {}
  };
  const handleDeleteCoupon = async (couponId) => {
    if(!window.confirm("Yakin ingin menghapus kupon ini?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', couponId)); showToast("Kupon dihapus!"); } catch(err) {}
  };
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const codeFormat = escapeInput(couponInput.toUpperCase().split(' ').join(''));
    const found = coupons.find(c => c.code === codeFormat && c.active);
    if (found) { setAppliedCoupon(found); showToast(`${found.discount}% Diskon diterapkan!`); } else { setAppliedCoupon(null); showToast("Kupon tidak valid.", "error"); }
  };

  // --- MISC (CHAT, TICKET) ---
  const handleSendChat = async (e) => {
    e.preventDefault();
    if(!chatInput.trim() || isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), { userId: user.uid, userName: userData?.name || user?.email?.split('@')[0] || 'Member', text: sanitizeHTML(chatInput), isAdmin, rankName: userRank.name, rankBg: userRank.bg, rankColor: userRank.color, createdAt: new Date().toISOString() });
        setChatInput('');
    } catch(e) {}
    isProcessingAction.current = false;
  };
  const handleDeleteChat = async (id) => {
    if(!window.confirm('Hapus chat?')) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'globalChat', id)); } catch(e) {}
  };
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message || isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), { userId: user.uid, userName: userData?.name || user?.email || 'Member', subject: escapeInput(ticketForm.subject), message: sanitizeHTML(ticketForm.message), status: 'open', adminReply: '', createdAt: new Date().toISOString() });
      setTicketForm({ subject: '', message: '' }); showToast("Tiket Bantuan dikirim.");
    } catch (err) {}
    isProcessingAction.current = false;
  };
  const handleAdminReplyTicket = async (ticketId, replyText) => {
    if (!replyText || isProcessingAction.current) return;
    isProcessingAction.current = true;
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), { status: 'answered', adminReply: sanitizeHTML(replyText), updatedAt: new Date().toISOString() }); showToast("Balasan terkirim."); } catch (err) {}
    isProcessingAction.current = false;
  };
  const handleDeleteTicket = async (ticketId) => {
    if(!window.confirm("Hapus tiket ini?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId)); showToast("Dihapus."); } catch (err) {}
  }
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (isProcessingAction.current) return;
    isProcessingAction.current = true;
    try {
      const data = { name: escapeInput(productForm.name), size: escapeInput(productForm.size), reqLevel: parseInt(productForm.reqLevel), url: productForm.url, category: productForm.category, updatedAt: serverTimestamp() };
      if (editingId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', editingId), data); showToast("Diperbarui"); } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'files'), { ...data, createdAt: serverTimestamp() }); showToast("Ditambahkan"); }
      setProductForm({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' }); setEditingId(null);
    } catch (err) {}
    isProcessingAction.current = false;
  };

  // --- LOGIC: PROSPACE AI MENTOR ---
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if(!aiInput.trim()) return;
    if (!aiConfig.isActive) return showToast("Fitur AI Mentor sedang dinonaktifkan oleh Admin.", "error");

    const safeInput = escapeInput(aiInput);
    const newMsgs = [...aiMessages, { role: 'user', text: safeInput }];
    setAiMessages(newMsgs); setAiInput(''); setAiTyping(true);

    try {
        const prompt = `Anda adalah 'ProSpace AI Mentor', asisten AI pintar khusus untuk member platform edukasi bisnis digital. Jawablah dengan bahasa Indonesia yang ramah, ringkas, dan jelas. \n\nPertanyaan User: ${safeInput}`;
        const reply = await fetchFromAI(prompt);
        setAiMessages(prev => [...prev, { role: 'ai', text: sanitizeHTML(reply) }]);
    } catch(err) {
        setAiMessages(prev => [...prev, { role: 'ai', text: "⚠️ Maaf, API Key belum dikonfigurasi atau tidak valid. Silakan hubungi CS Helpdesk." }]);
    }
    setAiTyping(false);
  };

  // --- LOGIC: AI MARKETING COPILOT GENERATOR ---
  const handleGenerateCopy = async (e) => {
      e.preventDefault();
      if (!aiConfig.isActive) return showToast("Fitur AI Copilot dinonaktifkan oleh Admin sementara waktu.", "error");
      setIsGeneratingCopy(true); setCopilotResult('');
      try {
          const link = `https://member.bagihosting.com/?ref=${user?.uid || '123'}`;
          const safeProduct = escapeInput(copilotForm.product);
          const prompt = `Buatkan 1 teks copywriting promosi bahasa Indonesia untuk platform ${copilotForm.platform} dengan gaya penulisan ${copilotForm.tone}. Produk yang dijual adalah "${safeProduct}". Jangan gunakan markdown berlebihan (\`\`\`). Sertakan emoji secukupnya. Di kalimat paling akhir, arahkan pembaca untuk mengklik link ini: ${link}`;
          const result = await fetchFromAI(prompt);
          setCopilotResult(sanitizeHTML(result.trim()));
          showToast("Copywriting berhasil di-generate AI!", "success");
      } catch (err) { showToast(err.message || "Gagal memanggil API AI. Cek konfigurasi.", "error"); }
      setIsGeneratingCopy(false);
  };

  // --- LOGIC: SIMPAN & TEST KONFIGURASI AI (ADMIN) ---
  const handleTestApiConnection = async () => {
      if (!aiConfig.apiKey) return showToast("Masukkan API Key terlebih dahulu!", "error");
      setIsTestingApi(true);
      try {
          let reply = "";
          if (aiConfig.provider === 'gemini') {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': aiConfig.apiKey },
                  body: JSON.stringify({ contents: [{ parts: [{ text: "Berikan respon persis 1 kata: 'BERHASIL'" }] }] })
              });
              const data = await res.json();
              if(data.error) throw new Error(data.error.message);
              reply = data.candidates[0].content.parts[0].text;
          } else if (aiConfig.provider === 'openai') {
              const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
                  body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{role:'user', content:"Berikan respon persis 1 kata: 'BERHASIL'"}] })
              });
              const data = await res.json();
              if(data.error) throw new Error(data.error.message);
              reply = data.choices[0].message.content;
          }
          showToast(`Koneksi Sukses! Respon AI: ${sanitizeHTML(reply.trim())}`, "success");
      } catch (err) { showToast(`Gagal Konek: ${err.message}`, "error"); }
      setIsTestingApi(false);
  };

  const handleSaveAiConfig = async (e) => {
      e.preventDefault();
      try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ai_config'), aiConfig); showToast("Konfigurasi AI dan API Key berhasil disimpan!"); } catch (err) {}
  };

  const closeSidebarMobile = () => { if (window.innerWidth < 1024) setSidebarOpen(false); };


  // ==========================================
  // RENDER: LAYOUT
  // ==========================================
  
  // TAMPILAN: PUBLIC REPLICATED SITE (LANDING PAGE SUNGGUHAN)
  if (showPublicSite && publicSiteData && !user) {
      
      // Komponen Reusable untuk FAQ (Accordion)
      const FaqItem = ({ q, a }) => {
          const [isOpen, setIsOpen] = useState(false);
          return (
              <div className="bg-white border border-slate-200 rounded-2xl mb-4 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                  <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-6 font-black text-slate-800 flex justify-between items-center bg-slate-50 hover:bg-indigo-50 focus:outline-none">
                      <span>{q}</span>
                      {isOpen ? <ChevronUp size={20} className="text-indigo-600" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </button>
                  {isOpen && <div className="p-6 pt-0 text-slate-600 leading-relaxed font-medium bg-slate-50" dangerouslySetInnerHTML={{ __html: a }}></div>}
              </div>
          );
      };

      // PERBAIKAN: Fungsi internal untuk pindah ke form register/login tanpa pindah link (Mencegah 404)
      const handleJoinClick = (mode = 'register') => {
          setShowPublicSite(false); // Tutup landing page publik
          setAuthMode(mode);        // Buka form pendaftaran/login
          window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas
      };

      return (
          <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] text-slate-800 flex flex-col relative overflow-x-hidden">
              
              {/* Promo Bar */}
              <div className="bg-gradient-to-r from-rose-500 to-orange-400 text-white text-center py-3 px-4 font-bold text-sm tracking-wide shadow-md relative z-50">
                  🔥 PROMO SPESIAL: Diskon 50% Untuk 10 Pembeli Pertama Hari Ini! <button onClick={() => handleJoinClick('register')} className="underline ml-2 font-black">KLAIM SEKARANG</button>
              </div>

              {/* Navbar */}
              <header className="sticky top-0 z-40 bg-white bg-opacity-90 backdrop-blur-xl border-b border-slate-200 py-4 px-6 shadow-sm">
                  <div className="max-w-6xl mx-auto flex justify-between items-center">
                      <div className="font-black text-2xl tracking-tighter text-slate-900 flex items-center gap-2">
                         <ShieldCheck className="text-indigo-600" size={28}/> Pro<span className="text-indigo-600">Space</span>
                      </div>
                      <button onClick={() => handleJoinClick('login')} className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-indigo-600 transition-colors shadow-lg hidden sm:block">Member Area</button>
                  </div>
              </header>

              {/* Hero Section */}
              <section className="relative pt-20 pb-32 px-6 overflow-hidden bg-slate-900 text-white">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 opacity-90 z-0"></div>
                  <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600 rounded-full blur-[150px] opacity-30 z-0 animate-pulse"></div>
                  
                  <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
                      <div className="w-full lg:w-1/2 text-center lg:text-left animate-slideInRight">
                          <span className="bg-white bg-opacity-10 border border-white border-opacity-20 text-indigo-300 font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-widest mb-6 inline-block backdrop-blur-sm">Rekomendasi Spesial: {publicSiteData.ownerName}</span>
                          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-['Outfit'] leading-tight mb-6 tracking-tight drop-shadow-lg">
                              <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(publicSiteData.heroHeadline) }}></span>
                          </h1>
                          <h2 className="text-lg sm:text-2xl text-indigo-300 font-medium mb-12 max-w-2xl">
                              <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(publicSiteData.heroSub) }}></span>
                          </h2>
                          
                          <button onClick={() => handleJoinClick('register')} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black px-10 py-5 rounded-full shadow-[0_10px_40px_rgba(79,70,229,0.5)] hover:scale-105 transition-transform text-lg flex items-center justify-center lg:justify-start gap-3 w-max mx-auto lg:mx-0">
                              <Rocket size={24} /> GABUNG SEKARANG JUGA
                          </button>
                      </div>
                      <div className="w-full lg:w-1/2 relative animate-float">
                          <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-[2rem] shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                             <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Platform Dashboard" className="rounded-[1.5rem] border-4 border-slate-900 w-full object-cover shadow-inner" />
                          </div>
                      </div>
                  </div>
              </section>

              {/* Trust Marquee */}
              <div className="bg-white border-b border-slate-200 py-6 overflow-hidden flex items-center relative">
                  <div className="absolute left-0 w-20 h-full bg-gradient-to-r from-white to-transparent z-10"></div>
                  <div className="absolute right-0 w-20 h-full bg-gradient-to-l from-white to-transparent z-10"></div>
                  <div className="flex gap-16 animate-[marquee_20s_linear_infinite] whitespace-nowrap opacity-40 font-black text-2xl font-['Outfit'] uppercase tracking-widest text-slate-400">
                      <span>Dipercaya Ribuan Member</span> • <span>Akses Lifetime</span> • <span>Support 24/7</span> • <span>Terbukti Menghasilkan</span> • <span>Dipercaya Ribuan Member</span> • <span>Akses Lifetime</span> • <span>Support 24/7</span> • <span>Terbukti Menghasilkan</span>
                  </div>
              </div>

              {/* VSL Section */}
              {publicSiteData.vslUrl && (
                  <section className="py-24 px-6 bg-slate-50 text-center">
                      <div className="max-w-4xl mx-auto">
                          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-6 font-['Outfit'] tracking-tight">Tonton Demo Singkat Ini</h2>
                          <p className="text-slate-500 text-lg mb-12 max-w-2xl mx-auto">Lihat langsung kehebatan fitur AI kami bekerja di dalam dashboard member secara live.</p>
                          <div className="bg-white p-4 rounded-[2rem] shadow-2xl border border-slate-200">
                              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 relative">
                                  <iframe src={publicSiteData.vslUrl} className="w-full h-full absolute top-0 left-0" frameBorder="0" allowFullScreen></iframe>
                              </div>
                          </div>
                      </div>
                  </section>
              )}

              {/* Story / Problem-Agitation-Solution */}
              <section className="py-24 px-6 bg-white relative">
                  <div className="max-w-3xl mx-auto text-center mb-16">
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-6 font-['Outfit']">Kenapa Harus ProSpace?</h2>
                      <div className="w-20 h-2 bg-indigo-600 rounded-full mx-auto mb-10"></div>
                      <div className="text-lg text-slate-600 leading-loose font-medium space-y-6 text-left bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-sm" dangerouslySetInnerHTML={{ __html: sanitizeHTML(publicSiteData.story) }}></div>
                  </div>
                  
                  {/* Bagian Perbaikan Tombol Cerita Tengah */}
                  <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto max-w-3xl mx-auto">
                      <button onClick={() => handleJoinClick('register')} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black px-10 py-5 rounded-full shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:scale-105 transition-transform text-lg flex items-center justify-center gap-3 w-full">
                          <Rocket size={24} /> GABUNG SEKARANG
                      </button>
                  </div>
              </section>

              {/* Features Grid */}
              <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-indigo-900 to-transparent opacity-30"></div>
                  <div className="max-w-6xl mx-auto relative z-10">
                      <div className="text-center mb-16">
                          <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 font-['Outfit'] tracking-tight">Fitur Superior Dalam 1 Genggaman</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {publicSiteData.features && publicSiteData.features.map((f, i) => (
                              <div key={i} className="bg-white bg-opacity-5 backdrop-blur-lg border border-white border-opacity-10 p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
                                  <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                      <MagicWand size={28} className="text-white" />
                                  </div>
                                  <h3 className="text-xl font-black mb-3">{f.t}</h3>
                                  <p className="text-indigo-200 leading-relaxed text-sm">{f.d}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </section>

              {/* Testimonials */}
              <section className="py-24 px-6 bg-slate-50">
                  <div className="max-w-6xl mx-auto">
                      <h2 className="text-3xl sm:text-4xl font-black text-center text-slate-900 mb-16 font-['Outfit']">Apa Kata Mereka?</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {publicSiteData.testimonials && publicSiteData.testimonials.map((testi, i) => (
                              <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-lg relative">
                                  <div className="absolute top-10 right-10 text-indigo-100 opacity-50 font-serif text-8xl leading-none">"</div>
                                  <p className="text-lg text-slate-700 italic font-medium relative z-10 mb-8">"{testi.t}"</p>
                                  <div className="flex items-center gap-4 relative z-10 border-t border-slate-100 pt-6">
                                      <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-black text-xl">{testi.n.charAt(0)}</div>
                                      <div>
                                          <h4 className="font-black text-slate-900">{testi.n}</h4>
                                          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Verified Member</p>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </section>

              {/* FAQ */}
              <section className="py-24 px-6 bg-white border-t border-slate-200">
                  <div className="max-w-3xl mx-auto">
                      <h2 className="text-3xl sm:text-4xl font-black text-center text-slate-900 mb-12 font-['Outfit']">Pertanyaan Populer (FAQ)</h2>
                      <div className="space-y-2">
                          {publicSiteData.faq && publicSiteData.faq.map((item, i) => (
                              <FaqItem key={i} q={item.q} a={item.a} />
                          ))}
                      </div>
                  </div>
              </section>

              {/* Super CTA / Pricing Override */}
              <section className="py-24 px-6 bg-slate-900 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                  <div className="max-w-4xl mx-auto relative z-10 bg-gradient-to-b from-indigo-600 to-purple-800 rounded-[3rem] p-12 sm:p-20 shadow-[0_20px_60px_rgba(79,70,229,0.4)] border border-indigo-400 border-opacity-30">
                      <h2 className="text-4xl sm:text-6xl font-black text-white font-['Outfit'] mb-6 tracking-tight">Ambil Keputusan Sekarang!</h2>
                      <p className="text-xl text-indigo-100 font-medium mb-12 max-w-2xl mx-auto">Jangan tunggu harga naik. Bergabunglah hari ini dan dapatkan akses penuh ke ekosistem ProSpace melalui rekomendasi {publicSiteData.ownerName}.</p>
                      
                      {/* PERBAIKAN TOMBOL BAWAH */}
                      <button onClick={() => handleJoinClick('register')} className="inline-flex items-center justify-center gap-3 bg-white text-indigo-600 font-black px-12 py-6 rounded-full shadow-2xl hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all text-xl uppercase tracking-wider">
                          Daftar & Kunci Diskon <ChevronRight size={24} />
                      </button>
                  </div>
              </section>

              <footer className="p-8 text-center text-slate-500 font-medium border-t border-slate-200 bg-white">
                  &copy; {new Date().getFullYear()} ProSpace Ecosystem. All rights reserved.<br/>
                  <span className="text-xs mt-2 inline-block">Affiliate Partner: {publicSiteData.ownerName}</span>
              </footer>
              
              <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
          </div>
      );
  }

  // TAMPILAN: LOGIN (DEFAULT JIKA BELUM ADA SESI DAN BUKAN REPLICATED SITE)
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-fadeIn relative z-10">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-100">
               <ShieldCheck size={32} className="text-white" />
             </div>
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
               {authLoading && <RefreshCw size={18} className="animate-spin" />}
               {authLoading ? 'MEMPROSES...' : authMode==='login' ? 'MASUK KE DASHBOARD' : 'DAFTAR SEKARANG'}
            </button>
          </form>
      </div>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
    </div>
  );

  // KOMPONEN: NAVIGASI SIDEBAR
  const NavBtn = ({ active, onClick, icon, label, count }) => (
    <button onClick={onClick} className={`flex items-center justify-between px-5 py-4 w-full rounded-2xl font-black transition-all group ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.03] active:scale-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
      <div className="flex items-center gap-4">
        <div className={`transition-transform ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-indigo-600'}`}>{icon}</div>
        <span className="text-sm tracking-tight">{label}</span>
      </div>
      {count !== undefined && count > 0 && !active && <span className="bg-rose-500 text-white shadow-lg text-[10px] font-black px-2.5 py-1 rounded-full">{count}</span>}
    </button>
  );

  const StatCard = ({ label, val, icon, color }) => {
    const colors = { emerald: 'bg-emerald-50 text-emerald-600', indigo: 'bg-indigo-50 text-indigo-600', amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600' };
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-transform group-hover:rotate-6 ${colors[color]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl font-black text-slate-800 font-['Outfit'] truncate">{val}</p>
        </div>
      </div>
    );
  };

  const ProFileCard = ({ file, currentTier, isCompleted, onToggleProgress }) => {
    const isAccessible = currentTier >= (file.reqLevel || 0);
    return (
      <div className={`bg-white rounded-[2rem] border-2 ${isAccessible ? (isCompleted ? 'border-emerald-300 shadow-lg' : 'border-transparent shadow-lg') : 'border-slate-100 bg-slate-50 bg-opacity-50 opacity-75'} p-6 sm:p-8 transition-all flex flex-col h-full group relative overflow-hidden`}>
        {isAccessible && <div className={`absolute top-0 left-0 w-full h-2 ${isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-indigo-600 to-sky-400'}`}></div>}
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div className={`h-14 w-14 rounded-[1.25rem] flex items-center justify-center transition-transform duration-500 shadow-md ${isAccessible ? (isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-600 group-hover:scale-110') : 'bg-slate-200 text-slate-400'}`}>
            {file.category === 'Ebook' ? <FileText size={24} /> : file.category === 'Video' ? <Video size={24} /> : <Box size={24} />}
          </div>
          {isAccessible ? (
            <button onClick={onToggleProgress} disabled={isProcessingAction.current} className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter flex items-center gap-1 border transition-colors disabled:opacity-50 ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
              {isCompleted ? <CheckSquare size={12} /> : <Square size={12} />} {isCompleted ? 'SELESAI' : 'TANDAI'}
            </button>
          ) : (
            <div className="bg-white text-rose-500 text-[9px] font-black px-3 py-1.5 rounded-full uppercase border border-rose-100 shadow-sm"><Lock size={12} className="inline mr-1" /> LOCKED</div>
          )}
        </div>
        <div className="space-y-2 mb-8 flex-1 relative z-10">
          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[2px]">{file.category}</p>
          <h4 className="text-lg font-black text-slate-900 font-['Outfit'] leading-tight line-clamp-2">{file.name}</h4>
        </div>
        <div className="relative z-10 mt-auto">
          {isAccessible ? (
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-full bg-slate-900 text-white text-center font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 text-xs">
              <Download size={18} /> UNDUH SEKARANG
            </a>
          ) : (
            <div className="w-full bg-slate-200 text-slate-500 text-center font-black py-4 rounded-2xl uppercase text-[9px] tracking-widest font-bold">Minimal Paket {TIER_LEVELS[file.reqLevel]?.name}</div>
          )}
        </div>
      </div>
    );
  };

  // TAMPILAN: UTAMA (DASHBOARD)
  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] flex text-slate-800 relative">
      
      {/* FOMO TICKER */}
      {latestActivity && (
        <div className="fixed bottom-6 left-6 z-[200] max-w-sm bg-white rounded-2xl shadow-3xl border border-slate-100 p-4 flex items-center gap-4 animate-slideInRight">
           <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${latestActivity.type === 'order' ? 'bg-amber-100 text-amber-600' : latestActivity.type === 'focus' || latestActivity.type === 'learn' || latestActivity.type === 'quiz' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <Zap size={20} className="animate-pulse" />
           </div>
           <p className="text-xs font-bold text-slate-700 leading-tight">{latestActivity.text}</p>
        </div>
      )}

      {/* AI WIDGET */}
      {!isAdmin && (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
           {isAIOpen && (
             <div className="w-[320px] sm:w-[380px] bg-white rounded-3xl shadow-3xl border border-slate-200 mb-4 overflow-hidden flex flex-col h-[450px] animate-fadeIn">
                <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center"><Bot size={20} /></div>
                      <h4 className="font-black text-sm">ProSpace AI Mentor</h4>
                   </div>
                   <button onClick={()=>setIsAIOpen(false)}><X size={18} /></button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 custom-scrollbar">
                   {aiMessages.map((m, i) => (
                      <div key={i} className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'ai' ? 'bg-white border self-start rounded-tl-none' : 'bg-indigo-600 text-white self-end rounded-tr-none shadow-md'}`} dangerouslySetInnerHTML={{__html: m.text}}></div>
                   ))}
                   {aiTyping && <div className="p-3 bg-white border self-start rounded-2xl rounded-tl-none italic text-xs text-slate-400">Sedang mengetik...</div>}
                   <div ref={aiEndRef} />
                </div>
                <form onSubmit={handleAiSubmit} className="p-3 bg-white border-t flex gap-2">
                   <input type="text" placeholder="Tanya AI..." value={aiInput} onChange={e=>setAiInput(e.target.value)} className="flex-1 px-4 py-2 bg-slate-100 rounded-xl outline-none text-sm" />
                   <button type="submit" disabled={isProcessingAction.current} className="bg-indigo-600 text-white p-2.5 rounded-xl disabled:opacity-50"><Send size={18} /></button>
                </form>
             </div>
           )}
           <button onClick={()=>setIsAIOpen(!isAIOpen)} className="bg-indigo-600 text-white p-4 rounded-full shadow-2xl animate-float"><Bot size={28} /></button>
        </div>
      )}

      {/* SIDEBAR */}
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
              <NavBtn active={activeTab==='admin_coupons'} onClick={()=>{setActiveTab('admin_coupons'); closeSidebarMobile();}} icon={<Tag size={20} />} label="Kelola Kupon" />
              <NavBtn active={activeTab==='admin_support'} onClick={()=>{setActiveTab('admin_support'); closeSidebarMobile();}} icon={<MessageCircle size={20} />} label="Support Helpdesk" count={adminStats.openTickets} />
              <NavBtn active={activeTab==='admin_users'} onClick={()=>{setActiveTab('admin_users'); closeSidebarMobile();}} icon={<Users size={20} />} label="Data Member CRM" />
              
              <NavBtn active={activeTab==='admin_academy'} onClick={()=>{setActiveTab('admin_academy'); closeSidebarMobile();}} icon={<GraduationCap size={20} />} label="Kelola Academy LMS" />
              <NavBtn active={activeTab==='admin_files'} onClick={()=>{setActiveTab('admin_files'); closeSidebarMobile();}} icon={<Plus size={20} />} label="Kelola Master File" />
              <NavBtn active={activeTab==='admin_ai_config'} onClick={()=>{setActiveTab('admin_ai_config'); closeSidebarMobile();}} icon={<Cpu size={20} />} label="Pengaturan API & AI" />
              
              <div className="my-6 border-b border-slate-100"></div>
            </>
          ) : (
            <>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Member Menu</p>
              <NavBtn active={activeTab==='dashboard'} onClick={()=>{setActiveTab('dashboard'); closeSidebarMobile();}} icon={<LayoutDashboard size={20} />} label="Dashboard" />
              <NavBtn active={activeTab==='elearning'} onClick={()=>{setActiveTab('elearning'); closeSidebarMobile();}} icon={<GraduationCap size={20} />} label="ProSpace Academy" />
              <NavBtn active={activeTab==='focus'} onClick={()=>{setActiveTab('focus'); closeSidebarMobile();}} icon={<Headphones size={20} />} label="Ruang Fokus VIP" />
              <NavBtn active={activeTab==='quiz'} onClick={()=>{setActiveTab('quiz'); closeSidebarMobile();}} icon={<BookOpen size={20} />} label="Kuis AI Dinamis" />
              <NavBtn active={activeTab==='community'} onClick={()=>{setActiveTab('community'); closeSidebarMobile();}} icon={<MessageCircle size={20} />} label="Komunitas VIP" />
              <NavBtn active={activeTab==='files'} onClick={()=>{setActiveTab('files'); closeSidebarMobile();}} icon={<FolderLock size={20} />} label="Katalog Master File" count={files.filter(f=>currentTier>=f.reqLevel).length} />
              <NavBtn active={activeTab==='shop'} onClick={()=>{setActiveTab('shop'); closeSidebarMobile();}} icon={<ShoppingBag size={20} />} label="Upgrade Paket" />
              <NavBtn active={activeTab==='transactions'} onClick={()=>{setActiveTab('transactions'); closeSidebarMobile();}} icon={<Banknote size={20} />} label="Riwayat Order" count={[...transactions].filter(t=>t.userId === user?.uid && t.status==='pending').length} />
              
              <div className="my-4 border-b border-slate-100"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Marketing & Earning</p>
              <NavBtn active={activeTab==='affiliate'} onClick={()=>{setActiveTab('affiliate'); closeSidebarMobile();}} icon={<Network size={20} />} label="Program Afiliasi" />
              <NavBtn active={activeTab==='copilot'} onClick={()=>{setActiveTab('copilot'); closeSidebarMobile();}} icon={<Rocket size={20} />} label="AI Marketing Copilot" />
              <NavBtn active={activeTab==='landingpage'} onClick={()=>{setActiveTab('landingpage'); closeSidebarMobile();}} icon={<LayoutTemplate size={20} />} label="Web Replikator Pribadi" />
              
              <NavBtn active={activeTab==='leaderboard'} onClick={()=>{setActiveTab('leaderboard'); closeSidebarMobile();}} icon={<Trophy size={20} />} label="Peringkat Marketer" />
              
              <div className="my-4 border-b border-slate-100"></div>
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

      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative custom-scrollbar bg-slate-50">
        
        {/* HEADER TOP */}
        <header className="h-20 bg-white bg-opacity-80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-[100] shrink-0">
          <button onClick={()=>setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 bg-slate-100 rounded-xl"><Menu /></button>
          <div className="flex items-center gap-6 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-tight">{userData?.name || 'Member'}</p>
              {isAdmin ? (
                 <div className="text-[9px] px-2 py-0.5 rounded-full uppercase font-black inline-flex items-center gap-1 mt-1 bg-indigo-100 text-indigo-600 border border-indigo-200">
                    <ShieldCheck size={10} /> SUPER ADMIN
                 </div>
              ) : (
                 <div className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black inline-block mt-1 ${userRank.bg} ${userRank.color} border ${userRank.border}`}>{userRank.icon} {userRank.name} RANK</div>
              )}
            </div>
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white rounded-2xl flex items-center justify-center font-black shadow-lg cursor-pointer" onClick={()=>setActiveTab('profile')}>
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-12 w-full max-w-7xl mx-auto animate-fadeIn pb-32">
          
          {/* ==================================================== */}
          {/* TAB: DASHBOARD */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {!isAdmin && (
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-[2.5rem] p-6 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6 border border-purple-400 border-opacity-30 overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-white bg-opacity-10 rounded-full blur-3xl"></div>
                   <div className="text-center sm:text-left relative z-10">
                      <h3 className="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center sm:justify-start gap-2"><Gift size={24} /> Bonus Check-In Harian</h3>
                      <p className="text-purple-100 text-xs sm:text-sm font-medium">Klaim setiap hari dan kumpulkan Poin Reward Anda.</p>
                   </div>
                   <button onClick={handleDailyCheckIn} disabled={userData?.lastCheckInDate === new Date().toDateString() || isProcessingAction.current} className="relative z-10 w-full sm:w-auto bg-white text-purple-600 px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-transform disabled:opacity-50 shadow-lg">
                      {userData?.lastCheckInDate === new Date().toDateString() ? 'SUDAH KLAIM' : '🎁 KLAIM +10 POIN'}
                   </button>
                </div>
              )}

              {progressData === 100 && accessibleFiles.length > 0 && !isAdmin && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] p-6 sm:p-10 text-white shadow-xl border border-emerald-400 border-opacity-30">
                   <div className="text-center sm:text-left">
                      <h3 className="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center sm:justify-start gap-2"><BadgeCheck size={24} /> Luar Biasa! Selesai 100%</h3>
                      <p className="text-emerald-50 text-xs sm:text-sm">Unduh sertifikat kelulusan Anda sekarang.</p>
                   </div>
                   <button onClick={() => setShowCertificate(true)} className="mt-4 w-full sm:w-auto bg-white text-emerald-600 px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2"><DownloadCloud size={18} /> CETAK SERTIFIKAT</button>
                </div>
              )}

              <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-14 text-white relative shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-500 bg-opacity-20 rounded-full blur-[100px]"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                  <div className="space-y-4 text-center lg:text-left w-full lg:w-2/3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-10 rounded-full border border-white border-opacity-10 backdrop-blur-sm">
                       <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{isAdmin ? 'Mode Super Admin' : TIER_LEVELS[currentTier].name + ' Member'}</span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-black font-['Outfit'] tracking-tight leading-tight">Halo, {userData?.name?.split(' ')[0] || 'Member'}! 👋</h2>
                    <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
                      {isAdmin ? "Anda dapat menelusuri seluruh fitur member melalui sidebar di sebelah kiri, atau mengelola database dari menu Admin Panel Master." : "Akses modul interaktif di ProSpace Academy dan tingkatkan skill digital Anda hari ini."}
                    </p>
                    {!isAdmin && (
                      <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                         <button onClick={()=>setActiveTab('elearning')} className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all text-sm flex items-center justify-center gap-2"><GraduationCap size={18} /> PROSPACE ACADEMY</button>
                      </div>
                    )}
                  </div>
                  {!isAdmin && (
                    <div className="w-full lg:w-1/3 flex justify-center items-center flex-col gap-4">
                       <div className="relative w-36 h-36">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                             <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                             <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${progressData}, 100`} strokeLinecap="round" className="transition-all duration-1000" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center font-black text-4xl text-white">{progressData}%</div>
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Katalog Progress</p>
                    </div>
                  )}
                </div>
              </div>

              {!isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  <StatCard label="Reward Points" val={userPoints + " PTS"} icon={<Award size={28} />} color="purple" />
                  <StatCard label="Materi Selesai" val={`${completedLessons.length} Materi`} icon={<CheckCircle2 size={28} />} color="indigo" />
                  <StatCard label="Gelar Rank" val={userRank.name} icon={<Trophy size={28} />} color="emerald" />
                  <StatCard label="Saldo Komisi" val={`Rp ${affiliateBalance.toLocaleString('id-ID')}`} icon={<Wallet size={28} />} color="amber" />
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: PROSPACE ACADEMY (MEMBER VIEW) */}
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
                        <GraduationCap size={48} className="mx-auto mb-4 opacity-50" />
                        Belum ada modul yang diterbitkan oleh Admin.
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
                                 <button 
                                    key={lesson.id}
                                    onClick={() => {setActiveCourseId(mod.id); setActiveLessonId(lesson.id); setQuizSelection(null);}} 
                                    className={`w-full text-left flex items-center justify-between p-3.5 rounded-xl transition-all ${isActive ? 'bg-indigo-50 border-indigo-200 border text-indigo-700 shadow-sm' : 'hover:bg-slate-50 border border-transparent text-slate-600'}`}
                                 >
                                   <div className="flex items-center gap-3">
                                     <div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {lesson.type === 'video' ? <PlaySquare size={16} /> : lesson.type === 'quiz' ? <HelpCircle size={16} /> : <FileText size={16} />}
                                     </div>
                                     <span className="text-sm font-bold truncate pr-2">{lesson.title}</span>
                                   </div>
                                   {isDone && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
                                 </button>
                               )
                            })}
                            {(!mod.lessons || mod.lessons.length === 0) && <p className="text-xs text-slate-400 italic px-2">Belum ada materi</p>}
                          </div>
                        </div>
                     ))}
                   </div>

                   {activeLesson ? (
                     <div className="w-full lg:w-2/3 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-max">
                        {activeLesson.type === 'video' && (
                           <div className="w-full aspect-video bg-slate-900 relative">
                              <iframe width="100%" height="100%" src={activeLesson.content} title="Video Player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                           </div>
                        )}
                        
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
                                    {isLessonCompleted && (
                                       <div className="mt-8 bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                                          <p className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-2">Penjelasan:</p><p className="text-slate-700 font-medium">{activeLesson.exp}</p>
                                       </div>
                                    )}
                                 </div>
                              )}
                           </div>
                           <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
                              <p className="text-slate-500 font-bold text-sm flex items-center gap-2"><Award className="text-amber-500" size={18} /> Hadiah +{activeLesson.points} Poin</p>
                              {isLessonCompleted ? (
                                 <button disabled className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-not-allowed"><CheckCircle2 size={18} /> MATERI SELESAI</button>
                              ) : (
                                 <button disabled={isProcessingAction.current} onClick={() => handleCompleteLearning(activeLesson, activeLesson.type === 'quiz', quizSelection)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50">{activeLesson.type === 'quiz' ? 'KIRIM JAWABAN' : 'TANDAI SELESAI'}</button>
                              )}
                           </div>
                        </div>
                     </div>
                   ) : (
                       <div className="w-full lg:w-2/3 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex items-center justify-center p-10 text-slate-400 font-bold">Pilih materi di kurikulum untuk mulai belajar.</div>
                   )}
                </div>
                )}
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB BARU: AI 1-CLICK LANDING PAGE REPLICATOR */}
          {/* ==================================================== */}
          {activeTab === 'landingpage' && !isAdmin && (
             <div className="animate-fadeIn space-y-8 max-w-4xl mx-auto">
                 <div className="text-center space-y-4 mb-10">
                     <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-2 shadow-lg shadow-blue-100"><LayoutTemplate size={32} /></div>
                     <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Web Replikator <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI Premium</span></h2>
                     <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Sistem akan merakit Landing Page mandiri berkonversi tinggi untuk Anda, siap mendatangkan pundi komisi tanpa perlu langganan hosting!</p>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-8 sm:p-12 overflow-hidden">
                     {currentTier < 2 ? (
                         <div className="text-center bg-amber-50 border border-amber-200 rounded-2xl p-10">
                             <Lock size={48} className="mx-auto text-amber-400 mb-4" />
                             <h3 className="text-xl font-black text-amber-800 mb-2">Akses Eksklusif Terkunci</h3>
                             <p className="text-amber-700 font-medium mb-6">Upgrade minimal ke paket <b>Business</b> untuk mengaktifkan AI Website Builder ini.</p>
                             <button onClick={() => setActiveTab('shop')} className="bg-amber-500 text-white font-black px-8 py-3 rounded-xl shadow-lg hover:bg-amber-600 transition-all">UPGRADE SEKARANG</button>
                         </div>
                     ) : (
                         <>
                             {!myLandingPage ? (
                                 <div className="text-center py-10">
                                     <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><MagicWand size={40} className="text-indigo-600" /></div>
                                     <h3 className="text-2xl font-black text-slate-800 mb-4">Website Anda Belum Dibuat</h3>
                                     <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">Sistem AI kami siap menenun algoritma copywriting maut khusus atas nama Anda. Proses ini hanya memakan waktu 10 detik.</p>
                                     <button onClick={handleGenerateLandingPage} disabled={isGeneratingLP} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black px-10 py-5 rounded-2xl shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-3 mx-auto disabled:opacity-50">
                                         {isGeneratingLP ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Wand2 size={24} />}
                                         {isGeneratingLP ? 'AI MERAKIT WEBSITE ANDA...' : 'GENERATE LANDING PAGE SAYA'}
                                     </button>
                                 </div>
                             ) : (
                                 <div className="space-y-10">
                                     {/* Dashboard Control Panel */}
                                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                         <div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status Web</p>
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                                                <span className="font-black text-slate-800 text-lg">ONLINE</span>
                                            </div>
                                         </div>
                                         <div className="flex gap-3 w-full sm:w-auto">
                                            <button onClick={() => window.open(`https://member.bagihosting.com/?ref=${user?.uid}`, '_blank')} className="flex-1 sm:flex-none bg-slate-900 text-white font-black px-6 py-3.5 rounded-xl hover:bg-indigo-600 transition-all text-sm flex items-center justify-center gap-2 shadow-lg">
                                                <Globe size={18} /> KUNJUNGI WEB
                                            </button>
                                            <button onClick={() => setIsEditingLP(!isEditingLP)} className={`flex-1 sm:flex-none font-black px-6 py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 border-2 ${isEditingLP ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                                                <Edit3 size={18} /> {isEditingLP ? 'TUTUP EDITOR' : 'EDIT KONTEN'}
                                            </button>
                                         </div>
                                     </div>

                                     {/* Share Link Area */}
                                     <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
                                        <div className="absolute right-0 top-0 opacity-10 scale-150 transform translate-x-1/4 -translate-y-1/4"><LinkIcon size={150}/></div>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 relative z-10">Link Referal Utama Anda</p>
                                        <div className="flex bg-white border border-indigo-200 rounded-xl p-2 items-center relative z-10 shadow-sm">
                                            <input type="text" readOnly value={`https://member.bagihosting.com/?ref=${user?.uid}`} className="bg-transparent flex-1 outline-none text-sm font-bold text-slate-700 px-3 truncate" />
                                            <button onClick={() => copyToClipboard(`https://member.bagihosting.com/?ref=${user?.uid}`)} className="bg-indigo-600 text-white px-5 py-3 rounded-lg font-black text-xs hover:bg-indigo-700 transition-colors shadow-md">COPY LINK</button>
                                        </div>
                                     </div>

                                     {/* Custom Domain Settings */}
                                     <div className="border border-slate-200 rounded-2xl p-6 sm:p-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><Globe size={20}/></div>
                                            <div>
                                                <h3 className="font-black text-lg text-slate-800">Custom Domain White-Label</h3>
                                                <p className="text-xs font-bold text-slate-400">Gunakan domain Anda sendiri (misal: www.bisnisku.com)</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <input type="text" placeholder="Masukkan nama domain Anda tanpa https..." value={editLPForm?.customDomain || ''} onChange={e => setEditLPForm({...editLPForm, customDomain: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" disabled={!isEditingLP} />
                                            <div className="bg-slate-50 p-4 rounded-xl text-xs font-medium text-slate-500 leading-relaxed border border-slate-200">
                                                <b>Instruksi DNS:</b> Arahkan CNAME record domain Anda ke <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">member.bagihosting.com</code>. Proses propagasi mungkin memakan waktu hingga 24 jam.
                                            </div>
                                            {isEditingLP && <button onClick={handleUpdateLandingPage} disabled={isProcessingAction.current} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-indigo-600 transition-colors">SIMPAN DOMAIN</button>}
                                        </div>
                                     </div>

                                     {/* Visual Editor Form */}
                                     {isEditingLP ? (
                                         <form onSubmit={handleUpdateLandingPage} className="border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 bg-white animate-slideUp relative">
                                            <div className="absolute top-0 right-0 bg-amber-400 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl rounded-tr-2xl">Editor Mode</div>
                                            <h3 className="font-black text-lg text-slate-800 mb-6 border-b border-slate-100 pb-4">Edit Konten Halaman</h3>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headline Utama</label>
                                                <textarea rows="2" value={editLPForm?.heroHeadline || ''} onChange={e=>setEditLPForm({...editLPForm, heroHeadline: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm resize-none"></textarea>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub Headline</label>
                                                <textarea rows="2" value={editLPForm?.heroSub || ''} onChange={e=>setEditLPForm({...editLPForm, heroSub: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-sm resize-none"></textarea>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link Video YouTube (VSL)</label>
                                                <input type="url" placeholder="https://www.youtube.com/embed/..." value={editLPForm?.vslUrl || ''} onChange={e=>setEditLPForm({...editLPForm, vslUrl: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Story / Copywriting (HTML Diizinkan)</label>
                                                <textarea rows="6" value={editLPForm?.story || ''} onChange={e=>setEditLPForm({...editLPForm, story: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-sm custom-scrollbar"></textarea>
                                            </div>
                                            
                                            <div className="pt-6 border-t border-slate-100 flex gap-4">
                                                <button type="submit" disabled={isProcessingAction.current} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex justify-center items-center gap-2">
                                                    <Save size={18} /> SIMPAN PERUBAHAN
                                                </button>
                                                <button type="button" onClick={handleGenerateLandingPage} disabled={isGeneratingLP} className="bg-slate-100 text-slate-600 font-black px-6 py-4 rounded-xl hover:bg-slate-200 transition-all text-xs flex justify-center items-center gap-2">
                                                    {isGeneratingLP ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />} RE-GENERATE AI
                                                </button>
                                            </div>
                                         </form>
                                     ) : (
                                         <div className="bg-slate-900 text-white rounded-[2rem] p-8 sm:p-12 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-20 blur-[80px] rounded-full group-hover:opacity-40 transition-opacity"></div>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 bg-white bg-opacity-10 px-3 py-1 inline-block rounded-full border border-white border-opacity-10">Preview Mini</p>
                                            <h1 className="text-3xl sm:text-4xl font-black mb-4 font-['Outfit'] leading-tight" dangerouslySetInnerHTML={{__html: myLandingPage.heroHeadline}}></h1>
                                            <h2 className="text-lg text-indigo-200 font-medium mb-8 leading-relaxed" dangerouslySetInnerHTML={{__html: myLandingPage.heroSub}}></h2>
                                            <div className="bg-white bg-opacity-5 p-6 rounded-2xl border border-white border-opacity-10 backdrop-blur-sm">
                                                <p className="text-sm text-slate-300 font-mono">... {myLandingPage.story.substring(0, 150).replace(/<[^>]+>/g, '')} ...</p>
                                            </div>
                                         </div>
                                     )}
                                 </div>
                             )}
                         </>
                     )}
                 </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: AI MARKETING COPILOT (JENIUS & KEREN) */}
          {/* ==================================================== */}
          {activeTab === 'copilot' && !isAdmin && (
             <div className="animate-fadeIn space-y-8">
                 <div className="text-center sm:text-left mb-6">
                     <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] flex items-center justify-center sm:justify-start gap-3">
                         <Rocket className="text-indigo-600" size={36} /> AI Marketing Copilot
                     </h2>
                     <p className="text-slate-500 font-medium mt-2 max-w-2xl">Studio pembuatan copywriting cerdas dengan **Live Smartphone Preview**. Buat teks promosi otomatis untuk memaksimalkan konversi komisi afiliasi Anda!</p>
                 </div>

                 <div className="flex flex-col lg:flex-row gap-10">
                     <div className="w-full lg:w-1/2 bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-slate-200">
                         <form onSubmit={handleGenerateCopy} className="space-y-6">
                             <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Produk / Campaign</label>
                                 <input type="text" placeholder="Contoh: ProSpace VIP" className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={copilotForm.product} onChange={e=>setCopilotForm({...copilotForm, product: e.target.value})} required />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform</label>
                                     <select className="w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={copilotForm.platform} onChange={e=>setCopilotForm({...copilotForm, platform: e.target.value})}>
                                         <option value="whatsapp">WhatsApp</option>
                                         <option value="instagram">Instagram</option>
                                     </select>
                                 </div>
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gaya Bahasa (Tone)</label>
                                     <select className="w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={copilotForm.tone} onChange={e=>setCopilotForm({...copilotForm, tone: e.target.value})}>
                                         <option value="fomo">Mendesak (FOMO)</option>
                                         <option value="santai">Santai / Asik</option>
                                         <option value="profesional">Profesional</option>
                                     </select>
                                 </div>
                             </div>
                             <button type="submit" disabled={isGeneratingCopy} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-5 rounded-2xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                 {isGeneratingCopy ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Wand2 size={20} />}
                                 {isGeneratingCopy ? 'AI SEDANG MENULIS...' : 'GENERATE COPYWRITING'}
                             </button>
                         </form>
                         
                         {copilotResult && (
                             <div className="mt-8 pt-8 border-t border-slate-100">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hasil Teks Mentah (Raw)</p>
                                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative group">
                                     <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: copilotResult}}></p>
                                     <button onClick={()=>copyToClipboard(copilotResult.replace(/<[^>]*>?/gm, ''))} className="absolute top-4 right-4 p-2 bg-white text-indigo-600 shadow-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-black uppercase"><Copy size={14}/> Salin</button>
                                 </div>
                             </div>
                         )}
                     </div>

                     <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-slate-100 rounded-[2.5rem] p-8 border border-slate-200 shadow-inner">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 bg-white px-4 py-2 rounded-full shadow-sm">Live Preview Studio</p>
                         <div className="w-full max-w-[300px] h-[600px] bg-slate-900 border-[12px] border-slate-900 rounded-[3rem] shadow-2xl relative flex flex-col overflow-hidden shrink-0 animate-float">
                             <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50"></div>
                             <div className="flex-1 bg-slate-50 overflow-y-auto relative w-full h-full flex flex-col custom-scrollbar">
                                 {copilotForm.platform === 'whatsapp' ? (
                                     <div className="flex flex-col h-full bg-[#E5DDD5]">
                                         <div className="bg-[#075E54] text-white p-4 pt-10 flex items-center gap-3 shrink-0 shadow-md relative z-10">
                                             <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-slate-500 overflow-hidden"><UserCircle size={32} /></div>
                                             <div><p className="font-bold text-sm leading-tight">Calon Member</p><p className="text-[10px] opacity-80 leading-none mt-0.5">online</p></div>
                                         </div>
                                         <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                             <div className="bg-white p-3 rounded-2xl rounded-tl-none text-sm text-slate-800 shadow-sm w-[80%] relative">
                                                 Halo kak, mau tanya detail sistem affiliatenya dong!
                                                 <span className="text-[9px] text-slate-400 absolute bottom-1 right-2">11:58</span>
                                             </div>
                                             <div className="bg-[#DCF8C6] p-3 pb-5 rounded-2xl rounded-tr-none text-sm text-slate-800 shadow-sm whitespace-pre-wrap w-[90%] ml-auto relative">
                                                 {isGeneratingCopy ? <span className="animate-pulse flex gap-1 items-center h-4"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span></span> : <span dangerouslySetInnerHTML={{__html: copilotResult || "Preview copywriting WhatsApp Anda akan muncul di sini..."}}></span>}
                                             </div>
                                         </div>
                                     </div>
                                 ) : (
                                     <div className="flex flex-col h-full bg-white">
                                         <div className="border-b border-slate-100 p-3 pt-10 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-rose-500 to-fuchsia-600 p-0.5 rounded-full"><div className="w-full h-full bg-white rounded-full border-2 border-white overflow-hidden flex items-center justify-center"><UserCircle size={24} className="text-slate-300"/></div></div>
                                                 <p className="font-bold text-xs">{userData?.name?.split(' ')[0].toLowerCase() || 'user'}_pro</p>
                                             </div>
                                         </div>
                                         <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                                             <div className="w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-300 border-b border-slate-50"><ImageIcon size={48} opacity={0.3} /></div>
                                             <div className="p-3 flex justify-between text-slate-700"><div className="flex gap-4"><Heart size={20} /><MessageCircle size={20} /><Send size={20} /></div><Bookmark size={20} className="text-slate-400"/></div>
                                             <div className="px-4">
                                                 <p className="text-[10px] font-black mb-2">9,124 likes</p>
                                                 <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                                                     <span className="font-black mr-2">{userData?.name?.split(' ')[0].toLowerCase() || 'user'}_pro</span>
                                                     {isGeneratingCopy ? <span className="animate-pulse">Mengetik caption...</span> : <span dangerouslySetInnerHTML={{__html: copilotResult || "Preview caption Instagram Anda akan muncul di sini..."}}></span>}
                                                 </p>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
          )}

          {/* TAB: FOCUS ROOM (V12) */}
          {activeTab === 'focus' && (
             <div className="animate-fadeIn max-w-4xl mx-auto">
                <div className="text-center space-y-4 mb-10">
                   <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full mb-2"><Headphones size={32} /></div>
                   <h2 className="text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Ruang Fokus VIP</h2>
                   <p className="text-slate-500 font-medium">Mode Deep Work. Putar musik, jalankan timer, dan dapatkan <strong className="text-purple-600">+25 Poin Reward</strong> per sesi.</p>
                </div>
                
                <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-10 items-center">
                   <div style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')" }} className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"></div>
                   
                   <div className="w-full md:w-1/2 relative z-10 flex flex-col items-center">
                      <p className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-4">Lo-Fi Study Radio</p>
                      <div className="w-full aspect-video rounded-2xl overflow-hidden border-4 border-slate-800 shadow-xl">
                         <iframe width="100%" height="100%" src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&controls=1" title="Lofi Girl Radio" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-3 text-center">*Unmute video untuk mendengarkan musik</p>
                   </div>

                   <div className="w-full md:w-1/2 flex flex-col items-center relative z-10 border-t md:border-t-0 md:border-l border-slate-800 pt-8 md:pt-0 md:pl-10">
                      <div className="inline-flex bg-slate-800 rounded-full p-1 mb-8">
                         <button onClick={()=>{setFocusMode('work'); setFocusTimeLeft(25*60); setIsFocusing(false);}} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${focusMode==='work' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Deep Work</button>
                         <button onClick={()=>{setFocusMode('break'); setFocusTimeLeft(5*60); setIsFocusing(false);}} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${focusMode==='break' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>Break</button>
                      </div>

                      <div className="text-[5rem] sm:text-[6rem] font-black font-mono leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-8 drop-shadow-2xl">
                         {formatTime(focusTimeLeft)}
                      </div>

                      <div className="flex items-center gap-4">
                         <button onClick={()=>setIsFocusing(!isFocusing)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl ${isFocusing ? 'bg-amber-500 text-amber-900' : 'bg-emerald-500 text-emerald-900'}`}>
                            {isFocusing ? <PauseCircle size={32} /> : <PlayCircle size={32} />}
                         </button>
                         <button onClick={()=>{setIsFocusing(false); setFocusTimeLeft(focusMode === 'work' ? 25 * 60 : 5 * 60);}} className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all"><RefreshCw size={20} /></button>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-6 uppercase tracking-widest bg-slate-800 px-4 py-2 rounded-xl border border-slate-700"><Award size={12} className="inline mr-1" /> Reward 25 Menit = 25 Poin</p>
                   </div>
                </div>
             </div>
          )}

          {/* TAB: ADMIN OVERVIEW */}
          {activeTab === 'admin_overview' && isAdmin && (
            <div className="space-y-8 animate-fadeIn">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">Admin Dashboard Visual</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative shadow-xl overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-indigo-500 opacity-40"><Banknote size={120} /></div>
                    <p className="text-[10px] font-black uppercase text-indigo-200 relative z-10">Total Pendapatan Bersih</p>
                    <p className="text-4xl font-black mt-2 font-['Outfit'] relative z-10">Rp {adminStats.totalRev.toLocaleString('id-ID')}</p>
                 </div>
                 <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Member Aktif</p>
                    <p className="text-4xl font-black mt-2 text-slate-800">{allUsers.length}</p>
                 </div>
                 <div className="bg-amber-50 rounded-[2.5rem] p-10 border border-amber-200 cursor-pointer" onClick={()=>setActiveTab('admin_trans')}>
                    <p className="text-[10px] font-black uppercase text-amber-600">Butuh Validasi</p>
                    <p className="text-4xl font-black mt-2 text-amber-600">{adminStats.pendingTrans}</p>
                 </div>
                 <div className="bg-rose-50 rounded-[2.5rem] p-10 border border-rose-200 cursor-pointer" onClick={()=>setActiveTab('admin_wd')}>
                    <p className="text-[10px] font-black uppercase text-rose-600">Request Penarikan</p>
                    <p className="text-4xl font-black mt-2 text-rose-600">{adminStats.pendingWd}</p>
                 </div>
               </div>

               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                   <h4 className="font-black uppercase tracking-widest text-xs text-slate-400 mb-8">Performance Transaksi (Visual)</h4>
                   <div className="space-y-6">
                      <div>
                         <div className="flex justify-between text-sm font-bold text-slate-700 mb-3"><span>Sukses Terupgrade</span> <span>{adminStats.approvedTrans} Member</span></div>
                         <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${approvedPercentage}%` }}></div>
                         </div>
                      </div>
                      <div>
                         <div className="flex justify-between text-sm font-bold text-slate-700 mb-3"><span>Menunggu Antrean</span> <span>{adminStats.pendingTrans} Transaksi</span></div>
                         <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: `${pendingPercentage}%` }}></div>
                         </div>
                      </div>
                   </div>
               </div>

               <button onClick={handleExportCSV} className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 uppercase tracking-widest">
                  <DownloadCloud size={20} /> Download Database Member (CSV)
               </button>
            </div>
          )}

          {/* TAB: ADMIN AI CONFIGURATION */}
          {activeTab === 'admin_ai_config' && isAdmin && (
             <div className="animate-fadeIn space-y-10">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                   <div>
                       <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] flex items-center gap-3"><Cpu className="text-indigo-600" size={32} /> Konfigurasi Mesin AI</h2>
                       <p className="text-slate-500 font-medium mt-2">Kelola API Key (OpenAI, Gemini) untuk fitur AI Copilot, Kuis Pintar, Replikator Web & AI Mentor.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-20 blur-3xl rounded-full"></div>
                            <Cpu size={48} className={`mb-6 ${aiConfig.isActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                            <h3 className="text-2xl font-black mb-2">Status AI Server</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-8">Jika dinonaktifkan, seluruh fitur yang menggunakan token AI pada member area akan dikunci otomatis untuk menghemat biaya API.</p>
                            
                            <div className="bg-slate-800 p-1 rounded-2xl flex items-center mb-6">
                                <button onClick={() => setAiConfig({...aiConfig, isActive: true})} className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${aiConfig.isActive ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>AKTIF</button>
                                <button onClick={() => setAiConfig({...aiConfig, isActive: false})} className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${!aiConfig.isActive ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>MATI</button>
                            </div>

                            {!aiConfig.apiKey && (
                                <div className="mt-auto bg-amber-500 bg-opacity-20 border border-amber-500 border-opacity-50 p-4 rounded-xl text-amber-300 text-xs font-bold flex gap-3">
                                    <AlertCircle size={24} className="shrink-0" />
                                    <p>AI belum bisa digunakan karena API Key masih kosong.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <form onSubmit={handleSaveAiConfig} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-8 sm:p-10 space-y-8 flex flex-col h-full justify-between">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Cpu size={14} /> Provider AI Model</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {['openai', 'gemini'].map(prov => (
                                            <button key={prov} type="button" onClick={() => setAiConfig({...aiConfig, provider: prov})} className={`p-4 rounded-2xl border-2 text-sm font-black capitalize transition-all ${aiConfig.provider === prov ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>
                                                {prov} {prov === 'openai' ? '(GPT-4)' : '(Flash Free)'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key size={14} /> Secret API Key</label>
                                        {aiConfig.provider === 'gemini' && (<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"><LinkIcon size={10} /> Dapatkan Free Key</a>)}
                                    </div>
                                    <input type="password" placeholder="Tempel API Key rahasia di sini..." value={aiConfig.apiKey} onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm tracking-widest" />
                                    <p className="text-[10px] text-slate-400 font-bold">*Kunci API hanya disimpan di sistem database dan tidak terekspos ke perangkat member non-admin.</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100">
                                <button type="button" onClick={handleTestApiConnection} disabled={isTestingApi} className="sm:w-1/3 py-5 rounded-2xl font-black border-2 border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isTestingApi ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : 'TEST KONEKSI'}
                                </button>
                                <button type="submit" className="sm:w-2/3 bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"><Save size={20} /> SIMPAN PENGATURAN AI</button>
                            </div>
                        </form>
                    </div>
                </div>
             </div>
          )}

          {/* TAB: COMMUNITY (LIVE CHAT) */}
          {activeTab === 'community' && (
             <div className="animate-fadeIn h-[calc(100vh-140px)] flex flex-col">
                <div className="mb-6 shrink-0">
                  <h2 className="text-3xl sm:text-4xl font-black font-['Outfit'] tracking-tight text-slate-900 leading-none">Komunitas VIP</h2>
                  <p className="text-slate-500 font-medium text-sm mt-3">Ruang diskusi real-time member ProSpace.</p>
                </div>
                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col overflow-hidden relative">
                   <div className="flex-1 p-6 overflow-y-auto bg-slate-50 flex flex-col gap-4 custom-scrollbar">
                      {sortedChat.length === 0 ? (
                         <div className="m-auto text-center text-slate-300">Belum ada obrolan. Ayo mulai!</div>
                      ) : (
                         sortedChat.map(msg => {
                            const isMe = msg.userId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                    <div className={`max-w-[80%] rounded-2xl p-4 relative ${msg.isAdmin ? 'bg-indigo-600 text-white rounded-tl-none shadow-lg' : isMe ? 'bg-emerald-500 text-white rounded-tr-none shadow-lg' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'}`}>
                                       {isAdmin && !isMe && (<button onClick={()=>handleDeleteChat(msg.id)} className="absolute -right-8 top-0 p-1 text-rose-300 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>)}
                                       {!isMe && (
                                           <div className="flex items-center gap-2 mb-1.5">
                                              <span className={`text-[10px] font-black ${msg.isAdmin ? 'text-indigo-200' : 'text-slate-500'}`}>{msg.userName}</span>
                                              {msg.rankName && <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black border uppercase ${msg.rankBg} ${msg.rankColor}`}>{msg.rankName}</span>}
                                           </div>
                                       )}
                                       <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{__html: sanitizeHTML(msg.text)}}></p>
                                       <p className={`text-[8px] text-right mt-1 font-bold ${msg.isAdmin || isMe ? 'text-white opacity-60' : 'text-slate-300'}`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            )
                         })
                      )}
                      <div ref={chatEndRef} />
                   </div>
                   <form onSubmit={handleSendChat} className="p-4 bg-white border-t flex gap-2 shrink-0">
                       <input type="text" placeholder="Ketik pesan..." className="flex-1 px-5 py-4 bg-slate-100 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-indigo-500" value={chatInput} onChange={e=>setChatInput(e.target.value)} required />
                       <button type="submit" disabled={isProcessingAction.current} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"><Send size={20} /></button>
                   </form>
                </div>
             </div>
          )}

          {/* TAB: FILES (MASTER FILES) */}
          {activeTab === 'files' && (
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
                     <ProFileCard key={f.id} file={f} currentTier={currentTier} isCompleted={completedFiles.includes(f.id)} onToggleProgress={() => handleToggleFileProgress(f.id, f.name)} />
                   ))}
                </div>
             </div>
          )}

          {/* TAB: LEADERBOARD */}
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

          {/* TAB: SHOP */}
          {activeTab === 'shop' && (
            <div className="animate-fadeIn space-y-12">
               <div className="text-center max-w-2xl mx-auto space-y-4 px-4">
                  <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">Pricing Plan</span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-['Outfit'] tracking-tight leading-tight">Pilih Paket Terbaik</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {[1, 2, 3].map(lv => {
                   const isActive = currentTier === lv;
                   const isPassed = currentTier > lv;
                   const isPending = [...transactions].some(t => t.userId === user?.uid && t.packageLevel === lv && t.status === 'pending');
                   return (
                     <div key={lv} className={`bg-white rounded-[2rem] border-2 p-10 flex flex-col h-full relative transition-all duration-300 ${isActive ? 'border-indigo-600 shadow-2xl lg:-translate-y-4' : 'border-slate-100 hover:border-slate-300 hover:shadow-xl'}`}>
                        {isActive && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Paket Aktif</div>}
                        <h3 className="text-2xl font-black text-slate-900 mb-2 font-['Outfit'] uppercase">{TIER_LEVELS[lv].name}</h3>
                        <p className="text-sm text-slate-500 mb-6 min-h-[40px]">{TIER_LEVELS[lv].desc}</p>
                        <span className="text-3xl font-black text-indigo-600 mb-8">Rp {TIER_LEVELS[lv].price.toLocaleString('id-ID')}</span>
                        <ul className="space-y-4 mb-8 flex-1">
                          {TIER_LEVELS[lv].features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /><span className="text-sm font-medium text-slate-600">{feat}</span></li>
                          ))}
                        </ul>
                        <button onClick={() => {setCheckoutPkg({...TIER_LEVELS[lv], level: lv}); setAppliedCoupon(null); setCouponInput('');}} disabled={isActive || isPassed || isPending} className={`w-full mt-auto py-5 rounded-2xl font-black transition-all ${isActive||isPassed||isPending ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl'}`}>
                          {isActive ? 'STATUS AKTIF' : isPassed ? 'TERLEWATI' : isPending ? 'PROSES VALIDASI' : 'PILIH PAKET'}
                        </button>
                     </div>
                   )
                 })}
               </div>
            </div>
          )}

          {/* TAB: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="animate-fadeIn space-y-10">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Riwayat Pembelian</h2>
               <div className="grid grid-cols-1 gap-4">
                 {[...transactions].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                       <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.status === 'pending' ? 'bg-amber-50 text-amber-500' : t.status === 'rejected' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}><Clock size={28} /></div>
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">{t.id}</p>
                             <h4 className="text-lg font-black text-slate-800">Paket {t.packageName}</h4>
                             <p className="text-xs font-bold text-slate-500 mt-1">Rp {t.price.toLocaleString('id-ID')}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className={`font-black uppercase text-xs ${t.status === 'pending' ? 'text-amber-500' : t.status === 'rejected' ? 'text-rose-500' : 'text-emerald-500'}`}>{t.status}</p>
                          {t.status === 'pending' && !isAdmin && <button onClick={()=>openWhatsAppConfirmation({name: t.packageName, price: t.price})} className="mt-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg">Info WA</button>}
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          )}

          {/* TAB: ADMIN TRANS */}
          {activeTab === 'admin_trans' && isAdmin && (
            <div className="space-y-10">
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
                               <td className="px-8 py-6"><div className="bg-slate-100 p-3 rounded-xl text-xs font-bold"><p>Pengirim: {t.senderName}</p><p>Bank: {t.senderBank}</p></div></td>
                               <td className="px-8 py-6 font-black text-indigo-600">Rp {t.price.toLocaleString('id-ID')}</td>
                               <td className="px-8 py-6 text-center">
                                  <div className="flex justify-center gap-2">
                                     <button onClick={()=>handleTransactionAction(t, 'approve')} disabled={isProcessingAction.current} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-50">TERIMA</button>
                                     <button onClick={()=>handleTransactionAction(t, 'reject')} disabled={isProcessingAction.current} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase disabled:opacity-50"><XCircle size={14} /></button>
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

          {/* TAB: ADMIN WITHDRAWAL (CRUD) */}
          {activeTab === 'admin_wd' && isAdmin && (
            <div className="space-y-10">
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

          {/* TAB: AFFILIATE */}
          {activeTab === 'affiliate' && !isAdmin && (
             <div className="animate-fadeIn space-y-10">
                <h2 className="text-3xl font-black text-slate-900">Program Afiliasi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-indigo-600 rounded-[2rem] p-10 text-white shadow-xl shadow-indigo-200">
                      <p className="text-[10px] font-black uppercase text-indigo-200">Saldo Komisi Aktif</p>
                      <p className="text-5xl font-black mt-2 font-['Outfit']">Rp {affiliateBalance.toLocaleString('id-ID')}</p>
                      <button onClick={handleRequestWithdrawal} disabled={isProcessingAction.current} className="mt-8 bg-white text-indigo-600 px-6 py-4 rounded-xl font-black text-sm shadow-lg hover:scale-105 transition-transform disabled:opacity-50">TARIK SALDO KE REKENING</button>
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

          {/* TAB: ADMIN USERS CRM */}
          {activeTab === 'admin_users' && isAdmin && (
            <div className="animate-fadeIn space-y-10">
               <div className="flex justify-between items-end">
                  <h2 className="text-3xl font-black text-slate-900">Member CRM Database</h2>
               </div>
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
                             <td className="px-8 py-6 uppercase font-black text-indigo-600 text-[10px]">{TIER_LEVELS[m.subscriptionLevel]?.name}</td>
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

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-2xl mx-auto">
               <h2 className="text-3xl font-black text-slate-900 mb-8">Pengaturan Profil</h2>
               <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-2xl">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Nomor WhatsApp</label>
                        <input type="text" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={profileForm.phone} onChange={e=>setProfileForm({...profileForm, phone: e.target.value})} />
                     </div>
                     <div className="pt-4 border-t border-slate-100">
                        <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Banknote size={18} className="text-indigo-500" /> Data Rekening (Untuk WD)</h4>
                        <div className="grid grid-cols-2 gap-6">
                           <input type="text" placeholder="Bank" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-sm" value={profileForm.bank} onChange={e=>setProfileForm({...profileForm, bank: e.target.value})} />
                           <input type="text" placeholder="No Rekening" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-sm" value={profileForm.accountNo} onChange={e=>setProfileForm({...profileForm, accountNo: e.target.value})} />
                        </div>
                     </div>
                     <button type="submit" disabled={isProcessingAction.current} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-600 transition-all mt-4 disabled:opacity-50">SIMPAN PERUBAHAN</button>
                  </form>
               </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================== */}
      {/* MODAL ADMIN: EDIT CRM USER */}
      {/* ========================================== */}
      {selectedUserDetail && isAdmin && (
         <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900 bg-opacity-80 backdrop-blur-md animate-fadeIn">
            <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                  <div>
                     <h3 className="text-2xl font-black">Edit Member CRM</h3>
                     <p className="text-indigo-300 font-bold text-sm">{selectedUserDetail.email}</p>
                  </div>
                  <button onClick={()=>setSelectedUserDetail(null)} className="p-2 bg-white bg-opacity-10 rounded-xl hover:bg-rose-500 transition-colors"><X /></button>
               </div>
               <form onSubmit={handleAdminUpdateUserCRM} className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={editUserForm.name} onChange={e=>setEditUserForm({...editUserForm, name: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No WhatsApp</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={editUserForm.phone} onChange={e=>setEditUserForm({...editUserForm, phone: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Bank</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={editUserForm.bank} onChange={e=>setEditUserForm({...editUserForm, bank: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No Rekening</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={editUserForm.accountNo} onChange={e=>setEditUserForm({...editUserForm, accountNo: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Reward Poin (Gamifikasi)</label><input type="number" className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 font-black text-sm text-indigo-700" value={editUserForm.rewardPoints} onChange={e=>setEditUserForm({...editUserForm, rewardPoints: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Saldo Komisi (Rp)</label><input type="number" className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 font-black text-sm text-emerald-700" value={editUserForm.commissionBalance} onChange={e=>setEditUserForm({...editUserForm, commissionBalance: e.target.value})} /></div>
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Level Lisensi (Tier)</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" value={editUserForm.subscriptionLevel} onChange={e=>setEditUserForm({...editUserForm, subscriptionLevel: e.target.value})}>
                          {[0,1,2,3].map(lv => <option key={lv} value={lv}>{TIER_LEVELS[lv].name}</option>)}
                      </select>
                  </div>
                  <button type="submit" disabled={isProcessingAction.current} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"><Save size={18} /> UPDATE DATA MEMBER</button>
               </form>
            </div>
         </div>
      )}

      {/* MODAL CHECKOUT */}
      {checkoutPkg && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900 bg-opacity-80 backdrop-blur-md animate-fadeIn overflow-y-auto">
           <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-3xl my-auto p-8 sm:p-12 space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black">Final Checkout</h3>
                 <button onClick={()=>{setCheckoutPkg(null); setAppliedCoupon(null);}} className="p-2 bg-slate-100 rounded-xl text-slate-400"><X /></button>
              </div>
              <div className="bg-slate-900 rounded-[1.5rem] p-6 text-white relative">
                 <p className="text-[10px] font-black uppercase text-indigo-300">Total Pembayaran</p>
                 <p className="text-3xl font-black">Rp {finalPrice.toLocaleString('id-ID')}</p>
              </div>
              <form onSubmit={handlePurchaseRequest} className="space-y-4">
                 <input type="text" placeholder="Nama Pemilik Rekening Pengirim" value={confirmForm.senderName} onChange={e=>setConfirmForm({...confirmForm, senderName: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm" required />
                 <input type="text" placeholder="Bank Asal" value={confirmForm.senderBank} onChange={e=>setConfirmForm({...confirmForm, senderBank: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm" required />
                 <button type="submit" disabled={isProcessingAction.current} className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs disabled:opacity-50">Konfirmasi & Upgrade</button>
              </form>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
    </div>
  );
}