import * as XLSX from 'xlsx';
import {
    Search, Plus, LogOut, ArrowUp, ArrowDown, CheckCircle, AlertCircle, Lock,
    Menu, Package, Upload, ArrowLeft, ArrowRight, Image as ImageIcon, Star, Trash2, X, Edit3, User, Crop, PenLine,
    FileDown, CheckSquare, Square
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';
import CryptoJS from 'crypto-js';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { getCroppedImg } from '../utils/cropImage';

// --- Configuration ---
const GITHUB_OWNER = "haku-yakyuu";
const GITHUB_REPO = "haku-yakyuu.github.io";
const GITHUB_BRANCH = "main";

// --- Design Specs ---
const COLORS = {
    ink: '#3E2723',
    paper: '#F5F1E8',
    paperDark: '#E8E3D5',
    placeholder: '#DCD7CE',
    white: '#FFFFFF',
    border: 'rgba(62, 39, 35, 0.1)',
    inkFaded: 'rgba(62, 39, 35, 0.4)'
};

const INITIAL_CATEGORIES = ["WBCQ資格賽", "日本職棒", "徐若熙", "經典賽", "MLB", "中職"];
const ADMIN_WHITELIST = [
    'bohan816@gmail.com',
    'jing370209@gmail.com',
    'wj209ing@gmail.com'
];

const STATUS_OPTIONS = [
    { label: "上架中", value: "active" },
    { label: "已隱藏", value: "hidden" },
    { label: "已售罄", value: "sold_out" }
];

const LAYOUT_OPTIONS = [
    { label: "縱向垂直", value: "vertical" },
    { label: "橫向水平", value: "horizontal" },
    { label: "無圖模式", value: "no_image" }
];

// --- Helper Components ---

const FontStyles = () => (
    <style>{`
        .haku-font-brand { font-family: 'Montserrat', sans-serif; }
        .haku-font-body { font-family: 'Noto Sans TC', sans-serif; }
        .haku-bg-paper { background-color: ${COLORS.paper}; }
        .haku-text-ink { color: ${COLORS.ink}; }
        .haku-border { border-color: ${COLORS.border}; }
      `}</style>
);

const LoadingOverlay = ({ isProcessing }) => (
    <div className={`fixed inset-0 z-[99999] bg-[var(--haku-paper)]/80 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-500 ${isProcessing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="w-16 h-16 border-4 border-[var(--haku-ink)]/20 border-t-[var(--haku-ink)] rounded-full animate-spin mb-8"></div>
        <h4 className="font-Montserrat font-black tracking-[0.3em] uppercase text-[var(--haku-ink)] animate-pulse">Processing</h4>
    </div>
);

const StatusDialog = ({ dialog }) => (
    <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[11000] transition-all duration-700 transform ${dialog.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-6 px-10 py-5 bg-[var(--haku-paper)] shadow-2xl border border-[var(--haku-ink)]/10 min-w-[360px] relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${dialog.type === 'error' ? 'bg-[var(--haku-ink)] opacity-50' : 'bg-[var(--haku-ink)]'}`}></div>
            {dialog.type === 'error' ?
                <AlertCircle className="text-[var(--haku-ink)] opacity-60" size={22} /> :
                <CheckCircle className="text-[var(--haku-ink)]" size={22} />
            }
            <div className="flex-1">
                <h4 className="font-Montserrat font-black tracking-[0.2em] text-[11px] uppercase text-[var(--haku-ink)]">{dialog.title}</h4>
                <p className="text-[10px] font-bold opacity-50 mt-1 uppercase tracking-wider">{dialog.message}</p>
            </div>
        </div>
    </div>
);

// Full Page Cropper Component
const CropperPage = ({ cropImage, setCropImage, crop, setCrop, zoom, setZoom, onCropComplete, handleConfirmCrop }) => (
    <div className="fixed inset-0 z-[10000] bg-[var(--haku-paper)] flex flex-col animate-in fade-in duration-300">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-[var(--haku-paper)] border-b border-[var(--haku-ink)]/10 px-6 md:px-12 py-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-6">
                <h1 className="font-Montserrat font-black text-2xl tracking-tight text-[var(--haku-ink)]">HAKU</h1>
                <div className="h-4 w-[1px] bg-[var(--haku-ink)]/10"></div>
                <p className="text-[10px] font-black opacity-40 tracking-[0.3em] uppercase">影像裁切調整</p>
            </div>
            <button
                onClick={() => setCropImage(null)}
                className="p-3 hover:bg-[var(--haku-ink)]/5 transition-all active:scale-90 rounded-full"
            >
                <X size={24} className="text-[var(--haku-ink)]" />
            </button>
        </div>

        {/* Main Crop Area - Adjusted for mobile */}
        <div className="flex-1 relative bg-[var(--placeholder-bg)]/30 flex items-center justify-center p-4 md:p-10 min-h-[50vh] md:min-h-0">
            <div className="relative w-full max-w-2xl aspect-square shadow-2xl border border-[var(--haku-ink)]/10 bg-white" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                <Cropper
                    image={cropImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1 / 1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    showGrid={true}
                    classes={{ containerClassName: 'bg-[var(--placeholder-bg)]' }}
                />
            </div>
        </div>

        {/* Footer / Controls */}
        <div className="bg-[var(--haku-paper)] border-t border-[var(--haku-ink)]/10 p-6 md:p-10 pb-12 md:pb-10">
            <div className="max-w-xl mx-auto space-y-8">
                <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-Montserrat font-black uppercase tracking-widest opacity-40">
                        <span>縮放微調</span>
                        <span>{Math.round(zoom * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.01}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-[var(--haku-ink)] h-1 bg-[var(--haku-ink)]/10 appearance-none cursor-pointer"
                    />
                </div>

                <button
                    onClick={handleConfirmCrop}
                    className="w-full py-5 text-[10px] font-Montserrat font-black tracking-[0.4em] uppercase bg-[var(--haku-ink)] text-[var(--haku-paper)] transition-all hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                >
                    <Crop size={16} />
                    確認裁切並上傳
                </button>
            </div>
        </div>
    </div>
);

export default function AdminApp() {
    const [user, setUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [githubToken, setGithubToken] = useState('');

    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'edit'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Dialog State
    const [dialog, setDialog] = useState({ show: false, type: 'success', title: '', message: '' });

    // Data State
    const [products, setProducts] = useState([]);
    const [pages, setPages] = useState([]);
    const [settings, setSettings] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // For Blocking Loader
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingPage, setEditingPage] = useState(null);
    const [editingSettings, setEditingSettings] = useState(null);
    const [localCache, setLocalCache] = useState({}); // Simple map: filename -> blobUrl
    // Crop State
    const [cropImage, setCropImage] = useState(null); // File to crop
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Export State
    const [activeExportMode, setActiveExportMode] = useState('range'); // 'range' | 'manual'
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [exportFee, setExportFee] = useState(15);
    const [exportRange, setExportRange] = useState({ start: '', end: '' });

    // --- Init ---
    useEffect(() => {
        // Firebase Auth listener
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                if (ADMIN_WHITELIST.includes(firebaseUser.email)) {
                    setUser(firebaseUser);
                    setIsLoggedIn(true); // Whitelisted Google User is considered logged in

                    // Recover GitHub token for image operations
                    try {
                        const savedToken = localStorage.getItem('github_token');
                        if (savedToken) {
                            setGithubToken(savedToken);
                        }
                    } catch (e) {
                        console.warn("Could not access localStorage for token", e);
                    }

                    fetchAllData();
                } else {
                    // Not in whitelist
                    signOut(auth);
                    showDialog('error', '權限不足', '您的帳號不在管理員白名單中');
                }
            } else {
                setUser(null);
                setIsLoggedIn(false);
                setGithubToken('');
            }
        });

        // Cleanup old cache entries on mount (e.g., older than 2 days)
        try {
            const keys = Object.keys(localStorage);
            const now = Date.now();
            keys.forEach(key => {
                if (key.startsWith('haku_cache_')) {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (now - item.timestamp > 172800000) { // 2 days
                        localStorage.removeItem(key);
                    }
                }
            });

            // Re-hydrate localCache from localStorage
            const restoredCache = {};
            keys.forEach(key => {
                if (key.startsWith('haku_cache_')) {
                    const fileName = key.replace('haku_cache_', '');
                    const item = JSON.parse(localStorage.getItem(key));
                    restoredCache[fileName] = item.data;
                }
            });
            setLocalCache(restoredCache);
        } catch (e) { console.error("Cache cleanup error", e); }

        return () => unsubscribe();
    }, []);

    // --- Actions ---
    const showDialog = (type, title, message) => {
        setDialog({ show: true, type, title, message });
        setTimeout(() => setDialog(prev => ({ ...prev, show: false })), 3000);
    };

    const handleGoogleLogin = async () => {
        setIsProcessing(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            if (ADMIN_WHITELIST.includes(result.user.email)) {
                setUser(result.user);
                setIsLoggedIn(true); // Success!
                fetchAllData();
                showDialog('success', '驗證成功', 'Google 帳號已登入');
            } else {
                await signOut(auth);
                showDialog('error', '權限不足', '您的帳號不在管理員白名單中');
            }
        } catch (error) {
            console.error(error);
            showDialog('error', '登入失敗', error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.removeItem('github_token');
        setIsLoggedIn(false);
        setUser(null);
        setGithubToken('');
        setProducts([]);
        setPages([]);
        setSettings({});
        setActiveTab('list');
    };

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Products
            const productsCol = collection(db, 'products');
            const snapshot = await getDocs(productsCol);
            const mappedProducts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    images: data.images ? data.images.split(',').map(img => {
                        img = img.trim();
                        if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('/')) return img;
                        return `/products/${img}`;
                    }) : [],
                    price: Number(data.price),
                    stock: Number(data.stock),
                    isFeatured: data.isFeatured === true || data.isFeatured === "true" || data.isFeatured === "TRUE"
                };
            }).sort((a, b) => b.id.localeCompare(a.id));
            setProducts(mappedProducts);

            // 2. Fetch Pages
            const pagesCol = collection(db, 'pages');
            const pagesSnap = await getDocs(pagesCol);
            setPages(pagesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // 3. Fetch Settings
            const settingsCol = collection(db, 'settings');
            const settingsSnap = await getDocs(settingsCol);
            const requiredKeys = ['about_text', 'announcement', 'google_ads_id', 'google_ads_label', 'google_verification', 'site_currency', 'site_title', 'solid_tags', 'yahoo_url'];
            const settingsObj = {};
            requiredKeys.forEach(k => settingsObj[k] = ""); // Init with empty
            settingsSnap.forEach(d => {
                settingsObj[d.id] = d.data().Value || d.data().value || "";
            });
            setSettings(settingsObj);

            // 4. Auto-Fetch GitHub Token
            if (!githubToken) {
                const tokenDoc = await getDoc(doc(db, 'admin_config', 'github'));
                if (tokenDoc.exists()) {
                    setGithubToken(tokenDoc.data().token);
                }
            }
        } catch (err) {
            console.error(err);
            showDialog('error', '載入失敗', '無法讀取資料: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const migrateToFirebase = async () => {
        if (!window.confirm("確定要執行資料遷移嗎？這將會覆寫 Firestore 中的現有資料。")) return;
        setIsProcessing(true);
        showDialog('success', '遷移中', '正在將資料導入 Firebase...');

        try {
            const batch = writeBatch(db);

            // Settings Migration
            const settingsData = [
                { "Setting_Key": "solid_tags", "Value": "精選" },
                { "Setting_Key": "site_title", "Value": "棒球選品｜HAKU" },
                { "Setting_Key": "announcement", "Value": "職人眼光的棒球選品" },
                { "Setting_Key": "about_text", "Value": "我們最早起步於棒球競標社團，在社群交流與販售中累積經驗，也逐步建立對商品品質與交易信任的重視。\n隨著經營方式成熟，開始進駐 Yahoo 奇摩拍賣，並同步於 蝦皮購物 進行寄賣，讓更多人能透過不同平台找到我們。\n目前官方網站作為商品展示與資訊整合平台，可瀏覽我們販售過與現正提供的商品內容，但尚未開放線上直接下單功能。\n若對商品有興趣，歡迎加入 LINE 官方帳號 @191wyokh 私訊洽詢，我們將協助確認庫存、報價與寄送方式。" },
                { "Setting_Key": "yahoo_url", "Value": "https://tw.bid.yahoo.com/booth/Y1816698905" },
                { "Setting_Key": "google_verification", "Value": "RSCsK8X-OoCTr2uKZ2oKz-QbY1SjZWYLZRIfQz9NKWY" },
                { "Setting_Key": "site_currency", "Value": "TWD" },
                { "Setting_Key": "google_ads_id", "Value": "" },
                { "Setting_Key": "google_ads_label", "Value": "" }
            ];

            settingsData.forEach(s => {
                const sRef = doc(db, 'settings', s.Setting_Key);
                batch.set(sRef, { Value: s.Value });
            });

            // Pages Migration
            const pagesData = [
                { "slug": "terms", "title": "服務條款", "content": "歡迎來到 HAKU（以下簡稱「本站」）。當您瀏覽或使用本站所提供的各項服務時，即視同您已詳盡閱讀、完全瞭解並同意接受本服務條款之所有內容。\n\n本站致力於提供棒球相關紀念品與收藏品的資訊展示及預訂服務。需要請您注意的是，本站網頁上所標示的各項商品資訊，包含價格、庫存及樣式等皆僅供參考，並不代表最終交易結果。由於此類商品具備高度的獨特性與稀有性，所有商品的具體物況均以描述與圖片為準，實際的庫存狀況與交易細節請您透過私訊詢問，並以確認之訊息為準。\n\n在您進行預訂或與本站聯繫時，請同意提供真實、正確且完整的個人資料，以利後續服務的遂行。本站對於所有訂單保有最終接受與否的權利，並保留隨時修改或變更服務內容之權限。\n\n考量到本站商品多於多個平台同步銷售，網頁上的庫存數據可能存在更新延遲的情形。因此，所有商品的即時庫存狀態、訂購權限以及最終成交售價，皆必須經過本站人員於私訊中正式確認後方為準確。在您獲得私訊確認之前，任何形式的預訂行為均不代表雙方契約已正式成立。此外，本站所販售之商品多為收藏性質，恕不保證所有商品的包裝或外盒完全無損。" },
                { "slug": "privacy-policy", "title": "隱私權政策", "content": "本站非常重視您的隱私權，我們承諾僅在提供服務所需的必要範圍內，以最嚴謹的態度處理並保護您的個人資料。\n\n當您在本站進行商品預訂或與我們聯繫時，我們會視需求收集包含您的姓名或暱稱、聯絡電話、電子郵件地址以及商品收件資訊。這些資料的收集完全是為了確保各項服務流程能順利運作，其使用目的僅限於訂單處理、物流寄送，以及後續的客服諮詢與售後回覆。我們深知信任的重要性，因此絕不會將您的個人資料出售、交換或出租給任何第三方。\n在保障資料安全的前提下，僅有在進行實體商品配送時，我們才會將必要的收件資訊提供給合作的貨運或快遞業者。身為使用者，您擁有完整的權利，可以隨時與我們聯絡並要求查詢、閱覽、補充、修正或刪除您留存於本站的個人資料。\n\n為了進一步提升您的瀏覽體驗，本站可能會在您的瀏覽器中寫入必要的 Cookie，主要用於記錄網站的偏好設定。您可以根據個人需求在瀏覽器設定中選擇拒絕 Cookie 的存取，但請留意這可能會導致網站的部分功能無法正常運作。若您對於以上條款有任何疑問，或需要進一步的說明，歡迎隨時透過私訊與我們聯絡。\n\n本條款最新修訂日期：2025 年 12 月 27 日" }
            ];

            pagesData.forEach(p => {
                const pRef = doc(db, 'pages', p.slug);
                batch.set(pRef, { title: p.title, content: p.content });
            });

            // Products Migration
            const productsData = [
                { "id": "haku_001", "name": "徐若熙 資格賽 WBCQ 肖像紀念球", "price": "6900", "stock": "1", "category": "WBCQ資格賽", "isFeatured": "TRUE", "tags": "精選", "status": "active", "images": "https://drive.google.com/thumbnail?id=1jX2DAScdH8_eLXNPnXE3wX8KCwOYsQmm&sz=w1000,https://drive.google.com/thumbnail?id=1lX4xS4TBHp1ji6-Zyh8rDZJYtLrXPzpJ&sz=w1000", "layout_type": "vertical", "description": "徐若熙 資格賽 WBCQ 2025 世界棒球經典賽 中華英雄 肖像紀念球" },
                { "id": "haku_002", "name": "王貞治1973三冠王紀念 日本職棒", "price": "4750", "stock": "1", "category": "日本職棒", "isFeatured": "TRUE", "tags": "精選", "status": "active", "images": "https://drive.google.com/thumbnail?id=1lhPU_N93YOz9lRgGK_ugQjnqvy6PTFr8&sz=w1000,https://drive.google.com/thumbnail?id=1s56umZ52ReED7MTNmL85Bk2vSFVK2vjS&sz=w1000,https://drive.google.com/thumbnail?id=11ZI4UgotmuIeU1-15m2G7arto4pNdSin&sz=w1000", "layout_type": "vertical", "description": "王貞治1973三冠王紀念 日本職棒｜福岡巨蛋王貞治棒球紀念館收藏等級展" },
                { "id": "haku_003", "name": "徐若熙生涯首勝紀念球", "price": "4800", "stock": "0", "category": "徐若熙", "isFeatured": "TRUE", "tags": "已售出", "status": "active", "images": "https://drive.google.com/thumbnail?id=1Y4JBYypedafFhylf3is3k64-0RKPF7Jb&sz=w1000,https://drive.google.com/thumbnail?id=1INRO-69Ly957pzpsEZvDTPYuhryJ_jzS&sz=w1000", "layout_type": "vertical", "description": "味全龍 徐若熙生涯首勝紀念球" },
                { "id": "haku_004", "name": "張育成 資格賽 WBCQ 肖像紀念球", "price": "2000", "stock": "1", "category": "WBCQ資格賽", "isFeatured": "TRUE", "tags": "精選", "status": "active", "images": "https://drive.google.com/thumbnail?id=1nxPvgPj1eQrxK_pVswgkxxY5uJlCD8xw&sz=w1000,https://drive.google.com/thumbnail?id=1_TqZw_2fTATOrajU4QY-PNseEmnJtNd4&sz=w1000", "layout_type": "vertical", "description": "張育成 資格賽 WBCQ 肖像紀念球" },
                { "id": "haku_005", "name": "孫易磊 資格賽 WBCQ 肖像紀念球", "price": "2000", "stock": "1", "category": "WBCQ資格賽", "isFeatured": "TRUE", "tags": "精選", "status": "active", "images": "https://drive.google.com/thumbnail?id=1s2W6twFxIZAgUNlE9L9gchgWqpukL7SA&sz=w1000,https://drive.google.com/thumbnail?id=1Y1HihBfhAP5TgExKTs06c0WXIzBBmKjm&sz=w1000", "layout_type": "vertical", "description": "孫易磊 資格賽 WBCQ 2025 世界棒球經典賽 中華英雄 肖像紀念球" },
                { "id": "haku_006", "name": "吳念庭 資格賽 WBCQ 肖像紀念球", "price": "2500", "stock": "1", "category": "WBCQ資格賽", "isFeatured": "TRUE", "tags": "精選", "status": "active", "images": "haku_006-0.jpg,haku_006-1.jpg", "layout_type": "vertical", "description": "吳念庭 資格賽 WBCQ 2025 世界棒球經典賽 中華英雄 肖像紀念球" }
            ];

            productsData.forEach(p => {
                const pRef = doc(db, 'products', p.id);
                batch.set(pRef, {
                    id: p.id,
                    name: p.name,
                    price: Number(p.price),
                    stock: Number(p.stock),
                    category: p.category,
                    isFeatured: p.isFeatured === "TRUE",
                    tags: p.tags,
                    status: p.status,
                    images: p.images,
                    layout: p.layout_type || 'vertical',
                    desc: p.description,
                    updatedAt: new Date().toISOString()
                });
            });

            await batch.commit();

            // Seed the admin_config for GitHub token
            await setDoc(doc(db, 'admin_config', 'github'), { token: "" }, { merge: true });

            showDialog('success', '遷移成功', '資料已成功導入 Firebase Firestore (含 Token 資料夾)');
            fetchProducts();
        } catch (err) {
            console.error(err);
            showDialog('error', '遷移失敗', err.message);
        } finally {
            setIsProcessing(false);
        }
    };
    const toggleProductSelection = (id) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleExportXLSX = () => {
        setIsProcessing(true);
        try {
            // 1. Filter products
            let toExport = [];
            if (activeExportMode === 'range') {
                if (!exportRange.start || !exportRange.end) {
                    showDialog('error', '匯出失敗', '請輸入商品編號範圍');
                    setIsProcessing(false);
                    return;
                }
                toExport = products.filter(p => {
                    const id = p.id;
                    return id >= exportRange.start && id <= exportRange.end;
                });
            } else {
                toExport = products.filter(p => selectedProductIds.includes(p.id));
            }

            if (toExport.length === 0) {
                showDialog('error', '匯出失敗', '未選取任何商品或範圍內無商品');
                setIsProcessing(false);
                return;
            }

            // 2. Prepare Data (43 Columns)
            const headers = [
                "分類", "商品名稱", "商品描述", "最低購買數量", "主商品貨號", "危險物品", "商品規格識別碼",
                "規格名稱 1", "規格選項 1", "規格圖片", "規格名稱 2", "規格選項 2", "價格", "庫存",
                "商品選項貨號", "新版尺寸表", "圖片尺寸表", "GTIN", "主商品圖片", "商品圖片 1", "商品圖片 2",
                "商品圖片 3", "商品圖片 4", "商品圖片 5", "商品圖片 6", "商品圖片 7", "商品圖片 8",
                "重量", "長度", "寬度", "高度", "黑貓宅急便", "7-ELEVEN", "全家", "萊爾富",
                "全家冷凍超取(不寄送離島地區)", "宅配通", "蝦皮店到店", "店到家宅配 - 標準包裹",
                "蝦皮店到店 - 隔日到貨", "店到家宅配 - 大型包裹", "較長備貨天數", "失敗原因"
            ];

            const rows = toExport.sort((a, b) => a.id.localeCompare(b.id)).map(p => {
                const row = new Array(43).fill("");

                // 分類 (Col 1)
                let catCode = p.category;
                if (catCode === "棒球" || catCode === "壘球") catCode = "101285";
                else if (catCode === "愛好收藏品") catCode = "101399";
                row[0] = catCode;

                // 商品名稱 (Col 2)
                row[1] = p.name;

                // 商品描述 (Col 3)
                row[2] = `此商品本體價格為 ${p.price}元\n${p.desc || ''}`;

                // 價格 (Col 13)
                const feeFactor = 1 - (exportFee / 100);
                row[12] = Math.ceil(p.price / feeFactor);

                // 庫存 (Col 14)
                row[13] = p.stock;

                // 圖片 URLs (Col 19-25) - Using webp as consistent with the build system
                const baseUrl = `https://raw.githubusercontent.com/haku-yakyuu/haku-yakyuu.github.io/refs/heads/main/dist/products/${p.id}`;
                row[18] = `${baseUrl}-0.webp`; // 主圖
                for (let i = 1; i <= 6; i++) {
                    if (p.images && p.images.length > i) {
                        row[18 + i] = `${baseUrl}-${i}.webp`;
                    }
                }

                // 物流開啟 (Col 33, 34, 38, 39, 40)
                row[32] = "開啟"; // 7-ELEVEN
                row[33] = "開啟"; // 全家
                row[37] = "開啟"; // 蝦皮店到店
                row[38] = "開啟"; // 店到家宅配 - 標準包裹
                row[39] = "開啟"; // 蝦皮店到店 - 隔日到貨

                return row;
            });

            // 3. Create Sheet
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

            // 4. Download
            XLSX.writeFile(workbook, `HAKU_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
            showDialog('success', '匯出成功', `已匯出 ${toExport.length} 項商品`);
        } catch (err) {
            console.error(err);
            showDialog('error', '匯出失敗', err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Image Handling ---
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const triggerFileUpload = () => fileInputRef.current?.click();
    const triggerCamera = () => cameraInputRef.current?.click();

    const handleFileChange = (e) => {
        if (!editingProduct) return;
        const file = e.target.files?.[0];
        if (!file) return;

        // Use Object URL instead of Base64 for better mobile performance (prevent OOM crashes)
        const objectUrl = URL.createObjectURL(file);
        setCropImage(objectUrl);

        // Reset input for same file upload
        e.target.value = null;
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const objectUrl = URL.createObjectURL(file);
            setCropImage(objectUrl);
        }
    };

    const onCropComplete = React.useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirmCrop = async () => {
        setIsProcessing(true);
        try {
            const croppedImageBlobUrl = await getCroppedImg(cropImage, croppedAreaPixels);

            // Convert blob URL to File object for saving
            const res = await fetch(croppedImageBlobUrl);
            const blob = await res.blob();
            const file = new File([blob], `crop-${Date.now()}.webp`, { type: 'image/webp' });

            // Compress the cropped image - Target 1000px WebP
            const options = {
                maxSizeMB: 0.6,
                maxWidthOrHeight: 1000,
                useWebWorker: true,
                fileType: 'image/webp',
                initialQuality: 0.85
            };
            const compressed = await imageCompression(file, options);
            const previewUrl = URL.createObjectURL(compressed);

            // Temporarily store just as a preview object, not assigned to ID yet
            // Wait for handleSave to assign real filename
            const newImageObj = {
                file: compressed,
                preview: previewUrl,
                isNew: true
            };

            setEditingProduct(prev => ({
                ...prev,
                rawImagesData: [...(prev.rawImagesData || prev.images.map(url => ({ url, isNew: false }))), newImageObj],
                images: [...(prev.images || []), newImageObj.preview]
            }));

            setCropImage(null);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
            showDialog('success', '裁切完成', '圖片已準備上傳');
        } catch (e) {
            console.error(e);
            showDialog('error', '裁切失敗', '處理圖片時發生錯誤');
        } finally {
            setIsProcessing(false);
        }
    };

    const removeImage = (index) => {
        if (!editingProduct) return;
        const newData = [...(editingProduct.rawImagesData || editingProduct.images.map(url => ({ url, isNew: false })))];
        newData.splice(index, 1);

        setEditingProduct({
            ...editingProduct,
            rawImagesData: newData,
            images: newData.map(d => d.preview || d.url)
        });
    };

    const moveImage = (index, direction) => {
        if (!editingProduct) return;
        const newData = [...(editingProduct.rawImagesData || editingProduct.images.map(url => ({ url, isNew: false })))];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newData.length) return;

        [newData[index], newData[targetIndex]] = [newData[targetIndex], newData[index]];

        setEditingProduct({
            ...editingProduct,
            rawImagesData: newData,
            images: newData.map(d => d.preview || d.url)
        });
    };

    // --- CRUD Operations ---
    const handleEdit = (product) => {
        setEditingProduct({
            ...product,
            rawImagesData: product.images.map(url => ({ url, isNew: false }))
        });
        setActiveTab('edit');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreateNew = () => {
        let nextId = "haku_001";
        if (products.length > 0) {
            const hakuIds = products
                .map(p => p.id)
                .filter(id => id && id.startsWith('haku_'))
                .map(id => {
                    const parts = id.split('_');
                    return parts.length > 1 ? parseInt(parts[1]) : NaN;
                })
                .filter(num => !isNaN(num));

            if (hakuIds.length > 0) {
                const maxNum = Math.max(...hakuIds);
                nextId = `haku_${String(maxNum + 1).padStart(3, '0')}`;
            }
        }

        const newProduct = {
            id: nextId,
            name: '',
            price: 0,
            stock: 1,
            category: '棒球收藏',
            isFeatured: false,
            tags: '精選',
            status: 'active',
            images: [],
            layout: 'vertical',
            desc: ''
        };
        setEditingProduct(newProduct);
        setActiveTab('edit');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async () => {
        if (!editingProduct || !editingProduct.id) return;
        const isExisting = products.some(p => p.id === editingProduct.id);
        if (!isExisting) {
            setEditingProduct(null);
            return;
        }
        if (!window.confirm(`確定要刪除商品 [${editingProduct.id}] 嗎？\n此操作無法復原。`)) return;

        setIsProcessing(true);
        showDialog('success', '刪除中', '正在移除商品資料...');

        try {
            const pRef = doc(db, 'products', editingProduct.id);
            await deleteDoc(pRef);

            setProducts(products.filter(p => p.id !== editingProduct.id));
            setEditingProduct(null);
            showDialog('success', '已刪除', `商品 [${editingProduct.id}] 已移除，正在通知系統更新...`);
            triggerDeploy();
        } catch (err) {
            console.error(err);
            showDialog('error', '刪除失敗', err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsProcessing(true); // BLOCK UI
        showDialog('success', '處理中', '正在上傳圖片並儲存資料...');

        const id = editingProduct.id;
        const finalImages = editingProduct.rawImagesData || [];
        const uploadedFileNames = [];
        const newLocalCache = { ...localCache };

        // 1. Parallel Image Upload Phase
        try {
            const uploadPromises = finalImages.map(async (item, i) => {
                const expectedFileName = `${id}-${i}.webp`;

                if (item.isNew && item.file) {
                    const content = await toBase64(item.file);
                    const base64 = content.split(',')[1];
                    await uploadToGitHub(expectedFileName, base64);
                    newLocalCache[expectedFileName] = item.preview;
                } else if (item.url && !item.url.includes(expectedFileName)) {
                    // Logic for reordering/moving existing images
                    const res = await fetch(item.url);
                    const blob = await res.blob();
                    const content = await toBase64(blob);
                    const base64 = content.split(',')[1];
                    await uploadToGitHub(expectedFileName, base64);
                    newLocalCache[expectedFileName] = item.url;
                }

                uploadedFileNames.push(expectedFileName);
            });

            await Promise.all(uploadPromises);
            setLocalCache(newLocalCache);
        } catch (err) {
            console.error(err);
            showDialog('error', '上傳失敗', err.message);
            setIsProcessing(false);
            return;
        }

        // 2. Data Save Phase - Save to Firestore
        try {
            const payload = {
                id,
                name: editingProduct.name,
                price: Number(editingProduct.price),
                stock: Number(editingProduct.stock),
                category: editingProduct.category,
                isFeatured: editingProduct.isFeatured,
                tags: editingProduct.tags,
                status: editingProduct.status,
                images: uploadedFileNames.filter(Boolean).join(','),
                layout: editingProduct.layout || 'vertical',
                desc: editingProduct.desc,
                updatedAt: new Date().toISOString()
            };

            const pRef = doc(db, 'products', id);
            await setDoc(pRef, payload);

            const productForList = { ...payload, images: uploadedFileNames };
            const updatedDocs = products.map(p => p.id === id ? productForList : p);
            if (!products.find(p => p.id === id)) updatedDocs.push(productForList);
            setProducts(updatedDocs);

            showDialog('success', '更新中', `商品 [${id}] 資料已儲存，正在通知系統重新發布...`);
            setEditingProduct(null);
            triggerDeploy();

        } catch (err) {
            console.error(err);
            showDialog('error', '存檔失敗', err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSavePage = async (pageId, title, content) => {
        setIsProcessing(true);
        try {
            await setDoc(doc(db, 'pages', pageId), { title, content });
            setPages(prev => prev.map(p => p.id === pageId ? { ...p, title, content } : p));
            showDialog('success', '頁面更新中', `[${title}] 已儲存，正在通知系統重新發布...`);
            setEditingPage(null);
            triggerDeploy();
        } catch (err) {
            console.error(err);
            showDialog('error', '儲存失敗', err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveSettings = async (newSettings) => {
        setIsProcessing(true);
        try {
            const batch = writeBatch(db);
            Object.entries(newSettings).forEach(([key, value]) => {
                batch.set(doc(db, 'settings', key), { Value: value });
            });
            await batch.commit();
            setSettings(newSettings);
            showDialog('success', '設定更新中', '所有變更已同步，正在通知系統重新發布...');
            setEditingSettings(null);
            triggerDeploy();
        } catch (err) {
            console.error(err);
            showDialog('error', '儲存失敗', err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const uploadToGitHub = async (fileName, content) => {
        if (!githubToken) throw new Error("Missing Token");
        const path = `public/products/${fileName}`;
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

        let sha = null;
        try {
            const checkRes = await fetch(url, { headers: { Authorization: `token ${githubToken}` } });
            if (checkRes.ok) {
                const data = await checkRes.json();
                sha = data.sha;
            }
        } catch (e) { }

        const body = { message: `Update ${fileName}`, content, branch: GITHUB_BRANCH };
        if (sha) body.sha = sha;

        const res = await fetch(url, {
            method: 'PUT',
            headers: { Authorization: `token ${githubToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({ message: 'Unknown error' }));
            console.error('GitHub PUT failed:', errData);
            throw new Error(`GitHub API Error: ${errData.message || res.statusText} (${res.status})`);
        }
    };

    const triggerDeploy = async () => {
        if (!githubToken) return;
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`;
        try {
            await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `token ${githubToken}`,
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ event_type: 'webhook' })
            });
            console.log("Deployment trigger sent to GitHub Actions.");
        } catch (err) {
            console.error("Failed to trigger deployment:", err);
        }
    };

    // --- UI Renders ---
    const getProductImage = (imgSource) => {
        // If it starts with http, it's external (or already full url)
        if (imgSource.startsWith('http') || imgSource.startsWith('data:') || imgSource.startsWith('/')) return imgSource;
        // Check local cache
        if (localCache[imgSource]) return localCache[imgSource];
        // Fallback to products/ path
        return `/products/${imgSource}`;
    };

    if (cropImage) {
        return (
            <>
                <FontStyles />
                <LoadingOverlay isProcessing={isProcessing} />
                <StatusDialog dialog={dialog} />
                <CropperPage
                    cropImage={cropImage} setCropImage={setCropImage}
                    crop={crop} setCrop={setCrop}
                    zoom={zoom} setZoom={setZoom}
                    onCropComplete={onCropComplete}
                    handleConfirmCrop={handleConfirmCrop}
                />
            </>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--haku-paper)]">
                <FontStyles />
                <LoadingOverlay isProcessing={isProcessing} />
                <StatusDialog dialog={dialog} />
                <div className="w-full max-w-[340px] md:max-w-sm bg-[var(--haku-paper)] border border-[var(--haku-ink)]/10 p-1">
                    <div className="border border-[var(--haku-ink)]/10">
                        <div className="p-10 md:p-16 text-center bg-[var(--haku-ink)] text-[var(--haku-paper)]">
                            <img src="/logotype-light.png" alt="HAKU" className="h-10 md:h-12 mx-auto mb-6" />
                            <div className="h-[1px] w-12 bg-current mx-auto opacity-30 mb-4"></div>
                            <p className="text-[9px] tracking-[0.6em] opacity-50 uppercase font-bold">管理員驗證</p>
                        </div>
                        <div className="p-8 md:p-14 space-y-10 md:space-y-12">
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full py-5 text-[10px] font-Montserrat font-black tracking-[0.5em] bg-[var(--haku-ink)] text-[var(--haku-paper)] transition-all hover:opacity-90 active:scale-[0.98] shadow-xl flex items-center justify-center gap-3"
                            >
                                <User size={16} /> GOOGLE 登入
                            </button>
                            <p className="text-center text-[8px] font-black opacity-20 tracking-widest uppercase">僅供授權人員使用</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    const totalPages = Math.ceil(products.length / itemsPerPage);
    const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const allCategories = [...new Set([...INITIAL_CATEGORIES, ...products.map(p => p.category)])].filter(Boolean).sort();

    return (
        <div className="min-h-screen flex flex-col bg-[var(--haku-paper)] selection:bg-[var(--haku-ink)] selection:text-[var(--haku-paper)]">
            <FontStyles />
            <LoadingOverlay isProcessing={isProcessing} />
            <StatusDialog dialog={dialog} />

            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
            <input type="file" ref={cameraInputRef} className="hidden" onChange={handleFileChange} accept="image/*" capture="environment" />

            {/* Sticky Navigation Area */}
            <header className="sticky top-0 z-50 bg-[var(--haku-paper)] border-b border-[var(--haku-ink)]/10 px-6 md:px-12 py-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <img src="/logotype-dark.png" alt="HAKU" className="h-6 md:h-8" />
                    <div className="h-4 w-[1px] bg-[var(--haku-ink)]/20 hidden md:block"></div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <a href="/" target="_blank" className="p-3 hover:bg-[var(--haku-ink)]/5 transition-all rounded-full group" title="前往前台首頁">
                        <User size={20} className="text-[var(--haku-ink)] opacity-40 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <button onClick={handleLogout} className="p-3 hover:bg-[var(--haku-ink)]/5 transition-all rounded-full group" title="登出系統">
                        <LogOut size={20} className="text-[var(--haku-ink)] opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </header>

            {/* Sub-menu Tabs */}
            <div className="bg-[var(--haku-paper)] border-b border-[var(--haku-ink)]/5 px-6 md:px-12">
                <div className="max-w-7xl mx-auto flex gap-6 md:gap-12 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => { setActiveTab('list'); setEditingProduct(null); }}
                        className={`py-6 text-[11px] font-Montserrat font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap ${activeTab === 'list' ? 'text-[var(--haku-ink)]' : 'text-[var(--haku-ink)]/30 hover:text-[var(--haku-ink)]'}`}
                    >
                        商品一覽
                        {activeTab === 'list' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--haku-ink)]"></div>}
                    </button>
                    <button
                        onClick={handleCreateNew}
                        className={`py-6 text-[11px] font-Montserrat font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap ${activeTab === 'edit' && !products.some(p => p.id === editingProduct?.id) ? 'text-[var(--haku-ink)]' : 'text-[var(--haku-ink)]/30 hover:text-[var(--haku-ink)]'}`}
                    >
                        新增商品
                        {activeTab === 'edit' && !products.some(p => p.id === editingProduct?.id) && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--haku-ink)]"></div>}
                    </button>
                    <button
                        onClick={() => { setActiveTab('pages'); setEditingPage(null); }}
                        className={`py-6 text-[11px] font-Montserrat font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap ${activeTab === 'pages' ? 'text-[var(--haku-ink)]' : 'text-[var(--haku-ink)]/30 hover:text-[var(--haku-ink)]'}`}
                    >
                        網頁內容
                        {activeTab === 'pages' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--haku-ink)]"></div>}
                    </button>
                    <button
                        onClick={() => { setActiveTab('settings'); setEditingSettings(null); }}
                        className={`py-6 text-[11px] font-Montserrat font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap ${activeTab === 'settings' ? 'text-[var(--haku-ink)]' : 'text-[var(--haku-ink)]/30 hover:text-[var(--haku-ink)]'}`}
                    >
                        全域設定
                        {activeTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--haku-ink)]"></div>}
                    </button>
                    <button
                        onClick={() => { setActiveTab('export'); }}
                        className={`py-6 text-[11px] font-Montserrat font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap ${activeTab === 'export' ? 'text-[var(--haku-ink)]' : 'text-[var(--haku-ink)]/30 hover:text-[var(--haku-ink)]'}`}
                    >
                        試算表匯出
                        {activeTab === 'export' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--haku-ink)]"></div>}
                    </button>
                </div>
            </div>

            {/* Content Scroller */}
            <main className="flex-1 overflow-x-hidden">
                <div className="p-6 md:p-16 max-w-7xl mx-auto pb-40">

                    {/* VIEW: Editor */}
                    {activeTab === 'edit' && editingProduct && (
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                            <div className="mb-12 flex items-center justify-between border-b border-[var(--haku-ink)]/10 pb-6 whitespace-nowrap overflow-hidden">
                                <h2 className="text-[14px] font-Montserrat font-black uppercase tracking-[0.3em] text-[var(--haku-ink)] truncate pr-4">
                                    {products.some(p => p.id === editingProduct.id) ? `EDIT / ${editingProduct.id}` : 'CREATE NEW ITEM'}
                                </h2>
                                <button onClick={() => { setActiveTab('list'); setEditingProduct(null); }} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all flex items-center gap-2">
                                    <X size={14} /> 取消編輯
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-16">
                                {/* Grid Layout for Inputs */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">

                                    {/* Left Side: Media */}
                                    <div
                                        className={`lg:col-span-12 space-y-8 p-4 border-2 border-transparent transition-all ${isDragging ? 'border-dashed border-[var(--haku-ink)] bg-[var(--haku-ink)]/5' : ''}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                            {(editingProduct.rawImagesData || editingProduct.images || []).map((imgData, idx) => {
                                                const src = imgData.preview || getProductImage(imgData.url || imgData);
                                                return (
                                                    <div key={idx} className="aspect-square border border-[var(--haku-ink)]/10 relative overflow-hidden group bg-[var(--placeholder-bg)]">
                                                        <img src={src} className="w-full h-full object-cover" alt="" />
                                                        <div className="absolute inset-0 bg-[var(--haku-ink)]/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 gap-2">
                                                            <div className="flex gap-2">
                                                                <button type="button" onClick={() => moveImage(idx, -1)} className="p-2 bg-[var(--haku-paper)] text-[var(--haku-ink)] active:scale-75"><ArrowLeft size={14} /></button>
                                                                <button type="button" onClick={() => moveImage(idx, 1)} className="p-2 bg-[var(--haku-paper)] text-[var(--haku-ink)] active:scale-75"><ArrowRight size={14} /></button>
                                                            </div>
                                                            <button type="button" onClick={() => removeImage(idx)} className="text-[8px] font-black text-white/60 hover:text-white uppercase tracking-widest mt-2">REMOVE</button>
                                                        </div>
                                                        <div className="absolute top-0 left-0 px-2 py-0.5 bg-[var(--haku-ink)] text-[var(--haku-paper)] text-xs font-black">{idx + 1}</div>
                                                    </div>
                                                );
                                            })}

                                            {/* Action Buttons */}
                                            <div className="contents">
                                                <button type="button" onClick={triggerFileUpload} className="aspect-square border-2 border-dashed border-[var(--haku-ink)]/10 hover:border-[var(--haku-ink)]/30 hover:bg-[var(--haku-ink)]/5 flex flex-col items-center justify-center gap-3 transition-all">
                                                    <Plus size={24} className="opacity-20" />
                                                    <span className="text-[9px] font-black opacity-30 tracking-widest uppercase text-center px-2">UPLOAD / DRAG</span>
                                                </button>

                                                <button type="button" onClick={triggerCamera} className="md:hidden aspect-square border-2 border-dashed border-[var(--haku-ink)]/10 hover:border-[var(--haku-ink)]/30 hover:bg-[var(--haku-ink)]/5 flex flex-col items-center justify-center gap-3 transition-all">
                                                    <ImageIcon size={24} className="opacity-20" />
                                                    <span className="text-[9px] font-black opacity-30 tracking-widest uppercase text-center px-2">TAKE PHOTO</span>
                                                </button>
                                            </div>
                                        </div>
                                        {isDragging && (
                                            <div className="text-center py-4 border border-[var(--haku-ink)]/10 bg-white/50 animate-pulse">
                                                <p className="text-[10px] font-Montserrat font-black uppercase tracking-[0.4em] text-[var(--haku-ink)]">Drop images here to add</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Middle: Details */}
                                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-widest opacity-40">編號</label>
                                            <input type="text" readOnly className="w-full p-4 bg-[var(--haku-ink)]/5 border-none text-xl font-black focus:outline-none opacity-50 cursor-not-allowed" value={editingProduct.id} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-widest opacity-40">名稱</label>
                                            <input type="text" required className="w-full p-4 bg-white/50 border-none text-xl font-bold focus:bg-white focus:ring-1 focus:ring-[var(--haku-ink)]/10 transition-all" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-widest opacity-40">分類</label>
                                            <input
                                                list="cat-list"
                                                type="text"
                                                placeholder="選擇或輸入分類..."
                                                className="w-full p-4 bg-white/50 border-none text-lg font-bold focus:bg-white transition-all"
                                                value={editingProduct.category}
                                                onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                            />
                                            <datalist id="cat-list">
                                                {allCategories.map(c => <option key={c} value={c} />)}
                                            </datalist>

                                            {/* Quick Select Tags */}
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {allCategories.slice(0, 10).map(cat => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setEditingProduct({ ...editingProduct, category: cat })}
                                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] border transition-all ${editingProduct.category === cat ? 'bg-[var(--haku-ink)] text-white border-[var(--haku-ink)]' : 'bg-transparent text-[var(--haku-ink)]/30 border-[var(--haku-ink)]/10 hover:border-[var(--haku-ink)]/30 hover:text-[var(--haku-ink)]'}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-widest opacity-40">售價</label>
                                            <input type="number" className="w-full p-4 bg-white/50 border-none text-xl font-Montserrat font-black focus:bg-white" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) })} />
                                        </div>
                                    </div>

                                    {/* Right: Settings */}
                                    <div className="lg:col-span-4 space-y-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-widest opacity-40">庫存</label>
                                            <input type="number" className="w-full p-4 bg-white/50 border-none text-xl font-Montserrat font-black focus:bg-white" value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-widest opacity-40">狀態</label>
                                            <select className="w-full p-4 bg-white/50 border-none font-Montserrat font-black uppercase text-sm" value={editingProduct.status} onChange={e => setEditingProduct({ ...editingProduct, status: e.target.value })}>
                                                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-4 py-4 cursor-pointer select-none" onClick={() => setEditingProduct({ ...editingProduct, isFeatured: !editingProduct.isFeatured })}>
                                            <div className={`w-8 h-8 flex items-center justify-center transition-all ${editingProduct.isFeatured ? 'bg-[var(--haku-ink)] text-white' : 'bg-white border border-[var(--haku-ink)]/10'}`}>
                                                <Star size={14} className={editingProduct.isFeatured ? 'fill-current' : 'opacity-20'} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">設為精選</span>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-12 space-y-3">
                                        <label className="text-[10px] font-Montserrat font-black uppercase tracking-widest opacity-40">說明</label>
                                        <textarea className="w-full p-6 bg-white border-none focus:ring-1 focus:ring-[var(--haku-ink)]/10 min-h-[200px] text-sm leading-relaxed" value={editingProduct.desc} onChange={e => setEditingProduct({ ...editingProduct, desc: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse md:flex-row gap-6 justify-between pt-12 border-t border-[var(--haku-ink)]/10">
                                    <div className="flex gap-4">
                                        {products.some(p => p.id === editingProduct.id) && (
                                            <button type="button" onClick={handleDelete} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest bg-white border border-[var(--haku-ink)]/10 hover:border-red-900 overflow-hidden group relative flex items-center justify-center">
                                                <span className="group-hover:translate-x-full inline-block transition-transform duration-300">刪除商品</span>
                                                <div className="absolute inset-0 bg-red-900 text-white flex items-center justify-center -translate-x-full group-hover:translate-x-0 transition-transform duration-300">SURE?</div>
                                            </button>
                                        )}
                                        <button type="button" onClick={() => { setActiveTab('list'); setEditingProduct(null); }} className="px-10 py-5 text-[10px] font-black uppercase tracking-widest border border-[var(--haku-ink)]/10 hover:bg-[var(--haku-ink)] hover:text-white transition-all flex items-center justify-center">放棄</button>
                                    </div>
                                    <button type="submit" className="px-20 py-5 text-[10px] font-black uppercase tracking-[0.4em] bg-[var(--haku-ink)] text-[var(--haku-paper)] shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center">核對並儲存資料</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* VIEW: Product List */}
                    {activeTab === 'list' && (
                        <div className="animate-in fade-in duration-500">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 border-b border-[var(--haku-ink)]/10 pb-10">
                                <div>
                                    <h2 className="text-[16px] font-Montserrat font-black uppercase tracking-[0.5em] text-[var(--haku-ink)] mb-2">PRODUCT LIST</h2>
                                    <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em]">目前共有 {products.length} 項品項</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 flex items-center justify-center font-Montserrat font-black text-xs border transition-all ${currentPage === i + 1 ? 'bg-[var(--haku-ink)] border-[var(--haku-ink)] text-white' : 'bg-white border-[var(--haku-ink)]/10 hover:bg-[var(--haku-ink)]/10'}`}>
                                                {String(i + 1).padStart(2, '0')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="py-20 text-center opacity-20 text-[10px] font-Montserrat font-black tracking-[0.6em] uppercase animate-pulse">Synchronizing...</div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {paginatedProducts.map(product => {
                                        const statusLabel = STATUS_OPTIONS.find(o => o.value === product.status)?.label || product.status;
                                        return (
                                            <div key={product.id} className="group bg-white border border-[var(--haku-ink)]/10 hover:border-[var(--haku-ink)]/20 shadow-sm transition-all relative overflow-hidden flex flex-row h-full min-h-[160px]">
                                                {/* Selection Checkbox */}
                                                <button
                                                    onClick={() => toggleProductSelection(product.id)}
                                                    className={`absolute top-0 right-0 z-20 p-4 transition-all ${selectedProductIds.includes(product.id) ? 'text-[var(--haku-ink)]' : 'text-[var(--haku-ink)]/10 hover:text-[var(--haku-ink)]/30'}`}
                                                >
                                                    {selectedProductIds.includes(product.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </button>

                                                {product.isFeatured && <div className="absolute top-3 left-3 z-10 p-1.5 bg-[var(--haku-ink)] text-white shadow-lg"><Star size={10} className="fill-current" /></div>}
                                                <div className="w-32 sm:w-40 md:w-48 aspect-square bg-[var(--placeholder-bg)] flex-shrink-0 overflow-hidden border-r border-[var(--haku-ink)]/5">
                                                    {product.images?.[0] ?
                                                        <img src={getProductImage(product.images[0])} className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-1000" /> :
                                                        <div className="w-full h-full flex flex-col items-center justify-center opacity-5"><Package size={40} /></div>
                                                    }
                                                </div>
                                                <div className="p-6 md:p-8 flex flex-col justify-center flex-grow min-w-0 pr-16 md:pr-24 relative">
                                                    <div className="mb-2">
                                                        <div className="text-[14px] md:text-[16px] font-bold truncate pr-4">{product.name}</div>
                                                        <div className="text-[9px] font-Montserrat font-black opacity-20 tracking-[0.2em] uppercase">{product.id}</div>
                                                    </div>
                                                    <div className="text-lg md:text-xl font-Montserrat font-black mb-4 text-[var(--haku-ink)]">${product.price.toLocaleString()}</div>
                                                    <div className="flex flex-wrap gap-2 items-center mt-auto">
                                                        <span className="text-[8px] font-black uppercase tracking-widest border border-[var(--haku-ink)]/20 px-2 py-0.5">{product.category}</span>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 ${product.status === 'active' ? 'bg-[var(--haku-ink)] text-white' : 'opacity-20 border border-[var(--haku-ink)]/20'}`}>{statusLabel}</span>
                                                        <span className="text-[9px] font-black opacity-30 uppercase tracking-widest ml-auto">庫存: {product.stock}</span>
                                                    </div>

                                                    {/* Explicit Edit Button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                                                        className="absolute right-6 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center border border-[var(--haku-ink)]/10 text-[var(--haku-ink)]/30 hover:text-[var(--haku-ink)] hover:border-[var(--haku-ink)]/30 hover:bg-[var(--haku-ink)]/5 rounded-full transition-all duration-300 active:scale-95"
                                                        title="編輯商品"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!isLoading && products.length === 0 && (
                                <div className="py-40 text-center">
                                    <Package size={48} className="mx-auto mb-6 opacity-5" />
                                    <p className="text-[10px] font-black opacity-20 tracking-[0.6em] uppercase">No Inventory Found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW: Pages Management */}
                    {activeTab === 'pages' && (
                        <div className="animate-in fade-in duration-500 space-y-12">
                            <h2 className="text-[16px] font-Montserrat font-black uppercase tracking-[0.5em] text-[var(--haku-ink)] border-b border-[var(--haku-ink)]/10 pb-6">PAGE CONTENT</h2>

                            <div className="grid grid-cols-1 gap-8">
                                {pages.map(page => (
                                    <div key={page.id} className="bg-white border border-[var(--haku-ink)]/10 p-8">
                                        {editingPage?.id === page.id ? (
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase opacity-30 tracking-widest">標題</label>
                                                    <input
                                                        className="text-xl font-bold w-full bg-transparent border-none focus:ring-0 p-0"
                                                        value={editingPage.title}
                                                        onChange={e => setEditingPage({ ...editingPage, title: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase opacity-30 tracking-widest">內容正文</label>
                                                    <textarea
                                                        className="w-full min-h-[400px] text-sm leading-relaxed p-6 bg-[var(--haku-ink)]/5 border-none focus:ring-1 focus:ring-[var(--haku-ink)]/10"
                                                        value={editingPage.content}
                                                        onChange={e => setEditingPage({ ...editingPage, content: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex gap-4 pt-4">
                                                    <button
                                                        onClick={() => handleSavePage(page.id, editingPage.title, editingPage.content)}
                                                        className="px-12 py-5 bg-[var(--haku-ink)] text-white text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center"
                                                    >
                                                        儲存頁面
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingPage(null)}
                                                        className="px-8 py-5 border border-[var(--haku-ink)]/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center"
                                                    >
                                                        取消
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-xl font-bold">{page.title}</h3>
                                                    <button
                                                        onClick={() => setEditingPage(page)}
                                                        className="p-3 border border-[var(--haku-ink)]/10 text-[var(--haku-ink)]/30 hover:text-[var(--haku-ink)] hover:border-[var(--haku-ink)]/30 hover:bg-[var(--haku-ink)]/5 transition-all"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                </div>
                                                <div className="text-sm opacity-50 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                                                    {page.content}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VIEW: Settings Management */}
                    {activeTab === 'settings' && (
                        <div className="animate-in fade-in duration-500 space-y-12">
                            <div className="flex justify-between items-end border-b border-[var(--haku-ink)]/10 pb-6">
                                <h2 className="text-[16px] font-Montserrat font-black uppercase tracking-[0.5em] text-[var(--haku-ink)]">SYSTEM SETTINGS</h2>
                                {!editingSettings && (
                                    <button
                                        onClick={() => setEditingSettings({ ...settings })}
                                        className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all flex items-center gap-2"
                                    >
                                        <Edit3 size={14} /> 進入編輯模式
                                    </button>
                                )}
                            </div>

                            <div className="bg-white border border-[var(--haku-ink)]/10 p-8 sm:p-14">
                                {editingSettings ? (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                                            {Object.keys(settings).sort().map(key => (
                                                <div key={key} className={`space-y-3 ${key === 'about_text' ? 'md:col-span-2' : ''}`}>
                                                    <label className="text-[10px] font-Montserrat font-black uppercase opacity-30 tracking-widest">{key.replace(/_/g, ' ')}</label>
                                                    {key === 'about_text' ? (
                                                        <textarea
                                                            className="w-full p-6 bg-[var(--haku-ink)]/5 border-none text-sm min-h-[220px] leading-relaxed"
                                                            value={editingSettings[key]}
                                                            onChange={e => setEditingSettings({ ...editingSettings, [key]: e.target.value })}
                                                        />
                                                    ) : (
                                                        <input
                                                            className="w-full p-5 bg-[var(--haku-ink)]/5 border-none text-lg font-bold"
                                                            value={editingSettings[key]}
                                                            onChange={e => setEditingSettings({ ...editingSettings, [key]: e.target.value })}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-6 justify-between pt-12 border-t border-[var(--haku-ink)]/10">
                                            <button
                                                onClick={() => setEditingSettings(null)}
                                                className="px-8 py-5 border border-[var(--haku-ink)]/20 text-[10px] font-black uppercase tracking-widest order-2 md:order-1 flex items-center justify-center"
                                            >
                                                放棄所有變更
                                            </button>
                                            <button
                                                onClick={() => handleSaveSettings(editingSettings)}
                                                className="px-20 py-5 bg-[var(--haku-ink)] text-white text-[10px] font-black uppercase tracking-[0.4em] order-1 md:order-2 shadow-xl flex items-center justify-center"
                                            >
                                                核對並同步雲端
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                                            {Object.entries(settings).sort().map(([key, value]) => (
                                                <div key={key} className={`${key === 'about_text' ? 'md:col-span-2 border-t border-[var(--haku-ink)]/5 pt-10 mt-4' : ''}`}>
                                                    <div className="text-[10px] font-Montserrat font-black uppercase opacity-40 tracking-widest mb-3">{key.replace(/_/g, ' ')}</div>
                                                    <div className={`text-base font-bold leading-relaxed ${key === 'about_text' ? 'whitespace-pre-wrap opacity-60' : 'truncate'}`}>
                                                        {value || <span className="opacity-10 italic font-normal tracking-wider">Empty Field</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VIEW: Export Management */}
                    {activeTab === 'export' && (
                        <div className="animate-in fade-in duration-500 space-y-12 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between border-b border-[var(--haku-ink)]/10 pb-6">
                                <h2 className="text-[16px] font-Montserrat font-black uppercase tracking-[0.5em] text-[var(--haku-ink)]">EXCEL EXPORT</h2>
                                <FileDown className="opacity-20" size={24} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Left: Configure Mode */}
                                <div className="space-y-8 bg-white border border-[var(--haku-ink)]/10 p-10">
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">匯出模式</label>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setActiveExportMode('range')}
                                                className={`flex-1 py-4 border text-[10px] font-black uppercase tracking-widest transition-all ${activeExportMode === 'range' ? 'bg-[var(--haku-ink)] text-white border-[var(--haku-ink)]' : 'bg-transparent border-[var(--haku-ink)]/10 text-[var(--haku-ink)] opacity-40 hover:opacity-100'}`}
                                            >
                                                範圍選取
                                            </button>
                                            <button
                                                onClick={() => setActiveExportMode('manual')}
                                                className={`flex-1 py-4 border text-[10px] font-black uppercase tracking-widest transition-all ${activeExportMode === 'manual' ? 'bg-[var(--haku-ink)] text-white border-[var(--haku-ink)]' : 'bg-transparent border-[var(--haku-ink)]/10 text-[var(--haku-ink)] opacity-40 hover:opacity-100'}`}
                                            >
                                                手動勾選 ({selectedProductIds.length})
                                            </button>
                                        </div>
                                    </div>

                                    {activeExportMode === 'range' ? (
                                        <div className="space-y-6 animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black opacity-30 uppercase tracking-widest">起始編號 (含)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="haku_001"
                                                        className="w-full p-4 bg-[var(--haku-ink)]/5 border-none font-bold placeholder:opacity-20"
                                                        value={exportRange.start}
                                                        onChange={e => setExportRange({ ...exportRange, start: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black opacity-30 uppercase tracking-widest">結束編號 (含)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="haku_050"
                                                        className="w-full p-4 bg-[var(--haku-ink)]/5 border-none font-bold placeholder:opacity-20"
                                                        value={exportRange.end}
                                                        onChange={e => setExportRange({ ...exportRange, end: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[9px] font-bold opacity-30 italic leading-relaxed">提示：將匯出 ID 在此字母順序範圍內的所有商品。</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in slide-in-from-top-2">
                                            <p className="text-[11px] font-bold">已在「商品一覽」中勾選 {selectedProductIds.length} 項商品。</p>
                                            <button
                                                onClick={() => setSelectedProductIds([])}
                                                className="text-[9px] font-black uppercase text-red-900/60 hover:text-red-900 tracking-widest"
                                            >
                                                清除所有勾選
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Price Options */}
                                <div className="space-y-8 bg-white border border-[var(--haku-ink)]/10 p-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">上架手續費設定</label>
                                        <div className="flex items-center gap-6">
                                            <input
                                                type="number"
                                                className="w-24 p-4 bg-[var(--haku-ink)]/5 border-none text-2xl font-black text-center"
                                                value={exportFee}
                                                onChange={e => setExportFee(Number(e.target.value))}
                                            />
                                            <div className="flex-1">
                                                <div className="text-xl font-Montserrat font-black">%</div>
                                                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest mt-1">匯出售價 = 原價 / (1 - {exportFee}%)</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-[var(--haku-ink)]/5">
                                        <button
                                            onClick={handleExportXLSX}
                                            className="w-full py-6 bg-[var(--haku-ink)] text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-4"
                                        >
                                            <FileDown size={18} /> 開始匯出 XLSX
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <footer className="mt-40 pt-10 border-t border-[var(--haku-ink)]/10 flex flex-col md:flex-row justify-between items-center opacity-30 gap-6">
                        <div className="text-[9px] font-Montserrat font-black tracking-[0.5em] uppercase">HAKU YAKYUU SELECT © 2025</div>
                        <div className="flex gap-10">
                            <span className="text-[9px] font-black tracking-[0.2em] uppercase">System v3.0 Sequential</span>
                            <span className="text-[9px] font-black tracking-[0.2em] uppercase">Mobile Optimized</span>
                        </div>
                    </footer>
                </div>
            </main>
        </div>
    );
}
