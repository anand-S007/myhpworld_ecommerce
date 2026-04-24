import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api.js';

// Centralized query keys so every hook + invalidation references the same identity
export const queryKeys = {
  categories:      ['categories'],
  banners:         ['banners'],
  offers:          ['offers'],
  deal:            ['deal-of-the-day'],
  featured:        ['featured-products'],
  navCategories:   ['nav-categories'],
  products:        (params) => ['products', params || {}],
  product:         (id)     => ['product', id],
  stores:          (params) => ['stores', params || {}],
  storesByPincode: (pin)    => ['stores', 'pincode', pin],
  storeBySlug:     (slug)   => ['store', 'slug', slug],
  myOrders:        ['me', 'orders'],
  myWishlist:      ['me', 'wishlist'],
  productReviews:  (id) => ['product', id, 'reviews'],

  adminStats:      ['admin', 'stats'],
  adminCategories: ['admin', 'categories'],
  adminBanners:    ['admin', 'banners'],
  adminOffers:     ['admin', 'offers'],
  adminProducts:   (params) => ['admin', 'products', params || {}],
  adminFeatured:   ['admin', 'featured'],
  adminDeal:       ['admin', 'deal'],
  adminOrders:     (params) => ['admin', 'orders', params || {}],
  adminStores:     ['admin', 'stores'],
  adminUsers:      (params) => ['admin', 'users', params || {}],
  adminPromotions: ['admin', 'promotions'],
  settings:        ['settings'],
  adminSettings:   ['admin', 'settings'],
  adminVisitStats: (range) => ['admin', 'analytics', 'visits', range || '1d'],
};

// ── Public queries ──────────────────────────────────────────────────────────
export const useCategories    = () => useQuery({ queryKey: queryKeys.categories,    queryFn: api.fetchCategories });
export const useBanners       = () => useQuery({ queryKey: queryKeys.banners,       queryFn: api.fetchBanners });
export const useOffers        = () => useQuery({ queryKey: queryKeys.offers,        queryFn: api.fetchOffers });
export const useDealOfTheDay  = () => useQuery({ queryKey: queryKeys.deal,          queryFn: api.fetchDealOfTheDay });
export const useFeatured      = () => useQuery({ queryKey: queryKeys.featured,      queryFn: api.fetchFeaturedProducts });
export const useNavCategories = () => useQuery({ queryKey: queryKeys.navCategories, queryFn: api.fetchNavCategories });
// Branding is rarely changing, so we cache it aggressively and share the
// same result across Navbar / Footer / AdminLayout by using one query key.
export const useSettings      = () => useQuery({ queryKey: queryKeys.settings,      queryFn: api.fetchSettings, staleTime: 5 * 60_000 });

export const useProducts = (params, enabled = true) =>
  useQuery({
    queryKey: queryKeys.products(params),
    queryFn:  () => api.fetchProducts(params),
    enabled,
  });

export const useProduct = (id) =>
  useQuery({ queryKey: queryKeys.product(id), queryFn: () => api.fetchProductById(id), enabled: !!id });

export const useStores = (params, enabled = true) =>
  useQuery({ queryKey: queryKeys.stores(params), queryFn: () => api.fetchStores(params), enabled });

export const useStoresByPincode = (pincode, enabled = true) =>
  useQuery({
    queryKey: queryKeys.storesByPincode(pincode),
    queryFn: () => api.searchStoresByPincode(pincode),
    enabled: enabled && !!pincode,
  });

export const useStoreBySlug = (slug) =>
  useQuery({
    queryKey: queryKeys.storeBySlug(slug),
    queryFn: () => api.fetchStoreBySlug(slug),
    enabled: !!slug,
  });

export const useMyOrders = (enabled = true) =>
  useQuery({ queryKey: queryKeys.myOrders, queryFn: api.fetchMyOrders, enabled });

// Wishlist — one `useWishlist` fetches the populated list + id set; the
// two mutations below do an optimistic update on the cache so heart buttons
// toggle instantly and reconcile with the server response on completion.
export const useWishlist = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.myWishlist,
    queryFn:  api.fetchWishlist,
    enabled,
    // Default shape so components can read `.ids` even before the first
    // fetch resolves without a bunch of `?.`
    placeholderData: { items: [], ids: [] },
  });

export const useAddToWishlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addToWishlist,
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: queryKeys.myWishlist });
      const prev = qc.getQueryData(queryKeys.myWishlist);
      if (prev) {
        qc.setQueryData(queryKeys.myWishlist, {
          ...prev,
          ids: Array.from(new Set([...(prev.ids || []), productId])),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(queryKeys.myWishlist, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.myWishlist }),
  });
};

export const useRemoveFromWishlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeFromWishlist,
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: queryKeys.myWishlist });
      const prev = qc.getQueryData(queryKeys.myWishlist);
      if (prev) {
        qc.setQueryData(queryKeys.myWishlist, {
          ...prev,
          ids:   (prev.ids || []).filter((id) => id !== productId),
          items: (prev.items || []).filter((p) => (p._id || p.id) !== productId),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(queryKeys.myWishlist, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.myWishlist }),
  });
};

export const useProductReviews = (productId) =>
  useQuery({
    queryKey: queryKeys.productReviews(productId),
    queryFn: () => api.fetchProductReviews(productId),
    enabled: !!productId,
  });

export const useSubmitReview = (productId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.submitProductReview(productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productReviews(productId) });
      qc.invalidateQueries({ queryKey: queryKeys.product(productId) });
    },
  });
};

export const useDeleteReview = (productId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId) => api.deleteProductReview(productId, reviewId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productReviews(productId) });
      qc.invalidateQueries({ queryKey: queryKeys.product(productId) });
    },
  });
};

// ── Public mutations ────────────────────────────────────────────────────────
export const useRegister       = () => useMutation({ mutationFn: api.register });
export const useLogin          = () => useMutation({ mutationFn: api.login });
export const useUnifiedLogin   = () => useMutation({ mutationFn: api.unifiedLogin });
export const useSendOtp        = () => useMutation({ mutationFn: api.sendOtp });
export const useVerifyOtp      = () => useMutation({ mutationFn: api.verifyOtp });
export const useResetPassword  = () => useMutation({ mutationFn: api.resetPassword });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.myOrders }),
  });
};

export const useSubscribeNewsletter = () => useMutation({ mutationFn: api.subscribeNewsletter });

// ── Admin auth ──────────────────────────────────────────────────────────────
export const useAdminLogin = () => useMutation({ mutationFn: api.adminLogin });

// ── Admin dashboard ─────────────────────────────────────────────────────────
export const useAdminStats = () =>
  useQuery({ queryKey: queryKeys.adminStats, queryFn: api.adminGetStats });

// ── Admin categories ────────────────────────────────────────────────────────
export const useAdminCategories = () =>
  useQuery({ queryKey: queryKeys.adminCategories, queryFn: api.adminGetCategories });

// Invalidate both the admin list and the public-facing list so admin edits
// show up immediately on the homepage without a hard refresh.
const invalidateCategories = (qc) => {
  qc.invalidateQueries({ queryKey: queryKeys.adminCategories });
  qc.invalidateQueries({ queryKey: queryKeys.categories });
  qc.invalidateQueries({ queryKey: queryKeys.navCategories });
};

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminCreateCategory, onSuccess: () => invalidateCategories(qc) });
};
export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.adminUpdateCategory(id, data),
    onSuccess: () => invalidateCategories(qc),
  });
};
export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminDeleteCategory, onSuccess: () => invalidateCategories(qc) });
};

// ── Admin banners ───────────────────────────────────────────────────────────
export const useAdminBanners = () =>
  useQuery({ queryKey: queryKeys.adminBanners, queryFn: api.adminGetBanners });

const invalidateBanners = (qc) => {
  qc.invalidateQueries({ queryKey: queryKeys.adminBanners });
  qc.invalidateQueries({ queryKey: queryKeys.banners });
};

export const useCreateBanner = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminCreateBanner, onSuccess: () => invalidateBanners(qc) });
};
export const useUpdateBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.adminUpdateBanner(id, data),
    onSuccess: () => invalidateBanners(qc),
  });
};
export const useDeleteBanner = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminDeleteBanner, onSuccess: () => invalidateBanners(qc) });
};

// ── Admin offers ────────────────────────────────────────────────────────────
export const useAdminOffers = () =>
  useQuery({ queryKey: queryKeys.adminOffers, queryFn: api.adminGetOffers });

const invalidateOffers = (qc) => {
  qc.invalidateQueries({ queryKey: queryKeys.adminOffers });
  qc.invalidateQueries({ queryKey: queryKeys.offers });
};

export const useCreateOffer = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminCreateOffer, onSuccess: () => invalidateOffers(qc) });
};
export const useUpdateOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.adminUpdateOffer(id, data),
    onSuccess: () => invalidateOffers(qc),
  });
};
export const useDeleteOffer = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminDeleteOffer, onSuccess: () => invalidateOffers(qc) });
};

// ── Admin products ──────────────────────────────────────────────────────────
export const useAdminProducts = (params) =>
  useQuery({ queryKey: queryKeys.adminProducts(params), queryFn: () => api.adminGetProducts(params) });

const invalidateProducts = (qc) => {
  qc.invalidateQueries({ queryKey: ['admin', 'products'] });
  qc.invalidateQueries({ queryKey: ['products'] });
  qc.invalidateQueries({ queryKey: queryKeys.featured });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminCreateProduct, onSuccess: () => invalidateProducts(qc) });
};
export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.adminUpdateProduct(id, data),
    onSuccess: () => invalidateProducts(qc),
  });
};
export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminDeleteProduct, onSuccess: () => invalidateProducts(qc) });
};

// Bulk upload — accepts an array of product payloads, returns
// { created, failed, total } so the UI can report row-level errors.
export const useBulkCreateProducts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.adminBulkCreateProducts,
    onSuccess: () => invalidateProducts(qc),
  });
};

// ── Admin featured ──────────────────────────────────────────────────────────
export const useAdminFeatured = () =>
  useQuery({ queryKey: queryKeys.adminFeatured, queryFn: api.adminGetFeatured });

export const useSetFeatured = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.adminSetFeatured,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminFeatured });
      qc.invalidateQueries({ queryKey: queryKeys.featured });
    },
  });
};

// ── Admin deals (multiple) ──────────────────────────────────────────────────
const invalidateDeals = (qc) => {
  qc.invalidateQueries({ queryKey: queryKeys.adminDeal });
  qc.invalidateQueries({ queryKey: queryKeys.deal });
};

export const useAdminDeals = () =>
  useQuery({ queryKey: queryKeys.adminDeal, queryFn: api.adminGetDeals });

export const useCreateDeal = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminCreateDeal, onSuccess: () => invalidateDeals(qc) });
};
export const useUpdateDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.adminUpdateDeal(id, data),
    onSuccess: () => invalidateDeals(qc),
  });
};
export const useDeleteDeal = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminDeleteDeal, onSuccess: () => invalidateDeals(qc) });
};

// ── Admin orders ────────────────────────────────────────────────────────────
export const useAdminOrders = (params) =>
  useQuery({ queryKey: queryKeys.adminOrders(params), queryFn: () => api.adminGetOrders(params) });

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.adminUpdateOrder(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  });
};

// ── Admin stores ────────────────────────────────────────────────────────────
export const useAdminStores = () =>
  useQuery({ queryKey: queryKeys.adminStores, queryFn: api.adminGetStores });

const invalidateStores = (qc) => {
  qc.invalidateQueries({ queryKey: queryKeys.adminStores });
  qc.invalidateQueries({ queryKey: ['stores'] });
};

export const useCreateStore = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminCreateStore, onSuccess: () => invalidateStores(qc) });
};
export const useUpdateStore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.adminUpdateStore(id, data),
    onSuccess: () => invalidateStores(qc),
  });
};
export const useDeleteStore = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminDeleteStore, onSuccess: () => invalidateStores(qc) });
};

// ── Admin users ─────────────────────────────────────────────────────────────
export const useAdminUsers = (params) =>
  useQuery({ queryKey: queryKeys.adminUsers(params), queryFn: () => api.adminGetUsers(params) });

export const useSetUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }) => api.adminSetUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
};

export const useSetUserBlocked = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }) => api.adminSetUserBlocked(id, blocked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
};

// ── Admin promotions ────────────────────────────────────────────────────────
// A promo change affects storefront pricing everywhere, so we invalidate the
// public product + featured + deal caches alongside the admin list.
const invalidatePromotions = (qc) => {
  qc.invalidateQueries({ queryKey: queryKeys.adminPromotions });
  qc.invalidateQueries({ queryKey: ['products'] });
  qc.invalidateQueries({ queryKey: queryKeys.featured });
  qc.invalidateQueries({ queryKey: queryKeys.deal });
};

export const useAdminPromotions = () =>
  useQuery({ queryKey: queryKeys.adminPromotions, queryFn: api.adminGetPromotions });

export const useCreatePromotion = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminCreatePromotion, onSuccess: () => invalidatePromotions(qc) });
};
export const useUpdatePromotion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.adminUpdatePromotion(id, data),
    onSuccess: () => invalidatePromotions(qc),
  });
};
export const useDeletePromotion = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.adminDeletePromotion, onSuccess: () => invalidatePromotions(qc) });
};

// ── Admin settings (branding) ───────────────────────────────────────────────
export const useAdminSettings = () =>
  useQuery({ queryKey: queryKeys.adminSettings, queryFn: api.adminGetSettings });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.adminUpdateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSettings });
      qc.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
};

// ── Admin visitor analytics ─────────────────────────────────────────────────
// `staleTime: 30s` so quickly clicking between ranges stays snappy, but the
// number refreshes often enough to feel live.
export const useVisitStats = (range) =>
  useQuery({
    queryKey: queryKeys.adminVisitStats(range),
    queryFn:  () => api.adminGetVisitStats(range),
    staleTime: 30_000,
  });
