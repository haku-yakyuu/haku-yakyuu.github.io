import React, { useState, useRef } from 'react';
import {
    X, Upload, ArrowLeft, ArrowRight, Trash2, ImageIcon, Star, Save
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

const COLORS = {
    ink: '#3E2723',
    paper: '#F5F1E8',
    paperDark: '#E8E3D5',
    white: '#FFFFFF',
    border: 'rgba(62, 39, 35, 0.2)',
    inkFaded: 'rgba(62, 39, 35, 0.4)'
};

const INITIAL_CATEGORIES = ["WBCQ資格賽", "日本職棒", "徐若熙", "經典賽", "MLB", "中職"];
const STATUS_OPTIONS = ["active", "hidden", "sold_out"];
const LAYOUT_OPTIONS = ["vertical", "horizontal", "no_image"];

export default function AdminEditor({ product, onSave, onCancel, triggerUpload }) {
    const [editingProduct, setEditingProduct] = useState(product);
    const fileInputRef = useRef(null);

    // Image Helpers
    const handleFileChange = async (e) => {
        const rawFiles = Array.from(e.target.files || []);
        if (rawFiles.length === 0) return;

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
            const newUrls = processedFiles.map(f => URL.createObjectURL(f));
            const newImageObjs = processedFiles.map(f => ({ file: f, preview: URL.createObjectURL(f), isNew: true }));

            setEditingProduct(prev => ({
                ...prev,
                rawImagesData: [...(prev.rawImagesData || prev.images.map(url => ({ url, isNew: false }))), ...newImageObjs],
                images: [...prev.images, ...newUrls]
            }));
        }
    };

    const removeImage = (index) => {
        const newData = [...(editingProduct.rawImagesData || editingProduct.images.map(url => ({ url, isNew: false })))];
        newData.splice(index, 1);
        setEditingProduct({
            ...editingProduct,
            rawImagesData: newData,
            images: newData.map(d => d.preview || d.url)
        });
    };

    const moveImage = (index, direction) => {
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

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(editingProduct);
    };

    return (
        <div className="min-h-screen bg-white animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Top Bar */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b px-6 py-4 flex justify-between items-center" style={{ borderColor: COLORS.ink }}>
                <button onClick={onCancel} className="p-2 opacity-50 hover:opacity-100 transition-opacity">
                    <X size={24} style={{ color: COLORS.ink }} />
                </button>
                <h2 className="text-sm font-black tracking-[0.2em] uppercase" style={{ color: COLORS.ink }}>
                    {editingProduct.id ? `EDITING: ${editingProduct.id}` : 'CREATE NEW PRODUCT'}
                </h2>
                <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 text-xs font-black tracking-widest text-white uppercase shadow-lg active:scale-95 transition-all" style={{ backgroundColor: COLORS.ink }}>
                    <Save size={16} /> Save
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-12 pb-40">
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} accept="image/*" />

                <form onSubmit={handleSubmit} className="space-y-16">

                    {/* Section 1: Images */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b pb-4" style={{ borderColor: COLORS.border }}>
                            <label className="text-xs font-black uppercase tracking-widest" style={{ color: COLORS.ink }}>Images</label>
                            <button
                                type="button" onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 border-2 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                                style={{ borderColor: COLORS.ink, color: COLORS.ink }}
                            >
                                <Upload size={14} /> Add Photos
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(editingProduct.rawImagesData || editingProduct.images || []).map((imgData, idx) => {
                                const src = imgData.preview || imgData.url || imgData;
                                return (
                                    <div key={idx} className="group relative aspect-square border overflow-hidden bg-gray-50" style={{ borderColor: COLORS.border }}>
                                        <img src={src} className="w-full h-full object-cover" alt={`Product ${idx}`} />
                                        <div className="absolute inset-0 bg-[#3E2723] bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => moveImage(idx, -1)} className="p-2 bg-white active:scale-75"><ArrowLeft size={14} /></button>
                                                <button type="button" onClick={() => moveImage(idx, 1)} className="p-2 bg-white active:scale-75"><ArrowRight size={14} /></button>
                                            </div>
                                            <button type="button" onClick={() => removeImage(idx)} className="p-2 bg-white active:scale-75 text-[10px] font-black"><Trash2 size={14} /></button>
                                        </div>
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-white text-[9px] font-black border border-black">{idx + 1}</div>
                                    </div>
                                );
                            })}
                            {(!editingProduct.images || editingProduct.images.length === 0) && (
                                <div className="col-span-full py-12 border-2 border-dashed flex flex-col items-center opacity-20" style={{ borderColor: COLORS.border }}>
                                    <ImageIcon size={32} className="mb-2" />
                                    <span className="text-[10px] font-bold tracking-widest">NO IMAGES</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Basic Info */}
                    <div className="space-y-8">
                        <div className="border-b pb-4 mb-6" style={{ borderColor: COLORS.border }}>
                            <label className="text-xs font-black uppercase tracking-widest" style={{ color: COLORS.ink }}>Basic Information</label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Unique ID</label>
                                <input type="text" required className="w-full py-3 border-b-2 bg-transparent text-lg font-bold focus:outline-none focus:border-[#3E2723] transition-colors"
                                    style={{ borderColor: COLORS.border, color: COLORS.ink }}
                                    value={editingProduct.id} onChange={e => setEditingProduct({ ...editingProduct, id: e.target.value })}
                                />
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Product Name</label>
                                <input type="text" required className="w-full py-3 border-b-2 bg-transparent text-lg font-bold focus:outline-none focus:border-[#3E2723] transition-colors"
                                    style={{ borderColor: COLORS.border, color: COLORS.ink }}
                                    value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                />
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Category</label>
                                <input list="cat-list" type="text" className="w-full py-3 border-b-2 bg-transparent text-lg font-bold focus:outline-none focus:border-[#3E2723] transition-colors"
                                    style={{ borderColor: COLORS.border, color: COLORS.ink }}
                                    value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                />
                                <datalist id="cat-list">{INITIAL_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Price (TWD)</label>
                                <input type="number" className="w-full py-3 border-b-2 bg-transparent text-lg font-black focus:outline-none focus:border-[#3E2723] transition-colors"
                                    style={{ borderColor: COLORS.border, color: COLORS.ink }}
                                    value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Status & Inventory */}
                    <div className="space-y-8">
                        <div className="border-b pb-4 mb-6" style={{ borderColor: COLORS.border }}>
                            <label className="text-xs font-black uppercase tracking-widest" style={{ color: COLORS.ink }}>Status & Inventory</label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Stock Count</label>
                                <input type="number" className="w-full py-3 border-b-2 bg-transparent text-lg font-black focus:outline-none focus:border-[#3E2723] transition-colors"
                                    style={{ borderColor: COLORS.border, color: COLORS.ink }}
                                    value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Visibility Status</label>
                                <select className="w-full py-3 border-b-2 bg-transparent text-lg font-bold focus:outline-none focus:border-[#3E2723]"
                                    style={{ borderColor: COLORS.border, color: COLORS.ink }}
                                    value={editingProduct.status} onChange={e => setEditingProduct({ ...editingProduct, status: e.target.value })}
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Grid Layout</label>
                                <select className="w-full py-3 border-b-2 bg-transparent text-lg font-bold focus:outline-none focus:border-[#3E2723]"
                                    style={{ borderColor: COLORS.border, color: COLORS.ink }}
                                    value={editingProduct.layout} onChange={e => setEditingProduct({ ...editingProduct, layout: e.target.value })}
                                >
                                    {LAYOUT_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-4 pt-6">
                                <div
                                    onClick={() => setEditingProduct({ ...editingProduct, isFeatured: !editingProduct.isFeatured })}
                                    className="flex items-center gap-4 cursor-pointer group select-none active:scale-95 transition-transform"
                                >
                                    <div className={`w-10 h-10 border-2 flex items-center justify-center transition-all ${editingProduct.isFeatured ? 'bg-[#3E2723] border-[#3E2723]' : 'border-gray-200'}`}>
                                        <Star size={20} className={editingProduct.isFeatured ? 'text-white fill-white' : 'opacity-10'} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: COLORS.ink }}>Featured Item</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Details */}
                    <div className="space-y-6">
                        <div className="border-b pb-4 mb-6" style={{ borderColor: COLORS.border }}>
                            <label className="text-xs font-black uppercase tracking-widest" style={{ color: COLORS.ink }}>Description</label>
                        </div>
                        <textarea
                            className="w-full p-6 border-2 focus:outline-none transition-all min-h-[200px] text-base leading-relaxed"
                            style={{ borderColor: COLORS.border, backgroundColor: COLORS.paper, color: COLORS.ink }}
                            value={editingProduct.desc} onChange={e => setEditingProduct({ ...editingProduct, desc: e.target.value })}
                            placeholder="Describe the product..."
                        />
                    </div>

                </form>
            </div>
        </div>
    );
}
