/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  SlidersHorizontal,
  Wifi,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import {
  BUSINESS_CATEGORIES,
  DIETARY_FILTERS,
  FoodListing,
  KAMPALA_NEIGHBORHOODS,
} from './types/marketplace';
import {
  calculateDiscountPercent,
  filterAndRankListings,
  formatUgx,
} from './lib/domainLogic';
import { FoodArtwork } from './lib/foodArtwork';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CustomerDashboardView } from './components/CustomerDashboardView';
import { BusinessPortalView } from './components/BusinessPortalView';
import { AdminConsoleView } from './components/AdminConsoleView';

type ActiveScreen = 'marketplace' | 'how_it_works' | 'customer_orders' | 'business_portal' | 'admin_console';

function SurplusSaverShell() {
  const {
    firebaseUser,
    userProfile,
    listings,
    businesses,
    orders,
    reviews,
    lowBandwidthMode,
    toggleLowBandwidthMode,
    signInWithGoogle,
    signOutUser,
    setActiveRoleView,
  } = useMarketplace();

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('marketplace');
  const [selectedListing, setSelectedListing] = useState<FoodListing | null>(null);

  // Marketplace Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('All Kampala');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedDietary, setSelectedDietary] = useState<string>('All');
  const [maxPriceUgx, setMaxPriceUgx] = useState<number>(0);
  const [sortBy, setSortBy] = useState<
    'recommended' | 'price_asc' | 'discount_desc' | 'distance_asc' | 'closing_soon'
  >('recommended');
  const [legalModalTopic, setLegalModalTopic] = useState<'privacy' | 'terms' | 'safety' | null>(
    null
  );

  const filteredListings = useMemo(
    () =>
      filterAndRankListings(
        listings,
        {
          searchQuery,
          neighborhood: selectedNeighborhood,
          category: selectedCategory,
          dietaryTag: selectedDietary,
          maxPriceUgx,
          sortBy,
          onlyAvailable: true,
        },
        Date.now()
      ),
    [
      listings,
      searchQuery,
      selectedNeighborhood,
      selectedCategory,
      selectedDietary,
      maxPriceUgx,
      sortBy,
    ]
  );

  const approvedBusinesses = useMemo(
    () => businesses.filter((b) => b.verificationStatus === 'approved'),
    [businesses]
  );

  const activeReservationsCount = useMemo(
    () =>
      orders.filter(
        (o) => o.orderStatus === 'reserved' || o.orderStatus === 'ready_for_pickup'
      ).length,
    [orders]
  );

  const navigateToRoleScreen = (screen: ActiveScreen) => {
    setActiveScreen(screen);
    if (screen === 'business_portal') setActiveRoleView('business');
    else if (screen === 'admin_console') setActiveRoleView('admin');
    else setActiveRoleView('customer');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C241E]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-8 py-4 bg-[#FAF8F5]/95 backdrop-blur-xs border-b border-[#E2DDD5]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            navigateToRoleScreen('marketplace');
          }}
          className="text-xl font-display font-bold tracking-tight text-[#1B5E3A] whitespace-nowrap shrink-0"
        >
          SurplusSaver
        </a>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#3A433C]"
        >
          <a
            href="#discover"
            onClick={(e) => {
              e.preventDefault();
              navigateToRoleScreen('marketplace');
            }}
            className={`hover:text-[#1B5E3A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'marketplace' ? 'text-[#1B5E3A] font-semibold underline' : ''
            }`}
          >
            Discover Offers
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              navigateToRoleScreen('how_it_works');
            }}
            className={`hover:text-[#1B5E3A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'how_it_works' ? 'text-[#1B5E3A] font-semibold underline' : ''
            }`}
          >
            How It Works
          </a>
          <a
            href="#my-orders"
            onClick={(e) => {
              e.preventDefault();
              navigateToRoleScreen('customer_orders');
            }}
            className={`hover:text-[#1B5E3A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'customer_orders' ? 'text-[#1B5E3A] font-semibold underline' : ''
            }`}
          >
            {activeReservationsCount > 0
              ? `My Orders (${activeReservationsCount})`
              : 'My Orders'}
          </a>
          <a
            href="#partner-portal"
            onClick={(e) => {
              e.preventDefault();
              navigateToRoleScreen('business_portal');
            }}
            className={`hover:text-[#1B5E3A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'business_portal' ? 'text-[#1B5E3A] font-semibold underline' : ''
            }`}
          >
            Business Portal
          </a>
          <a
            href="#admin-console"
            onClick={(e) => {
              e.preventDefault();
              navigateToRoleScreen('admin_console');
            }}
            className={`hover:text-[#1B5E3A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'admin_console' ? 'text-[#1B5E3A] font-semibold underline' : ''
            }`}
          >
            Admin Console
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {firebaseUser ? (
            <button
              type="button"
              onClick={signOutUser}
              className="px-4 py-2 text-xs font-semibold text-[#1C241E] bg-[#EFECE6] hover:bg-[#E2DDD5] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Sign Out ({userProfile?.displayName?.split(' ')[0] || 'Account'})
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1B5E3A] hover:bg-[#14472B] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Bar (Visible on small viewports) */}
      <div className="md:hidden flex items-center justify-between gap-1 px-4 py-2 bg-[#EFECE6] border-b border-[#E2DDD5] overflow-x-auto">
        {[
          { id: 'marketplace', label: 'Discover' },
          { id: 'customer_orders', label: `Orders (${orders.length})` },
          { id: 'business_portal', label: 'Business' },
          { id: 'admin_console', label: 'Admin' },
          { id: 'how_it_works', label: 'Safety & Info' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigateToRoleScreen(item.id as ActiveScreen)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
              activeScreen === item.id
                ? 'bg-white text-[#1B5E3A] shadow-xs'
                : 'text-[#5A655D]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content Router */}
      <main className="flex-1">
        {activeScreen === 'customer_orders' && (
          <CustomerDashboardView onSelectListing={(lst) => setSelectedListing(lst)} />
        )}

        {activeScreen === 'business_portal' && <BusinessPortalView />}

        {activeScreen === 'admin_console' && <AdminConsoleView />}

        {activeScreen === 'how_it_works' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <div>
              <div className="text-xs text-[#1B5E3A] font-semibold">
                Kampala Pilot · Food Safety & Marketplace Architecture
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold text-[#1C241E]">
                How SurplusSaver Works for Customers & Food Businesses
              </h1>
              <p className="mt-3 text-base text-[#5A655D] max-w-2xl leading-relaxed">
                Good Food. Better Prices. Less Waste. We connect KCCA-verified Kampala restaurants, bakeries, grocers, and hotels with nearby residents seeking quality meals and groceries at 50%–60% off retail prices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-white border border-[#E2DDD5]">
                <div className="text-xs font-mono-tabular font-bold text-[#1B5E3A]">
                  01. Discover Nearby Surplus
                </div>
                <h2 className="mt-2 text-lg font-display font-bold text-[#1C241E]">
                  Verified Daily Listings in UGX
                </h2>
                <p className="mt-2 text-xs text-[#5A655D] leading-relaxed">
                  Approved businesses list unsold fresh food before closing time with transparent original vs. discounted UGX prices, full ingredient lists, declared allergens, and storage instructions.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-white border border-[#E2DDD5]">
                <div className="text-xs font-mono-tabular font-bold text-[#1B5E3A]">
                  02. Atomic Checkout & Hold
                </div>
                <h2 className="mt-2 text-lg font-display font-bold text-[#1C241E]">
                  Reserve Online Without Overselling
                </h2>
                <p className="mt-2 text-xs text-[#5A655D] leading-relaxed">
                  Select your quantity and pickup window. Our atomic inventory reservation guarantees two customers never buy the final unit, and supports MTN MoMo, Airtel Money, Card (Sandbox), or Pay-on-Collection hold.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-white border border-[#E2DDD5]">
                <div className="text-xs font-mono-tabular font-bold text-[#1B5E3A]">
                  03. Code-Verified Collection
                </div>
                <h2 className="mt-2 text-lg font-display font-bold text-[#1C241E]">
                  Collect Within the Safe Window
                </h2>
                <p className="mt-2 text-xs text-[#5A655D] leading-relaxed">
                  Present your 6-character collection code (`SS-XXXXXX`) at the shop before the collection deadline. Staff verify the code to complete handover and record net settlement proceeds.
                </p>
              </div>
            </div>

            {/* Food Safety Charter & Prohibited Items */}
            <div className="p-6 sm:p-8 rounded-xl bg-white border border-[#E2DDD5] space-y-4">
              <h2 className="text-xl font-display font-bold text-[#1C241E] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1B5E3A]" />
                <span>Mandatory Kampala Food Safety & Marketplace Trust Rules</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#3A433C]">
                <div className="space-y-2">
                  <div className="font-bold text-[#1C241E]">
                    Strict Separation of Three Deadlines
                  </div>
                  <p className="text-[#5A655D] leading-relaxed">
                    Every listing enforces three chronological timestamps: (1) <strong>Sale Cutoff</strong> (when online reservations close), (2) <strong>Customer Collection Deadline</strong> (when pickup closes), and (3) <strong>Safe-Use Guideline</strong>. SurplusSaver never infers food safety from a date alone.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="font-bold text-[#9A3412]">
                    Prohibited Food Categories
                  </div>
                  <p className="text-[#5A655D] leading-relaxed">
                    Businesses are strictly prohibited from listing: unpasteurized dairy, raw minced meat or offal, infant formula, alcohol, temperature-abused buffet items, or any food lacking allergen disclosures.
                  </p>
                </div>
              </div>
            </div>

            {/* Frequently Asked Questions */}
            <div className="space-y-4">
              <h2 className="text-xl font-display font-bold text-[#1C241E] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#1B5E3A]" />
                <span>Frequently Asked Questions</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
                  <div className="font-bold text-[#1C241E]">
                    What is a Surprise Surplus Bundle?
                  </div>
                  <p className="mt-1.5 text-[#5A655D] leading-relaxed">
                    Bakeries and supermarkets often don&apos;t know which exact pastries or produce items will remain at closing time. A Surprise Bundle guarantees the stated retail value and dietary/allergen category at 55%+ off.
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
                  <div className="font-bold text-[#1C241E]">
                    What if I need to cancel my reservation?
                  </div>
                  <p className="mt-1.5 text-[#5A655D] leading-relaxed">
                    You can cancel any uncollected reservation from your Customer Dashboard up to 45 minutes before the collection deadline closes. Stock is immediately restored.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'marketplace' && (
          <>
            {/* Storefront Hero Section (2-Column Balanced Split + Full-Width Bar Below) */}
            <section className="border-b border-[#E2DDD5] bg-[#FAF8F5]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                  {/* Left Column: Value Proposition, Location Selector & Search */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-medium text-[#1B5E3A]">
                        Kampala, Uganda · Good Food. Better Prices. Less Waste.
                      </div>
                      <h1 className="mt-2 text-3xl sm:text-5xl font-display font-bold text-[#1C241E] tracking-tight leading-[1.12]">
                        Save More on Great Food. Help Waste Less.
                      </h1>
                      <p className="mt-4 text-base text-[#5A655D] max-w-2xl leading-relaxed">
                        Discover discounted surplus food from local restaurants, bakeries and shops. Reserve your favourites in UGX and collect them at a convenient time.
                      </p>

                      {/* Location & Search Bar */}
                      <div className="mt-6 p-2 rounded-xl bg-white border border-[#D5CFC4] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 border-b sm:border-b-0 sm:border-r border-[#E2DDD5] shrink-0">
                          <MapPin className="w-4 h-4 text-[#1B5E3A] shrink-0" />
                          <select
                            aria-label="Select Kampala Neighborhood"
                            value={selectedNeighborhood}
                            onChange={(e) => setSelectedNeighborhood(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-[#1C241E] focus:outline-none"
                          >
                            {KAMPALA_NEIGHBORHOODS.map((area) => (
                              <option key={area} value={area}>
                                {area}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1 flex items-center gap-2 px-3 py-2">
                          <Search className="w-4 h-4 text-[#5A655D] shrink-0" />
                          <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search sourdough, luwombo, produce, Kololo..."
                            className="w-full bg-transparent text-xs text-[#1C241E] placeholder-[#7A847D] focus:outline-none"
                          />
                        </div>

                        <a
                          href="#offers-grid"
                          className="px-4 py-2.5 rounded-lg bg-[#1B5E3A] hover:bg-[#14472B] text-white text-xs font-semibold text-center transition-colors whitespace-nowrap shrink-0"
                        >
                          Find Food Near Me
                        </a>
                      </div>
                    </div>

                    {/* Secondary CTAs & Workspace Switcher */}
                    <div className="mt-6 pt-6 border-t border-[#E2DDD5] flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => navigateToRoleScreen('business_portal')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#EFECE6] hover:bg-[#E2DDD5] text-xs font-semibold text-[#1C241E] transition-colors whitespace-nowrap shrink-0"
                        >
                          <span>Partner With Us (Business Portal)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={toggleLowBandwidthMode}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D5CFC4] text-xs font-medium text-[#5A655D] hover:text-[#1C241E] whitespace-nowrap shrink-0"
                        >
                          <Wifi className="w-3.5 h-3.5 text-[#1B5E3A]" />
                          <span>{lowBandwidthMode ? 'Low-Data Mode: ON' : 'Low-Data Mode: OFF'}</span>
                        </button>
                      </div>

                      <div className="text-xs text-[#5A655D] font-mono-tabular">
                        {filteredListings.length} verified offers available today
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Featured Spotlight Offer Card */}
                  <div className="lg:col-span-5">
                    {listings[0] && (
                      <div
                        onClick={() => setSelectedListing(listings[0])}
                        className="h-full rounded-xl bg-white border border-[#E2DDD5] overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-16/9 w-full bg-[#F3E9DC] overflow-hidden">
                          <FoodArtwork
                            imageKey={listings[0].imageKey}
                            customImageDataUrl={listings[0].customImageDataUrl}
                            title={listings[0].title}
                            lowBandwidth={lowBandwidthMode}
                          />
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-xs text-[#5A655D]">
                              Featured Today · {listings[0].businessName} · {listings[0].neighborhood}
                            </div>
                            <h2 className="mt-1.5 text-xl font-display font-bold text-[#1C241E]">
                              {listings[0].title}
                            </h2>
                            <p className="mt-2 text-xs text-[#5A655D] line-clamp-2">
                              {listings[0].description}
                            </p>
                          </div>

                          <div className="mt-5 pt-4 border-t border-[#E2DDD5] flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl font-mono-tabular font-bold text-[#1B5E3A]">
                                  {formatUgx(listings[0].discountedPriceUgx)}
                                </span>
                                <span className="text-xs font-mono-tabular line-through text-[#7A847D]">
                                  {formatUgx(listings[0].originalPriceUgx)}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#5A655D] mt-0.5">
                                {listings[0].collectionWindowLabel} · {listings[0].remainingQuantity}{' '}
                                left
                              </div>
                            </div>
                            <span className="px-3.5 py-2 rounded-lg bg-[#1B5E3A] text-white text-xs font-semibold whitespace-nowrap shrink-0">
                              Reserve Offer
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Discover Marketplace & Multi-Dimensional Filters */}
            <section id="offers-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              {/* Interactive Category Filter Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E2DDD5]">
                <div className="flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg overflow-x-auto">
                  {['All Categories', ...BUSINESS_CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-white text-[#1C241E] shadow-xs'
                          : 'text-[#5A655D] hover:text-[#1C241E]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Secondary Filters: Dietary, Price Ceiling, and Sort */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <div className="inline-flex items-center gap-1.5 text-[#5A655D]">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Dietary:</span>
                  </div>
                  <select
                    aria-label="Filter by Dietary Characteristic"
                    value={selectedDietary}
                    onChange={(e) => setSelectedDietary(e.target.value)}
                    className="rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1.5 text-[#1C241E]"
                  >
                    <option value="All">All Dietary</option>
                    {DIETARY_FILTERS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by Maximum UGX Price"
                    value={maxPriceUgx}
                    onChange={(e) => setMaxPriceUgx(Number(e.target.value))}
                    className="rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1.5 font-mono-tabular text-[#1C241E]"
                  >
                    <option value={0}>Any Price (UGX)</option>
                    <option value={15000}>Up to UGX 15,000</option>
                    <option value={20000}>Up to UGX 20,000</option>
                    <option value={25000}>Up to UGX 25,000</option>
                  </select>

                  <select
                    aria-label="Sort Surplus Offers"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1.5 text-[#1C241E]"
                  >
                    <option value="recommended">Sort: Recommended</option>
                    <option value="price_asc">Price: Lowest First</option>
                    <option value="discount_desc">Savings: Highest %</option>
                    <option value="distance_asc">Distance: Nearest</option>
                    <option value="closing_soon">Sale Closing Soon</option>
                  </select>
                </div>
              </div>

              {/* 3-Column Product Card Grid */}
              {filteredListings.length === 0 ? (
                <div className="my-12 p-10 rounded-xl bg-white border border-[#E2DDD5] text-center max-w-lg mx-auto">
                  <h3 className="text-lg font-display font-bold text-[#1C241E]">
                    No Matching Surplus Offers Found
                  </h3>
                  <p className="mt-1.5 text-xs text-[#5A655D]">
                    Try clearing your neighborhood, price, or dietary filters to view all available Kampala food offers.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedNeighborhood('All Kampala');
                      setSelectedCategory('All Categories');
                      setSelectedDietary('All');
                      setMaxPriceUgx(0);
                    }}
                    className="mt-4 px-4 py-2 rounded-lg bg-[#1B5E3A] text-white text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredListings.map((item) => {
                    const discountPct = calculateDiscountPercent(
                      item.originalPriceUgx,
                      item.discountedPriceUgx
                    );
                    return (
                      <article
                        key={item.id}
                        onClick={() => setSelectedListing(item)}
                        className="group rounded-xl bg-white border border-[#E2DDD5] overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
                      >
                        <div>
                          {/* Lead with Imagery (4:3 Aspect Ratio) */}
                          <div className="aspect-4/3 w-full bg-[#F2EFE9] overflow-hidden border-b border-[#E2DDD5]">
                            <FoodArtwork
                              imageKey={item.imageKey}
                              customImageDataUrl={item.customImageDataUrl}
                              title={item.title}
                              lowBandwidth={lowBandwidthMode}
                            />
                          </div>

                          <div className="p-5">
                            {/* Unboxed Metadata with Typographic Separators (Zero-Pill Rule) */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5A655D]">
                              <span className="font-medium text-[#1B5E3A]">{item.businessName}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.neighborhood}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">{item.distanceKm.toFixed(1)} km</span>
                              {item.isSponsored && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[#8A5A00] font-medium">Sponsored</span>
                                </>
                              )}
                            </div>

                            <h3 className="mt-1.5 text-base font-semibold text-[#1C241E] group-hover:text-[#1B5E3A] transition-colors line-clamp-2">
                              {item.title}
                            </h3>

                            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#5A655D]">
                              <Clock className="w-3.5 h-3.5 text-[#1B5E3A] shrink-0" />
                              <span>{item.collectionWindowLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular font-semibold text-[#B45309]">
                                {item.remainingQuantity} left
                              </span>
                            </div>

                            <div className="mt-1.5 text-[11px] text-[#5A655D] truncate">
                              Allergens: {item.allergens}
                            </div>
                          </div>
                        </div>

                        {/* Price & Reserve Footer */}
                        <div className="px-5 py-3.5 bg-[#FAF8F5] border-t border-[#E2DDD5] flex items-center justify-between">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-mono-tabular font-bold text-[#1C241E]">
                                {formatUgx(item.discountedPriceUgx)}
                              </span>
                              <span className="text-xs font-mono-tabular line-through text-[#7A847D]">
                                {formatUgx(item.originalPriceUgx)}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono-tabular font-semibold text-[#1B5E3A]">
                              Save {discountPct}% ({formatUgx(item.originalPriceUgx - item.discountedPriceUgx)})
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedListing(item);
                            }}
                            className="px-3.5 py-2 rounded-lg bg-[#1B5E3A] hover:bg-[#14472B] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                          >
                            Reserve
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 3: Participating Kampala Businesses & Verified Customer Reviews */}
            <section className="border-t border-[#E2DDD5] bg-white py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-[#1B5E3A]">
                      KCCA Hygiene Permit Checked · Transparent Food Safety
                    </div>
                    <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#1C241E]">
                      Participating Kampala Food Partners ({approvedBusinesses.length})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToRoleScreen('business_portal')}
                    className="text-xs font-semibold text-[#1B5E3A] hover:underline whitespace-nowrap shrink-0"
                  >
                    Register Your Restaurant, Bakery or Supermarket →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {approvedBusinesses.map((biz) => (
                    <div
                      key={biz.id}
                      onClick={() => {
                        setSelectedNeighborhood(biz.neighborhood);
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E2DDD5] hover:border-[#1B5E3A] transition-colors cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs text-[#5A655D]">
                          {biz.category} · {biz.neighborhood}
                        </div>
                        <h3 className="mt-1 text-base font-bold text-[#1C241E]">{biz.name}</h3>
                        <p className="mt-1 text-xs text-[#5A655D]">{biz.address}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#E2DDD5] flex items-center justify-between text-[11px] font-mono-tabular text-[#5A655D]">
                        <span className="inline-flex items-center gap-1 text-[#1B5E3A] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{biz.kccaPermitNumber}</span>
                        </span>
                        <span>{biz.distanceKm.toFixed(1)} km</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Verified Post-Collection Customer Reviews */}
                {reviews.length > 0 && (
                  <div className="pt-8 border-t border-[#E2DDD5]">
                    <h3 className="text-lg font-display font-bold text-[#1C241E]">
                      Verified Post-Purchase Customer Reviews
                    </h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                      {reviews.slice(0, 4).map((rev) => (
                        <div
                          key={rev.id}
                          className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E2DDD5] text-xs"
                        >
                          <div className="flex items-center justify-between text-[#5A655D]">
                            <span className="font-bold text-[#1C241E]">{rev.customerName}</span>
                            <span className="font-mono-tabular font-semibold text-[#1B5E3A]">
                              {rev.rating} / 5 Stars · Verified Collection
                            </span>
                          </div>
                          <p className="mt-2 text-[#3A433C] leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Product Detail & Atomic Checkout Modal */}
      <ProductDetailModal
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
        onOrderConfirmed={() => navigateToRoleScreen('customer_orders')}
        onReportIssue={(lst) => {
          setSelectedListing(null);
          navigateToRoleScreen('customer_orders');
          void lst;
        }}
      />

      {/* Legal, Privacy & Food Safety Policy Modal */}
      {legalModalTopic && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-xl bg-white border border-[#E2DDD5] p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-3">
              <h3 className="text-base font-display font-bold text-[#1C241E]">
                {legalModalTopic === 'privacy'
                  ? 'Privacy Notice (Uganda PDPO Compliance)'
                  : legalModalTopic === 'terms'
                  ? 'SurplusSaver Terms of Service & Cancellation Policy'
                  : 'Food Safety, Allergen & Hygiene Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModalTopic(null)}
                className="text-xs font-semibold text-[#5A655D]"
              >
                Close
              </button>
            </div>
            {legalModalTopic === 'privacy' && (
              <div className="space-y-2 text-[#5A655D] leading-relaxed">
                <p>
                  SurplusSaver processes personal data in accordance with the Data Protection and Privacy Act of Uganda and Personal Data Protection Office (PDPO) guidelines.
                </p>
                <p>
                  We collect only your display name, neighborhood preference, and isolated contact information (`/users/&#123;uid&#125;/private/info`) required to issue booking confirmations and food-safety recall notices. We never sell personal data or expose customer locations to third parties.
                </p>
              </div>
            )}
            {legalModalTopic === 'terms' && (
              <div className="space-y-2 text-[#5A655D] leading-relaxed">
                <p>
                  Reservations hold live inventory at participating Kampala food businesses. Customers must present their 6-character verification code (`SS-XXXXXX`) before the stated collection deadline.
                </p>
                <p>
                  Orders may be cancelled up to 45 minutes prior to collection closing for a full refund. Simulated Sandbox payments in this pilot environment do not charge real Mobile Money or card accounts.
                </p>
              </div>
            )}
            {legalModalTopic === 'safety' && (
              <div className="space-y-2 text-[#5A655D] leading-relaxed">
                <p>
                  All participating food businesses must maintain a valid KCCA Food Hygiene Permit, declare ingredients and allergens on every listing, and enforce strict cold/hot storage procedures.
                </p>
                <p>
                  Customers with severe food allergies should verify ingredients directly with store staff upon collection. Any critical safety report immediately suspends the listing pending inspection.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clean Footer */}
      <footer className="border-t border-[#E2DDD5] bg-[#EFECE6] py-8 px-4 sm:px-8 text-xs text-[#5A655D]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-display font-bold text-[#1C241E]">SurplusSaver</span> · Kampala, Uganda · Currency: UGX · Pilot Sample Data Marked Fictional
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => setLegalModalTopic('safety')}
              className="hover:text-[#1C241E] hover:underline whitespace-nowrap shrink-0"
            >
              Food Safety Charter
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTopic('privacy')}
              className="hover:text-[#1C241E] hover:underline whitespace-nowrap shrink-0"
            >
              Privacy Policy (Uganda PDPO)
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTopic('terms')}
              className="hover:text-[#1C241E] hover:underline whitespace-nowrap shrink-0"
            >
              Terms & Cancellation Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <MarketplaceProvider>
      <SurplusSaverShell />
    </MarketplaceProvider>
  );
}
