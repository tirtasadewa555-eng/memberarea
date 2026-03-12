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
  getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, 
  deleteDoc, addDoc, serverTimestamp, query, where, increment, orderBy, limit
} from 'firebase/firestore';
import { 
  LayoutDashboard, ShoppingBag, Users, UserCircle, LogOut, Plus, Search, Download, 
  ShieldCheck, CreditCard, Settings, Menu, X, Bell, Trash2, Edit3, ChevronRight, 
  FileText, Video, Box, Lock, MessageSquare, Banknote, CheckCircle, Clock, 
  Megaphone, FolderLock, ArrowRight, AlertCircle, Activity, XCircle, LifeBuoy, 
  MessageCircle, Network, Wallet, Copy, Save, Star, Send, Receipt, Tag, Trophy, Eye, 
  CheckSquare, Square, Award, Sparkles, Crown, Gift, DownloadCloud, BadgeCheck, Bot, Zap,
  Headphones, PlayCircle, PauseCircle, RefreshCw
} from 'lucide-react';

// ==========================================
// 1. KONFIGURASI SISTEM
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC_go5YDW885EE1LUyeMBppyC-Zt18jYdQ",
  authDomain: "memberarea-websiteku.firebaseapp.com",
  projectId: "memberarea-websiteku",
  storageBucket: "memberarea-websiteku.firebasestorage.app",
  messagingSenderId: "9418923099",
  appId: "1:9418923099:web:f0275b81b802c08bb3737e"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'membership-v12-system';
const ADMIN_EMAIL = "admin@website.com"; 
const WHATSAPP_ADMIN = "628123456789"; 

const TIER_LEVELS = {
  0: { name: 'Free', color: 'text-slate-500', bg: 'bg-slate-100', price: 0 },
  1: { name: 'Personal', color: 'text-emerald-600', bg: 'bg-emerald-50', price: 99000 },
  2: { name: 'Business', color: 'text-indigo-600', bg: 'bg-indigo-50', price: 249000 },
  3: { name: 'Agency', color: 'text-amber-600', bg: 'bg-amber-50', price: 499000 }
};

const BANK_ACCOUNTS = [
  { bank: "BCA", number: "1234 5678 90", owner: "PT DIGITAL SUKSES" },
  { bank: "MANDIRI", number: "0987 6543 21", owner: "ADMIN MEMBERSHIP" }
];

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
  
  // --- Data States ---
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

  // --- UI States ---
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [checkoutPkg, setCheckoutPkg] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null); 
  const [showCertificate, setShowCertificate] = useState(false); 
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', text: 'Halo! Saya ProSpace AI Mentor. Butuh bantuan seputar materi, afiliasi, atau teknis?' }]);

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

  // --- Focus Room States (V12 Gamification) ---
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60); // Default 25 Menit
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusMode, setFocusMode] = useState('work'); // 'work' | 'break'

  const chatEndRef = useRef(null);
  const aiEndRef = useRef(null);

  // --- Derived States ---
  const currentTier = userData?.subscriptionLevel || 0;
  const affiliateBalance = userData?.commissionBalance || 0;
  const completedFiles = userData?.completedFiles || [];

  const userPoints = useMemo(() => {
    let pts = userData?.rewardPoints || 0;
    if (completedFiles.length) pts += completedFiles.length * 50; 
    return pts;
  }, [completedFiles, userData?.rewardPoints]);

  const userRank = useMemo(() => {
    if(userPoints >= 1000) return { name: 'Diamond', color: 'text-purple-600', bg: 'bg-purple-100', border:'border-purple-200', icon: <Crown size={14}/> };
    if(userPoints >= 300) return { name: 'Gold', color: 'text-amber-600', bg: 'bg-amber-100', border:'border-amber-200', icon: <Star size={14}/> };
    if(userPoints >= 100) return { name: 'Silver', color: 'text-slate-600', bg: 'bg-slate-200', border:'border-slate-300', icon: <Award size={14}/> };
    return { name: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-100', border:'border-orange-200', icon: <Sparkles size={14}/> };
  }, [userPoints]);

  const filteredUsers = useMemo(() => {
    let list = [...allUsers];
    if (searchUserQuery) {
        const q = searchUserQuery.toLowerCase();
        list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.joinDate || 0) - new Date(a.joinDate || 0));
  }, [allUsers, searchUserQuery]);

  const filteredFiles = useMemo(() => {
    if (!searchFileQuery) return files;
    return files.filter(f => f.name?.toLowerCase().includes(searchFileQuery.toLowerCase()));
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

  const leaderboardData = useMemo(() => {
    return allUsers
        .map(u => ({ uid: u.uid, name: u.name, totalEarned: (u.commissionBalance || 0) + (withdrawals.filter(w => w.userId === u.uid && w.status === 'approved').reduce((a, b) => a + b.amount, 0)) }))
        .filter(e => e.totalEarned > 0)
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 10);
  }, [allUsers, withdrawals]);

  const finalPrice = useMemo(() => {
    if (!checkoutPkg) return 0;
    if (appliedCoupon) return checkoutPkg.price - (checkoutPkg.price * appliedCoupon.discount / 100);
    return checkoutPkg.price;
  }, [checkoutPkg, appliedCoupon]);

  // --- Utility Functions ---
  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3500);
  };

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast("Berhasil disalin ke clipboard!");
  };

  const openWhatsAppConfirmation = (data) => {
    const text = `Halo Admin, konfirmasi pembayaran.%0A%0APaket: ${data.name}%0AHarga: Rp ${data.price.toLocaleString('id-ID')}%0A%0A_Bukti transfer:_`;
    window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${text}`, '_blank');
  };

  const logActivity = async (text, type) => {
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activities'), {
            text, type, createdAt: new Date().toISOString()
        });
    } catch (e) {}
  };

  // ==========================================
  // REAL-TIME SYNC & TIMER ENGINE
  // ==========================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) localStorage.setItem('affiliate_ref_v12', refCode);

    if (!isConfigReady) { setLoading(false); return; }
    const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {} } };
    initAuth();
    
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const checkIsAdmin = u?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAdmin(checkIsAdmin);
      if (checkIsAdmin && activeTab === 'dashboard') setActiveTab('admin_overview');
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || !isConfigReady) return;

    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (d) => {
      if (d.exists()) {
          setUserData(d.data());
          setProfileForm(prev => ({ ...prev, phone: d.data().phone || '', bank: d.data().bank || '', accountNo: d.data().accountNo || '' }));
      }
    });

    const unsubFiles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'files'), (s) => setFiles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAnnounce = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), (s) => setAnnouncements(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCoupons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), (s) => setCoupons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubChat = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), (s) => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
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

    return () => { unsubProfile(); unsubFiles(); unsubAnnounce(); unsubCoupons(); unsubChat(); unsubAct(); unsubTrans(); unsubTickets(); unsubWd(); adminUnsub(); };
  }, [user, isAdmin]);

  // Timer Focus Engine (V12 Gamification)
  useEffect(() => {
    let interval;
    if (isFocusing && focusTimeLeft > 0) {
      interval = setInterval(() => { setFocusTimeLeft(prev => prev - 1); }, 1000);
    } else if (isFocusing && focusTimeLeft <= 0) {
      setIsFocusing(false);
      handleFocusComplete();
    }
    return () => clearInterval(interval);
  }, [isFocusing, focusTimeLeft]);

  const handleFocusComplete = async () => {
    if (focusMode === 'work') {
       try {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { rewardPoints: increment(25) });
           showToast("Sesi Fokus Selesai! Anda mendapatkan +25 Poin Reward 🏆", "success");
           logActivity(`${userData?.name?.split(' ')[0] || 'Member'} baru saja menyelesaikan sesi Deep Work! 🧠`, 'focus');
           setFocusMode('break');
           setFocusTimeLeft(5 * 60); // 5 Menit Istirahat
       } catch(e) { showToast("Gagal menyimpan poin sesi", "error"); }
    } else {
       showToast("Waktu istirahat selesai. Saatnya kembali fokus!", "success");
       setFocusMode('work');
       setFocusTimeLeft(25 * 60);
    }
  };

  const toggleFocusTimer = () => setIsFocusing(!isFocusing);
  const resetFocusTimer = () => { setIsFocusing(false); setFocusTimeLeft(focusMode === 'work' ? 25 * 60 : 5 * 60); };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Scroll to bottom on new chat
  useEffect(() => {
    if (activeTab === 'community') chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedChat, activeTab]);
  useEffect(() => {
    if (isAIOpen) aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, isAIOpen]);

  // ==========================================
  // CORE LOGIC ACTIONS
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!isConfigReady) return showToast("Config Firebase belum diisi!", "error");
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const storedRef = localStorage.getItem('affiliate_ref_v12'); 
        const init = { name: formData.name, email: formData.email, subscriptionLevel: 0, joinDate: new Date().toISOString(), uid: cred.user.uid, commissionBalance: 0, rewardPoints: 0, referredBy: storedRef || null, completedFiles: [] };
        await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profile', 'data'), init);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', cred.user.uid), init);
        localStorage.removeItem('affiliate_ref_v12');
        logActivity(`${formData.name} baru saja mendaftar! 🚀`, 'join');
        showToast("Pendaftaran Berhasil!");
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        showToast("Selamat Datang!");
      }
    } catch (err) { showToast("Gagal Login/Daftar. Cek kredensial Anda.", "error"); }
    setAuthLoading(false);
  };

  const handleDailyCheckIn = async () => {
    const today = new Date().toDateString();
    if (userData?.lastCheckInDate === today) return showToast("Sudah klaim harian.", "error");
    try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { rewardPoints: increment(10), lastCheckInDate: today });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { rewardPoints: increment(10), lastCheckInDate: today });
        showToast("Check-in Berhasil! +10 Poin", "success");
    } catch (e) { showToast("Error klaim poin", "error"); }
  };

  const handleToggleFileProgress = async (fileId, fileName) => {
    try {
        const isDoneNow = !completedFiles.includes(fileId);
        const newArr = isDoneNow ? [...completedFiles, fileId] : completedFiles.filter(id => id !== fileId);
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { completedFiles: newArr });
        if(isDoneNow) {
            showToast("Materi selesai! +50 Poin Reward", "success");
            logActivity(`${userData?.name?.split(' ')[0]} menyelesaikan materi: ${fileName} 📚`, 'learn');
        }
    } catch(e) { showToast("Gagal simpan progress", "error"); }
  };

  const handlePurchaseRequest = async (e) => {
    e.preventDefault();
    if (!confirmForm.senderName || !confirmForm.senderBank) return showToast("Form harus lengkap!", "error");
    try {
      const transId = `TRX-${Math.floor(Date.now() / 1000)}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', transId), {
        id: transId, userId: user.uid, userName: userData?.name || user?.email || 'Member', 
        packageLevel: checkoutPkg.level, packageName: checkoutPkg.name, price: finalPrice, promoCode: appliedCoupon?.code || null, 
        senderName: confirmForm.senderName, senderBank: confirmForm.senderBank, notes: confirmForm.notes, status: 'pending', createdAt: new Date().toISOString()
      });
      logActivity(`${userData?.name?.split(' ')[0] || 'Seseorang'} memesan lisensi ${checkoutPkg.name}! 🔥`, 'order');
      setCheckoutPkg(null); setAppliedCoupon(null); setConfirmForm({senderName:'', senderBank:'', notes:''});
      showToast("Konfirmasi terkirim! Admin akan memvalidasi.");
      setActiveTab('transactions');
    } catch (err) { showToast("Gagal kirim invoice", "error"); }
  };

  const handleTransactionAction = async (trans, action) => {
    try {
      if (action === 'approve') {
          if(!window.confirm(`Upgrade member ${trans.userName}?`)) return;
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
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', trans.id), { status: 'rejected' });
          showToast("Ditolak", "error");
      }
    } catch (err) { showToast("Error database", "error"); }
  };

  const handleRequestWithdrawal = async () => {
    if (!userData?.bank || !userData?.accountNo) return showToast("Lengkapi profil bank dulu!", "error");
    if (affiliateBalance < 100000) return showToast("Min penarikan Rp 100rb", "error");
    try {
        const amount = affiliateBalance;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), {
            userId: user.uid, userName: userData?.name, bank: userData.bank, accountNo: userData.accountNo, 
            amount, status: 'pending', createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { commissionBalance: increment(-amount) });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { commissionBalance: increment(-amount) });
        logActivity(`${userData?.name?.split(' ')[0]} menarik komisi Rp ${amount.toLocaleString()} 💸`, 'withdraw');
        showToast("Permintaan WD terkirim!");
    } catch(e) { showToast("Gagal tarik saldo", "error"); }
  };

  const handleAdminWithdrawalAction = async (wdId, action, userId, amount) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', wdId), { status: action, updatedAt: new Date().toISOString() });
      if (action === 'rejected') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data'), { commissionBalance: increment(amount) });
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', userId), { commissionBalance: increment(amount) });
         showToast("Pencairan ditolak. Saldo dikembalikan.", "error");
      } else { showToast("Pencairan dana SELESAI."); }
    } catch(e) { showToast("Gagal memproses", "error"); }
  }

  const handleUpdateProfileStandard = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), profileForm);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), profileForm);
      showToast("Profil diperbarui!");
    } catch(err) { showToast("Gagal update profil", "error"); }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), {
        userId: user.uid, userName: userData?.name || user?.email || 'Member', subject: ticketForm.subject, 
        message: ticketForm.message, status: 'open', adminReply: '', createdAt: new Date().toISOString()
      });
      setTicketForm({ subject: '', message: '' });
      showToast("Tiket Bantuan dikirim.");
    } catch (err) { showToast("Gagal kirim tiket", "error"); }
  };

  const handleAdminReplyTicket = async (ticketId, replyText) => {
    if (!replyText) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), { status: 'answered', adminReply: replyText, updatedAt: new Date().toISOString() });
      showToast("Balasan terkirim.");
    } catch (err) { showToast("Gagal membalas tiket", "error"); }
  };

  const handleDeleteTicket = async (ticketId) => {
    if(!window.confirm("Hapus permanen tiket ini?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId)); showToast("Dihapus."); } 
    catch (err) { showToast("Gagal menghapus", "error"); }
  }

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const codeFormat = couponInput.toUpperCase().trim();
    const found = coupons.find(c => c.code === codeFormat && c.active);
    if (found) { setAppliedCoupon(found); showToast(`${found.discount}% Diskon OK!`); } 
    else { setAppliedCoupon(null); showToast("Kupon tidak valid.", "error"); }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
        const code = couponForm.code.toUpperCase().trim();
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', code), { 
            code, discount: parseInt(couponForm.discount), active: true, createdAt: new Date().toISOString() 
        });
        setCouponForm({code:'', discount:''});
        showToast("Kupon dibuat!");
    } catch(e) { showToast("Gagal buat kupon", "error"); }
  };

  const handleDeleteCoupon = async (couponId) => {
    if(!window.confirm("Hapus kupon ini?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', couponId)); showToast("Kupon dihapus!"); } 
    catch(err) { showToast("Gagal menghapus kupon", "error"); }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if(!chatInput.trim()) return;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), {
            userId: user.uid, userName: userData?.name || user?.email, text: chatInput,
            isAdmin, rankName: userRank.name, rankBg: userRank.bg, rankColor: userRank.color,
            createdAt: new Date().toISOString()
        });
        setChatInput('');
    } catch(e) { showToast("Gagal kirim", "error"); }
  };

  const handleDeleteChat = async (id) => {
    if(!window.confirm('Hapus chat?')) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'globalChat', id)); } 
    catch(e) { showToast('Gagal hapus', 'error'); }
  };

  const handleAiSubmit = (e) => {
    e.preventDefault();
    if(!aiInput.trim()) return;
    const userMsg = { role: 'user', text: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiTyping(true);
    
    setTimeout(() => {
        let reply = "Saya masih belajar. Hubungi Admin untuk bantuan teknis.";
        const low = aiInput.toLowerCase();
        if(low.includes('halo') || low.includes('hai')) reply = "Halo! Senang bertemu Anda. Ada yang bisa AI bantu?";
        if(low.includes('komisi') || low.includes('afiliasi')) reply = "Komisi afiliasi sebesar 20% diberikan otomatis setiap ada yang beli via link Anda. Cek menu Program Afiliasi.";
        if(low.includes('sertifikat')) reply = "Sertifikat otomatis terbuka jika progress materi mencapai 100%. Teruslah belajar!";
        if(low.includes('poin') || low.includes('fokus')) reply = "Kumpulkan poin dengan Daily Check-in (+10), Selesai Materi (+50), dan Deep Work di Ruang Fokus (+25 per 25 menit).";
        
        setAiMessages(prev => [...prev, { role: 'ai', text: reply }]);
        setAiTyping(false);
    }, 1000);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...productForm, reqLevel: parseInt(productForm.reqLevel), updatedAt: serverTimestamp() };
      if (editingId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', editingId), data); } 
      else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'files'), { ...data, createdAt: serverTimestamp() }); }
      setProductForm({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
      setEditingId(null);
    } catch (err) { showToast("Gagal simpan produk", "error"); }
  };

  const updateMemberTier = async (uid, level) => {
    if(!window.confirm(`Ubah akses member ke tier ${TIER_LEVELS[level].name}?`)) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid), { subscriptionLevel: level });
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { subscriptionLevel: level });
      showToast('Tier diperbarui.');
    } catch (err) { showToast('Akses ditolak', 'error'); }
  };

  const deleteMemberData = async (uid) => {
    if(!window.confirm("YAKIN HAPUS DATA MEMBER?")) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid));
        showToast('Data Dihapus', 'error');
    } catch (err) { showToast('Gagal menghapus', 'error'); }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    const msg = e.target.announce.value;
    if (!msg) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { message: msg, createdAt: new Date().toISOString() });
      e.target.reset();
      showToast("Broadcast dikirim.");
    } catch (err) {}
  };

  const handleExportCSV = () => {
    const headers = ["Nama", "Email", "WA", "Tier", "Saldo"];
    const rows = [headers.join(",")];
    filteredUsers.forEach(u => rows.push([`"${u.name}"`, `"${u.email}"`, `"${u.phone || ''}"`, `"${TIER_LEVELS[u.subscriptionLevel].name}"`, `"${u.commissionBalance || 0}"`].join(",")));
    const blob = new Blob([rows.join("\n")], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Member_Export.csv`;
    link.click();
  };

  const closeSidebarMobile = () => { if (window.innerWidth < 1024) setSidebarOpen(false); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  // ==========================================
  // RENDER: AUTH
  // ==========================================
  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-fadeIn">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-100">
               <ShieldCheck size={32} className="text-white"/>
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
            <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all">
               {authLoading ? 'PROSES...' : authMode==='login' ? 'MASUK KE DASHBOARD' : 'DAFTAR SEKARANG'}
            </button>
          </form>
      </div>
    </div>
  );

  // ==========================================
  // RENDER: MAIN DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] flex text-slate-800 relative">
      
      {/* FOMO TICKER */}
      {latestActivity && (
        <div className="fixed bottom-6 left-6 z-[200] max-w-sm bg-white rounded-2xl shadow-3xl border border-slate-100 p-4 flex items-center gap-4 animate-slideInRight">
           <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${latestActivity.type === 'order' ? 'bg-amber-100 text-amber-600' : latestActivity.type === 'focus' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
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
                      <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center"><Bot size={20}/></div>
                      <h4 className="font-black text-sm">ProSpace AI Mentor</h4>
                   </div>
                   <button onClick={()=>setIsAIOpen(false)}><X size={18}/></button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 custom-scrollbar">
                   {aiMessages.map((m, i) => (
                      <div key={i} className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'ai' ? 'bg-white border self-start rounded-tl-none' : 'bg-indigo-600 text-white self-end rounded-tr-none'}`}>{m.text}</div>
                   ))}
                   {aiTyping && <div className="p-3 bg-white border self-start rounded-2xl rounded-tl-none italic text-xs text-slate-400">Mengetik...</div>}
                   <div ref={aiEndRef}/>
                </div>
                <form onSubmit={handleAiSubmit} className="p-3 bg-white border-t flex gap-2">
                   <input type="text" placeholder="Tanya AI..." value={aiInput} onChange={e=>setAiInput(e.target.value)} className="flex-1 px-4 py-2 bg-slate-100 rounded-xl outline-none text-sm" />
                   <button type="submit" className="bg-indigo-600 text-white p-2.5 rounded-xl"><Send size={18}/></button>
                </form>
             </div>
           )}
           <button onClick={()=>setIsAIOpen(!isAIOpen)} className="bg-indigo-600 text-white p-4 rounded-full shadow-2xl animate-float"><Bot size={28}/></button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-8 border-b border-slate-100 shrink-0">
          <h1 className="text-2xl font-black text-indigo-600 font-['Outfit'] flex items-center gap-2"><ShieldCheck size={24}/> ProSpace</h1>
          <button onClick={()=>setSidebarOpen(false)} className="lg:hidden text-slate-400"><X/></button>
        </div>
        <div className="p-6 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {isAdmin ? (
            <>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 px-4 mt-2">Admin Panel</p>
              <NavBtn active={activeTab==='admin_overview'} onClick={()=>{setActiveTab('admin_overview'); closeSidebarMobile();}} icon={<Activity size={20}/>} label="Overview Visual" />
              <NavBtn active={activeTab==='admin_trans'} onClick={()=>{setActiveTab('admin_trans'); closeSidebarMobile();}} icon={<CheckCircle size={20}/>} label="Validasi Bayar" count={adminStats.pendingTrans} />
              <NavBtn active={activeTab==='admin_wd'} onClick={()=>{setActiveTab('admin_wd'); closeSidebarMobile();}} icon={<Wallet size={20}/>} label="Pencairan Dana" count={adminStats.pendingWd} />
              <NavBtn active={activeTab==='admin_coupons'} onClick={()=>{setActiveTab('admin_coupons'); closeSidebarMobile();}} icon={<Tag size={20}/>} label="Kelola Kupon" />
              <NavBtn active={activeTab==='admin_support'} onClick={()=>{setActiveTab('admin_support'); closeSidebarMobile();}} icon={<MessageCircle size={20}/>} label="Support Helpdesk" count={adminStats.openTickets} />
              <NavBtn active={activeTab==='admin_users'} onClick={()=>{setActiveTab('admin_users'); closeSidebarMobile();}} icon={<Users size={20}/>} label="Data Member CRM" />
              <NavBtn active={activeTab==='admin_files'} onClick={()=>{setActiveTab('admin_files'); closeSidebarMobile();}} icon={<Plus size={20}/>} label="Kelola Produk" />
            </>
          ) : (
            <>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Member Menu</p>
              <NavBtn active={activeTab==='dashboard'} onClick={()=>{setActiveTab('dashboard'); closeSidebarMobile();}} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
              <NavBtn active={activeTab==='focus'} onClick={()=>{setActiveTab('focus'); closeSidebarMobile();}} icon={<Headphones size={20}/>} label="Ruang Fokus VIP" />
              <NavBtn active={activeTab==='community'} onClick={()=>{setActiveTab('community'); closeSidebarMobile();}} icon={<MessageCircle size={20}/>} label="Komunitas VIP" />
              <NavBtn active={activeTab==='files'} onClick={()=>{setActiveTab('files'); closeSidebarMobile();}} icon={<FolderLock size={20}/>} label="Katalog Materi" count={files.filter(f=>currentTier>=f.reqLevel).length} />
              <NavBtn active={activeTab==='shop'} onClick={()=>{setActiveTab('shop'); closeSidebarMobile();}} icon={<ShoppingBag size={20}/>} label="Upgrade Paket" />
              <NavBtn active={activeTab==='transactions'} onClick={()=>{setActiveTab('transactions'); closeSidebarMobile();}} icon={<Banknote size={20}/>} label="Riwayat Order" count={[...transactions].filter(t=>t.userId === user?.uid && t.status==='pending').length} />
              <NavBtn active={activeTab==='affiliate'} onClick={()=>{setActiveTab('affiliate'); closeSidebarMobile();}} icon={<Network size={20}/>} label="Program Afiliasi" />
              <NavBtn active={activeTab==='leaderboard'} onClick={()=>{setActiveTab('leaderboard'); closeSidebarMobile();}} icon={<Trophy size={20}/>} label="Peringkat Marketer" />
              <NavBtn active={activeTab==='support'} onClick={()=>{setActiveTab('support'); closeSidebarMobile();}} icon={<LifeBuoy size={20}/>} label="Tiket Bantuan" />
            </>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 shrink-0">
          <NavBtn active={activeTab==='profile'} onClick={()=>{setActiveTab('profile'); closeSidebarMobile();}} icon={<Settings size={20}/>} label="Pengaturan Profil" />
          <button onClick={()=>signOut(auth)} className="flex items-center gap-4 px-5 py-4 w-full rounded-2xl font-bold text-rose-500 hover:bg-rose-50 group">
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform"/><span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative custom-scrollbar bg-slate-50">
        
        {/* HEADER TOP */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-[100] shrink-0">
          <button onClick={()=>setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 bg-slate-100 rounded-xl"><Menu/></button>
          <div className="flex items-center gap-6 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-tight">{userData?.name || 'Member'}</p>
              <div className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black inline-block mt-1 ${userRank.bg} ${userRank.color} border ${userRank.border}`}>{userRank.icon} {userRank.name} RANK</div>
            </div>
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white rounded-2xl flex items-center justify-center font-black shadow-lg cursor-pointer" onClick={()=>setActiveTab('profile')}>
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-12 w-full max-w-7xl mx-auto animate-fadeIn pb-32">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && !isAdmin && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-[2.5rem] p-6 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6 border border-purple-400/30 overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                 <div className="text-center sm:text-left relative z-10">
                    <h3 className="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center sm:justify-start gap-2"><Gift size={24}/> Bonus Check-In Harian</h3>
                    <p className="text-purple-100 text-xs sm:text-sm font-medium">Klaim setiap hari dan kumpulkan Poin Reward Anda.</p>
                 </div>
                 <button onClick={handleDailyCheckIn} disabled={userData?.lastCheckInDate === new Date().toDateString()} className="relative z-10 w-full sm:w-auto bg-white text-purple-600 px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-transform disabled:opacity-50 shadow-lg">
                    {userData?.lastCheckInDate === new Date().toDateString() ? 'SUDAH KLAIM' : '🎁 KLAIM +10 POIN'}
                 </button>
              </div>

              {progressData === 100 && accessibleFiles.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] p-6 sm:p-10 text-white shadow-xl border border-emerald-400/30">
                   <div className="text-center sm:text-left">
                      <h3 className="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center sm:justify-start gap-2"><BadgeCheck size={24}/> Luar Biasa! Selesai 100%</h3>
                      <p className="text-emerald-50 text-xs sm:text-sm">Unduh sertifikat kelulusan Anda sekarang.</p>
                   </div>
                   <button onClick={() => setShowCertificate(true)} className="mt-4 w-full sm:w-auto bg-white text-emerald-600 px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2"><DownloadCloud size={18}/> CETAK SERTIFIKAT</button>
                </div>
              )}

              <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-14 text-white relative shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-500/20 rounded-full blur-[100px]"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                  <div className="space-y-4 text-center lg:text-left w-full lg:w-2/3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm">
                       <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{TIER_LEVELS[currentTier].name} Member</span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-black font-['Outfit'] tracking-tight leading-tight">Halo, {userData?.name?.split(' ')[0] || 'Member'}! 👋</h2>
                    <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">Gunakan fitur Ruang Fokus VIP untuk belajar lebih produktif dan dapatkan ekstra poin.</p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                       <button onClick={()=>setActiveTab('focus')} className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all text-sm flex items-center justify-center gap-2"><Headphones size={18}/> RUANG FOKUS</button>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/3 flex justify-center items-center flex-col gap-4">
                     <div className="relative w-36 h-36">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                           <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ffffff10" strokeWidth="3" />
                           <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${progressData}, 100`} strokeLinecap="round" className="transition-all duration-1000" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-black text-4xl text-white">{progressData}%</div>
                     </div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Learning Progress</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                <StatCard label="Reward Points" val={userPoints + " PTS"} icon={<Award size={28}/>} color="purple" />
                <StatCard label="Modul Terbuka" val={`${accessibleFiles.length} File`} icon={<Box size={28}/>} color="indigo" />
                <StatCard label="Gelar Rank" val={userRank.name} icon={<Trophy size={28}/>} color="emerald" />
                <StatCard label="Saldo Komisi" val={`Rp ${affiliateBalance.toLocaleString('id-ID')}`} icon={<Wallet size={28}/>} color="amber" />
              </div>
            </div>
          )}

          {/* TAB: FOCUS ROOM (NEW V12 GAMIFICATION) */}
          {activeTab === 'focus' && !isAdmin && (
             <div className="animate-fadeIn max-w-4xl mx-auto">
                <div className="text-center space-y-4 mb-10">
                   <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full mb-2"><Headphones size={32}/></div>
                   <h2 className="text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Ruang Fokus VIP</h2>
                   <p className="text-slate-500 font-medium">Mode Deep Work. Putar musik, jalankan timer, dan dapatkan <strong className="text-purple-600">+25 Poin Reward</strong> per sesi.</p>
                </div>
                
                <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-10 items-center">
                   <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
                   
                   {/* Music Player */}
                   <div className="w-full md:w-1/2 relative z-10 flex flex-col items-center">
                      <p className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-4">Lo-Fi Study Radio</p>
                      <div className="w-full aspect-video rounded-2xl overflow-hidden border-4 border-slate-800 shadow-xl">
                         <iframe 
                            width="100%" height="100%" 
                            src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&controls=1" 
                            title="Lofi Girl Radio" frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen>
                         </iframe>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-3 text-center">*Unmute video untuk mendengarkan musik</p>
                   </div>

                   {/* Pomodoro Timer */}
                   <div className="w-full md:w-1/2 flex flex-col items-center relative z-10 border-t md:border-t-0 md:border-l border-slate-800 pt-8 md:pt-0 md:pl-10">
                      <div className="inline-flex bg-slate-800 rounded-full p-1 mb-8">
                         <button onClick={()=>{setFocusMode('work'); setFocusTimeLeft(25*60); setIsFocusing(false);}} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${focusMode==='work' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Deep Work</button>
                         <button onClick={()=>{setFocusMode('break'); setFocusTimeLeft(5*60); setIsFocusing(false);}} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${focusMode==='break' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>Break</button>
                      </div>

                      <div className="text-[5rem] sm:text-[6rem] font-black font-mono leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-8 drop-shadow-2xl">
                         {formatTime(focusTimeLeft)}
                      </div>

                      <div className="flex items-center gap-4">
                         <button onClick={toggleFocusTimer} className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl ${isFocusing ? 'bg-amber-500 text-amber-900' : 'bg-emerald-500 text-emerald-900'}`}>
                            {isFocusing ? <PauseCircle size={32}/> : <PlayCircle size={32}/>}
                         </button>
                         <button onClick={resetFocusTimer} className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all"><RefreshCw size={20}/></button>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-6 uppercase tracking-widest bg-slate-800 px-4 py-2 rounded-xl border border-slate-700"><Award size={12} className="inline mr-1"/> Reward 25 Menit = 25 Poin</p>
                   </div>
                </div>
             </div>
          )}

          {/* TAB: ADMIN OVERVIEW */}
          {activeTab === 'admin_overview' && isAdmin && (
            <div className="space-y-8 animate-fadeIn">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">Admin Dashboard Visual</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-indigo-600 rounded-[2rem] p-8 text-white relative shadow-xl overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-indigo-500 opacity-30"><Banknote size={120}/></div>
                    <p className="text-[10px] font-black uppercase text-indigo-200">Total Revenue</p>
                    <p className="text-3xl font-black mt-2 font-['Outfit']">Rp {adminStats.totalRev.toLocaleString('id-ID')}</p>
                 </div>
                 <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Member</p>
                    <p className="text-4xl font-black mt-2 text-slate-800">{allUsers.length}</p>
                 </div>
                 <div className="bg-amber-50 rounded-[2rem] p-8 border border-amber-200 cursor-pointer" onClick={()=>setActiveTab('admin_trans')}>
                    <p className="text-[10px] font-black uppercase text-amber-600">Butuh Validasi</p>
                    <p className="text-4xl font-black mt-2 text-amber-600">{adminStats.pendingTrans}</p>
                 </div>
                 <div className="bg-rose-50 rounded-[2rem] p-8 border border-rose-200 cursor-pointer" onClick={()=>setActiveTab('admin_wd')}>
                    <p className="text-[10px] font-black uppercase text-rose-600">Pencairan Dana</p>
                    <p className="text-4xl font-black mt-2 text-rose-600">{adminStats.pendingWd}</p>
                 </div>
               </div>

               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                   <h4 className="font-black uppercase tracking-widest text-xs text-slate-400 mb-8">Performance Transaksi</h4>
                   <div className="space-y-6">
                      <div>
                         <div className="flex justify-between text-sm font-bold text-slate-700 mb-3"><span>Sukses</span> <span>{adminStats.approvedTrans} Member</span></div>
                         <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{width: `${transactions.length ? (adminStats.approvedTrans/transactions.length)*100 : 0}%`}}></div>
                         </div>
                      </div>
                      <div>
                         <div className="flex justify-between text-sm font-bold text-slate-700 mb-3"><span>Antrean</span> <span>{adminStats.pendingTrans} Transaksi</span></div>
                         <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{width: `${transactions.length ? (adminStats.pendingTrans/transactions.length)*100 : 0}%`}}></div>
                         </div>
                      </div>
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
                                       {isAdmin && !isMe && (
                                         <button onClick={()=>handleDeleteChat(msg.id)} className="absolute -right-8 top-0 p-1 text-rose-300 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                       )}
                                       {!isMe && (
                                           <div className="flex items-center gap-2 mb-1.5">
                                              <span className={`text-[10px] font-black ${msg.isAdmin ? 'text-indigo-200' : 'text-slate-500'}`}>{msg.userName}</span>
                                              {msg.rankName && <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black border uppercase ${msg.rankBg} ${msg.rankColor}`}>{msg.rankName}</span>}
                                           </div>
                                       )}
                                       <p className="text-sm leading-relaxed">{msg.text}</p>
                                       <p className={`text-[8px] text-right mt-1 font-bold ${msg.isAdmin || isMe ? 'text-white/60' : 'text-slate-300'}`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            )
                         })
                      )}
                      <div ref={chatEndRef} />
                   </div>
                   <form onSubmit={handleSendChat} className="p-4 bg-white border-t flex gap-2 shrink-0">
                       <input type="text" placeholder="Ketik pesan..." className="flex-1 px-5 py-4 bg-slate-100 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-indigo-500" value={chatInput} onChange={e=>setChatInput(e.target.value)} required />
                       <button type="submit" className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"><Send size={20}/></button>
                   </form>
                </div>
             </div>
          )}

          {/* TAB: FILES */}
          {activeTab === 'files' && (
             <div className="space-y-10 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Katalog Materi Digital</h2>
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
                   <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border-4 border-amber-100"><Trophy size={40}/></div>
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
                  <h2 className="text-3xl sm:text-5xl font-black text-slate-900 font-['Outfit']">Pilih Paket Terbaik</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[1, 2, 3].map(lv => {
                    const isActive = currentTier === lv;
                    const isPassed = currentTier > lv;
                    const isPending = [...transactions].some(t => t.userId === user?.uid && t.packageLevel === lv && t.status === 'pending');
                    return (
                      <div key={lv} className={`bg-white rounded-[2rem] border-2 p-10 flex flex-col h-full relative ${isActive ? 'border-indigo-600 shadow-2xl lg:-translate-y-4' : 'border-slate-100 hover:border-slate-300 hover:shadow-xl'}`}>
                         <h3 className="text-2xl font-black text-slate-900 mb-6 font-['Outfit'] uppercase">{TIER_LEVELS[lv].name}</h3>
                         <span className="text-3xl font-black text-indigo-600 mb-8">Rp {TIER_LEVELS[lv].price.toLocaleString('id-ID')}</span>
                         <button onClick={() => {setCheckoutPkg({...TIER_LEVELS[lv], level: lv}); setAppliedCoupon(null); setCouponInput('');}} disabled={isActive || isPassed || isPending} className={`w-full mt-auto py-5 rounded-2xl font-black ${isActive||isPassed||isPending ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl'}`}>
                           {isActive ? 'STATUS AKTIF' : isPassed ? 'TERLEWATI' : isPending ? 'PROSES VALIDASI' : 'PILIH PAKET'}
                         </button>
                      </div>
                    )
                  })}
               </div>
            </div>
          )}

          {/* TAB: TRANSACTIONS */}
          {activeTab === 'transactions' && !isAdmin && (
            <div className="animate-fadeIn space-y-10">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit']">Riwayat Pembelian</h2>
               <div className="grid grid-cols-1 gap-4">
                  {[...transactions].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                       <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.status === 'pending' ? 'bg-amber-50 text-amber-500' : t.status === 'rejected' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                             <Clock size={28}/>
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">{t.id}</p>
                             <h4 className="text-lg font-black text-slate-800">Paket {t.packageName}</h4>
                             <p className="text-xs font-bold text-slate-500 mt-1">Rp {t.price.toLocaleString('id-ID')}</p>
                          </div>
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

          {/* TAB: ADMIN TRANS */}
          {activeTab === 'admin_trans' && isAdmin && (
            <div className="animate-fadeIn space-y-10">
               <h2 className="text-3xl font-black text-slate-900">Validasi Pembayaran</h2>
               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                       <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr><th className="px-8 py-5">User</th><th className="px-8 py-5">Data Transfer</th><th className="px-8 py-5">Tagihan</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {transactions.filter(t => t.status==='pending').map(t => (
                            <tr key={t.id}>
                               <td className="px-8 py-6">
                                  <p className="font-black text-slate-900 text-sm">{t.userName}</p>
                                  <p className="text-[10px] text-slate-400 mt-1">{new Date(t.createdAt).toLocaleDateString('id-ID')}</p>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="bg-slate-100 p-3 rounded-xl text-xs font-bold">Pengirim: {t.senderName}<br/>Bank: {t.senderBank}</div>
                               </td>
                               <td className="px-8 py-6 font-black text-indigo-600">Rp {t.price.toLocaleString('id-ID')}</td>
                               <td className="px-8 py-6 text-center">
                                  <div className="flex justify-center gap-2">
                                     <button onClick={()=>handleTransactionAction(t, 'approve')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-emerald-600 transition-all shadow-lg"><CheckCircle size={14}/></button>
                                     <button onClick={()=>handleTransactionAction(t, 'reject')} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase"><XCircle size={14}/></button>
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
                      <button onClick={handleRequestWithdrawal} className="mt-8 bg-white text-indigo-600 px-6 py-4 rounded-xl font-black text-sm shadow-lg hover:scale-105 transition-transform">TARIK SALDO KE REKENING</button>
                   </div>
                   <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Link Referral Anda</p>
                      <div className="flex bg-slate-50 border rounded-xl p-2 items-center">
                         <input type="text" readOnly value={`https://domainanda.com/?ref=${user?.uid}`} className="bg-transparent flex-1 outline-none text-sm font-bold text-slate-600 px-3 truncate" />
                         <button onClick={()=>copyToClipboard(`https://domainanda.com/?ref=${user?.uid}`)} className="bg-indigo-100 text-indigo-600 p-3 rounded-lg"><Copy size={16}/></button>
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
                  <button onClick={handleExportCSV} className="bg-emerald-500 text-white px-5 py-3 rounded-xl font-black text-xs hover:bg-emerald-600 flex gap-2"><DownloadCloud size={16}/> CSV</button>
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
                             <td className="px-8 py-6">
                                <p className="font-black text-slate-900">{m.name}</p>
                                <p className="text-[11px] text-slate-500">{m.email}</p>
                             </td>
                             <td className="px-8 py-6 uppercase font-black text-indigo-600 text-[10px]">{TIER_LEVELS[m.subscriptionLevel]?.name}</td>
                             <td className="px-8 py-6 text-center">
                                <div className="flex justify-center gap-2">
                                  <button onClick={()=>setSelectedUserDetail(m)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Eye size={16}/></button>
                                  <button onClick={()=>deleteMemberDataAction(m.uid)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><Trash2 size={16}/></button>
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
                  <form onSubmit={handleUpdateProfileStandard} className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Nomor WhatsApp</label>
                        <input type="text" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={profileForm.phone} onChange={e=>setProfileForm({...profileForm, phone: e.target.value})} />
                     </div>
                     <div className="pt-4 border-t border-slate-100">
                        <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Banknote size={18} className="text-indigo-500"/> Data Rekening (Untuk WD Komisi)</h4>
                        <div className="grid grid-cols-2 gap-6">
                           <input type="text" placeholder="Bank" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-sm" value={profileForm.bank} onChange={e=>setProfileForm({...profileForm, bank: e.target.value})} />
                           <input type="text" placeholder="No Rekening" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-sm" value={profileForm.accountNo} onChange={e=>setProfileForm({...profileForm, accountNo: e.target.value})} />
                        </div>
                     </div>
                     <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-600 transition-all mt-4">SIMPAN PERUBAHAN</button>
                  </form>
               </div>
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      {selectedUserDetail && isAdmin && (
         <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/80 animate-fadeIn">
            <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col max-h-[85vh]">
               <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                  <div>
                     <h3 className="text-2xl font-black">{selectedUserDetail.name}</h3>
                     <p className="text-indigo-300 font-bold text-sm">{selectedUserDetail.email}</p>
                  </div>
                  <button onClick={()=>setSelectedUserDetail(null)} className="p-2 bg-white/10 rounded-xl"><X/></button>
               </div>
               <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-5 bg-slate-50 rounded-2xl border">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">WA Member</p>
                        <p className="font-black text-slate-800">{selectedUserDetail.phone || '-'}</p>
                     </div>
                     <div className="p-5 bg-slate-50 rounded-2xl border">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Poin Reward</p>
                        <p className="font-black text-slate-800">{selectedUserDetail.rewardPoints || 0} PTS</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {showCertificate && (
         <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/90 animate-fadeIn overflow-y-auto">
            <div className="max-w-3xl w-full bg-white p-2 shadow-2xl relative">
               <button onClick={()=>setShowCertificate(false)} className="absolute -top-4 -right-4 p-2 bg-rose-500 text-white rounded-full z-10"><X/></button>
               <div id="printable-certificate" className="border-[12px] border-double border-indigo-100 p-10 sm:p-20 text-center bg-white relative">
                  <div className="absolute top-10 left-10 text-indigo-100"><Award size={120}/></div>
                  <h1 className="text-4xl font-serif font-black text-indigo-900 mb-2 uppercase tracking-widest">Certificate of Achievement</h1>
                  <p className="text-slate-400 font-bold mb-10">Diberikan secara bangga kepada:</p>
                  <h2 className="text-5xl font-black text-slate-800 mb-8 font-['Outfit'] border-b-2 border-indigo-100 pb-4 inline-block">{userData?.name || 'Member'}</h2>
                  <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">Atas penyelesaian 100% kurikulum materi di platform digital <strong className="text-indigo-600">ProSpace Membership</strong>.</p>
                  <div className="mt-16 flex justify-between items-end px-10">
                     <div className="text-left"><p className="font-black border-b">{new Date().toLocaleDateString('id-ID')}</p><p className="text-[10px] text-slate-400">TANGGAL LULUS</p></div>
                     <div className="text-right"><p className="font-black border-b">ADMIN PROSPACE</p><p className="text-[10px] text-slate-400">FOUNDER & CEO</p></div>
                  </div>
               </div>
               <div className="p-4 text-center bg-slate-50"><button onClick={()=>window.print()} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 mx-auto"><DownloadCloud size={18}/> PRINT PDF</button></div>
            </div>
         </div>
      )}

      {checkoutPkg && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/80 animate-fadeIn overflow-y-auto">
           <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-3xl my-auto p-8 sm:p-12 space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black">Final Checkout</h3>
                 <button onClick={()=>{setCheckoutPkg(null); setAppliedCoupon(null);}} className="p-2 bg-slate-100 rounded-xl text-slate-400"><X/></button>
              </div>
              <div className="bg-slate-900 rounded-[1.5rem] p-6 text-white relative">
                 <p className="text-[10px] font-black uppercase text-indigo-300">Total Pembayaran</p>
                 <p className="text-3xl font-black">Rp {finalPrice.toLocaleString('id-ID')}</p>
              </div>
              <form onSubmit={handlePurchaseRequest} className="space-y-4">
                 <input type="text" placeholder="Nama Pemilik Rekening Pengirim" value={confirmForm.senderName} onChange={e=>setConfirmForm({...confirmForm, senderName: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm" required />
                 <input type="text" placeholder="Bank Asal" value={confirmForm.senderBank} onChange={e=>setConfirmForm({...confirmForm, senderBank: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 font-bold text-sm" required />
                 <button type="submit" className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs">
                    Konfirmasi & Upgrade
                 </button>
              </form>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @media print { body * { visibility: hidden; } #printable-certificate, #printable-certificate * { visibility: visible; } #printable-certificate { position: absolute; left: 0; top: 0; width: 100%; } }
      `}} />
    </div>
  );
}