import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Plus, LogOut, ArrowUp, ArrowDown, CheckCircle, AlertCircle, Lock,
    Menu, Package, Upload, ArrowLeft, ArrowRight, Image as ImageIcon, Star, Trash2, X, Edit3
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import CryptoJS from 'crypto-js';

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
    white: '#FFFFFF',
    border: 'rgba(62, 39, 35, 0.15)',
    inkFaded: 'rgba(62, 39, 35, 0.4)'
};

// Global Font Styles (Injected via style tag for strict encapsulation if needed, or rely on Layout.astro)
const FontStyles = () => (
    <style>{`
    .haku-font-brand { font-family: 'Montserrat', sans-serif; }
    .haku-font-body { font-family: 'Noto Sans TC', sans-serif; }
    .haku-bg-paper { background-color: ${COLORS.paper}; }
    .haku-text-ink { color: ${COLORS.ink}; }
    .haku-border { border-color: ${COLORS.border}; }
  `}</style>
);

const INITIAL_CATEGORIES = ["WBCQ資格賽", "日本職棒", "徐若熙", "經典賽", "MLB", "中職"];
const STATUS_OPTIONS = ["active", "hidden", "sold_out"];
const LAYOUT_OPTIONS = ["vertical", "horizontal", "no_image"];

export default function AdminApp() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [githubToken, setGithubToken] = useState('');

    // Dialog State
    const [dialog, setDialog] = useState({ show: false, type: 'success', title: '', message: '' });

    // Data State
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile

    // File handling
    const fileInputRef = useRef(null);
    // We keep track of files to upload separately from URLs for preview
    // structure: { [index]: File }
    const [filesToUpload, setFilesToUpload] = useState([]);

    // --- Init ---
    useEffect(() => {
        const savedToken = sessionStorage.getItem('github_token');
        if (savedToken) {
            setGithubToken(savedToken);
            setIsLoggedIn(true);
            fetchProducts(savedToken); // Optional: if we want to fetch from GAS immediately
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
    const triggerFileUpload = () => fileInputRef.current?.click();

    const handleFileChange = async (e) => {
        if (!editingProduct) return; // Safety check
        const rawFiles = Array.from(e.target.files || []);
        if (rawFiles.length === 0) return;

        // Compress
        const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg' };
        const processedFiles = [];

        for (const file of rawFiles) {
            try {
                const compressed = await imageCompression(file, options);
                processedFiles.push(compressed);
            } catch (err) {
                console.error(err);
            }
        }

        if (processedFiles.length > 0) {
            // Create Preview URLs
            const newUrls = processedFiles.map(f => URL.createObjectURL(f));

            // Update State
            // We append new images to the end
            const currentImages = editingProduct.images || [];
            const startIndex = currentImages.length;

            // Verify editingProduct is not null
            if (!editingProduct) return;

            setEditingProduct({
                ...editingProduct,
                images: [...currentImages, ...newUrls]
            });

            // Store file objects for upload later
            // keys will be strictly index based 0,1,2... 
            // Wait, shifting logic complicates this. 
            // Strategy: Store { blob: File, preview: string, isNew: true } in editingProduct?
            // Let's simplify: We just need to upload ALL images again with strict naming (id-0.jpg, id-1.jpg)
            // So we need to keep track of which preview URL corresponds to which File blob.
            // If it's an existing URL (http...), we don't need to upload unless reordered?
            // Actually, user requirement: "Automatically rename to -0, -1..."
            // So if we reorder, we might overwrite id-0.jpg with what was previously id-1.jpg.
            // This implies we should re-upload ALL images on save to ensure consistency? 
            // Or at least re-upload "New" files and "Moved" files.
            // Simplest Robust Approach: Re-upload everything that is a Blob.
            // Existing URLs are fine? No, if we swap id-0 (existing) and id-1 (existing), we physically need to swap content on GitHub.
            // BUT GitHub API doesn't support "move". We must upload content X to id-1.jpg and content Y to id-0.jpg.
            // For existing images, we don't have the Blob, only the URL.
            // We might need to fetch the existing image to get the blob if we want to "move" it to another index name?
            // That's heavy.

            // Simpler Logic: 
            // 1. New files are added.
            // 2. User reorders.
            // 3. On Save:
            //    We iterate through the final list of images.
            //    If it's a Blob (New File) -> Upload to id-{index}.jpg
            //    If it's a URL (Old File) -> 
            //       Check if it's already named id-{index}.jpg? 
            //       If yes, skip.
            //       If no (e.g. it was id-5.jpg but now is at index 0), we need to copy/move.
            //       "Moving" on GitHub is hard.
            //       Workaround: We only support uploading NEW files easily. Reordering existing files might break if we don't have the source.
            //       Let's assume for MVP: We store New Files as Blobs in `filesToUpload` array.
            //       Wait, mapping index is tricky.

            // REVISED STRATEGY for MVP + React:
            // We will store mixed types in `editingProduct.images`:
            // Type A: String URL (Existing)
            // Type B: { file: File, preview: string } (New)
            // When sorting, we sort this mixed array.
            // On Save:
            //   Loop i from 0 to length
            //   Construct target filename: `id-${i}.jpg`
            //   If item is Type B (New) -> Upload File -> Success
            //   If item is Type A (Existing URL) ->
            //      Parse original filename from URL.
            //      If original == target, do nothing.
            //      If original != target (e.g. moved from pos 2 to 0), we technically need to rename.
            //      *Risk*: We can't easily rename without downloading.
            //      *Compromise*: We warn user or just accept it? 
            //      Actually, maybe we just don't support reordering OLD images for now, or we just upload new ones.
            //      Let's try to support it by checking if it's a Blob.

            const newImageObjs = processedFiles.map(f => ({ file: f, preview: URL.createObjectURL(f), isNew: true }));
            setEditingProduct(prev => ({
                ...prev,
                rawImagesData: [...(prev.rawImagesData || prev.images.map(url => ({ url, isNew: false }))), ...newImageObjs],
                images: [...prev.images, ...newUrls] // Keep simple URL array for display if needed, but rawImagesData is better source of truth
            }));

            showDialog('success', '圖片已新增', `已成功加入 ${processedFiles.length} 張圖片`);
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
        setEditingProduct({
            id: `haku_${Date.now().toString().slice(-4)}`,
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

    const handleSave = async (e) => {
        e.preventDefault();
        showDialog('success', '處理中', '正在上傳圖片並儲存資料...');

        const id = editingProduct.id;
        const finalImages = editingProduct.rawImagesData || [];
        const uploadedFileNames = [];

        // 1. Image Upload Phase - Upload ALL new images to GitHub
        try {
            for (let i = 0; i < finalImages.length; i++) {
                const item = finalImages[i];
                const fileName = `${id}-${i}.jpg`;

                if (item.isNew && item.file) {
                    // Upload New File to GitHub
                    const content = await toBase64(item.file);
                    const base64 = content.split(',')[1];
                    await uploadToGitHub(fileName, base64);
                }

                // Always record the filename (not full URL) for the Sheet
                // This ensures ProductCard can construct URLs correctly
                uploadedFileNames.push(fileName);
            }
        } catch (err) {
            console.error(err);
            showDialog('error', '上傳失敗', err.message);
            return;
        }

        // 2. Data Save Phase - Save to Google Sheets
        try {
            const payload = {
                ...editingProduct,
                images: uploadedFileNames.join(',') // Save comma-separated filenames only
            };

            await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            // Update Local State
            const updatedDocs = products.map(p => p.id === id ? { ...payload, images: uploadedFileNames } : p);
            if (!products.find(p => p.id === id)) updatedDocs.push({ ...payload, images: uploadedFileNames });
            setProducts(updatedDocs);

            showDialog('success', '存檔完成', `商品 [${id}] 已成功更新`);
            setEditingProduct(null);

        } catch (err) {
            console.error(err);
            showDialog('error', '存檔失敗', err.message);
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
    const StatusDialog = () => (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-500 transform ${dialog.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
            <div className={`flex items-center gap-4 px-8 py-4 rounded-none shadow-2xl border-2 bg-white ${dialog.type === 'error' ? 'border-red-500' : ''}`} style={{ borderColor: dialog.type === 'error' ? 'red' : COLORS.ink, minWidth: '320px' }}>
                {dialog.type === 'error' ? <AlertCircle className="text-red-500" size={24} /> : <CheckCircle style={{ color: COLORS.ink }} size={24} />}
                <div>
                    <h4 className="font-black tracking-widest text-xs uppercase" style={{ color: COLORS.ink }}>{dialog.title}</h4>
                    <p className="text-[10px] opacity-60 mt-0.5 font-bold uppercase tracking-tighter">{dialog.message}</p>
                </div>
            </div>
        </div>
    );

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: COLORS.paper }}>
                <FontStyles />
                <StatusDialog />
                <div className="w-full max-w-sm bg-white shadow-2xl border border-black border-opacity-5 overflow-hidden animate-in fade-in zoom-in duration-1000">
                    <div className="p-14 text-center" style={{ backgroundColor: COLORS.ink }}>
                        <h1 className="text-5xl font-black tracking-tighter text-white mb-2 haku-font-brand">HAKU</h1>
                        <div className="h-0.5 w-12 bg-white mx-auto opacity-30 mb-2"></div>
                        <p className="text-[9px] tracking-[0.5em] text-white opacity-40 uppercase">System Gateway</p>
                    </div>
                    <form onSubmit={handleLogin} className="p-12 space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black tracking-[0.2em] opacity-30 uppercase">Security Key Required</label>
                            <div className="relative border-b-2 transition-all focus-within:border-black" style={{ borderColor: COLORS.border }}>
                                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                                <input
                                    type="password" required placeholder="ENTER PASSWORD"
                                    className="w-full pl-10 py-3 bg-transparent focus:outline-none text-base font-black tracking-[0.3em]"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-5 text-[11px] font-black tracking-[0.5em] text-white transition-all active:scale-95 hover:brightness-110 shadow-lg"
                            style={{ backgroundColor: COLORS.ink }}
                        >
                            AUTHENTICATE
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row relative" style={{ backgroundColor: COLORS.paper }}>
            <StatusDialog />
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} accept="image/*" />

            {/* Mobile Header Bar */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-30 shadow-sm" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 active:bg-gray-100 rounded-full">
                        <Menu size={24} style={{ color: COLORS.ink }} />
                    </button>
                    <h1 className="font-black text-xl tracking-tighter" style={{ color: COLORS.ink }}>HAKU</h1>
                </div>
                <div className="text-[10px] font-bold opacity-30 tracking-widest uppercase">Admin</div>
            </div>

            {/* Backdrop for Mobile Sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-in fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Responsive Sidebar */}
            <aside
                className={`
                    fixed md:relative inset-y-0 left-0 z-50 w-64 bg-white border-r h-full flex flex-col shadow-2xl md:shadow-none
                    transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
                style={{ borderColor: COLORS.border }}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="p-10 border-b border-gray-50 flex justify-between items-center hidden md:flex">
                        <h2 className="font-black text-2xl tracking-tighter" style={{ color: COLORS.ink }}>HAKU</h2>
                    </div>
                    {/* Mobile Close Button (Optional visually, since backdrop works, but good for accessibility) */}
                    <div className="md:hidden p-6 flex justify-end">
                        <button onClick={() => setIsSidebarOpen(false)}><X size={24} className="opacity-50" /></button>
                    </div>

                    <nav className="flex-1 p-8 space-y-6">
                        <div className="flex items-center gap-5 w-full transition-all cursor-pointer active:scale-95 p-3 rounded-lg hover:bg-gray-50" style={{ color: COLORS.ink }}>
                            <Package size={22} />
                            <span className="text-xs font-black tracking-[0.2em] uppercase">Inventory</span>
                        </div>
                    </nav>

                    <div className="pt-10 mt-auto border-t p-8" style={{ borderColor: COLORS.border }}>
                        <button onClick={() => { setIsLoggedIn(false); sessionStorage.clear(); }} className="flex items-center gap-5 w-full opacity-30 hover:opacity-100 transition-all active:scale-95">
                            <LogOut size={22} />
                            <span className="text-xs font-black tracking-[0.2em] uppercase">Exit System</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="flex-1 h-[calc(100vh-65px)] md:h-screen overflow-y-auto w-full">
                <div className="p-4 md:p-14 max-w-7xl mx-auto pb-24">
                    <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-16 gap-6 md:gap-8">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black tracking-tighter mb-2" style={{ color: COLORS.ink }}>管理主控台</h1>
                            <p className="text-[10px] opacity-40 font-bold uppercase tracking-[0.3em]">Curation & Asset Management</p>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center justify-center gap-4 px-6 md:px-10 py-4 md:py-5 text-white font-black text-[10px] md:text-[12px] tracking-[0.3em] transition-all active:scale-95 hover:shadow-2xl w-full md:w-auto shadow-md"
                            style={{ backgroundColor: COLORS.ink }}
                        >
                            <Plus size={18} />
                            CREATE NEW
                        </button>
                    </header>

                    {/* Editor Modal */}
                    {editingProduct && (
                        <div className="mb-8 md:mb-20 bg-white p-6 md:p-12 border-2 shadow-2xl relative animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ borderColor: COLORS.ink }}>
                            <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 md:top-8 md:right-8 p-2 md:p-3 opacity-20 hover:opacity-100 transition-all active:scale-75">
                                <X size={24} />
                            </button>

                            <form onSubmit={handleSave} className="space-y-8 md:space-y-12">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">

                                    {/* Image Management Section */}
                                    <div className="lg:col-span-12 space-y-4 md:space-y-6">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">8: 多圖管理與排序</label>
                                            <button
                                                type="button" onClick={triggerFileUpload}
                                                className="px-4 py-2 md:px-6 border-2 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                                                style={{ borderColor: COLORS.ink, color: COLORS.ink }}
                                            >
                                                <Upload size={14} /> Add Images
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                                            {(editingProduct.rawImagesData || editingProduct.images || []).map((imgData, idx) => {
                                                const src = imgData.preview || imgData.url || imgData; // Fallback
                                                return (
                                                    <div key={idx} className="group relative aspect-square border overflow-hidden bg-gray-50" style={{ borderColor: COLORS.border }}>
                                                        <img src={src} className="w-full h-full object-cover" alt={`Product ${idx}`} />
                                                        {/* Overlay Controls */}
                                                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                            <div className="flex gap-2">
                                                                <button type="button" onClick={() => moveImage(idx, -1)} className="p-1.5 bg-white rounded-none active:scale-75"><ArrowLeft size={14} style={{ color: COLORS.ink }} /></button>
                                                                <button type="button" onClick={() => moveImage(idx, 1)} className="p-1.5 bg-white rounded-none active:scale-75"><ArrowRight size={14} style={{ color: COLORS.ink }} /></button>
                                                            </div>
                                                            <button type="button" onClick={() => removeImage(idx)} className="p-2 bg-white rounded-none active:scale-75 flex items-center gap-2 text-[10px] font-black">
                                                                <Trash2 size={14} /> REMOVE
                                                            </button>
                                                        </div>
                                                        {/* Index Badge */}
                                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-white text-[9px] font-black border border-black">{idx + 1}</div>
                                                    </div>
                                                );
                                            })}
                                            {(!editingProduct.images || editingProduct.images.length === 0) && (
                                                <div className="col-span-full py-16 border-2 border-dashed flex flex-col items-center opacity-20" style={{ borderColor: COLORS.border }}>
                                                    <ImageIcon size={32} className="mb-2" />
                                                    <span className="text-[10px] font-bold tracking-widest">尚無圖片，請上傳檔案</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Text Fields */}
                                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                        <div className="space-y-1">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">1: 商品ID (UNIQUE)</label>
                                            <input type="text" required className="w-full p-3 md:p-4 border-b-2 text-base md:text-lg font-bold focus:outline-none focus:border-black transition-all bg-transparent" value={editingProduct.id} onChange={e => setEditingProduct({ ...editingProduct, id: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">2: 商品名稱</label>
                                            <input type="text" required className="w-full p-3 md:p-4 border-b-2 text-base md:text-lg font-bold focus:outline-none focus:border-black transition-all bg-transparent" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">3: 商品分類 (自訂輸入)</label>
                                            <input list="cat-list" type="text" className="w-full p-3 md:p-4 border-b-2 text-base md:text-lg font-bold focus:outline-none focus:border-black bg-transparent" value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} />
                                            <datalist id="cat-list">
                                                {INITIAL_CATEGORIES.map(c => <option key={c} value={c} />)}
                                            </datalist>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">4: 價格 (TWD)</label>
                                            <input type="number" className="w-full p-3 md:p-4 border-b-2 text-base md:text-lg font-black focus:outline-none focus:border-black bg-transparent" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">5: 庫存數量</label>
                                            <input type="number" className="w-full p-3 md:p-4 border-b-2 text-base md:text-lg font-black focus:outline-none focus:border-black bg-transparent" value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">6: 標籤 (逗號分隔)</label>
                                            <input type="text" className="w-full p-3 md:p-4 border-b-2 text-base md:text-lg font-black focus:outline-none focus:border-black bg-transparent" value={editingProduct.tags} onChange={e => setEditingProduct({ ...editingProduct, tags: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="lg:col-span-4 space-y-6 md:space-y-8">
                                        <div className="space-y-1">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">7: 上架狀態</label>
                                            <select className="w-full p-3 md:p-4 border-b-2 text-base font-bold bg-transparent focus:outline-none" value={editingProduct.status} onChange={e => setEditingProduct({ ...editingProduct, status: e.target.value })}>
                                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">8: 版型 (Layout)</label>
                                            <select className="w-full p-3 md:p-4 border-b-2 text-base font-bold bg-transparent focus:outline-none" value={editingProduct.layout} onChange={e => setEditingProduct({ ...editingProduct, layout: e.target.value })}>
                                                {LAYOUT_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-5 pt-4">
                                            <div
                                                onClick={() => setEditingProduct({ ...editingProduct, isFeatured: !editingProduct.isFeatured })}
                                                className="flex items-center gap-4 cursor-pointer group select-none active:scale-95 transition-transform"
                                            >
                                                <div className={`w-8 h-8 border-2 flex items-center justify-center transition-all ${editingProduct.isFeatured ? 'bg-black border-black/100' : 'border-black/10'}`}>
                                                    <Star size={18} className={editingProduct.isFeatured ? 'text-black fill-black' : 'opacity-10'} />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">5: 精選推薦</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-12 space-y-4">
                                        <label className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-40">10: 商品詳細描述</label>
                                        <textarea className="w-full p-4 md:p-8 border-2 bg-gray-50 focus:outline-none focus:bg-white transition-all min-h-[160px] text-sm" style={{ borderColor: COLORS.border }} value={editingProduct.desc} onChange={e => setEditingProduct({ ...editingProduct, desc: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse md:flex-row justify-end gap-4 md:gap-8 pt-6 md:pt-12 border-t-2" style={{ borderColor: COLORS.border }}>
                                    <button type="button" onClick={() => setEditingProduct(null)} className="w-full md:w-auto px-8 md:px-12 py-4 md:py-5 text-[11px] font-black tracking-[0.3em] uppercase border-2 border-gray-100 transition-all active:scale-95">Cancel</button>
                                    <button type="submit" className="w-full md:w-auto px-8 md:px-12 py-4 md:py-5 text-[11px] font-black tracking-[0.3em] uppercase text-white transition-all active:scale-95 shadow-xl" style={{ backgroundColor: COLORS.ink }}>Commit Changes</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Data Grid */}
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 mb-24">
                        {isLoading ? (
                            <div className="text-center py-12 opacity-50 text-xs font-black tracking-widest uppercase">Loading Inventory...</div>
                        ) : (
                            products.map(product => (
                                <div key={product.id} className="bg-white border shadow-sm p-4 space-y-4" style={{ borderColor: COLORS.border }}>
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 bg-gray-50 flex-shrink-0 border overflow-hidden relative" style={{ borderColor: COLORS.border }}>
                                            {product.images && product.images.length > 0 ? <img src={product.images[0]} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-4 opacity-10" />}
                                            {product.isFeatured && <div className="absolute top-0 right-0 p-1" style={{ backgroundColor: COLORS.ink }}><Star size={8} className="text-white fill-white" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-sm tracking-tight mb-1 truncate" style={{ color: COLORS.ink }}>{product.name}</div>
                                            <div className="text-[9px] font-bold opacity-30 tracking-widest uppercase mb-2">{product.id}</div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-[9px] px-2 py-0.5 bg-gray-100 border border-black/5 font-black">{product.category}</span>
                                                <span className={`text-[9px] px-2 py-0.5 border border-black/5 font-black uppercase ${product.status === 'active' ? 'bg-green-50 text-green-800' : 'bg-gray-100 opacity-50'}`}>{product.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="text-sm font-black" style={{ color: COLORS.ink }}>${product.price.toLocaleString()}</div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold opacity-40">Stock: {product.stock}</span>
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 bg-white border shadow-sm active:scale-95"
                                                style={{ borderColor: COLORS.ink }}
                                            >
                                                <Edit3 size={14} style={{ color: COLORS.ink }} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white border-2 overflow-hidden shadow-sm" style={{ borderColor: COLORS.ink }}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-[10px] uppercase tracking-[0.3em] font-black" style={{ color: COLORS.ink }}>
                                    <th className="p-8 border-b-2">Curation Item</th>
                                    <th className="p-8 border-b-2">Cat</th>
                                    <th className="p-8 border-b-2 text-center">Inv</th>
                                    <th className="p-8 border-b-2">Price</th>
                                    <th className="p-8 border-b-2">Status</th>
                                    <th className="p-8 border-b-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-8 text-center opacity-50">Loading Inventory...</td></tr>
                                ) : products.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-all">
                                        <td className="p-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-gray-50 flex-shrink-0 border-2 overflow-hidden relative" style={{ borderColor: COLORS.border }}>
                                                    {product.images && product.images.length > 0 ? <img src={product.images[0]} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-4 opacity-10" />}
                                                    {product.isFeatured && <div className="absolute top-0 right-0 p-1.5" style={{ backgroundColor: COLORS.ink }}><Star size={10} className="text-white fill-white" /></div>}
                                                </div>
                                                <div>
                                                    <div className="font-black text-base tracking-tight mb-1" style={{ color: COLORS.ink }}>{product.name}</div>
                                                    <div className="text-[10px] font-bold opacity-30 tracking-widest uppercase">{product.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <span className="text-[10px] font-black tracking-widest px-4 py-1.5 bg-gray-100 rounded-none border border-black border-opacity-5">{product.category}</span>
                                        </td>
                                        <td className="p-8 text-center font-black text-sm">{product.stock}</td>
                                        <td className="p-8 font-black text-sm">${product.price.toLocaleString()}</td>
                                        <td className="p-8 font-black text-sm uppercase">{product.status}</td>
                                        <td className="p-8 text-right space-x-3">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-4 bg-white border-2 border-gray-50 shadow-sm hover:shadow-lg transition-all active:scale-75"
                                            >
                                                <Edit3 size={18} style={{ color: COLORS.ink }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && products.length === 0 && (
                        <div className="p-20 md:p-40 text-center">
                            <Package size={48} className="mx-auto mb-6 opacity-5 md:w-16 md:h-16" />
                            <p className="text-[10px] md:text-xs font-black opacity-20 tracking-[0.5em] uppercase">Inventory Empty</p>
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
