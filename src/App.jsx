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
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  increment
} from 'firebase/firestore';
import { 
  LayoutDashboard, ShoppingBag, Users, UserCircle, LogOut, Plus, Search, Download, 
  ShieldCheck, CreditCard, Settings, Menu, X, Bell, Trash2, Edit3, ChevronRight, 
  FileText, Video, Box, Lock, MessageSquare, Banknote, CheckCircle, Clock, 
  Megaphone, FolderLock, ArrowRight, AlertCircle, Activity, XCircle, LifeBuoy, 
  MessageCircle, Network, Wallet, Copy, Save, Star, Send, Receipt, Tag, Trophy, Eye, CheckSquare, Square, Award, Sparkles, Crown
} from 'lucide-react';

// ==========================================
// 1. KONFIGURASI SISTEM
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyC_go5YDW885EE1LUyeMBppyC-Zt18jYdQ",
  authDomain: "memberarea-websiteku.firebaseapp.com",
  projectId: "memberarea-websiteku",
  storageBucket: "memberarea-websiteku.firebasestorage.app",
  messagingSenderId: "9418923099",
  appId: "1:9418923099:web:f0275b81b802c08bb3737e"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'membership-v9-system';
const ADMIN_EMAIL = "admin@website.com"; // Ganti dengan Email Admin
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
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [files, setFiles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]); 
  const [withdrawals, setWithdrawals] = useState([]); 
  const [coupons, setCoupons] = useState([]); 
  const [chatMessages, setChatMessages] = useState([]); // Community Chat State
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [checkoutPkg, setCheckoutPkg] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null); 
  
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchFileQuery, setSearchFileQuery] = useState('');

  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [productForm, setProductForm] = useState({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
  const [confirmForm, setConfirmForm] = useState({ senderName: '', senderBank: '', notes: '' });
  const [couponForm, setCouponForm] = useState({ code: '', discount: '' }); 
  const [chatInput, setChatInput] = useState('');
  
  const [profileForm, setProfileForm] = useState({ phone: '', bank: '', accountNo: '' });
  const [editingId, setEditingId] = useState(null);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const chatEndRef = useRef(null);

  const currentTier = userData?.subscriptionLevel || 0;
  const affiliateBalance = userData?.commissionBalance || 0;
  const completedFiles = userData?.completedFiles || [];

  // Gamification Logic (Points & Ranks)
  const userPoints = useMemo(() => {
    let pts = 0;
    if (completedFiles.length) pts += completedFiles.length * 50; // 50 poin per materi selesai
    if (affiliateBalance) pts += Math.floor(affiliateBalance / 10000); // 1 poin per 10rb komisi
    return pts;
  }, [completedFiles, affiliateBalance]);

  const userRank = useMemo(() => {
    if(userPoints >= 1000) return { name: 'Diamond', color: 'text-purple-600', bg: 'bg-purple-100', border:'border-purple-200', icon: <Crown size={14}/> };
    if(userPoints >= 300) return { name: 'Gold', color: 'text-amber-600', bg: 'bg-amber-100', border:'border-amber-200', icon: <Star size={14}/> };
    if(userPoints >= 100) return { name: 'Silver', color: 'text-slate-600', bg: 'bg-slate-200', border:'border-slate-300', icon: <Award size={14}/> };
    return { name: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-100', border:'border-orange-200', icon: <Sparkles size={14}/> };
  }, [userPoints]);

  const filteredUsers = useMemo(() => {
    if (!searchUserQuery) return [...allUsers].sort((a, b) => new Date(b.joinDate || 0) - new Date(a.joinDate || 0));
    const q = searchUserQuery.toLowerCase();
    return allUsers.filter(u => (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q))).sort((a, b) => new Date(b.joinDate || 0) - new Date(a.joinDate || 0));
  }, [allUsers, searchUserQuery]);

  const filteredFiles = useMemo(() => {
    if (!searchFileQuery) return files;
    return files.filter(f => f.name && f.name.toLowerCase().includes(searchFileQuery.toLowerCase()));
  }, [files, searchFileQuery]);

  const sortedChat = useMemo(() => {
    return [...chatMessages].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [chatMessages]);

  const adminStats = useMemo(() => {
    const totalRev = transactions.filter(t => t.status === 'approved').reduce((acc, curr) => acc + curr.price, 0);
    const pendingTrans = transactions.filter(t => t.status === 'pending').length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const pendingWd = withdrawals.filter(w => w.status === 'pending').length;
    return { totalRev, pendingTrans, openTickets, pendingWd };
  }, [transactions, tickets, withdrawals]);

  const leaderboardData = useMemo(() => {
    const earnings = {};
    allUsers.forEach(u => {
        earnings[u.uid] = { uid: u.uid, name: u.name, balance: u.commissionBalance || 0, totalWithdrawn: 0 };
    });
    withdrawals.forEach(w => {
        if (w.status === 'approved' && earnings[w.userId]) {
            earnings[w.userId].totalWithdrawn += w.amount;
        }
    });
    return Object.values(earnings)
        .map(e => ({ ...e, totalEarned: e.balance + e.totalWithdrawn }))
        .filter(e => e.totalEarned > 0)
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 10);
  }, [allUsers, withdrawals]);

  const progressData = useMemo(() => {
    const accessible = files.filter(f => currentTier >= f.reqLevel);
    if(accessible.length === 0) return 0;
    const completedAccessFiles = completedFiles.filter(id => accessible.some(f => f.id === id));
    return Math.round((completedAccessFiles.length / accessible.length) * 100);
  }, [files, currentTier, completedFiles]);

  const finalPrice = useMemo(() => {
    if (!checkoutPkg) return 0;
    if (appliedCoupon && appliedCoupon.discount) return checkoutPkg.price - (checkoutPkg.price * appliedCoupon.discount / 100);
    return checkoutPkg.price;
  }, [checkoutPkg, appliedCoupon]);

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
    showToast("Link Referral berhasil disalin!");
  };

  // Scroll to bottom on new chat
  useEffect(() => {
    if (activeTab === 'community') {
       chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [sortedChat, activeTab]);

  // ==========================================
  // REAL-TIME SYNC
  // ==========================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) localStorage.setItem('affiliate_ref_v9', refCode);

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
         setProfileForm({ phone: d.data().phone || '', bank: d.data().bank || '', accountNo: d.data().accountNo || '' });
      }
    });

    const unsubFiles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'files'), (s) => setFiles(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubAnnounce = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), (s) => setAnnouncements(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubCoupons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), (s) => setCoupons(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    
    // Sinkronisasi Live Chat
    const unsubChat = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), (s) => {
       setChatMessages(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubTrans = () => {}; let unsubTickets = () => {}; let unsubWd = () => {}; let adminUnsub = () => {};

    if (isAdmin) {
      unsubTrans = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), (s) => setTransactions(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      unsubTickets = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), (s) => setTickets(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      unsubWd = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), (s) => setWithdrawals(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      adminUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userRegistry'), (s) => setAllUsers(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    } else {
      unsubTrans = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), where('userId', '==', user.uid)), (s) => setTransactions(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      unsubTickets = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), where('userId', '==', user.uid)), (s) => setTickets(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      unsubWd = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), where('userId', '==', user.uid)), (s) => setWithdrawals(s.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }

    return () => { unsubProfile(); unsubFiles(); unsubAnnounce(); unsubCoupons(); unsubChat(); unsubTrans(); unsubTickets(); unsubWd(); adminUnsub(); };
  }, [user, isAdmin]);

  // ==========================================
  // ACTIONS
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!isConfigReady) return showToast("Config Firebase belum diisi!", "error");
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const storedRef = localStorage.getItem('affiliate_ref_v9'); 
        
        const init = { 
            name: formData.name, email: formData.email, subscriptionLevel: 0, 
            joinDate: new Date().toISOString(), uid: cred.user.uid, commissionBalance: 0,
            referredBy: storedRef || null, completedFiles: []
        };
        await setDoc(doc(db, 'artifacts', appId, 'users', cred.user.uid, 'profile', 'data'), init);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', cred.user.uid), init);
        
        localStorage.removeItem('affiliate_ref_v9');
        showToast("Registrasi Berhasil!");
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        showToast("Selamat Datang di Member Area!");
      }
    } catch (err) { 
      console.error(err);
      showToast("Gagal masuk/daftar. Cek kembali kredensial Anda.", "error"); 
    }
    setAuthLoading(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), profileForm);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), profileForm);
      showToast("Profil berhasil diperbarui!");
    } catch(err) { showToast("Gagal mengupdate profil", "error"); }
  };

  const handleToggleFileProgress = async (fileId) => {
    try {
        let newCompleted = [...completedFiles];
        if (newCompleted.includes(fileId)) {
            newCompleted = newCompleted.filter(id => id !== fileId);
        } else {
            newCompleted.push(fileId);
            showToast("Materi ditandai selesai! +50 Poin Reward", "success");
        }
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { completedFiles: newCompleted });
    } catch(e) { showToast("Gagal menyimpan progress.", "error"); }
  };

  // SEND CHAT (COMMUNITY)
  const handleSendChat = async (e) => {
    e.preventDefault();
    if(!chatInput.trim()) return;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'globalChat'), {
            userId: user.uid,
            userName: userData?.name || user?.email?.split('@')[0] || 'Member',
            text: chatInput,
            isAdmin: isAdmin,
            rankName: userRank.name,
            rankBg: userRank.bg,
            rankColor: userRank.color,
            createdAt: new Date().toISOString()
        });
        setChatInput('');
    } catch(e) { showToast('Gagal mengirim pesan', 'error'); }
  };

  const handleDeleteChat = async (id) => {
    if(window.confirm('Hapus pesan ini dari komunitas?')) {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'globalChat', id));
        } catch(e) { showToast('Gagal menghapus pesan', 'error'); }
    }
  };

  // AFFILIATE
  const handleRequestWithdrawal = async () => {
    if (!userData?.bank || !userData?.accountNo) return showToast("Lengkapi Nama Bank dan No Rekening di menu Profil terlebih dahulu!", "error");
    if (affiliateBalance < 100000) return showToast("Minimal penarikan komisi adalah Rp 100.000", "error");
    if (withdrawals.some(w => w.status === 'pending')) return showToast("Anda masih memiliki penarikan yang sedang diproses.", "error");

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), {
        userId: user.uid, userName: userData?.name || user?.email || 'Member', bank: userData.bank, 
        accountNo: userData.accountNo, amount: affiliateBalance, status: 'pending', createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { commissionBalance: 0 });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', user.uid), { commissionBalance: 0 });
      showToast("Permintaan penarikan berhasil dikirim ke Admin!");
    } catch(e) { showToast("Gagal request penarikan", "error"); }
  };

  const handleAdminWithdrawalAction = async (wdId, action, userId, amount) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', wdId), { status: action, updatedAt: new Date().toISOString() });
      if (action === 'rejected') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data'), { commissionBalance: increment(amount) });
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', userId), { commissionBalance: increment(amount) });
         showToast("Pencairan ditolak. Saldo telah dikembalikan ke member.", "error");
      } else {
         showToast("Pencairan dana ditandai SUKSES DITRANSFER.");
      }
    } catch(e) { showToast("Gagal memproses", "error"); }
  }

  // COUPONS SYSTEM (ADMIN)
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if(!couponForm.code || !couponForm.discount) return;
    try {
       const codeUpper = couponForm.code.toUpperCase().replace(/\s+/g, '');
       await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', codeUpper), {
          id: codeUpper, code: codeUpper, discount: parseInt(couponForm.discount), active: true, createdAt: new Date().toISOString()
       });
       setCouponForm({code: '', discount: ''});
       showToast("Kupon Diskon berhasil dibuat!");
    } catch(err) { showToast("Gagal membuat kupon", "error"); }
  };

  const handleDeleteCoupon = async (couponId) => {
    if(!window.confirm("Yakin ingin menghapus kupon ini?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', couponId));
      showToast("Kupon dihapus!");
    } catch(err) { showToast("Gagal menghapus kupon", "error"); }
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const codeFormat = couponInput.toUpperCase().replace(/\s+/g, '');
    const found = coupons.find(c => c.code === codeFormat && c.active);
    
    if (found) {
       setAppliedCoupon(found);
       showToast(`Kupon ${found.discount}% berhasil diterapkan!`);
    } else {
       setAppliedCoupon(null);
       showToast("Kode Kupon tidak valid atau sudah kadaluarsa.", "error");
    }
  };

  // TRANSACTIONS
  const handlePurchaseRequest = async (e) => {
    e.preventDefault();
    if (!confirmForm.senderName || !confirmForm.senderBank) return showToast("Harap lengkapi form konfirmasi!", "error");
    
    try {
      const transId = `TRX-${Math.floor(Date.now() / 1000)}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', transId), {
        id: transId, userId: user.uid, userName: userData?.name || user?.email || 'Member', userEmail: user.email, 
        packageLevel: checkoutPkg.level, packageName: checkoutPkg.name, 
        price: finalPrice, 
        promoCode: appliedCoupon ? appliedCoupon.code : null,
        senderName: confirmForm.senderName, senderBank: confirmForm.senderBank, notes: confirmForm.notes, 
        status: 'pending', createdAt: new Date().toISOString()
      });
      
      const text = `Halo Admin, konfirmasi pembayaran.%0A%0A*INV: ${transId}*%0ANama: ${userData?.name || 'Member'}%0APaket: ${checkoutPkg.name}%0AHarga: Rp ${finalPrice.toLocaleString('id-ID')}%0A%0A_Bukti transfer:_`;
      window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${text}`, '_blank');
      
      setCheckoutPkg(null);
      setAppliedCoupon(null);
      setConfirmForm({ senderName: '', senderBank: '', notes: '' });
      showToast("Konfirmasi terkirim! Admin akan segera memvalidasi.");
      setActiveTab('transactions');
    } catch (err) { showToast("Gagal mengirim konfirmasi", "error"); }
  };

  const handleTransactionAction = async (trans, action) => {
    try {
      if (action === 'approve') {
          if(!window.confirm(`Yakin menerima pembayaran dari ${trans.senderName} dan UPGRADE INSTAN ke ${trans.packageName}?`)) return;
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', trans.id), { status: 'approved' });
          
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', trans.userId), { subscriptionLevel: trans.packageLevel });
          await updateDoc(doc(db, 'artifacts', appId, 'users', trans.userId, 'profile', 'data'), { subscriptionLevel: trans.packageLevel });
          
          const targetUser = allUsers.find(u => u.uid === trans.userId);
          if (targetUser && targetUser.referredBy) {
              const commAmount = trans.price * 0.20; 
              await updateDoc(doc(db, 'artifacts', appId, 'users', targetUser.referredBy, 'profile', 'data'), { commissionBalance: increment(commAmount) });
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', targetUser.referredBy), { commissionBalance: increment(commAmount) });
              showToast(`Sukses! Komisi afiliasi otomatis dikirim ke referrer.`);
          } else {
              showToast("Pembayaran Disetujui! Akses member telah dibuka.");
          }
      } else if (action === 'reject') {
          if(!window.confirm(`Tolak pembayaran dari ${trans.userName}?`)) return;
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', trans.id), { status: 'rejected' });
          showToast("Pembayaran Ditolak.", "error");
      }
    } catch (err) { showToast("Gagal memproses transaksi", "error"); }
  };

  // TICKETS
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), {
        userId: user.uid, userName: userData?.name || user?.email || 'Member', subject: ticketForm.subject, 
        message: ticketForm.message, status: 'open', adminReply: '', createdAt: new Date().toISOString()
      });
      setTicketForm({ subject: '', message: '' });
      showToast("Tiket berhasil dikirim. Tim kami akan merespon.");
    } catch (err) { showToast("Gagal mengirim tiket", "error"); }
  };

  const handleAdminReplyTicket = async (ticketId, replyText) => {
    if (!replyText) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), { status: 'answered', adminReply: replyText, updatedAt: new Date().toISOString() });
      showToast("Balasan terkirim dan tiket ditutup.");
    } catch (err) { showToast("Gagal membalas tiket", "error"); }
  };

  const handleDeleteTicket = async (ticketId) => {
    if(!window.confirm("Hapus permanen tiket ini dari sistem?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId));
      showToast("Tiket berhasil dihapus.");
    } catch (err) { showToast("Gagal menghapus tiket", "error"); }
  }

  // ADMIN SYSTEM CONFIG
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...productForm, reqLevel: parseInt(productForm.reqLevel), updatedAt: serverTimestamp() };
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'files', editingId), data);
        showToast("Produk diperbarui");
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'files'), { ...data, createdAt: serverTimestamp() });
        showToast("Produk ditambahkan");
      }
      setProductForm({ name: '', size: '', reqLevel: 1, url: '', category: 'Ebook' });
      setEditingId(null);
    } catch (err) { showToast("Gagal menyimpan", "error"); }
  };

  const updateMemberTier = async (uid, level) => {
    if(!window.confirm(`Ubah level akses member ini ke tier ${TIER_LEVELS[level].name}?`)) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid), { subscriptionLevel: level });
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { subscriptionLevel: level });
      showToast('Status member diperbarui secara realtime.');
    } catch (err) { showToast('Akses ditolak', 'error'); }
  };

  const deleteMemberData = async (uid) => {
    if(!window.confirm("YAKIN HAPUS DATA MEMBER INI? Data registry akan dihapus permanen.")) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'userRegistry', uid));
        showToast('Data Registry Member Dihapus', 'error');
    } catch (err) { showToast('Gagal menghapus', 'error'); }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    const msg = e.target.announce.value;
    if (!msg) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { message: msg, createdAt: new Date().toISOString() });
      e.target.reset();
      showToast("Pengumuman Terkirim Keseluruh Member");
    } catch (err) { console.error(err); }
  };

  const closeSidebarMobile = () => { if (window.innerWidth < 1024) setSidebarOpen(false); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  // ==========================================
  // VIEW: AUTHENTICATION
  // ==========================================
  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8 font-['Plus_Jakarta_Sans']">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100 animate-fadeIn relative">
        {!isConfigReady && <div className="absolute top-0 left-0 w-full bg-rose-500 text-white py-2 text-center text-xs font-bold z-50">API Key Firebase Belum Dikonfigurasi!</div>}
        
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-12 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-400 opacity-20 rounded-full blur-3xl"></div>
          <div className="relative z-10 mt-8">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30">
               <ShieldCheck size={32} className="text-white"/>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black font-['Outfit'] mb-6 leading-tight">Mulai Perjalanan<br/>Digital Anda.</h1>
            <p className="text-indigo-200 text-lg leading-relaxed">Platform ekosistem produk digital premium. Akses ribuan file master dan lisensi eksklusif di satu tempat.</p>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
          <div className="md:hidden text-center mb-8 mt-4">
             <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
               <ShieldCheck size={28} className="text-white"/>
             </div>
             <h1 className="text-2xl font-black font-['Outfit'] text-slate-800">Digital<span className="text-indigo-600">Pro</span></h1>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10 w-full sm:w-max mx-auto md:mx-0">
            <button onClick={()=>setAuthMode('login')} className={`flex-1 sm:px-8 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${authMode==='login'?'bg-white text-indigo-600 shadow-md':'text-slate-500 hover:text-slate-700'}`}>MASUK</button>
            <button onClick={()=>setAuthMode('register')} className={`flex-1 sm:px-8 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${authMode==='register'?'bg-white text-indigo-600 shadow-md':'text-slate-500 hover:text-slate-700'}`}>DAFTAR</button>
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 mb-3 font-['Outfit']">{authMode==='login'?'Selamat Datang!':'Buat Akun Baru'}</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">{authMode==='login'?'Silakan masuk ke dashboard member Anda.':'Lengkapi data di bawah untuk bergabung.'}</p>
          
          <form onSubmit={handleAuth} className="space-y-5">
            {authMode==='register' && (
              <div className="space-y-2">
                 <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Nama Lengkap</label>
                 <input type="text" placeholder="Cth: Budi Santoso" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold text-slate-800" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required />
              </div>
            )}
            <div className="space-y-2">
               <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Alamat Email</label>
               <input type="email" placeholder="nama@email.com" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold text-slate-800" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Password</label>
               <input type="password" placeholder="Min. 6 Karakter" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-bold text-slate-800" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} required />
            </div>
            
            <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 lg:py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all flex justify-center items-center gap-2 mt-4 hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0">
               {authLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode==='login' ? 'MASUK SEKARANG' : 'DAFTAR SEKARANG')}
               {!authLoading && <ArrowRight size={20}/>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // VIEW: MAIN DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] flex text-slate-800 relative">
      
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity" onClick={()=>setSidebarOpen(false)}></div>}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-8 border-b border-slate-100 shrink-0">
          <h1 className="text-2xl font-black tracking-tight text-indigo-600 font-['Outfit'] flex items-center gap-2">
            <ShieldCheck size={24} className="text-indigo-600"/> Pro<span className="text-slate-800">Space</span>
          </h1>
          <button onClick={()=>setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
        </div>
        
        <div className="p-6 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {isAdmin && (
            <>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 px-4 mt-2">Admin Center</p>
              <NavBtn active={activeTab==='admin_overview'} onClick={()=>{setActiveTab('admin_overview'); closeSidebarMobile();}} icon={<Activity size={20}/>} label="Overview" />
              <NavBtn active={activeTab==='admin_trans'} onClick={()=>{setActiveTab('admin_trans'); closeSidebarMobile();}} icon={<CheckCircle size={20}/>} label="Validasi Bayar" count={adminStats.pendingTrans} />
              <NavBtn active={activeTab==='admin_wd'} onClick={()=>{setActiveTab('admin_wd'); closeSidebarMobile();}} icon={<Wallet size={20}/>} label="Pencairan Dana" count={adminStats.pendingWd} />
              <NavBtn active={activeTab==='admin_coupons'} onClick={()=>{setActiveTab('admin_coupons'); closeSidebarMobile();}} icon={<Tag size={20}/>} label="Kelola Kupon" />
              <NavBtn active={activeTab==='admin_support'} onClick={()=>{setActiveTab('admin_support'); closeSidebarMobile();}} icon={<LifeBuoy size={20}/>} label="Support Helpdesk" count={adminStats.openTickets} />
              <NavBtn active={activeTab==='admin_users'} onClick={()=>{setActiveTab('admin_users'); closeSidebarMobile();}} icon={<Users size={20}/>} label="Data Member CRM" />
              <NavBtn active={activeTab==='admin_files'} onClick={()=>{setActiveTab('admin_files'); closeSidebarMobile();}} icon={<Plus size={20}/>} label="Kelola Produk" />
              <div className="my-6 border-b border-slate-100"></div>
            </>
          )}

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 mt-2">Menu Member</p>
          <NavBtn active={activeTab==='dashboard'} onClick={()=>{setActiveTab('dashboard'); closeSidebarMobile();}} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <NavBtn active={activeTab==='community'} onClick={()=>{setActiveTab('community'); closeSidebarMobile();}} icon={<MessageCircle size={20}/>} label="Komunitas VIP" />
          <NavBtn active={activeTab==='files'} onClick={()=>{setActiveTab('files'); closeSidebarMobile();}} icon={<FolderLock size={20}/>} label="Katalog Materi" count={files.filter(f=>currentTier>=f.reqLevel).length} />
          <NavBtn active={activeTab==='shop'} onClick={()=>{setActiveTab('shop'); closeSidebarMobile();}} icon={<ShoppingBag size={20}/>} label="Upgrade Paket" />
          <NavBtn active={activeTab==='transactions'} onClick={()=>{setActiveTab('transactions'); closeSidebarMobile();}} icon={<Banknote size={20}/>} label="Riwayat Order" count={[...transactions].filter(t=>t.userId === user?.uid && t.status==='pending').length} />
          <NavBtn active={activeTab==='affiliate'} onClick={()=>{setActiveTab('affiliate'); closeSidebarMobile();}} icon={<Network size={20}/>} label="Program Afiliasi" />
          <NavBtn active={activeTab==='leaderboard'} onClick={()=>{setActiveTab('leaderboard'); closeSidebarMobile();}} icon={<Trophy size={20}/>} label="Leaderboard Marketer" />
          <NavBtn active={activeTab==='support'} onClick={()=>{setActiveTab('support'); closeSidebarMobile();}} icon={<LifeBuoy size={20}/>} label="Tiket Bantuan" />
        </div>

        <div className="p-6 border-t border-slate-100 shrink-0">
          <NavBtn active={activeTab==='profile'} onClick={()=>{setActiveTab('profile'); closeSidebarMobile();}} icon={<Settings size={20}/>} label="Pengaturan Profil" />
          <button onClick={()=>signOut(auth)} className="flex items-center gap-4 px-4 py-3.5 mt-2 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all w-full group">
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform"/><span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden relative scroll-smooth custom-scrollbar">
        
        {/* HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 lg:px-12 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={()=>setSidebarOpen(true)} className="lg:hidden p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><Menu size={24}/></button>
             <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 hidden md:flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[10px] font-black uppercase tracking-widest">{isAdmin ? 'Mode Administrator' : 'Sistem Aktif'}</span>
             </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right hidden sm:block flex items-center gap-3">
              <div>
                <p className="text-sm font-black text-slate-900 leading-tight">{userData?.name || user?.email?.split('@')[0] || 'Member'}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                   {isAdmin ? <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Super Admin</span> : <span className={`text-[8px] px-2 rounded-full uppercase tracking-widest font-black ${userRank.bg} ${userRank.color} flex items-center gap-1`}>{userRank.icon} {userRank.name}</span>}
                </div>
              </div>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white rounded-2xl sm:rounded-full flex items-center justify-center font-black text-sm sm:text-base shadow-lg shadow-indigo-200 cursor-pointer hover:scale-105 transition-transform" onClick={()=>setActiveTab('profile')}>
              {userData?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 sm:p-8 lg:p-12 w-full max-w-7xl mx-auto animate-fadeIn pb-32">
          
          {/* TOAST POPUP */}
          {toast.show && (
            <div className={`fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-[100] px-6 py-4 rounded-2xl shadow-2xl font-bold text-white flex items-center gap-3 animate-slideUp border ${toast.type==='error'?'bg-rose-600 border-rose-500':'bg-slate-900 border-slate-700'}`}>
              {toast.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20} className="text-emerald-400"/>} 
              {toast.msg}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN OVERVIEW */}
          {/* ==================================================== */}
          {activeTab === 'admin_overview' && isAdmin && (
            <div className="space-y-8 animate-fadeIn">
               <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Admin Overview</h2>
                  <p className="text-slate-500 font-medium text-sm sm:text-base mt-2">Ringkasan bisnis dan aktivitas sistem hari ini.</p>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200">
                    <div className="absolute -right-6 -top-6 text-indigo-500 opacity-50"><Banknote size={100}/></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 relative z-10">Total Pendapatan</p>
                    <p className="text-3xl font-black mt-2 font-['Outfit'] relative z-10">Rp {adminStats.totalRev.toLocaleString('id-ID')}</p>
                 </div>
                 <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden cursor-pointer hover:border-indigo-300 transition-colors" onClick={()=>setActiveTab('admin_users')}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Member Aktif</p>
                    <p className="text-4xl font-black mt-2 text-slate-800 font-['Outfit']">{allUsers.length}</p>
                 </div>
                 <div className="bg-amber-50 rounded-[2rem] p-8 border border-amber-200 shadow-sm flex flex-col justify-center cursor-pointer hover:bg-amber-100 transition-colors" onClick={()=>setActiveTab('admin_trans')}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Perlu Validasi Bayar</p>
                    <div className="flex items-center gap-3 mt-2">
                       <p className="text-4xl font-black text-amber-600 font-['Outfit']">{adminStats.pendingTrans}</p>
                       {adminStats.pendingTrans > 0 && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
                    </div>
                 </div>
                 <div className="bg-rose-50 rounded-[2rem] p-8 border border-rose-200 shadow-sm flex flex-col justify-center cursor-pointer hover:bg-rose-100 transition-colors" onClick={()=>setActiveTab('admin_support')}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Tiket Bantuan (Open)</p>
                    <div className="flex items-center gap-3 mt-2">
                       <p className="text-4xl font-black text-rose-600 font-['Outfit']">{adminStats.openTickets}</p>
                       {adminStats.openTickets > 0 && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>}
                    </div>
                 </div>
               </div>

               <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-black uppercase tracking-widest text-xs text-slate-400 flex items-center gap-2"><Megaphone size={16}/> Kirim Pengumuman Global</h4>
                  <form onSubmit={handlePostAnnouncement} className="flex flex-col sm:flex-row gap-3">
                     <input name="announce" type="text" placeholder="Ketik pesan info baru..." className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" />
                     <button type="submit" className="bg-slate-900 text-white px-8 py-4 sm:py-0 rounded-2xl font-black hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 text-sm"><Plus size={18}/> BROADCAST</button>
                  </form>
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN WITHDRAWALS (PENCAIRAN DANA) */}
          {/* ==================================================== */}
          {activeTab === 'admin_wd' && isAdmin && (
            <div className="animate-fadeIn space-y-6 sm:space-y-10">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">Pencairan Dana Afiliasi</h2>
               <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left min-w-[800px]">
                       <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr><th className="px-6 sm:px-8 py-5">Afiliator</th><th className="px-6 sm:px-8 py-5">Data Rekening Tujuan</th><th className="px-6 sm:px-8 py-5">Nominal Tarik</th><th className="px-6 sm:px-8 py-5 text-center">Tindakan Admin</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {[...withdrawals].filter(w => w.status === 'pending').length === 0 ? (
                            <tr><td colSpan="4" className="px-8 py-20 text-center font-bold text-slate-400">Tidak ada request penarikan komisi saat ini.</td></tr>
                          ) : (
                            [...withdrawals].filter(w => w.status === 'pending').map(w => (
                              <tr key={w.id} className="hover:bg-slate-50 transition-all">
                                 <td className="px-6 sm:px-8 py-6">
                                    <p className="font-black text-slate-900 text-sm">{w.userName}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(w.createdAt).toLocaleString('id-ID')}</p>
                                 </td>
                                 <td className="px-6 sm:px-8 py-6">
                                    <p className="font-black text-indigo-600 text-sm">{w.bank}</p>
                                    <p className="font-mono text-slate-700 font-bold text-xs mt-0.5">{w.accountNo}</p>
                                 </td>
                                 <td className="px-6 sm:px-8 py-6 font-black text-slate-900 text-base">Rp {w.amount.toLocaleString('id-ID')}</td>
                                 <td className="px-6 sm:px-8 py-6 text-center">
                                      <div className="flex justify-center gap-2">
                                        <button onClick={()=>handleAdminWithdrawalAction(w.id, 'approved', w.userId, w.amount)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[9px] sm:text-[10px] uppercase shadow-lg shadow-emerald-200 transition-all flex items-center gap-1"><CheckCircle size={14}/> SUDAH TRANSFER</button>
                                        <button onClick={()=>handleAdminWithdrawalAction(w.id, 'rejected', w.userId, w.amount)} className="bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-[9px] sm:text-[10px] uppercase transition-all flex items-center gap-1"><XCircle size={14}/> TOLAK</button>
                                      </div>
                                 </td>
                              </tr>
                            ))
                          )}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: MEMBER DASHBOARD */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && !isAdmin && (
            <div className="space-y-6 sm:space-y-10 animate-fadeIn">
              {announcements.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-3xl flex items-start sm:items-center gap-4">
                   <div className="bg-white p-3 rounded-2xl shadow-sm shrink-0"><Megaphone className="text-amber-500" size={24}/></div>
                   <div className="flex-1">
                     <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Pengumuman Sistem</p>
                     <p className="text-amber-950 font-bold text-sm sm:text-base leading-relaxed">{announcements[announcements.length - 1].message}</p>
                   </div>
                </div>
              )}

              <div className="bg-slate-900 rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-16 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-indigo-500/20 rounded-full blur-[80px] sm:blur-[120px] -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                  <div className="space-y-4 sm:space-y-6 text-center lg:text-left w-full lg:w-2/3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm mx-auto lg:mx-0">
                       <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Dashboard {TIER_LEVELS[currentTier].name}</span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black font-['Outfit'] tracking-tight leading-[1.1]">Hai, {userData?.name?.split(' ')[0] || user?.email?.split('@')[0]}! 👋</h2>
                    <p className="text-slate-400 text-base sm:text-lg lg:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed">Selamat datang di member area. Tingkatkan terus kompetensi digital Anda dengan menyelesaikan modul dan kumpulkan poin reward.</p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                       <button onClick={()=>setActiveTab('files')} className="w-full sm:w-auto bg-white text-slate-900 px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black shadow-xl hover:scale-105 transition-all text-sm sm:text-base">MULAI BELAJAR</button>
                       {currentTier < 3 && (
                         <button onClick={()=>setActiveTab('shop')} className="w-full sm:w-auto bg-indigo-600 border border-indigo-500 text-white px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-500 transition-all text-sm sm:text-base">UPGRADE LISENSI</button>
                       )}
                    </div>
                  </div>
                  <div className="w-full lg:w-1/3 flex justify-center lg:justify-end">
                     <div className="w-48 h-48 sm:w-64 sm:h-64 bg-white/5 rounded-[2rem] sm:rounded-[3rem] border border-white/10 flex flex-col items-center justify-center gap-3 sm:gap-4 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] sm:rounded-[3rem] pointer-events-none"></div>
                        
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-2">
                           <svg className="w-full h-full" viewBox="0 0 36 36">
                              <path className="text-white/10" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-emerald-400" strokeDasharray={`${progressData}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                           </svg>
                           <div className="absolute inset-0 flex items-center justify-center flex-col">
                              <span className="text-2xl sm:text-3xl font-black text-white">{progressData}%</span>
                           </div>
                        </div>
                        
                        <div className="text-center relative z-10">
                           <p className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">Progress Modul</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                <StatCard label="Poin Reward" val={userPoints + " PTS"} icon={<Award size={28}/>} color="purple" />
                <StatCard label="Total Produk Buka" val={`${files.filter(f=>currentTier>=f.reqLevel).length} File`} icon={<Box size={28}/>} color="indigo" />
                <StatCard label="Tipe Lisensi" val={TIER_LEVELS[currentTier].name} icon={<ShieldCheck size={28}/>} color="emerald" />
                <StatCard label="Saldo Afiliasi" val={`Rp ${affiliateBalance.toLocaleString('id-ID')}`} icon={<Wallet size={28}/>} color="amber" />
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: COMMUNITY (LIVE CHAT) - NEW FEATURE! */}
          {/* ==================================================== */}
          {activeTab === 'community' && (
             <div className="animate-fadeIn h-[calc(100vh-140px)] flex flex-col">
                <div className="mb-6 shrink-0">
                  <h2 className="text-3xl sm:text-4xl font-black font-['Outfit'] tracking-tight text-slate-900">Komunitas VIP</h2>
                  <p className="text-slate-500 font-medium text-sm sm:text-base mt-2">Ruang diskusi dan tanya jawab real-time sesama member dan Admin.</p>
                </div>
                
                <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl flex flex-col overflow-hidden relative">
                   <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center"><MessageCircle size={20}/></div>
                         <div>
                            <h4 className="font-black text-slate-800 leading-tight">Live Chatroom</h4>
                            <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> {allUsers.length} Member Tergabung</p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/50 flex flex-col gap-4 custom-scrollbar">
                      {sortedChat.length === 0 ? (
                         <div className="m-auto text-center text-slate-400">
                             <MessageSquare size={48} className="mx-auto mb-4 opacity-50"/>
                             <p className="font-bold">Belum ada obrolan. Jadilah yang pertama menyapa!</p>
                         </div>
                      ) : (
                         sortedChat.map(msg => {
                            const isMe = msg.userId === user?.uid;
                            const isMsgAdmin = msg.isAdmin;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-[1.5rem] p-4 sm:p-5 relative ${isMsgAdmin ? 'bg-indigo-600 text-white rounded-tl-none shadow-md' : isMe ? 'bg-emerald-500 text-white rounded-tr-none shadow-md' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'}`}>
                                       
                                       {isAdmin && !isMe && (
                                         <button onClick={()=>handleDeleteChat(msg.id)} className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                       )}

                                       {!isMe && (
                                           <div className="flex items-center gap-2 mb-2">
                                              <span className={`text-xs font-black ${isMsgAdmin ? 'text-indigo-200' : 'text-slate-500'}`}>{msg.userName}</span>
                                              {isMsgAdmin ? (
                                                 <span className="text-[8px] bg-indigo-500 border border-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-widest text-white flex items-center gap-1"><ShieldCheck size={10}/> ADMIN</span>
                                              ) : (
                                                 msg.rankName && <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest border font-black ${msg.rankBg} ${msg.rankColor} ${msg.rankBorder}`}>{msg.rankName}</span>
                                              )}
                                           </div>
                                       )}
                                       <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                       <p className={`text-[9px] text-right mt-2 font-bold ${isMsgAdmin || isMe ? 'text-white/70' : 'text-slate-400'}`}>{new Date(msg.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            )
                         })
                      )}
                      <div ref={chatEndRef} />
                   </div>

                   <form onSubmit={handleSendChat} className="p-4 sm:p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
                       <input type="text" placeholder="Ketik pesan Anda di sini..." className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm" value={chatInput} onChange={e=>setChatInput(e.target.value)} required />
                       <button type="submit" className="bg-indigo-600 text-white px-6 sm:px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shrink-0">
                          <span className="hidden sm:inline">KIRIM</span> <Send size={18}/>
                       </button>
                   </form>
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: FILES (CATALOG) */}
          {/* ==================================================== */}
          {activeTab === 'files' && (
             <div className="animate-fadeIn space-y-6 sm:space-y-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6 sm:pb-8">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Katalog Materi</h2>
                    <p className="text-slate-500 font-medium text-sm sm:text-base mt-2">Akses, unduh, dan tandai materi yang telah selesai Anda pelajari.</p>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input type="text" placeholder="Cari materi..." value={searchFileQuery} onChange={e=>setSearchFileQuery(e.target.value)} className="w-full sm:w-72 pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" />
                  </div>
                </div>
                
                {filteredFiles.length === 0 ? (
                  <div className="py-20 sm:py-32 text-center bg-white rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-slate-200 px-4">
                     <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><Box size={40} className="text-slate-300"/></div>
                     <p className="text-slate-800 font-black text-lg sm:text-xl">Katalog Kosong</p>
                     <p className="text-slate-500 text-sm mt-2">Tidak ada file yang sesuai dengan pencarian Anda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                     {filteredFiles.map(f => (
                       <ProFileCard 
                          key={f.id} 
                          file={f} 
                          currentTier={currentTier} 
                          isCompleted={completedFiles.includes(f.id)}
                          onToggleProgress={() => handleToggleFileProgress(f.id)}
                          onReview={() => showToast("Fitur ulasan dalam pengembangan.", "success")}
                       />
                     ))}
                  </div>
                )}
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: LEADERBOARD (GAMIFICATION) */}
          {/* ==================================================== */}
          {activeTab === 'leaderboard' && (
             <div className="animate-fadeIn space-y-6 sm:space-y-10">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                   <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-100">
                      <Trophy size={40}/>
                   </div>
                   <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Top Affiliate Leaderboard</h2>
                   <p className="text-slate-500 text-sm sm:text-base">Peringkat 10 Marketer terbaik dengan penghasilan komisi terbesar sepanjang masa.</p>
                </div>

                <div className="max-w-4xl mx-auto bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-200 overflow-hidden shadow-xl">
                   <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Peringkat Global</h4>
                      <span className="text-[10px] font-bold text-slate-400">Update Realtime</span>
                   </div>
                   <div className="p-4 sm:p-8 space-y-4">
                      {leaderboardData.length === 0 ? (
                         <p className="text-center py-10 font-bold text-slate-400">Belum ada data afiliator yang mendapatkan komisi.</p>
                      ) : (
                         leaderboardData.map((lb, index) => {
                            const isTop3 = index < 3;
                            return (
                               <div key={lb.uid} className={`flex items-center p-4 sm:p-6 rounded-2xl border transition-all ${isTop3 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-md transform hover:scale-[1.02]' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ${index === 0 ? 'bg-amber-400 text-white shadow-lg shadow-amber-200' : index === 1 ? 'bg-slate-300 text-white shadow-lg' : index === 2 ? 'bg-orange-300 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                                     #{index + 1}
                                  </div>
                                  <div className="ml-4 sm:ml-6 flex-1 min-w-0">
                                     <h4 className="font-black text-slate-900 text-base sm:text-lg truncate">
                                        {isAdmin ? (lb.name || 'Member') : (lb.name ? lb.name.split(' ')[0] + ' ***' : 'Member ***')}
                                        {lb.uid === user?.uid && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full uppercase tracking-widest">Anda</span>}
                                     </h4>
                                     <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Super Affiliate</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Komisi</p>
                                     <p className={`font-black text-lg sm:text-2xl font-['Outfit'] ${isTop3 ? 'text-amber-600' : 'text-slate-800'}`}>Rp {lb.totalEarned.toLocaleString('id-ID')}</p>
                                  </div>
                               </div>
                            )
                         })
                      )}
                   </div>
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: SHOP (UPGRADE) */}
          {/* ==================================================== */}
          {activeTab === 'shop' && (
            <div className="animate-fadeIn space-y-8 sm:space-y-12">
               <div className="text-center max-w-2xl mx-auto space-y-4 px-4">
                  <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">Pricing Plan</span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-['Outfit'] tracking-tight leading-tight">Pilih Paket Terbaik Untuk Bisnis Anda</h2>
                  <p className="text-slate-500 text-base sm:text-lg">Sekali bayar, nikmati akses seumur hidup tanpa biaya langganan bulanan.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {[1, 2, 3].map(lv => {
                    const isActive = currentTier === lv;
                    const isPassed = currentTier > lv;
                    const isPending = [...transactions].some(t => t.userId === user?.uid && t.packageLevel === lv && t.status === 'pending');
                    const isDisabled = isActive || isPassed || isPending;

                    return (
                      <div key={lv} className={`bg-white rounded-[2rem] sm:rounded-[3rem] border-2 p-8 sm:p-10 flex flex-col h-full relative transition-all duration-300 ${isActive ? 'border-indigo-600 shadow-2xl shadow-indigo-100 lg:-translate-y-4' : isPending ? 'border-amber-400 shadow-lg shadow-amber-50' : 'border-slate-100 hover:border-slate-300 hover:shadow-xl'}`}>
                         {isActive && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 w-max">Paket Aktif Anda</div>}
                         {isPending && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-200 w-max flex items-center gap-1"><Clock size={14}/> Menunggu Validasi</div>}
                         
                         <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 font-['Outfit']">{TIER_LEVELS[lv].name}</h3>
                         <p className="text-slate-500 text-sm font-medium mb-6">Akses ke semua produk level {TIER_LEVELS[lv].name}.</p>
                         <div className="flex items-end gap-1 mb-8">
                            <span className="text-3xl sm:text-4xl font-black text-indigo-600 font-['Outfit'] tracking-tighter">Rp {TIER_LEVELS[lv].price.toLocaleString('id-ID')}</span>
                            <span className="text-slate-400 text-sm sm:text-base font-bold mb-1">/Selamanya</span>
                         </div>
                         <ul className="space-y-4 mb-10 flex-1">
                            <li className="flex items-start gap-3"><CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20}/><span className="text-sm font-bold text-slate-700">Akses {TIER_LEVELS[lv].name} Files</span></li>
                            <li className="flex items-start gap-3"><CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20}/><span className="text-sm font-bold text-slate-700">Update Produk Selamanya</span></li>
                            <li className="flex items-start gap-3"><CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20}/><span className="text-sm font-bold text-slate-700">Lisensi Penggunaan Komersial</span></li>
                            {lv >= 2 && <li className="flex items-start gap-3"><CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20}/><span className="text-sm font-bold text-slate-700">Prioritas Customer Support</span></li>}
                            {lv === 3 && <li className="flex items-start gap-3"><CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20}/><span className="text-sm font-bold text-slate-700">Lisensi PLR (Jual Ulang)</span></li>}
                         </ul>
                         <button onClick={() => { setCheckoutPkg({...TIER_LEVELS[lv], level: lv}); setAppliedCoupon(null); setCouponInput(''); }} disabled={isDisabled} className={`w-full py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black tracking-widest text-xs sm:text-sm transition-all ${isDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl'}`}>
                           {isActive ? 'STATUS AKTIF' : isPassed ? 'SUDAH TERLEWATI' : isPending ? 'PROSES VALIDASI' : 'PILIH PAKET'}
                         </button>
                      </div>
                    )
                  })}
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: TRANSACTIONS (USER VIEW) */}
          {/* ==================================================== */}
          {activeTab === 'transactions' && !isAdmin && (
            <div className="animate-fadeIn space-y-6 sm:space-y-10">
               <h2 className="text-3xl sm:text-4xl font-black font-['Outfit'] tracking-tight text-slate-900">Riwayat Pembelian</h2>
               {transactions.length === 0 ? (
                 <div className="py-20 sm:py-32 text-center bg-white rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-slate-200 px-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><Banknote size={40} className="text-slate-300"/></div>
                    <p className="text-slate-800 font-black text-lg sm:text-xl">Belum ada Transaksi</p>
                    <p className="text-slate-500 text-sm mt-2">Anda belum melakukan pembelian paket apapun.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {[...transactions].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(t => (
                      <div key={t.id} className={`bg-white p-6 sm:p-8 rounded-[2rem] border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm transition-all ${t.status === 'pending' ? 'border-amber-200' : 'border-slate-100 hover:shadow-lg'}`}>
                         <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto">
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl flex items-center justify-center ${t.status === 'pending' ? 'bg-amber-50 text-amber-500' : t.status === 'rejected' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                               {t.status === 'pending' ? <Clock size={28}/> : t.status === 'rejected' ? <XCircle size={28}/> : <CheckCircle size={28}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] truncate">{t.id}</p>
                               <h4 className="text-lg sm:text-xl font-black text-slate-800 leading-tight mt-1 truncate">Paket {t.packageName}</h4>
                               <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">Rp {t.price.toLocaleString('id-ID')} • {new Date(t.createdAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                         </div>
                         <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 md:gap-3 border-t md:border-none border-slate-100 pt-4 md:pt-0">
                            <div className="text-left md:text-right">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">Status</p>
                               <p className={`font-black uppercase text-xs sm:text-sm ${t.status === 'pending' ? 'text-amber-500' : t.status === 'rejected' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                 {t.status === 'pending' ? 'Menunggu Validasi' : t.status === 'rejected' ? 'Ditolak/Gagal' : 'Pembayaran Sukses'}
                               </p>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN - TRANSACTIONS (VALIDASI) */}
          {/* ==================================================== */}
          {activeTab === 'admin_trans' && isAdmin && (
            <div className="animate-fadeIn space-y-6 sm:space-y-10">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">Validasi Konfirmasi Pembayaran</h2>
               <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                       <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 sm:px-8 py-5">Invoice & User</th>
                            <th className="px-6 sm:px-8 py-5">Data Konfirmasi User</th>
                            <th className="px-6 sm:px-8 py-5">Tagihan</th>
                            <th className="px-6 sm:px-8 py-5 text-center">Tindakan Admin</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {[...transactions].filter(t => t.status==='pending').length === 0 ? (
                            <tr><td colSpan="4" className="px-8 py-20 text-center font-bold text-slate-400">✅ Tidak ada pembayaran tertunda yang perlu divalidasi.</td></tr>
                          ) : (
                            [...transactions].filter(t => t.status==='pending')
                            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .map(t => (
                              <tr key={t.id} className="hover:bg-slate-50 transition-all">
                                 <td className="px-6 sm:px-8 py-6">
                                    <p className="font-black text-slate-900 text-sm">{t.userName}</p>
                                    <p className="text-[10px] text-slate-500 font-bold font-mono mt-1">{t.id}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(t.createdAt).toLocaleString('id-ID')}</p>
                                 </td>
                                 <td className="px-6 sm:px-8 py-6">
                                    <div className="bg-slate-100 p-3 rounded-xl inline-block">
                                       <p className="text-xs font-bold text-slate-800"><span className="text-slate-400">Pengirim:</span> {t.senderName || '-'}</p>
                                       <p className="text-xs font-bold text-slate-800 mt-1"><span className="text-slate-400">Bank:</span> {t.senderBank || '-'}</p>
                                       {t.notes && <p className="text-[10px] italic text-slate-500 mt-1">"{t.notes}"</p>}
                                    </div>
                                 </td>
                                 <td className="px-6 sm:px-8 py-6 font-black text-indigo-600 text-sm sm:text-base">
                                    Rp {t.price.toLocaleString('id-ID')}
                                    <span className="block text-[10px] text-slate-400 mt-1 font-sans">{t.packageName} {t.promoCode && <span className="text-emerald-500 font-bold">({t.promoCode})</span>}</span>
                                 </td>
                                 <td className="px-6 sm:px-8 py-6 text-center">
                                      <div className="flex justify-center gap-2">
                                        <button onClick={()=>handleTransactionAction(t, 'approve')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[9px] sm:text-[10px] uppercase shadow-lg shadow-emerald-200 hover:-translate-y-1 transition-all flex items-center gap-1"><CheckCircle size={14}/> TERIMA & UPGRADE</button>
                                        <button onClick={()=>handleTransactionAction(t, 'reject')} className="bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-[9px] sm:text-[10px] uppercase transition-all flex items-center gap-1" title="Tolak jika bukti palsu"><XCircle size={14}/> TOLAK</button>
                                      </div>
                                 </td>
                              </tr>
                            ))
                          )}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: AFFILIATE (USER VIEW) */}
          {/* ==================================================== */}
          {activeTab === 'affiliate' && !isAdmin && (
             <div className="animate-fadeIn space-y-8 sm:space-y-10">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Program Afiliasi</h2>
                  <p className="text-slate-500 font-medium text-sm sm:text-base mt-2">Sebarkan link Anda. Anda otomatis mendapat komisi 20% ketika pesanan klien disetujui Admin.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-indigo-600 rounded-[2rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-xl shadow-indigo-200 flex flex-col justify-center">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 relative z-10">Saldo Komisi Tersedia</p>
                      <p className="text-4xl sm:text-5xl font-black mt-2 font-['Outfit'] relative z-10">Rp {affiliateBalance.toLocaleString('id-ID')}</p>
                      <button onClick={handleRequestWithdrawal} className="mt-6 bg-white text-indigo-600 px-6 py-4 rounded-xl font-black text-sm hover:scale-105 transition-transform w-max shadow-lg">TARIK SALDO KE REKENING</button>
                   </div>
                   <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Link Referral Anda</p>
                      <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-2 items-center">
                         <input type="text" readOnly value={`https://domainanda.com/?ref=${user?.uid}`} className="bg-transparent flex-1 outline-none text-sm font-bold text-slate-600 px-3 truncate" />
                         <button onClick={()=>copyToClipboard(`https://domainanda.com/?ref=${user?.uid}`)} className="bg-indigo-100 text-indigo-600 p-3 rounded-lg hover:bg-indigo-200 transition-colors"><Copy size={16}/></button>
                      </div>
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                         <p className="text-xs font-bold text-amber-800 leading-relaxed">Penting: Lengkapi profil Anda (Nomor WA dan Data Rekening Bank) sebelum melakukan penarikan komisi. Penarikan diproses maks 2x24 jam.</p>
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                   <div className="p-6 border-b border-slate-100"><h4 className="font-black text-slate-800">Riwayat Penarikan Saldo</h4></div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm min-w-[500px]">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           <tr><th className="px-6 py-4">Waktu Request</th><th className="px-6 py-4">Nominal</th><th className="px-6 py-4">Status Transaksi</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                           {[...withdrawals].length === 0 ? (
                              <tr><td colSpan="3" className="px-6 py-10 text-center text-slate-400 font-normal">Belum ada riwayat penarikan dana.</td></tr>
                           ) : (
                              [...withdrawals].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)).map(w => (
                                <tr key={w.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4">{new Date(w.createdAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                                  <td className="px-6 py-4 text-indigo-600">Rp {w.amount.toLocaleString('id-ID')}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest ${w.status==='pending' ? 'bg-amber-100 text-amber-600' : w.status==='rejected' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                      {w.status === 'pending' ? 'Menunggu Transfer' : w.status === 'rejected' ? 'Ditolak' : 'Selesai'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                   </div>
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: SUPPORT HELPDESK (USER VIEW) */}
          {/* ==================================================== */}
          {activeTab === 'support' && !isAdmin && (
            <div className="animate-fadeIn space-y-8 sm:space-y-10">
               <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Pusat Bantuan</h2>
                  <p className="text-slate-500 font-medium text-sm sm:text-base mt-2">Kirimkan pertanyaan atau kendala Anda di sini. Tim teknis kami akan merespon tiket Anda.</p>
               </div>
               
               <form onSubmit={handleCreateTicket} className="bg-white p-6 sm:p-10 rounded-[2rem] border border-slate-200 shadow-xl space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                  <h3 className="font-black text-xl text-slate-800">Buat Tiket Baru</h3>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subjek / Topik</label>
                     <input type="text" placeholder="Misal: Link download error" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" value={ticketForm.subject} onChange={e=>setTicketForm({...ticketForm, subject: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detail Pesan</label>
                     <textarea placeholder="Jelaskan kendala Anda secara detail..." rows="4" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm resize-none" value={ticketForm.message} onChange={e=>setTicketForm({...ticketForm, message: e.target.value})} required></textarea>
                  </div>
                  <button type="submit" className="bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm"><Send size={18}/> KIRIM TIKET</button>
               </form>

               <div className="space-y-6">
                  <h3 className="font-black text-slate-800 text-2xl font-['Outfit']">Status Tiket Anda</h3>
                  {[...tickets].length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-[2rem] border border-slate-200"><p className="text-slate-400 font-bold">Belum ada riwayat tiket bantuan.</p></div>
                  ) : (
                    [...tickets].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(ticket => (
                      <div key={ticket.id} className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-4 mb-4 gap-3">
                            <div>
                              <h4 className="font-black text-lg text-slate-800 leading-tight">{ticket.subject}</h4>
                              <p className="text-xs text-slate-400 mt-1 font-medium">{new Date(ticket.createdAt).toLocaleString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest w-max ${ticket.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {ticket.status === 'open' ? 'MENUNGGU BALASAN' : 'TELAH DIJAWAB'}
                            </span>
                         </div>
                         <p className="text-sm text-slate-600 leading-relaxed p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4 relative">
                            <span className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black text-slate-400">Pesan Anda:</span>
                            {ticket.message}
                         </p>
                         
                         {ticket.adminReply && (
                           <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl relative mt-6">
                              <div className="absolute -top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center gap-1 shadow-md"><ShieldCheck size={12}/> CS SUPPORT</div>
                              <p className="text-sm font-bold text-indigo-900 leading-relaxed pt-2">{ticket.adminReply}</p>
                           </div>
                         )}
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN - MANAGE SUPPORT TICKETS */}
          {/* ==================================================== */}
          {activeTab === 'admin_support' && isAdmin && (
             <div className="animate-fadeIn space-y-6 sm:space-y-10">
                <div>
                   <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">Support Helpdesk Admin</h2>
                   <p className="text-slate-500 font-medium text-sm sm:text-base mt-2">Jawab keluhan dan pertanyaan member di sini.</p>
                </div>
                
                <div className="space-y-6">
                   {[...tickets].length === 0 ? (
                     <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <LifeBuoy size={48} className="text-slate-200 mx-auto mb-4"/>
                        <p className="text-slate-400 font-bold">Hebat! Tidak ada tiket bantuan yang terbuka.</p>
                     </div>
                   ) : (
                     [...tickets].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(t => (
                        <div key={t.id} className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                           {t.status === 'open' && <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>}
                           
                           {/* Tombol Hapus Tiket untuk Admin */}
                           <button onClick={()=>handleDeleteTicket(t.id)} className="absolute top-6 right-6 p-2 text-rose-300 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100" title="Hapus Tiket"><Trash2 size={18}/></button>

                           <div className="flex justify-between items-start mb-4 pr-10">
                              <div>
                                 <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-2"><UserCircle size={14}/> {t.userName} <span className="text-slate-400 font-normal">({t.userId})</span></p>
                                 <h4 className="font-black text-xl text-slate-900">{t.subject}</h4>
                              </div>
                              <span className="text-xs font-bold text-slate-400 text-right">{new Date(t.createdAt).toLocaleDateString('id-ID')}</span>
                           </div>
                           <p className="text-sm text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-100">{t.message}</p>
                           
                           {t.status === 'open' ? (
                             <form onSubmit={(e) => {
                                e.preventDefault();
                                handleAdminReplyTicket(t.id, e.target.reply.value);
                             }} className="mt-6 flex flex-col sm:flex-row gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                <input name="reply" type="text" placeholder="Tulis solusi untuk member di sini..." className="flex-1 px-4 py-3 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm bg-white" required />
                                <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] sm:text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md"><Send size={16}/> BALAS TIKET</button>
                             </form>
                           ) : (
                             <div className="mt-4 bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1"><CheckCircle size={12} className="inline"/> ANDA TELAH MEMBALAS:</p>
                               <p className="text-sm font-bold text-emerald-900">{t.adminReply}</p>
                             </div>
                           )}
                        </div>
                     ))
                   )}
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN - MANAGE USERS (CRM SYSTEM) */}
          {/* ==================================================== */}
          {activeTab === 'admin_users' && isAdmin && (
            <div className="animate-fadeIn space-y-6 sm:space-y-10">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">Database Member CRM</h2>
                    <p className="text-slate-500 text-sm mt-1">Pantau dan kelola data seluruh pengguna sistem Anda.</p>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input type="text" placeholder="Cari nama / email..." value={searchUserQuery} onChange={e=>setSearchUserQuery(e.target.value)} className="w-full sm:w-80 pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" />
                  </div>
               </div>
               
               <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl relative">
                  <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center text-xs font-bold text-slate-500">
                     <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Live Sync Active</span>
                     <span>Total Record: {filteredUsers.length}</span>
                  </div>

                  <div className="overflow-x-auto w-full custom-scrollbar max-h-[600px]">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                        <tr>
                          <th className="px-6 sm:px-8 py-5">Identitas Member</th>
                          <th className="px-6 sm:px-8 py-5">Tingkat Langganan</th>
                          <th className="px-6 sm:px-8 py-5 text-center">Ubah Akses Manual</th>
                          <th className="px-6 sm:px-8 py-5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredUsers.length === 0 ? (
                           <tr><td colSpan="4" className="px-8 py-16 text-center text-slate-400 font-bold italic">Member tidak ditemukan atau database kosong.</td></tr>
                        ) : (
                          filteredUsers.map(m => {
                            const isNew = m.joinDate ? (new Date() - new Date(m.joinDate)) < 86400000 : false;
                            return (
                              <tr key={m.uid} className="hover:bg-slate-50 transition-all">
                                <td className="px-6 sm:px-8 py-4 sm:py-6">
                                   <p className="font-black text-slate-900 text-sm flex items-center">
                                      {m.name || 'User Baru'}
                                      {isNew && <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[8px] uppercase tracking-widest font-black">Baru</span>}
                                   </p>
                                   <p className="text-[11px] text-slate-500 font-medium mt-0.5">{m.email}</p>
                                   <p className="text-[9px] text-slate-400 font-mono mt-1">Terdaftar: {m.joinDate ? new Date(m.joinDate).toLocaleString('id-ID') : '-'}</p>
                                </td>
                                <td className="px-6 sm:px-8 py-4 sm:py-6">
                                   <span className={`px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${m.subscriptionLevel === 0 ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600'}`}>{TIER_LEVELS[m.subscriptionLevel]?.name || 'Free'}</span>
                                </td>
                                <td className="px-6 sm:px-8 py-4 sm:py-6 text-center">
                                 <div className="flex justify-center gap-1 sm:gap-2 flex-wrap">
                                   {[0, 1, 2, 3].map(lv => (
                                     <button key={lv} onClick={()=>updateMemberTier(m.uid, lv)} className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black border transition-all ${m.subscriptionLevel === lv ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-600'}`}>
                                       {m.subscriptionLevel === lv ? 'AKTIF' : `SET ${TIER_LEVELS[lv].name.toUpperCase()}`}
                                     </button>
                                   ))}
                                 </div>
                              </td>
                              <td className="px-6 sm:px-8 py-4 sm:py-6 text-center">
                                   <div className="flex justify-center gap-2">
                                     <button onClick={()=>setSelectedUserDetail(m)} className="p-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-colors inline-flex" title="Lihat Detail CRM"><Eye size={16}/></button>
                                     <button onClick={()=>deleteMemberData(m.uid)} className="p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-colors inline-flex" title="Hapus Data"><Trash2 size={16}/></button>
                                   </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN - MANAGE FILES */}
          {/* ==================================================== */}
          {activeTab === 'admin_files' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 animate-fadeIn">
               <div className="lg:col-span-1">
                  <form onSubmit={handleProductSubmit} className="bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-6 lg:sticky lg:top-28">
                     <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">{editingId ? 'Edit Data Produk' : 'Post Produk Baru'}</h3>
                     <div className="space-y-5">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Produk</label>
                           <input type="text" value={productForm.name} onChange={e=>setProductForm({...productForm, name:e.target.value})} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-sm text-slate-800" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                              <select value={productForm.category} onChange={e=>setProductForm({...productForm, category:e.target.value})} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none"><option>Ebook</option><option>Video</option><option>Software</option></select>
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ukuran</label>
                              <input type="text" placeholder="Cth: 15 MB" value={productForm.size} onChange={e=>setProductForm({...productForm, size:e.target.value})} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-sm text-slate-800" required />
                           </div>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Akses Minimal (Tier)</label>
                           <select value={productForm.reqLevel} onChange={e=>setProductForm({...productForm, reqLevel:e.target.value})} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none">{[1,2,3].map(lv => <option key={lv} value={lv}>{TIER_LEVELS[lv].name}</option>)}</select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL / Link Download Asli</label>
                           <input type="url" placeholder="https://..." value={productForm.url} onChange={e=>setProductForm({...productForm, url:e.target.value})} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-sm text-slate-800" required />
                        </div>
                     </div>
                     <div className="flex gap-3 pt-2">
                       <button type="submit" className="flex-1 bg-slate-900 text-white font-black py-4 sm:py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[10px] sm:text-xs hover:bg-indigo-600">{editingId ? 'SIMPAN EDIT' : 'PUBLISH KE KATALOG'}</button>
                       {editingId && <button type="button" onClick={()=>{setEditingId(null); setProductForm({name:'', size:'', reqLevel:1, url:'', category:'Ebook'})}} className="p-4 sm:p-5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100"><X size={20}/></button>}
                     </div>
                  </form>
               </div>
               {/* List Section */}
               <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                  {files.length === 0 && <p className="text-center py-10 text-slate-400 font-bold">Katalog masih kosong.</p>}
                  {files.map(f => (
                    <div key={f.id} className="bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all group">
                       <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 text-indigo-500 rounded-2xl flex items-center justify-center font-black group-hover:scale-105 group-hover:bg-indigo-50 transition-all shrink-0">
                             {f.category === 'Ebook' ? <FileText size={24}/> : f.category === 'Video' ? <Video size={24}/> : <Box size={24}/>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-900 text-base sm:text-lg truncate">{f.name}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex gap-2 flex-wrap">
                               <span>{f.size}</span><span>•</span><span>{f.category}</span><span>•</span><span className="text-indigo-500">{TIER_LEVELS[f.reqLevel]?.name}</span>
                            </p>
                          </div>
                       </div>
                       <div className="flex gap-2 w-full sm:w-auto justify-end border-t sm:border-none border-slate-100 pt-4 sm:pt-0">
                          <button onClick={()=>{setEditingId(f.id); setProductForm({name:f.name, size:f.size, reqLevel:f.reqLevel, url:f.url, category:f.category}); window.scrollTo({top:0, behavior:'smooth'})}} className="p-3 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-all flex-1 sm:flex-none flex justify-center"><Edit3 size={18}/></button>
                          <button onClick={async ()=>{if(window.confirm('Yakin menghapus file ini dari katalog?')) await deleteDoc(doc(db,'artifacts',appId,'public','data','files',f.id));}} className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-xl transition-all flex-1 sm:flex-none flex justify-center"><Trash2 size={18}/></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN COUPONS (KUPON DISKON) */}
          {/* ==================================================== */}
          {activeTab === 'admin_coupons' && isAdmin && (
             <div className="animate-fadeIn space-y-6 sm:space-y-10">
                <div className="flex justify-between items-end">
                   <div>
                      <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">Kelola Kupon Diskon</h2>
                      <p className="text-slate-500 font-medium text-sm mt-2">Buat kode promo untuk memberikan diskon khusus saat checkout.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-1">
                      <form onSubmit={handleCreateCoupon} className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-5 lg:sticky lg:top-28">
                         <h3 className="font-black text-lg text-slate-800">Buat Kupon Baru</h3>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Promo</label>
                            <input type="text" placeholder="Misal: DISKON50" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm uppercase" value={couponForm.code} onChange={e=>setCouponForm({...couponForm, code: e.target.value})} required />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Persentase Diskon (%)</label>
                            <input type="number" min="1" max="100" placeholder="Misal: 50" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" value={couponForm.discount} onChange={e=>setCouponForm({...couponForm, discount: e.target.value})} required />
                         </div>
                         <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-sm"><Plus size={18}/> TAMBAH KUPON</button>
                      </form>
                   </div>
                   
                   <div className="lg:col-span-2">
                      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               <tr><th className="px-6 py-5">Kode Kupon</th><th className="px-6 py-5">Diskon</th><th className="px-6 py-5 text-center">Tindakan</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {coupons.length === 0 ? (
                                 <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400 font-bold">Belum ada kupon diskon yang dibuat.</td></tr>
                               ) : (
                                 coupons.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(c => (
                                   <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4">
                                         <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">{c.code}</span>
                                      </td>
                                      <td className="px-6 py-4 font-black text-slate-800 text-lg">{c.discount}% OFF</td>
                                      <td className="px-6 py-4 text-center">
                                         <button onClick={()=>handleDeleteCoupon(c.id)} className="p-2.5 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-colors inline-flex"><Trash2 size={16}/></button>
                                      </td>
                                   </tr>
                                 ))
                               )}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* ==================================================== */}
          {/* TAB: PROFILE (UPDATEABLE) */}
          {/* ==================================================== */}
          {activeTab === 'profile' && (
            <div className="animate-fadeIn max-w-2xl mx-auto md:mx-0">
               <h2 className="text-3xl font-black text-slate-900 font-['Outfit'] mb-6 sm:mb-8 tracking-tight">Pengaturan Profil</h2>
               <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-200 p-8 sm:p-14 shadow-2xl space-y-8 sm:space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-500 to-sky-400"></div>
                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 border-b border-slate-100 pb-8 sm:pb-10">
                    <div className="h-24 w-24 sm:h-28 sm:w-28 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-2xl shadow-indigo-200">{userData?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}</div>
                    <div className="text-center sm:text-left">
                       <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mb-2">{userData?.name || 'Member'}</h3>
                       <p className="text-slate-500 font-bold text-sm sm:text-lg">{user?.email}</p>
                       <p className="text-[10px] text-slate-400 font-mono mt-1">UID: {user?.uid}</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor WhatsApp</label>
                           <input type="text" placeholder="Cth: 08123456789" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm transition-all" value={profileForm.phone} onChange={e=>setProfileForm({...profileForm, phone: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terdaftar Pada</label>
                           <input type="text" disabled className="w-full px-5 py-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 font-bold text-sm cursor-not-allowed" value={userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'} />
                        </div>
                     </div>
                     
                     <div className="pt-4 border-t border-slate-100">
                        <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Banknote size={18} className="text-indigo-500"/> Rekening Pencairan Komisi Afiliasi</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Bank</label>
                              <input type="text" placeholder="BCA / Mandiri / BNI" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm transition-all" value={profileForm.bank} onChange={e=>setProfileForm({...profileForm, bank: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No Rekening</label>
                              <input type="text" placeholder="Nomor rekening Anda" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm transition-all" value={profileForm.accountNo} onChange={e=>setProfileForm({...profileForm, accountNo: e.target.value})} />
                           </div>
                        </div>
                     </div>
                     
                     <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 mt-4 text-sm"><Save size={18}/> SIMPAN PERUBAHAN</button>
                  </form>
               </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================== */}
      {/* MODAL CHECKOUT & KONFIRMASI INTERNAL */}
      {/* ========================================== */}
      {checkoutPkg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/80 animate-fadeIn overflow-y-auto">
           <div className="max-w-2xl w-full bg-white rounded-[2rem] sm:rounded-[3rem] shadow-3xl my-auto animate-slideUp border border-white/20">
              <div className="p-6 sm:p-12 space-y-6 sm:space-y-8">
                 <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">Checkout Paket</h3>
                      <p className="text-slate-500 font-medium text-xs sm:text-sm">Langkah 1: Transfer ke rekening. Langkah 2: Isi form konfirmasi.</p>
                    </div>
                    <button onClick={()=>{setCheckoutPkg(null); setAppliedCoupon(null); setCouponInput('');}} className="p-2 sm:p-3 bg-slate-100 rounded-xl sm:rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all shrink-0"><X size={20}/></button>
                 </div>

                 {/* Rekening Tujuan */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {BANK_ACCOUNTS.map((b, i) => (
                      <div key={i} className="p-5 sm:p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col items-center text-center">
                         <p className="text-[10px] font-black uppercase text-indigo-500 tracking-[3px] mb-1">Bank {b.bank}</p>
                         <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tighter">{b.number}</h4>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{b.owner}</p>
                      </div>
                    ))}
                 </div>

                 {/* Total Tagihan */}
                 <div className="bg-slate-900 rounded-[1.5rem] p-6 text-white relative overflow-hidden shadow-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-30 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                       <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Total Bayar Lunas</p>
                       <div className="flex items-baseline gap-2">
                          {appliedCoupon && <span className="text-lg text-slate-400 line-through decoration-rose-500">Rp {checkoutPkg.price.toLocaleString('id-ID')}</span>}
                          <p className="text-2xl sm:text-4xl font-black font-['Outfit'] tracking-tighter">Rp {finalPrice.toLocaleString('id-ID')}</p>
                       </div>
                    </div>
                    <div className="text-left sm:text-right relative z-10">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upgrade</p>
                       <p className="text-base sm:text-xl font-black text-amber-400">{checkoutPkg.name}</p>
                    </div>
                 </div>

                 {/* Form Konfirmasi Internal & Kupon */}
                 <form onSubmit={handlePurchaseRequest} className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200 space-y-4">
                    
                    {/* Input Kupon */}
                    <div className="flex gap-2 mb-6 border-b border-slate-200 pb-6">
                       <input type="text" placeholder="Punya Kode Promo?" value={couponInput} onChange={e=>setCouponInput(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm uppercase" />
                       <button type="button" onClick={handleApplyCoupon} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-colors">Terapkan</button>
                    </div>

                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-2 flex items-center gap-2"><Receipt size={16} className="text-indigo-600"/> Form Konfirmasi Transfer</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <input type="text" placeholder="Nama Rekening Pengirim" value={confirmForm.senderName} onChange={e=>setConfirmForm({...confirmForm, senderName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" required />
                       <input type="text" placeholder="Bank Asal (Misal: BCA)" value={confirmForm.senderBank} onChange={e=>setConfirmForm({...confirmForm, senderBank: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" required />
                    </div>
                    <input type="text" placeholder="Catatan / Link Bukti TF (Opsional)" value={confirmForm.notes} onChange={e=>setConfirmForm({...confirmForm, notes: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm" />
                    
                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-sm mt-2">
                       <MessageSquare size={18}/> KLIK UNTUK KONFIRMASI PEMBAYARAN
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">Admin akan memvalidasi pembayaran Anda melalui sistem dalam waktu 1x24 jam.</p>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL CRM DETAIL MEMBER (HANYA ADMIN) */}
      {/* ========================================== */}
      {selectedUserDetail && isAdmin && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/80 animate-fadeIn">
            <div className="max-w-2xl w-full bg-white rounded-[2rem] sm:rounded-[3rem] shadow-3xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
               {/* Header Modal */}
               <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200">
                        {selectedUserDetail.name?.charAt(0).toUpperCase() || 'U'}
                     </div>
                     <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight leading-none mb-1">{selectedUserDetail.name || 'Member'}</h3>
                        <p className="text-sm font-bold text-slate-500">{selectedUserDetail.email}</p>
                     </div>
                  </div>
                  <button onClick={()=>setSelectedUserDetail(null)} className="p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-200 shadow-sm"><X size={20}/></button>
               </div>
               
               {/* Body Modal (Scrollable) */}
               <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Status Lisensi</p>
                        <p className="font-black text-indigo-600 uppercase">{TIER_LEVELS[selectedUserDetail.subscriptionLevel]?.name || 'FREE'}</p>
                     </div>
                     <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Pendapatan Afiliasi</p>
                        <p className="font-black text-emerald-600">Rp {leaderboardData.find(u => u.uid === selectedUserDetail.uid)?.totalEarned.toLocaleString('id-ID') || '0'}</p>
                     </div>
                  </div>

                  <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Detail Kontak & Pembayaran</p>
                     <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 text-sm">
                        <div className="flex justify-between"><span className="font-bold text-slate-500">No. WhatsApp:</span> <span className="font-black text-slate-800">{selectedUserDetail.phone || 'Belum diisi'}</span></div>
                        <div className="flex justify-between"><span className="font-bold text-slate-500">Nama Bank:</span> <span className="font-black text-slate-800">{selectedUserDetail.bank || 'Belum diisi'}</span></div>
                        <div className="flex justify-between"><span className="font-bold text-slate-500">No. Rekening:</span> <span className="font-black text-slate-800">{selectedUserDetail.accountNo || 'Belum diisi'}</span></div>
                        <div className="flex justify-between pt-3 border-t border-slate-200"><span className="font-bold text-slate-500">UID System:</span> <span className="font-mono text-[10px] text-slate-400">{selectedUserDetail.uid}</span></div>
                        <div className="flex justify-between"><span className="font-bold text-slate-500">Direferensikan Oleh:</span> <span className="font-mono text-[10px] text-indigo-400">{selectedUserDetail.referredBy || 'Organik (Tidak ada)'}</span></div>
                     </div>
                  </div>

                  <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Riwayat Transaksi User Ini</p>
                     <div className="space-y-3">
                        {transactions.filter(t => t.userId === selectedUserDetail.uid).length === 0 ? (
                           <div className="p-4 bg-white border border-slate-200 rounded-xl text-center text-sm font-bold text-slate-400">Belum ada transaksi.</div>
                        ) : (
                           transactions.filter(t => t.userId === selectedUserDetail.uid).map(t => (
                              <div key={t.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                 <div>
                                    <p className="font-black text-slate-800 text-sm">Paket {t.packageName}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(t.createdAt).toLocaleDateString('id-ID')}</p>
                                 </div>
                                 <span className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-black ${t.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : t.status === 'rejected' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {t.status}
                                 </span>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Global CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}} />
    </div>
  );
}

// ==========================================
// MODULAR UI COMPONENTS
// ==========================================
function NavBtn({ active, onClick, icon, label, count }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-5 py-4 w-full rounded-2xl font-black transition-all group ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.03] active:scale-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
      <div className="flex items-center gap-4">
        <div className={`transition-transform ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-indigo-600'}`}>{icon}</div>
        <span className="text-sm tracking-tight">{label}</span>
      </div>
      {count !== undefined && count > 0 && !active && <span className="bg-rose-500 text-white shadow-lg shadow-rose-200 text-[10px] font-black px-2.5 py-1 rounded-full">{count}</span>}
    </button>
  );
}

function StatCard({ label, val, icon, color }) {
  const colors = { 
    emerald: 'bg-emerald-50 text-emerald-600', 
    indigo: 'bg-indigo-50 text-indigo-600', 
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 sm:gap-6 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:rotate-6 group-hover:scale-110 ${colors[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 sm:mb-2">{label}</p>
        <p className="text-xl sm:text-2xl font-black text-slate-800 font-['Outfit'] tracking-tight truncate">{val}</p>
      </div>
    </div>
  );
}

function ProFileCard({ file, currentTier, isCompleted, onToggleProgress, onReview }) {
  const isAccessible = currentTier >= (file.reqLevel || 0);
  return (
    <div className={`bg-white rounded-[2rem] sm:rounded-[2.5rem] border-2 ${isAccessible ? (isCompleted ? 'border-emerald-300 shadow-lg' : 'border-transparent hover:border-indigo-300 shadow-lg hover:shadow-2xl') : 'border-slate-100 opacity-75 bg-slate-50/50'} p-6 sm:p-8 transition-all duration-500 flex flex-col h-full group relative overflow-hidden`}>
      {isAccessible && <div className={`absolute top-0 left-0 w-full h-2 ${isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-indigo-600 to-sky-400'}`}></div>}
      <div className="flex justify-between items-start mb-6 sm:mb-8 relative z-10">
        <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center transition-transform duration-500 shadow-md ${isAccessible ? (isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-600 group-hover:scale-110') : 'bg-slate-200 text-slate-400'}`}>
          {file.category === 'Ebook' ? <FileText size={24} className="sm:w-7 sm:h-7"/> : file.category === 'Video' ? <Video size={24} className="sm:w-7 sm:h-7"/> : <Box size={24} className="sm:w-7 sm:h-7"/>}
        </div>
        {isAccessible ? (
          <button onClick={onToggleProgress} className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter flex items-center gap-1 border transition-colors ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
            {isCompleted ? <CheckSquare size={12}/> : <Square size={12}/>} 
            {isCompleted ? 'SELESAI' : 'TANDAI'}
          </button>
        ) : (
          <div className="bg-white text-rose-500 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter flex items-center gap-1.5 border border-rose-100 shadow-sm">
            <Lock size={12}/> TERKUNCI
          </div>
        )}
      </div>
      <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-1 relative z-10">
        <p className="text-[9px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-[2px]">{file.category}</p>
        <h4 className="text-lg sm:text-xl font-black text-slate-900 font-['Outfit'] leading-tight tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{file.name}</h4>
      </div>
      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-[10px] sm:text-[11px] font-bold text-slate-700 relative z-10">
         <div className="flex justify-between items-center border-b border-slate-100 pb-2"><span className="text-slate-400 uppercase tracking-widest">Ukuran</span><span>{file.size}</span></div>
         <div className="flex justify-between items-center"><span className="text-slate-400 uppercase tracking-widest">Akses Tier</span><span className={`px-2 py-1 rounded-md ${isAccessible ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>{TIER_LEVELS[file.reqLevel]?.name.toUpperCase() || 'FREE'}</span></div>
      </div>
      <div className="relative z-10 mt-auto">
        {isAccessible ? (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-full bg-slate-900 sm:bg-indigo-600 text-white text-center font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.75rem] shadow-xl sm:shadow-2xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:-translate-y-2 active:translate-y-0 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <Download size={18} className="sm:w-5 sm:h-5"/> UNDUH SEKARANG
          </a>
        ) : (
          <div className="w-full bg-slate-200 text-slate-500 text-center font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.75rem] uppercase text-[9px] sm:text-[10px] tracking-widest border border-slate-300">Minimal Paket {TIER_LEVELS[file.reqLevel]?.name}</div>
        )}
      </div>
    </div>
  );
}