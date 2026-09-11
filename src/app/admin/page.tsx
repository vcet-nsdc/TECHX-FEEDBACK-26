'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import AdminRouteGuard from '@/components/uncharted/AdminRouteGuard';
import { setLabsCache } from '@/lib/expeditionStore';
import { csvCell } from '@/lib/utils';
import type { CheckpointNode, ExpeditionLab } from '@/lib/expeditionData';
import { generateOrderedSerpentineLayout } from '@/lib/mapPlacement';
import ProductIcon, { isImageUrlIcon } from '@/components/ProductIcon';

type LabKey = '1' | '2' | '3' | '4';

const LABS_CONFIG: { key: LabKey; id: string; name: string; description: string }[] = [
  { key: '1', id: '1', name: 'Lab 502', description: 'Advanced AI, Network & Mobile Systems' },
  { key: '2', id: '2', name: 'Lab 508', description: 'Robotics, IoT & Hardware Systems' },
  { key: '3', id: '3', name: 'Lab 509', description: 'Cloud, Data & Emerging Technologies' },
  { key: '4', id: '4', name: 'Lab 510', description: 'Desert Recon, Automation & Cyber Defense' },
];

const SUGGESTED_ICONS = ['📱', '💻', '🤖', '🌐', '📶', '📹', '🚁', '⚙️', '🔬', '📊', '🎓', '🚪', '🛠️', '💊', '💰'];

function applySafeLayout(checkpoints: CheckpointNode[], seed?: number): CheckpointNode[] {
  // Deterministic serpentine: same geometry the runtime map uses, so persisted
  // positions always match what the map renders and add/delete never break
  // the connecting trail. `seed` retained for API compatibility.
  void seed;
  const slots = generateOrderedSerpentineLayout(checkpoints.length);
  return checkpoints.map((cp, i) => ({
    ...cp,
    x: slots[i]?.x ?? cp.x,
    y: slots[i]?.y ?? cp.y,
  }));
}

interface FeedbackEntry {
  studentName: string;
  studentEmail: string;
  studentDepartment: string;
  rating: number;
  comment: string;
  tableId: string;
  timestamp: string;
}

interface ProductStat {
  productId: string;
  productName: string;
  labName: string;
  totalRatings: number;
  averageRating: number;
}

export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <AdminDashboard />
    </AdminRouteGuard>
  );
}

function AdminDashboard() {
  const { logout } = useAdmin();
  const router = useRouter();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'feedback'>('all');

  // Dashboard metrics state
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalFeedback: 0,
    completedUsers: 0,
  });
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Labs and Products state
  const [labs, setLabs] = useState<Record<string, ExpeditionLab>>({});
  const [isLabsLoading, setIsLabsLoading] = useState(true);
  const [activeLabKey, setActiveLabKey] = useState<LabKey>('1');
  const [productSaveStatus, setProductSaveStatus] = useState<string | null>(null);

  // Add Product form state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductIcon, setNewProductIcon] = useState('📦');
  const [newProductIconMode, setNewProductIconMode] = useState<'emoji' | 'image'>('emoji');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');

  // Edit Product state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductIcon, setEditProductIcon] = useState('');

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [expandedUserEmail, setExpandedUserEmail] = useState<string | null>(null);

  // Handle Logout
  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  // 1. Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      const data = await res.json();
      setDashboardStats({
        totalUsers: data.stats?.totalUsers || 0,
        totalFeedback: data.stats?.totalFeedback || 0,
        completedUsers: data.stats?.completedUsers || 0,
      });
      setProductStats(data.productStats || []);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // 2. Fetch Labs and Products
  const fetchLabs = useCallback(async () => {
    setIsLabsLoading(true);
    try {
      const res = await fetch('/api/admin/labs');
      if (!res.ok) throw new Error('Failed to load labs catalog');
      const data = await res.json();
      const loadedLabs = (data?.labs ?? {}) as Record<string, ExpeditionLab>;
      setLabs(loadedLabs);
      setLabsCache(loadedLabs);
    } catch (err) {
      console.error('Error loading labs:', err);
    } finally {
      setIsLabsLoading(false);
    }
  }, []);

  // 3. Fetch All Feedback
  const fetchFeedback = useCallback(async () => {
    setIsFeedbackLoading(true);
    try {
      const res = await fetch('/api/admin/feedback');
      if (!res.ok) throw new Error('Failed to fetch feedback');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.items || [];
      setFeedbackList(list);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setIsFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    fetchLabs();
    fetchFeedback();
  }, [fetchDashboardStats, fetchLabs, fetchFeedback]);

  // Compute Lab with the highest number of feedbacks
  const topLabInfo = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of productStats) {
      let lab = p.labName || 'General';
      if (lab.includes('502') || lab.includes('King') || lab.includes('01')) lab = 'Lab 502';
      else if (lab.includes('508') || lab.includes('Forge') || lab.includes('02')) lab = 'Lab 508';
      else if (lab.includes('509') || lab.includes('Vault') || lab.includes('03')) lab = 'Lab 509';
      else if (lab.includes('510') || lab.includes('Desert') || lab.includes('Oasis') || lab.includes('04')) lab = 'Lab 510';
      counts[lab] = (counts[lab] || 0) + (p.totalRatings || 0);
    }
    let topName = 'None yet';
    let max = 0;
    for (const [name, c] of Object.entries(counts)) {
      if (c > max) {
        max = c;
        topName = name;
      }
    }
    return { name: topName, count: max };
  }, [productStats]);

  // Product lookup map for friendly names
  const productLookup = useMemo(() => {
    const map: Record<string, { name: string; labName: string; icon: string }> = {};
    for (const lab of Object.values(labs)) {
      for (const cp of lab.checkpoints || []) {
        map[cp.id] = { name: cp.name, labName: lab.name, icon: cp.icon || '📦' };
      }
    }
    return map;
  }, [labs]);

  // Product stats lookup map for quick rating access
  const productStatsMap = useMemo(() => {
    const map: Record<string, ProductStat> = {};
    for (const p of productStats) {
      map[p.productId] = p;
    }
    return map;
  }, [productStats]);

  // Group feedback entries by student user
  const usersFeedbackGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        email: string;
        department: string;
        feedbacks: FeedbackEntry[];
        averageRating: number;
      }
    >();

    for (const f of feedbackList) {
      const key = (f.studentEmail || f.studentName || 'unknown').toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: f.studentName || 'Anonymous',
          email: f.studentEmail || '—',
          department: f.studentDepartment || 'General',
          feedbacks: [],
          averageRating: 0,
        });
      }
      map.get(key)!.feedbacks.push(f);
    }

    // Compute average ratings
    for (const user of map.values()) {
      if (user.feedbacks.length > 0) {
        const sum = user.feedbacks.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
        user.averageRating = Number((sum / user.feedbacks.length).toFixed(2));
      }
    }

    return Array.from(map.values());
  }, [feedbackList]);

  // Filtered users list based on search query
  const filteredUsers = useMemo(() => {
    if (!searchUserQuery.trim()) return usersFeedbackGrouped;
    const q = searchUserQuery.toLowerCase();
    return usersFeedbackGrouped.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
    );
  }, [usersFeedbackGrouped, searchUserQuery]);

  // Save Labs Catalog to API and persist across all devices
  const saveLabsToDatabase = async (updatedLabs: Record<string, ExpeditionLab>) => {
    setProductSaveStatus('Saving changes…');
    try {
      const res = await fetch('/api/admin/labs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labs: updatedLabs }),
      });
      if (!res.ok) throw new Error('Failed to update products');
      const data = await res.json();
      const saved = (data?.labs ?? updatedLabs) as Record<string, ExpeditionLab>;
      setLabs(saved);
      setLabsCache(saved);
      setProductSaveStatus('Saved successfully ✓');
      setTimeout(() => setProductSaveStatus(null), 3000);
    } catch (err) {
      setProductSaveStatus('Error saving products');
      console.error(err);
    }
  };

  // Add Product to active lab
  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;

    const currentLab = labs[activeLabKey];
    if (!currentLab) return;

    const resolvedIcon =
      newProductIconMode === 'image'
        ? newProductImageUrl.trim() || '📦'
        : newProductIcon.trim() || '📦';

    const newCheckpoint: CheckpointNode = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newProductName.trim(),
      description: '',
      icon: resolvedIcon,
      x: 50,
      y: 50,
    };

    const updatedCheckpoints = applySafeLayout([...(currentLab.checkpoints || []), newCheckpoint]);
    const updatedLabs = {
      ...labs,
      [activeLabKey]: {
        ...currentLab,
        checkpoints: updatedCheckpoints,
      },
    };

    setLabs(updatedLabs);
    setNewProductName('');
    setNewProductIcon('📦');
    setShowAddProductModal(false);
    await saveLabsToDatabase(updatedLabs);
  };

  // Save Inline Edit for a Product
  const handleSaveProductEdit = async (labKey: LabKey, productId: string) => {
    const currentLab = labs[labKey];
    if (!currentLab) return;

    const updatedCheckpoints = (currentLab.checkpoints || []).map((cp) => {
      if (cp.id === productId) {
        return {
          ...cp,
          name: editProductName.trim() || cp.name,
          icon: editProductIcon.trim() || cp.icon,
        };
      }
      return cp;
    });

    const updatedLabs = {
      ...labs,
      [labKey]: {
        ...currentLab,
        checkpoints: updatedCheckpoints,
      },
    };

    setLabs(updatedLabs);
    setEditingProductId(null);
    await saveLabsToDatabase(updatedLabs);
  };

  // Delete Product
  const handleDeleteProduct = async (labKey: LabKey, productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    const currentLab = labs[labKey];
    if (!currentLab) return;

    const remaining = (currentLab.checkpoints || []).filter((cp) => cp.id !== productId);
    const updatedCheckpoints = applySafeLayout(remaining);
    const updatedLabs = {
      ...labs,
      [labKey]: {
        ...currentLab,
        checkpoints: updatedCheckpoints,
      },
    };

    setLabs(updatedLabs);
    await saveLabsToDatabase(updatedLabs);
  };

  // Export CSV of all feedback
  const handleExportCSV = () => {
    const headers = ['Student Name', 'Email', 'Department', 'Product ID', 'Product Name', 'Rating', 'Comment', 'Date & Time'];
    const rows = feedbackList.map((f) => [
      f.studentName || '',
      f.studentEmail || '',
      f.studentDepartment || '',
      f.tableId || '',
      productLookup[f.tableId]?.name || f.tableId,
      f.rating,
      f.comment || '',
      f.timestamp ? new Date(f.timestamp).toLocaleString() : '',
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TechX_Feedback_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0e0905] text-[#f5efe6] font-sans antialiased">
      {/* 1. TOP NAVBAR: UNCHARTED DARK TIMBER WITH LIGHT HIGH-CONTRAST CONTENT */}
      <header className="sticky top-0 z-30 border-b border-[#382314] bg-[#160e08]/95 backdrop-blur-md text-[#f5efe6] shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#24170d] border border-[#3d2614] text-lg font-bold text-[#c99f58] shadow-2xs">
              ⚙️
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#a89078]">
                TechX 2026
              </p>
              <h1 className="text-base font-bold tracking-tight text-[#fdfbf7]">
                Admin Dashboard
              </h1>
            </div>
          </div>

          {/* NAVBAR: Manage Products | User Activity | Leaderboard */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center rounded-lg border border-[#3d2614] bg-[#1a110a] p-1 text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab('products');
                  document.getElementById('manage-products')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`rounded px-3.5 py-1.5 transition ${
                  activeTab === 'products'
                    ? 'bg-[#c99f58] text-[#140c06] font-bold shadow-xs'
                    : 'text-[#c99f58]/85 hover:text-[#fdfbf7] hover:bg-[#24170d]'
                }`}
              >
                Manage Products
              </button>
              <button
                onClick={() => {
                  setActiveTab('feedback');
                  document.getElementById('user-activity')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`rounded px-3.5 py-1.5 transition ${
                  activeTab === 'feedback'
                    ? 'bg-[#c99f58] text-[#140c06] font-bold shadow-xs'
                    : 'text-[#c99f58]/85 hover:text-[#fdfbf7] hover:bg-[#24170d]'
                }`}
              >
                User Activity
              </button>
              <Link
                href="/admin/leaderboard"
                className="flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-semibold text-[#c99f58]/85 hover:text-[#fdfbf7] hover:bg-[#24170d] transition"
              >
                <span>🏆</span>
                <span>Leaderboard</span>
              </Link>
            </div>

            {/* Public View Button */}
            <Link
              href="/leaderboard?public=true"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#8a5d33] bg-[#24160c] hover:bg-[#341f10] hover:border-[#c99f58] px-3 py-1.5 text-xs font-bold text-[#c99f58] hover:text-[#f3dfa2] transition shadow-xs"
              title="Open Fullscreen Public Display Leaderboard"
            >
              <span className="text-sm leading-none">⛶</span>
              <span className="hidden sm:inline">Public View</span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-[#1e0e0a] hover:bg-[#2d120a] hover:border-red-600 px-3 py-1.5 text-xs font-bold text-red-300 transition shadow-xs cursor-pointer"
              title="Logout of Admin"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10">

        {/* TOP 4 STATS CARDS */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#fdfbf7]">
                Operations Summary
              </h2>
              <p className="text-xs text-[#a89078]">
                Key metrics on student registrations, review counts, and location activity
              </p>
            </div>
            <button
              onClick={() => {
                fetchDashboardStats();
                fetchFeedback();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#3d2614] bg-[#24170d] px-3.5 py-1.5 text-xs font-bold text-[#c99f58] transition hover:bg-[#2f1e11] hover:text-[#fdfbf7]"
            >
              <span>⟳</span>
              <span>Refresh Metrics</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Registered Users */}
            <div className="rounded-xl border border-[#382314] bg-[#18110a] p-5 shadow-lg border-l-4 border-l-[#d97706]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#c99f58]">
                  Total Registered Users
                </span>
                <span className="text-xl">👥</span>
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight text-[#fdfbf7]">
                {isStatsLoading ? '…' : dashboardStats.totalUsers}
              </div>
              <p className="mt-1 text-xs text-[#9e8369]">
                Unique students registered
              </p>
            </div>

            {/* Card 2: Total Feedbacks */}
            <div className="rounded-xl border border-[#382314] bg-[#18110a] p-5 shadow-lg border-l-4 border-l-[#f59e0b]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#c99f58]">
                  Total Feedbacks
                </span>
                <span className="text-xl">💬</span>
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight text-[#fdfbf7]">
                {isStatsLoading ? '…' : dashboardStats.totalFeedback}
              </div>
              <p className="mt-1 text-xs text-[#9e8369]">
                Total product reviews submitted
              </p>
            </div>

            {/* Card 3: Completed All Labs */}
            <div className="rounded-xl border border-[#382314] bg-[#18110a] p-5 shadow-lg border-l-4 border-l-[#b45309]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#c99f58]">
                  Completed All 4 Labs
                </span>
                <span className="text-xl">🎓</span>
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight text-[#fdfbf7]">
                {isStatsLoading ? '…' : dashboardStats.completedUsers}
              </div>
              <p className="mt-1 text-xs text-[#9e8369]">
                Users who submitted feedback in all 4 labs
              </p>
            </div>

            {/* Card 4: Top Lab by Feedback */}
            <div className="rounded-xl border border-[#382314] bg-[#18110a] p-5 shadow-lg border-l-4 border-l-[#991b1b]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#c99f58]">
                  Top Lab by Feedback
                </span>
                <span className="text-xl">🏢</span>
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight text-[#fdfbf7] truncate" title={topLabInfo.name}>
                {isStatsLoading ? '…' : topLabInfo.name}
              </div>
              <p className="mt-1 text-xs text-[#9e8369]">
                {topLabInfo.count > 0 ? `${topLabInfo.count} reviews recorded` : 'No reviews recorded yet'}
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TWO CARDS IN OVERVIEW: 1. MANAGE PRODUCTS | | | 2. USER ACTIVITY          */}
        {/* ========================================================================= */}

        {/* CARD 1: MANAGE PRODUCTS */}
        {(activeTab === 'all' || activeTab === 'products') && (
          <section id="manage-products" className="rounded-2xl border border-[#382314] bg-[#18110a] p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2e1d10] pb-5">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-[#fdfbf7]">
                  Manage Products
                </h3>
                <p className="text-xs text-[#a89078]">
                  Add, edit, or remove products assigned to each lab. Edits reflect immediately on every user&apos;s mobile phone.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {productSaveStatus && (
                  <span className="text-xs font-bold text-[#f59e0b] bg-[#2d1c0e] border border-[#523318] px-2.5 py-1 rounded">
                    {productSaveStatus}
                  </span>
                )}
                <button
                  onClick={() => {
                    setNewProductName('');
                    setNewProductIcon('📦');
                    setNewProductIconMode('emoji');
                    setNewProductImageUrl('');
                    setShowAddProductModal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-[#c99f58] hover:bg-[#dfb46e] px-4 py-2 text-xs font-bold text-[#140c06] shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <span className="text-sm font-black">+</span>
                  <span>Add New Product</span>
                </button>
              </div>
            </div>

            {/* Lab Selector Tabs */}
            <div className="mt-5 flex flex-wrap gap-2 border-b border-[#2e1d10] pb-3">
              {LABS_CONFIG.map((lab) => {
                const count = labs[lab.key]?.checkpoints?.length || 0;
                const isSelected = activeLabKey === lab.key;
                return (
                  <button
                    key={lab.key}
                    onClick={() => setActiveLabKey(lab.key)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition border cursor-pointer ${
                      isSelected
                        ? 'bg-[#c99f58] text-[#140c06] border-[#c99f58] shadow-sm'
                        : 'bg-[#24170d] text-[#c99f58] border-[#382314] hover:bg-[#2e1d10]'
                    }`}
                  >
                    <span>{lab.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        isSelected ? 'bg-[#140c06] text-[#c99f58] font-bold' : 'bg-[#18110a] text-[#a89078]'
                      }`}
                    >
                      {count} products
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Products List for Active Lab */}
            <div className="mt-5">
              {isLabsLoading ? (
                <div className="py-12 text-center text-xs text-[#a89078]">
                  Loading products list…
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(labs[activeLabKey]?.checkpoints || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#382314] p-8 text-center text-sm text-[#a89078]">
                      No products added to this lab yet. Click &quot;Add New Product&quot; above to create one.
                    </div>
                  ) : (
                    (labs[activeLabKey]?.checkpoints || []).map((product) => {
                      const isEditing = editingProductId === product.id;

                      return (
                        <div
                          key={product.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#382314] bg-[#22170f] p-3.5 transition hover:border-[#54361e] shadow-xs"
                        >
                          {isEditing ? (
                            /* Inline Edit Form */
                            <div className="flex flex-1 flex-wrap items-center gap-2.5">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-[#4a2f1a] bg-[#18110a] text-base">
                                <ProductIcon icon={editProductIcon} fallback="📦" />
                              </span>
                              <input
                                type="text"
                                value={editProductIcon}
                                onChange={(e) => setEditProductIcon(e.target.value)}
                                className="w-40 rounded border border-[#4a2f1a] bg-[#18110a] px-2 py-1.5 text-center text-xs text-[#fdfbf7]"
                                title="Icon / Emoji or Image URL"
                                placeholder="Emoji or Image URL"
                              />
                              <input
                                type="text"
                                value={editProductName}
                                onChange={(e) => setEditProductName(e.target.value)}
                                placeholder="Product Name"
                                className="flex-1 min-w-[200px] rounded border border-[#4a2f1a] bg-[#18110a] px-3 py-1.5 text-xs font-semibold text-[#fdfbf7] outline-none focus:border-[#c99f58]"
                              />
                              <button
                                onClick={() => handleSaveProductEdit(activeLabKey, product.id)}
                                className="rounded bg-[#c99f58] hover:bg-[#dfb46e] px-3.5 py-1.5 text-xs font-bold text-[#140c06] shadow-xs cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingProductId(null)}
                                className="rounded border border-[#4a2f1a] bg-[#18110a] hover:bg-[#281c12] px-3 py-1.5 text-xs font-semibold text-[#c99f58] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            /* Display Row */
                            <>
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#18110a] text-xl border border-[#382314]">
                                  <ProductIcon icon={product.icon} fallback="📦" />
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-[#fdfbf7] truncate">
                                    {product.name}
                                  </h4>
                                  <div className="flex items-center gap-2.5 text-[11px] text-[#9e8369]">
                                    <span>
                                      Product ID: <span className="font-mono text-[#c99f58] font-bold">{product.id}</span>
                                    </span>
                                    {productStatsMap[product.id] && productStatsMap[product.id].totalRatings > 0 && (
                                      <span className="text-[#f59e0b] font-semibold">
                                        • {productStatsMap[product.id].averageRating.toFixed(1)} ⭐ ({productStatsMap[product.id].totalRatings} reviews)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProductId(product.id);
                                    setEditProductName(product.name);
                                    setEditProductIcon(product.icon || '📦');
                                  }}
                                  className="rounded border border-[#422a18] bg-[#18110a] hover:bg-[#281b11] px-3 py-1.5 text-xs font-bold text-[#d4bca0] transition cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(activeLabKey, product.id)}
                                  className="rounded border border-[#662222] bg-[#2b1111] hover:bg-[#3d1616] px-3 py-1.5 text-xs font-bold text-[#fca5a5] transition cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* CARD 2: USER ACTIVITY */}
        {(activeTab === 'all' || activeTab === 'feedback') && (
          <section id="user-activity" className="rounded-2xl border border-[#382314] bg-[#18110a] p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2e1d10] pb-5">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-[#fdfbf7]">
                  User Activity
                </h3>
                <p className="text-xs text-[#a89078]">
                  Select any student user to view all the products they reviewed and the exact ratings given
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 rounded-lg bg-[#c99f58] hover:bg-[#dfb46e] px-3.5 py-1.5 text-xs font-bold text-[#140c06] shadow-xs transition cursor-pointer"
                >
                  <span>⤓</span>
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={fetchFeedback}
                  className="rounded-lg border border-[#3d2614] bg-[#24170d] hover:bg-[#2f1e11] px-3 py-1.5 text-xs font-bold text-[#c99f58] transition cursor-pointer"
                >
                  ⟳ Refresh
                </button>
              </div>
            </div>

            {/* Search filter */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by student name, email, or department…"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                className="w-full max-w-md rounded-lg border border-[#382314] bg-[#120c07] px-3.5 py-2 text-xs font-medium text-[#fdfbf7] placeholder-[#7d6550] outline-none focus:border-[#c99f58]"
              />
              {searchUserQuery && (
                <button
                  onClick={() => setSearchUserQuery('')}
                  className="text-xs font-bold text-[#a89078] px-2 hover:text-[#fdfbf7] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* User List Table */}
            <div className="mt-5 overflow-x-auto rounded-xl border border-[#382314]">
              {isFeedbackLoading ? (
                <div className="py-12 text-center text-xs text-[#a89078]">
                  Loading student feedback records…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#a89078]">
                  No feedback records matching your search.
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#382314] bg-[#22170f] font-bold text-[#c99f58] uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Products Rated</th>
                      <th className="py-3 px-4 text-center">Average Score</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#291b11]">
                    {filteredUsers.map((user) => {
                      const isExpanded = expandedUserEmail === user.email;

                      return (
                        <tr key={user.email} className="hover:bg-[#22170f]/70 transition">
                          <td colSpan={6} className="p-0">
                            {/* Main User Row */}
                            <div
                              onClick={() => setExpandedUserEmail(isExpanded ? null : user.email)}
                              className="grid grid-cols-6 items-center px-4 py-3 cursor-pointer select-none"
                            >
                              <div className="font-bold text-[#fdfbf7] flex items-center gap-1.5">
                                <span className="text-[#c99f58] font-mono text-[10px]">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <span>{user.name}</span>
                              </div>
                              <div className="text-[#a89078] font-mono">{user.email}</div>
                              <div className="text-[#cbb59f]">{user.department}</div>
                              <div className="text-center font-bold text-[#fdfbf7]">
                                <span className="rounded-full bg-[#281b11] border border-[#452b17] text-[#e0cfbe] px-2.5 py-0.5 text-[11px]">
                                  {user.feedbacks.length} {user.feedbacks.length === 1 ? 'product' : 'products'}
                                </span>
                              </div>
                              <div className="text-center font-bold text-[#f59e0b]">
                                {user.averageRating > 0 ? `${user.averageRating.toFixed(2)} ⭐` : '—'}
                              </div>
                              <div className="text-right">
                                <button className="text-[11px] font-bold text-[#c99f58] hover:text-[#fdfbf7] underline cursor-pointer">
                                  {isExpanded ? 'Hide Details' : 'View Reviews'}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Breakdown: All Products Rated by this user */}
                            {isExpanded && (
                              <div className="bg-[#140e08] border-t border-b border-[#382314] p-4 space-y-3">
                                <div className="text-xs font-bold text-[#c99f58] flex items-center justify-between">
                                  <span>
                                    Detailed Reviews by {user.name} ({user.feedbacks.length} submitted):
                                  </span>
                                </div>

                                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                  {user.feedbacks.map((f, i) => {
                                    const prodInfo = productLookup[f.tableId];
                                    const prodName = prodInfo?.name || f.tableId;
                                    const prodIcon = prodInfo?.icon || '📦';
                                    const prodLab = prodInfo?.labName || 'Lab';

                                    return (
                                      <div
                                        key={`${f.tableId}-${i}`}
                                        className="rounded-lg border border-[#382314] bg-[#1e150d] p-3 shadow-xs"
                                      >
                                        <div className="flex items-center justify-between gap-2 border-b border-[#2d1b0e] pb-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden text-base">
                                              <ProductIcon icon={prodIcon} fallback="📦" />
                                            </span>
                                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2a1a0f] border border-[#54361e] text-[#c99f58] shrink-0">
                                              {f.tableId}
                                            </span>
                                            <span className="font-bold text-xs text-[#fdfbf7] truncate">
                                              {prodName}
                                            </span>
                                          </div>
                                          <div className="shrink-0 font-bold text-[#f59e0b] text-xs">
                                            {f.rating} / 5 ⭐
                                          </div>
                                        </div>

                                        <p className="mt-2 text-xs italic text-[#d4c3b0] min-h-[28px]">
                                          {f.comment ? `"${f.comment}"` : <span className="text-[#7d6550] not-italic">No comment provided</span>}
                                        </p>

                                        <div className="mt-2 flex items-center justify-between text-[10px] text-[#8c745f] border-t border-[#2d1b0e] pt-1">
                                          <span className="text-[#c99f58]">{prodLab}</span>
                                          <span>{f.timestamp ? new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </main>

      {/* MODAL: ADD NEW PRODUCT */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#4a2f1a] bg-[#18110a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2e1d10] pb-3">
              <h3 className="text-base font-bold text-[#fdfbf7]">
                Add Product to {LABS_CONFIG.find((l) => l.key === activeLabKey)?.name || 'Lab'}
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-sm font-bold text-[#a89078] hover:text-[#fdfbf7] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#c99f58] mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Autonomous Drone"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full rounded-lg border border-[#382314] bg-[#0e0905] px-3 py-2 text-xs font-semibold text-[#fdfbf7] placeholder-[#7d6550] outline-none focus:border-[#c99f58]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#c99f58] mb-1">
                  Product Logo / Icon
                </label>

                {/* Emoji / Image URL mode toggle */}
                <div className="mb-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewProductIconMode('emoji')}
                    className={`rounded px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      newProductIconMode === 'emoji'
                        ? 'bg-[#c99f58] text-[#140c06]'
                        : 'border border-[#382314] bg-[#22170f] text-[#c99f58] hover:bg-[#2e1e12]'
                    }`}
                  >
                    Emoji
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProductIconMode('image')}
                    className={`rounded px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      newProductIconMode === 'image'
                        ? 'bg-[#c99f58] text-[#140c06]'
                        : 'border border-[#382314] bg-[#22170f] text-[#c99f58] hover:bg-[#2e1e12]'
                    }`}
                  >
                    Image URL (PNG / WebP)
                  </button>
                </div>

                {newProductIconMode === 'emoji' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newProductIcon}
                      onChange={(e) => setNewProductIcon(e.target.value)}
                      className="w-14 rounded-lg border border-[#382314] bg-[#0e0905] px-2 py-2 text-center text-lg text-[#fdfbf7] outline-none"
                    />
                    <div className="flex flex-wrap gap-1">
                      {SUGGESTED_ICONS.slice(0, 9).map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewProductIcon(icon)}
                          className={`flex h-7 w-7 items-center justify-center rounded border text-sm transition cursor-pointer ${
                            newProductIcon === icon
                              ? 'border-[#c99f58] bg-[#3a2514] text-[#c99f58]'
                              : 'border-[#382314] bg-[#22170f] text-[#fdfbf7] hover:bg-[#2e1e12]'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#382314] bg-[#0e0905] text-lg">
                      <ProductIcon icon={newProductImageUrl} fallback="📦" />
                    </span>
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png or /tablet/coins.webp"
                      value={newProductImageUrl}
                      onChange={(e) => setNewProductImageUrl(e.target.value)}
                      className="w-full rounded-lg border border-[#382314] bg-[#0e0905] px-3 py-2 text-xs font-semibold text-[#fdfbf7] placeholder-[#7d6550] outline-none focus:border-[#c99f58]"
                    />
                  </div>
                )}
                {newProductIconMode === 'image' && newProductImageUrl.trim() !== '' && !isImageUrlIcon(newProductImageUrl) && (
                  <p className="mt-1 text-[10px] text-[#f59e0b]">
                    Tip: use a full URL (https://…), a data:image URI, or a /public path ending in .png/.webp/.jpg/.svg
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#2e1d10] pt-3">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="rounded-lg border border-[#382314] bg-[#24170d] hover:bg-[#2f1e11] px-4 py-2 text-xs font-bold text-[#c99f58] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!newProductName.trim()}
                className="rounded-lg bg-[#c99f58] hover:bg-[#dfb46e] disabled:opacity-50 px-4 py-2 text-xs font-bold text-[#140c06] shadow-sm cursor-pointer"
              >
                Create & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
