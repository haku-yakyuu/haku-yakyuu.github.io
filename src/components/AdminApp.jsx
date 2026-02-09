import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Plus, LogOut, ArrowUp, ArrowDown, CheckCircle, AlertCircle, Lock,
    Menu, Package, Upload, ArrowLeft, ArrowRight, Image as ImageIcon, Star, Trash2, X, Edit3, User, Crop
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';
import CryptoJS from 'crypto-js';
import { getCroppedImg } from '../utils/cropImage';

// --- Configuration ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw7jGvpY2DU5dPdSdkXMcL4Mnf0jZIcKfMYEJOkIiDIm7qoMkGid-upq1AJ3mVRP9Il/exec";
const GITHUB_OWNER = "haku-yakyuu";
const GITHUB_REPO = "haku-yakyuu.github.io";
const GITHUB_BRANCH = "main";
const ENCRYPTED_TOKEN = "U2FsdGVkX1+VhTXj07qRpVUojK3OfTm/2e89vcATiPZEU+AwvuLdOeInMR/EYKQB1ZVIR8zSREm8rGpHstt/SuWv35IJNA4PUAvcptg06lvCNusYM1+LkxZ00xvS5n54cpghy6rxe6J2TQbxa3DztQ==";

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
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${dialog.type === 'error' ? 'bg-red-800' : 'bg-[var(--haku-ink)]'}`}></div>
            {dialog.type === 'error' ?
                <AlertCircle className="text-red-800" size={22} /> :
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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [githubToken, setGithubToken] = useState('');

    // Dialog State
    const [dialog, setDialog] = useState({ show: false, type: 'success', title: '', message: '' });

    // Data State
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // For Blocking Loader
    const [editingProduct, setEditingProduct] = useState(null);
    const [localCache, setLocalCache] = useState({}); // Simple map: filename -> blobUrl
    // Crop State
    const [cropImage, setCropImage] = useState(null); // File to crop
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // --- Init ---
    useEffect(() => {
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

        const savedToken = sessionStorage.getItem('github_token');
        if (savedToken) {
            setGithubToken(savedToken);
            setIsLoggedIn(true);
            fetchProducts();
        }
    }, []);

    // --- Actions ---
    const showDialog = (type, title, message) => {
        setDialog({ show: true, type, title, message });
        setTimeout(() => setDialog(prev => ({ ...prev, show: false })), 3000);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        try {
            const bytes = CryptoJS.AES.decrypt(ENCRYPTED_TOKEN, password);
            const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);

            if (decryptedToken.startsWith('github_pat_')) {
                sessionStorage.setItem('github_token', decryptedToken);
                setGithubToken(decryptedToken);
                setIsLoggedIn(true);
                showDialog('success', '驗證成功', '正在進入 HAKU 維護系統...');
                fetchProducts(); // Load data
            } else {
                showDialog('error', '驗證失敗', '密碼不正確');
            }
        } catch (e) {
            showDialog('error', '驗證失敗', '密碼不正確');
        }
    };

    const fetchProducts = async () => {
        if (!GAS_API_URL || GAS_API_URL.includes("YOUR_GAS_WEB_APP_URL")) {
            console.warn("GAS_API_URL is not configured.");
            return;
        }

        setIsLoading(true);
        try {
            // doGet via GAS
            const res = await fetch(GAS_API_URL);
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Received non-JSON response from GAS. Check your URL deployment.");
            }

            const data = await res.json();
            // Map GAS data to our state structure if needed
            // GAS returns: { products: [...], config: {...} }
            // Product structure in GAS: {id, name, price, stock, category, isFeatured, tags, status, images, layout, desc}
            // Images string "url1,url2" -> array
            const mappedProducts = data.products.map(p => ({
                ...p,
                images: p.images ? p.images.split(',').map(img => {
                    img = img.trim();
                    if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('/')) return img;
                    return `/products/${img}`;
                }) : [],
                price: Number(p.price),
                stock: Number(p.stock),
                isFeatured: p.isFeatured === true || p.isFeatured === "true"
            }));
            setProducts(mappedProducts);
        } catch (err) {
            console.error(err);
            showDialog('error', '載入失敗', '無法從 Google Sheets 讀取資料: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Image Handling ---
    const fileInputRef = useRef(null);
    const triggerFileUpload = () => fileInputRef.current?.click();

    const handleFileChange = async (e) => {
        if (!editingProduct) return;
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => setCropImage(reader.result));
        reader.readAsDataURL(file);

        // Reset input for same file upload
        e.target.value = null;
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
            const file = new File([blob], `crop-${Date.now()}.jpg`, { type: 'image/jpeg' });

            // Compress the cropped image
            const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1000, useWebWorker: true, fileType: 'image/jpeg' };
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
        // Prepare data structure
        setEditingProduct({
            ...product,
            // Map images to consistent structure
            rawImagesData: product.images.map(url => ({ url, isNew: false }))
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreateNew = () => {
        const now = new Date();
        const formattedDate =
            now.getFullYear().toString().slice(-2) +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');

        setEditingProduct({
            id: `haku_${formattedDate}`,
            name: '',
            price: 0,
            stock: 0,
            category: '',
            isFeatured: false,
            tags: '',
            status: 'active',
            images: [],
            rawImagesData: [],
            layout: 'vertical',
            desc: '',
            updatedAt: ''
        });
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
            await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'delete', id: editingProduct.id })
            });

            setProducts(products.filter(p => p.id !== editingProduct.id));
            setEditingProduct(null);
            showDialog('success', '已刪除', `商品 [${editingProduct.id}] 已成功移除`);
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

        // 1. Data Prep & Image Upload Phase
        try {
            for (let i = 0; i < finalImages.length; i++) {
                const item = finalImages[i];
                const expectedFileName = `${id}-${i}.jpg`;

                let blobToUpload = null;
                let previewToCache = item.preview;

                // Case A: New image from cropper
                if (item.isNew && item.file) {
                    blobToUpload = item.file;
                }
                // Case B: Existing image but position/index changed (Reordered)
                else if (item.url && !item.url.includes(expectedFileName)) {
                    // It was moved, need to re-upload to the new index filename
                    const res = await fetch(item.url);
                    blobToUpload = await res.blob();
                    previewToCache = item.url;
                }

                if (blobToUpload) {
                    const content = await toBase64(blobToUpload);
                    const base64 = content.split(',')[1];
                    await uploadToGitHub(expectedFileName, base64);

                    // Update Local Cache (for instant preview)
                    newLocalCache[expectedFileName] = previewToCache;
                    try {
                        localStorage.setItem(`haku_cache_${expectedFileName}`, JSON.stringify({
                            data: previewToCache,
                            timestamp: Date.now()
                        }));
                    } catch (e) { }
                }

                uploadedFileNames.push(expectedFileName);
            }
            setLocalCache(newLocalCache);
        } catch (err) {
            console.error(err);
            showDialog('error', '上傳失敗', err.message);
            setIsProcessing(false);
            return;
        }

        // 2. Data Save Phase - Save to Google Sheets
        try {
            const payload = {
                ...editingProduct,
                images: uploadedFileNames.join(','),
                rawImagesData: undefined
            };

            await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const updatedDocs = products.map(p => p.id === id ? { ...payload, images: uploadedFileNames } : p);
            if (!products.find(p => p.id === id)) updatedDocs.push({ ...payload, images: uploadedFileNames });
            setProducts(updatedDocs);

            showDialog('success', '存檔完成', `商品 [${id}] 已成功更新`);
            setEditingProduct(null);

        } catch (err) {
            console.error(err);
            showDialog('error', '存檔失敗', err.message);
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
        if (!res.ok) throw new Error("GitHub API Error");
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
                <div className="w-full max-w-sm bg-[var(--haku-paper)] border border-[var(--haku-ink)]/10 p-1">
                    <div className="border border-[var(--haku-ink)]/10">
                        <div className="p-16 text-center bg-[var(--haku-ink)] text-[var(--haku-paper)]">
                            <h1 className="text-6xl font-Montserrat font-black tracking-tighter mb-4">HAKU</h1>
                            <div className="h-[1px] w-12 bg-current mx-auto opacity-30 mb-4"></div>
                            <p className="text-[9px] tracking-[0.6em] opacity-50 uppercase font-bold">內部管理網路</p>
                        </div>
                        <form onSubmit={handleLogin} className="p-14 space-y-12">
                            <div className="space-y-4">
                                <label className="text-[10px] font-Montserrat font-black tracking-[0.3em] opacity-40 uppercase">管理者金鑰</label>
                                <div className="relative group">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity" size={16} />
                                    <input
                                        type="password" required placeholder="••••••••"
                                        className="w-full pl-8 py-4 bg-transparent border-b border-[var(--haku-ink)]/20 focus:border-[var(--haku-ink)] focus:outline-none text-lg font-black tracking-[0.4em] transition-all"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-5 text-[10px] font-Montserrat font-black tracking-[0.5em] bg-[var(--haku-ink)] text-[var(--haku-paper)] transition-all hover:opacity-90 active:scale-[0.98] shadow-xl"
                            >
                                登入系統
                            </button>
                            <p className="text-center text-[8px] font-black opacity-20 tracking-widest uppercase">僅供授權人員使用</p>
                        </form>
                    </div>
                </div>
            </div>
        );
    }



    return (
        <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: COLORS.paper }}>
            <FontStyles />
            <LoadingOverlay isProcessing={isProcessing} />
            <StatusDialog dialog={dialog} />

            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />

            {/* Global Header */}
            <header className="sticky top-0 z-50 bg-[var(--haku-paper)] border-b border-[var(--haku-ink)]/10 px-6 md:px-12 py-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                    <h1 className="font-Montserrat font-black text-2xl md:text-3xl tracking-tighter text-[var(--haku-ink)]">HAKU</h1>
                    <div className="h-4 w-[1px] bg-[var(--haku-ink)]/10 hidden md:block"></div>
                    <p className="text-[9px] font-black opacity-20 tracking-[0.4em] uppercase hidden md:block">維護管理系統</p>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <a href="/" className="p-3 hover:bg-[var(--haku-ink)]/5 transition-all active:scale-90 group relative" title="使用者頁面">
                        <User size={20} className="text-[var(--haku-ink)] opacity-40 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <button
                        onClick={() => { setIsLoggedIn(false); sessionStorage.clear(); }}
                        className="p-3 hover:bg-[var(--haku-ink)]/5 transition-all active:scale-90 group relative"
                        title="登出系統"
                    >
                        <LogOut size={20} className="text-[var(--haku-ink)] opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 overflow-y-auto w-full">
                <div className="p-6 md:p-16 max-w-7xl mx-auto pb-32">
                    <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 md:mb-20 gap-8">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-Montserrat font-black tracking-tighter text-[var(--haku-ink)] uppercase">維護中心</h1>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            disabled={!!editingProduct}
                            className={`group flex items-center justify-center gap-4 px-10 py-5 bg-[var(--haku-ink)] text-[var(--haku-paper)] font-Montserrat font-black text-[12px] tracking-[0.3em] transition-all w-full md:w-auto uppercase ${editingProduct ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:shadow-[0_20px_40px_rgba(62,39,35,0.2)] active:scale-95'}`}
                        >
                            <Plus size={18} className={`transition-transform ${!editingProduct ? 'group-hover:rotate-90' : ''}`} />
                            新增品項
                        </button>
                    </header>

                    {/* Editor Modal */}
                    {editingProduct && (
                        <div className="mb-12 md:mb-24 bg-[var(--haku-paper)] p-8 md:p-16 border border-[var(--haku-ink)]/20 shadow-[-20px_20px_60px_rgba(62,39,35,0.05)] relative animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <button onClick={() => setEditingProduct(null)} className="absolute top-6 right-6 md:top-10 md:right-10 p-2 opacity-20 hover:opacity-100 transition-all active:scale-75">
                                <X size={28} className="text-[var(--haku-ink)]" />
                            </button>

                            <form onSubmit={handleSave} className="space-y-12 md:space-y-20">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20">

                                    {/* Image Management Section */}
                                    <div className="lg:col-span-12 space-y-6 md:space-y-10">
                                        <div className="flex justify-between items-end border-b border-[var(--haku-ink)]/10 pb-4">
                                            <div>
                                                <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] text-[var(--haku-ink)]">媒體資產</label>
                                                <p className="text-[9px] opacity-30 uppercase font-bold mt-1">支援拖曳排序功能</p>
                                            </div>
                                            <button
                                                type="button" onClick={triggerFileUpload}
                                                className="px-6 py-3 border border-[var(--haku-ink)] text-[10px] font-Montserrat font-black tracking-widest uppercase flex items-center gap-3 bg-transparent text-[var(--haku-ink)] hover:bg-[var(--haku-ink)] hover:text-[var(--haku-paper)] transition-all active:scale-95"
                                            >
                                                <Upload size={14} /> 上傳新圖
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
                                            {(editingProduct.rawImagesData || editingProduct.images || []).map((imgData, idx) => {
                                                const src = imgData.preview || getProductImage(imgData.url || imgData);
                                                return (
                                                    <div key={idx} className="group relative aspect-square border border-[var(--haku-ink)]/10 overflow-hidden bg-[var(--placeholder-bg)] shadow-sm">
                                                        <img src={src} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Entry ${idx}`} />
                                                        {/* Overlay Controls */}
                                                        <div className="absolute inset-0 bg-[var(--haku-ink)]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-4 p-4">
                                                            <div className="flex gap-2">
                                                                <button type="button" onClick={() => moveImage(idx, -1)} className="p-2 bg-[var(--haku-paper)] text-[var(--haku-ink)] active:scale-75 transition-transform"><ArrowLeft size={16} /></button>
                                                                <button type="button" onClick={() => moveImage(idx, 1)} className="p-2 bg-[var(--haku-paper)] text-[var(--haku-ink)] active:scale-75 transition-transform"><ArrowRight size={16} /></button>
                                                            </div>
                                                            <button type="button" onClick={() => removeImage(idx)} className="w-full py-2 bg-red-900 text-[var(--haku-paper)] text-[9px] font-Montserrat font-black tracking-widest uppercase active:scale-95 transition-transform flex items-center justify-center gap-2">
                                                                <Trash2 size={12} /> 移除圖片
                                                            </button>
                                                        </div>
                                                        {/* Index Badge */}
                                                        <div className="absolute top-0 left-0 px-3 py-1 bg-[var(--haku-ink)] text-[var(--haku-paper)] text-[10px] font-Montserrat font-black">{idx + 1}</div>
                                                    </div>
                                                );
                                            })}
                                            {(!editingProduct.images || editingProduct.images.length === 0) && (
                                                <div className="col-span-full py-24 border border-dashed border-[var(--haku-ink)]/20 flex flex-col items-center justify-center opacity-30" >
                                                    <ImageIcon size={40} className="mb-4 text-[var(--haku-ink)]" />
                                                    <span className="text-[10px] font-Montserrat font-black tracking-[0.4em] uppercase text-[var(--haku-ink)]">尚無媒體檔案</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Text Fields */}
                                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">商品編號</label>
                                            <input type="text" required className="w-full p-0 py-3 bg-transparent border-b border-[var(--haku-ink)]/10 text-xl font-black focus:outline-none focus:border-[var(--haku-ink)] transition-all placeholder:opacity-10" placeholder="例如：haku_001" value={editingProduct.id} onChange={e => setEditingProduct({ ...editingProduct, id: e.target.value })} />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">商品名稱</label>
                                            <input type="text" required className="w-full p-0 py-3 bg-transparent border-b border-[var(--haku-ink)]/10 text-xl font-bold focus:outline-none focus:border-[var(--haku-ink)] transition-all placeholder:opacity-10" placeholder="輸入商品名稱" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">商品分類</label>
                                            <input list="cat-list" type="text" className="w-full p-0 py-3 bg-transparent border-b border-[var(--haku-ink)]/10 text-xl font-bold focus:outline-none focus:border-[var(--haku-ink)] transition-all" value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} />
                                            <datalist id="cat-list">
                                                {INITIAL_CATEGORIES.map(c => <option key={c} value={c} />)}
                                            </datalist>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">售價 (TWD)</label>
                                            <div className="relative">
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-Montserrat font-black opacity-20">$</span>
                                                <input type="number" className="w-full pl-6 py-3 bg-transparent border-b border-[var(--haku-ink)]/10 text-xl font-Montserrat font-black focus:outline-none focus:border-[var(--haku-ink)] transition-all" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) })} />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">在庫數量</label>
                                            <input type="number" className="w-full p-0 py-3 bg-transparent border-b border-[var(--haku-ink)]/10 text-xl font-Montserrat font-black focus:outline-none focus:border-[var(--haku-ink)] transition-all" value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })} />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">檢索標籤 (以逗號分隔)</label>
                                            <input type="text" className="w-full p-0 py-3 bg-transparent border-b border-[var(--haku-ink)]/10 text-xl font-bold focus:outline-none focus:border-[var(--haku-ink)] transition-all placeholder:opacity-10" placeholder="標籤1, 標籤2..." value={editingProduct.tags} onChange={e => setEditingProduct({ ...editingProduct, tags: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="lg:col-span-4 space-y-10 md:space-y-12">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">上架狀態</label>
                                            <select className="w-full py-3 bg-transparent border-b border-[var(--haku-ink)]/10 text-sm font-Montserrat font-black focus:outline-none cursor-pointer uppercase" value={editingProduct.status} onChange={e => setEditingProduct({ ...editingProduct, status: e.target.value })}>
                                                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">版型配置</label>
                                            <select className="w-full py-3 bg-transparent border-b border-[var(--haku-ink)]/10 text-sm font-Montserrat font-black focus:outline-none cursor-pointer uppercase" value={editingProduct.layout} onChange={e => setEditingProduct({ ...editingProduct, layout: e.target.value })}>
                                                {LAYOUT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                        </div>

                                        <div className="pt-4">
                                            <div
                                                onClick={() => setEditingProduct({ ...editingProduct, isFeatured: !editingProduct.isFeatured })}
                                                className="flex items-center gap-5 cursor-pointer group select-none active:scale-95 transition-transform"
                                            >
                                                <div className={`w-10 h-10 border transition-all flex items-center justify-center ${editingProduct.isFeatured ? 'bg-[var(--haku-ink)] border-[var(--haku-ink)] shadow-lg' : 'border-[var(--haku-ink)]/10'}`}>
                                                    <Star size={20} className={editingProduct.isFeatured ? 'text-[var(--haku-paper)] fill-current' : 'opacity-10'} />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] text-[var(--haku-ink)]">設為精選推薦商品</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-12 space-y-6">
                                        <label className="text-[10px] font-Montserrat font-black uppercase tracking-[0.3em] opacity-40">商品詳細描述</label>
                                        <textarea className="w-full p-8 bg-[var(--placeholder-bg)]/20 border border-[var(--haku-ink)]/10 focus:outline-none focus:bg-white focus:border-[var(--haku-ink)]/30 transition-all min-h-[220px] text-sm leading-relaxed" value={editingProduct.desc} onChange={e => setEditingProduct({ ...editingProduct, desc: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse md:flex-row justify-between gap-6 md:gap-10 pt-16 border-t border-[var(--haku-ink)]/10">
                                    {/* Delete Button - only for existing products */}
                                    {products.some(p => p.id === editingProduct.id) && (
                                        <button type="button" onClick={handleDelete} className="w-full md:w-auto px-8 py-5 text-[10px] font-Montserrat font-black tracking-[0.4em] uppercase border border-[var(--haku-ink)]/20 text-[var(--haku-ink)]/60 hover:border-[var(--haku-ink)] hover:text-[var(--haku-ink)] transition-all active:scale-95 flex items-center justify-center gap-3">
                                            <Trash2 size={14} />
                                            刪除商品
                                        </button>
                                    )}
                                    <div className="flex flex-col-reverse md:flex-row gap-6 md:gap-10 md:ml-auto">
                                        <button type="button" onClick={() => setEditingProduct(null)} className="w-full md:w-auto px-12 py-5 text-[10px] font-Montserrat font-black tracking-[0.4em] uppercase border border-[var(--haku-ink)]/10 hover:border-[var(--haku-ink)] transition-all active:scale-95">捨棄變更</button>
                                        <button type="submit" className="w-full md:w-auto px-16 py-5 text-[10px] font-Montserrat font-black tracking-[0.4em] uppercase bg-[var(--haku-ink)] text-[var(--haku-paper)] transition-all hover:shadow-2xl active:scale-95">核對並儲存</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Data Grid */}
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-6 mb-32">
                        {isLoading ? (
                            <div className="text-center py-20 opacity-20 text-[10px] font-Montserrat font-black tracking-[0.5em] uppercase italic">同步中...</div>
                        ) : (
                            products.map(product => {
                                const statusLabel = STATUS_OPTIONS.find(o => o.value === product.status)?.label || product.status;
                                return (
                                    <div key={product.id} className="bg-[var(--haku-paper)] border border-[var(--haku-ink)]/10 shadow-sm p-6 space-y-6 relative overflow-hidden group">
                                        {product.isFeatured && <div className="absolute top-0 right-0 px-3 py-1 bg-[var(--haku-ink)] text-[var(--haku-paper)] text-[8px] font-black uppercase tracking-widest z-10">精選推薦</div>}
                                        <div className="flex gap-6">
                                            <div className="w-24 h-24 bg-[var(--placeholder-bg)] flex-shrink-0 border border-[var(--haku-ink)]/5 overflow-hidden aspect-square">
                                                {product.images && product.images.length > 0 ? <img src={getProductImage(product.images[0])} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" /> : <ImageIcon className="w-full h-full p-6 opacity-10 text-[var(--haku-ink)]" />}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="font-bold text-base tracking-tight mb-1 truncate text-[var(--haku-ink)]">{product.name}</div>
                                                <div className="text-[9px] font-Montserrat font-black opacity-30 tracking-[0.2em] uppercase mb-3">{product.id}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="text-[8px] px-2 py-0.5 border border-[var(--haku-ink)]/20 font-black uppercase tracking-wider">{product.category}</span>
                                                    <span className={`text-[8px] px-2 py-0.5 border border-[var(--haku-ink)]/20 font-black uppercase tracking-wider ${product.status === 'active' ? 'bg-[var(--haku-ink)] text-[var(--haku-paper)]' : 'opacity-30'}`}>{statusLabel}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-6 border-t border-[var(--haku-ink)]/5">
                                            <div className="text-xl font-Montserrat font-black text-[var(--haku-ink)]">${product.price.toLocaleString()}</div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-[9px] font-Montserrat font-black opacity-30 uppercase tracking-widest">在庫: {product.stock}</div>
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="w-12 h-12 flex items-center justify-center border border-[var(--haku-ink)] text-[var(--haku-ink)] hover:bg-[var(--haku-ink)] hover:text-[var(--haku-paper)] transition-all active:scale-75"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-[var(--haku-paper)] border border-[var(--haku-ink)]/10 shadow-[-40px_40px_100px_rgba(62,39,35,0.03)] group transition-all">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-Montserrat font-black uppercase tracking-[0.4em] text-[var(--haku-ink)] border-b border-[var(--haku-ink)]/10">
                                    <th className="px-10 py-10 font-black">選物目標</th>
                                    <th className="px-10 py-10 font-black">分類區域</th>
                                    <th className="px-10 py-10 font-black text-center">在庫量</th>
                                    <th className="px-10 py-10 font-black">建議售價</th>
                                    <th className="px-10 py-10 font-black">上架狀態</th>
                                    <th className="px-10 py-10 font-black text-right opacity-30">操作控管</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--haku-ink)]/5">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="py-32 text-center opacity-20 text-[10px] font-Montserrat font-black tracking-[0.5em] uppercase italic">資料同步傳輸中...</td></tr>
                                ) : products.map(product => {
                                    const statusLabel = STATUS_OPTIONS.find(o => o.value === product.status)?.label || product.status;
                                    return (
                                        <tr key={product.id} className="hover:bg-[var(--haku-ink)]/[0.02] transition-colors group/row">
                                            <td className="px-10 py-10">
                                                <div className="flex items-center gap-8">
                                                    <div className="w-20 h-20 bg-[var(--placeholder-bg)] flex-shrink-0 border border-[var(--haku-ink)]/5 overflow-hidden relative shadow-sm aspect-square">
                                                        {product.images && product.images.length > 0 ? <img src={getProductImage(product.images[0])} className="w-full h-full object-cover grayscale-[0.4] group-hover/row:grayscale-0 group-hover/row:scale-110 transition-all duration-700" /> : <ImageIcon className="w-full h-full p-6 opacity-10 text-[var(--haku-ink)]" />}
                                                        {product.isFeatured && <div className="absolute top-0 right-0 p-1.5 bg-[var(--haku-ink)]" title="精選推薦商品"><Star size={10} className="text-[var(--haku-paper)] fill-current" /></div>}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-lg tracking-tight mb-1 text-[var(--haku-ink)]">{product.name}</div>
                                                        <div className="text-[10px] font-Montserrat font-black opacity-20 tracking-[0.3em] uppercase group-hover/row:opacity-40 transition-opacity">{product.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-10">
                                                <span className="text-[10px] font-black tracking-[0.2em] px-4 py-1.5 border border-[var(--haku-ink)]/10 uppercase text-[var(--haku-ink)]">{product.category}</span>
                                            </td>
                                            <td className="px-10 py-10 text-center font-Montserrat font-black text-sm text-[var(--haku-ink)]">{product.stock}</td>
                                            <td className="px-10 py-10 font-Montserrat font-black text-lg text-[var(--haku-ink)]">${product.price.toLocaleString()}</td>
                                            <td className="px-10 py-10">
                                                <span className={`text-[9px] font-Montserrat font-black tracking-[0.3em] uppercase px-3 py-1 border ${product.status === 'active' ? 'bg-[var(--haku-ink)] border-[var(--haku-ink)] text-[var(--haku-paper)]' : 'border-[var(--haku-ink)]/20 opacity-30 text-[var(--haku-ink)]'}`}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-10 py-10 text-right">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="w-14 h-14 bg-transparent border border-[var(--haku-ink)]/10 text-[var(--haku-ink)] hover:bg-[var(--haku-ink)] hover:text-[var(--haku-paper)] hover:border-[var(--haku-ink)] shadow-sm hover:shadow-xl transition-all active:scale-[0.85] flex items-center justify-center ml-auto"
                                                >
                                                    <Edit3 size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && products.length === 0 && (
                        <div className="p-20 md:p-40 text-center">
                            <Package size={48} className="mx-auto mb-6 opacity-5 md:w-16 md:h-16" />
                            <p className="text-[10px] md:text-xs font-black opacity-20 tracking-[0.5em] uppercase">尚無在庫資料</p>
                        </div>
                    )}

                    <footer className="mt-12 md:mt-20 py-8 md:py-10 border-t flex flex-col md:flex-row justify-between items-center opacity-20 gap-4" style={{ borderColor: COLORS.border }}>
                        <div className="text-[9px] md:text-[10px] font-black tracking-[0.5em] uppercase">HAKU YAKYUU SELECT © 2025</div>
                        <div className="text-[9px] md:text-[10px] font-black tracking-[0.5em] uppercase">Admin v2.1 Mobile</div>
                    </footer>

                </div> {/* End of main content wrapper */}
            </main>
        </div>
    );
}
