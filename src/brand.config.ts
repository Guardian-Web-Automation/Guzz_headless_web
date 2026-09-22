/**
 * Everything brand-specific lives in this ONE file.
 *
 * To run the same suite against another brand:
 *   1. add an entry to `brands` below (copy `guzz` and change URL / paths / selectors),
 *   2. run with `BRAND=<key> npm test` (or set BRAND in .env).
 *
 * `src/pages.ts` is brand-agnostic and reads only from here, so no page object
 * or spec ever needs to change for a new brand.
 */
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export type BrandConfig = {
  /** Display name, used in assertions and test titles. */
  name: string;
  baseUrl: string;
  /** Matched against the URL after navigation. */
  urlPattern: RegExp;
  currencySymbol: string;
  /** Route paths, relative to baseUrl. */
  paths: {
    home: string;
    allProducts: string;
    menCollection: string;
    womenCollection: string;
    cart: string;
    search: string;
    account: string;
    contactUs: string;
    wishlist: string;
  };
  /** Primary navigation: visible label -> expected href fragment. */
  nav: { label: string; href: string }[];
  /** Data the specs need but that differs per brand. */
  data: {
    searchTerm: string;
    /** Expected number of products on the "all products" listing, at minimum. */
    minProductsOnListing: number;
    /**
     * Collections under test. `defaultSort` is per collection because a
     * storefront sets its own default sort order on each one.
     */
    collections: Record<
      'shopAll' | 'men',
      { path: string; title: string; defaultSort: string }
    >;
    /** Sort options in the order they are rendered. */
    sortOptions: string[];
    /** Filter categories in the order they are rendered. */
    filterCategories: string[];
    /** A note filter that returns a known, small result set. */
    filterNote: string;
    /** Range used by the price-filter test. */
    priceRange: { from: number; to: number };
    /** Highest catalogue price, shown as a hint in the price filter. */
    highestPrice: number;
    /** A product whose card is inspected element by element. */
    sampleCard: {
      name: string;
      tag: string;
      variant: string;
      price: number;
      comparePrice: number;
      discount: string;
    };
    /** A product opened from a card to verify PDP hand-off. */
    sampleProduct: { name: string; price: number };
    /** Data the navigation-menu suite runs against. */
    menu: {
      /**
       * Category entries in the primary navigation: the visible label, the
       * collection it opens and that collection's heading.
       */
      categories: { label: string; path: string; title: string }[];
      /** The label whose collection should hold combos/sets, not singles. */
      comboLabel: string;
      /** The label whose collection is the full catalogue. */
      shopAllLabel: string;
      /**
       * A single-bottle SKU advertises a size variant like "50ml | notes".
       * Combo products must not.
       */
      singleBottleVariant: string;
    };
    /** Data the footer suite runs against. */
    footer: {
      /** Shop links: visible label -> destination. */
      shopLinks: { label: string; path: string }[];
      /** Policy / info links: visible label -> destination. */
      policyLinks: { label: string; path: string }[];
      socialNetworks: string[];
      logo: string;
      /** Address used for the newsletter case. */
      newsletterEmail: string;
      contact: {
        title: string;
        phone: string;
        email: string;
        form: {
          firstName: string;
          lastName: string;
          email: string;
          message: string;
        };
      };
    };
    /** Data the home suite runs against. */
    home: {
      /** Section keys in the order they must render, top to bottom. */
      sectionOrder: string[];
      heroSlideCount: number;
      /** Section headings, asserted case-insensitively. */
      sections: {
        bestsellers: string;
        crafting: string;
        discover: string;
        notes: string;
        perfumers: string;
      };
      /** A product in the bestsellers rail. */
      bestseller: { name: string; price: number; handle: string };
      /** Cards in the discovery row. */
      discoverySets: { name: string; price: number; handle: string }[];
      /** Lifestyle tiles: visible label -> destination path. */
      genderTiles: { label: string; path: string }[];
    };
    /** Data the cart suite runs against. */
    cart: {
      /** Primary product, added in most cart cases. */
      product: {
        handle: string;
        name: string;
        variant: string;
        price: number;
        comparePrice: number;
      };
      /** A second, distinct product for multi-line cases. */
      secondProduct: { handle: string; name: string; price: number };
      /** Order summary row labels, in render order. */
      summaryRows: string[];
    };
    /** Data the search suite runs against. */
    search: {
      term: string;
      /** Suggestion overlay section headings, in render order. */
      sections: string[];
      /** A trending chip offered for the term. */
      chip: string;
      /** A product the term matches. */
      product: { name: string; price: number; handle: string };
    };
    /** The product the PDP suite runs against. */
    pdp: {
      handle: string;
      name: string;
      price: number;
      comparePrice: number;
      discount: string;
      taxNote: string;
      /** Accordion rows in render order. */
      accordions: string[];
      /** Section headings, asserted case-insensitively. */
      sections: {
        bundle: string;
        keyNotes: string;
        heritage: string;
        reviews: string;
        recommendations: string;
      };
      /** The bundle offered on this product's page. */
      bundle: { name: string; price: number; comparePrice: number };
      /** A card in the recommendations rail. */
      recommendation: { name: string; price: number };
    };
  };
  selectors: Selectors;
};

export type Selectors = {
  header: {
    root: string;
    logo: string;
    menuButton: string;
    searchButton: string;
    /** The header swaps controls at the mobile breakpoint. */
    searchButtonMobile: string;
    menuDrawer: string;
    menuDrawerOpenClass: string;
    menuDrawerClose: string;
    menuDrawerLink: string;
    cartButton: string;
    cartBadge: string;
    accountLink: string;
    wishlistLink: string;
    nav: string;
  };
  menuDrawer: { root: string; closeButton: string };
  searchDrawer: {
    root: string;
    openRoot: string;
    overlay: string;
    panel: string;
    field: string;
    label: string;
    input: string;
    clearButton: string;
    submitButton: string;
    closeButton: string;
    body: string;
    section: string;
    heading: string;
    chip: string;
    card: string;
    cardImage: string;
    cardTitle: string;
    cardPrice: string;
    cardAddButton: string;
    searchForButton: string;
  };
  /** Full search results page. */
  searchPage: {
    root: string;
    input: string;
    submitButton: string;
    toolbar: string;
    resultCount: string;
    sortLabel: string;
    sortSelect: string;
    grid: string;
  };
  productCard: {
    root: string;
    name: string;
    link: string;
    image: string;
    genderTag: string;
    ratingStar: string;
    ratingCount: string;
    variant: string;
    price: string;
    comparePrice: string;
    discount: string;
    addButton: string;
    wishlistButton: string;
  };
  /** Home page sections. */
  home: {
    announcementBar: string;
    hero: string;
    heroSlide: string;
    heroImage: string;
    heroDots: string;
    heroDot: string;
    heroActiveDotClass: string;
    bestsellers: string;
    bestsellersTitle: string;
    bestsellersViewAll: string;
    crafting: string;
    craftingTitle: string;
    discover: string;
    discoverTitle: string;
    discoverRow: string;
    genderTiles: string;
    genderTileCard: string;
    genderTileCta: string;
    notes: string;
    notesTitle: string;
    notesItem: string;
    /** The active note. Desktop and mobile use different wrappers. */
    notesActiveItem: string;
    notesActiveItemMobile: string;
    notesItemName: string;
    notesItemLink: string;
    perfumers: string;
    perfumersTitle: string;
    uspStrip: string;
    uspItem: string;
  };
  /** Collection page shell. */
  collection: {
    root: string;
    heroBanner: string;
    marquee: string;
    title: string;
    toolbar: string;
    grid: string;
    sentinel: string;
  };
  listing: {
    filterButton: string;
    sortButton: string;
    /** Mobile renders sort/filter as a sticky bottom bar instead. */
    mobileBar: string;
    mobileSortCell: string;
    mobileFilterCell: string;
    mobileCellSub: string;
    /** Desktop sort menu items. */
    sortDropdownItem: string;
    /** Mobile sort drawer, kept so the same config drives a mobile run. */
    sortDrawer: string;
    sortOption: string;
    sortOptionRadio: string;
    /** The sort option currently selected. */
    sortOptionSelected: string;
    /** Class marking a selected filter category. */
    activeClass: string;
    filterDrawer: string;
    /** Class added to a drawer while it is open. */
    openClass: string;
    filterDrawerTitle: string;
    filterCategory: string;
    filterOption: string;
    filterOptionLabel: string;
    filterOptionCount: string;
    priceHint: string;
    priceFrom: string;
    priceTo: string;
    applyFilters: string;
    clearFilters: string;
  };
  pdp: {
    root: string;
    gallery: string;
    galleryDots: string;
    galleryDot: string;
    galleryPrev: string;
    galleryNext: string;
    title: string;
    wishlistButton: string;
    shareButton: string;
    subtitle: string;
    rating: string;
    ratingScore: string;
    ratingCount: string;
    price: string;
    comparePrice: string;
    discount: string;
    taxNote: string;
    quantityValue: string;
    increaseQuantity: string;
    decreaseQuantity: string;
    addToCart: string;
    buyNow: string;
    /** Mobile-only action bar, carrying its own copy of the CTAs. */
    stickyBar: string;
    stickyAddToCart: string;
    stickyBuyNow: string;
    uspRow: string;
    uspItem: string;
    keyNotes: string;
    keyNotesTitle: string;
    heritage: string;
    heritageTitle: string;
    accordion: string;
    accordionHeader: string;
    accordionTitle: string;
    accordionBody: string;
    accordionContent: string;
    accordionOpenClass: string;
  };
  /** The "buy the pair" upsell on the PDP. */
  bundle: {
    root: string;
    title: string;
    name: string;
    price: string;
    comparePrice: string;
    saving: string;
    addButton: string;
  };
  /** Judge.me review widget. */
  reviews: {
    root: string;
    /** Class the widget adds to itself once it has finished mounting. */
    widgetReady: string;
    widgetTitle: string;
    summaryStars: string;
    average: string;
    countText: string;
    verifiedBadge: string;
    histogramRow: string;
    histogramFrequency: string;
    writeReviewLink: string;
    /**
     * The write-a-review form. The widget renders a second, hidden copy of
     * every field, so the root is pinned to the visible form.
     */
    form: {
      root: string;
      ratingStar: string;
      body: string;
      mediaUpload: string;
      displayName: string;
      nameFormatSelect: string;
      email: string;
      submitButton: string;
      cancelLink: string;
    };
  };
  recommendations: {
    root: string;
    title: string;
  };
  /** Order summary block on the cart page. */
  cartSummary: {
    root: string;
    title: string;
    row: string;
    rowLabel: string;
    rowValue: string;
    total: string;
    totalAmount: string;
  };
  /**
   * Checkout. The storefront has two front-ends and which one appears is
   * decided by the browser, not by the test: GoKwik renders in a
   * cross-origin iframe over the storefront, but in WebKit it does not
   * engage at all and BUY NOW / CHECKOUT land on Shopify's own hosted
   * checkout instead.
   */
  checkout: {
    iframe: string;
    orderSummary: string;
    summaryPricing: string;
    originalPrice: string;
    loginContainer: string;
    /** Expands the collapsed summary to reveal the ordered lines. */
    summaryToggle: string;
    lineName: string;
    /**
     * Shopify's hosted checkout. Its class names are hashed per build, so
     * these are the ARIA roles, which are stable: the first table lists the
     * line items, the second the totals.
     */
    native: {
      url: RegExp;
      table: string;
      row: string;
      rowHeader: string;
      totalRowHeader: string;
      /** Collapses the summary on narrow viewports. */
      summaryToggle: string;
    };
  };
  cartDrawer: {
    root: string;
    backButton: string;
    bagIcon: string;
    prepaidPill: string;
    line: string;
    lineImage: string;
    lineName: string;
    lineVariant: string;
    linePrice: string;
    lineComparePrice: string;
    lineRemove: string;
    quantity: string;
    quantityValue: string;
    quantityIncrease: string;
    quantityDecrease: string;
    /** "More from the lineage" upsell rail. */
    upsell: string;
    upsellTitle: string;
    upsellCard: string;
    upsellName: string;
    upsellPrice: string;
    upsellAddButton: string;
    trustStrip: string;
    summary: string;
    summaryHead: string;
    summaryTitle: string;
    summaryChevron: string;
    summaryOpenClass: string;
    summaryRow: string;
    summaryRowLabel: string;
    summaryRowValue: string;
    summaryFreeDelivery: string;
    summaryTotal: string;
    summaryTotalAmount: string;
    checkoutBar: string;
    itemCount: string;
    total: string;
    checkoutButton: string;
    emptyTitle: string;
    emptySubtitle: string;
    emptyCta: string;
    closeButton: string;
  };
  cartPage: {
    root: string;
    title: string;
    continueShopping: string;
    emptyTitle: string;
    emptyCta: string;
  };
  footer: {
    root: string;
    newsletterBlock: string;
    newsletterTitle: string;
    newsletterForm: string;
    newsletterInput: string;
    newsletterSubmit: string;
    brandLogo: string;
    brandSubtitle: string;
    columns: string;
    shopColumn: string;
    policyColumn: string;
    copyright: string;
    socialLinks: string;
  };
  /** Contact Us page. */
  contact: {
    root: string;
    title: string;
    subtitle: string;
    infoItem: string;
    form: string;
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    submitButton: string;
    confirmation: string;
  };
};

const guzz: BrandConfig = {
  name: 'GUZZ',
  baseUrl: 'https://startedwithguzz.com/',
  urlPattern: /startedwithguzz\.com/,
  currencySymbol: '₹',
  paths: {
    home: '/',
    allProducts: '/collections/all',
    menCollection: '/collections/mens-perfume-collection',
    womenCollection: '/collections/womens-perfume-collection',
    cart: '/cart',
    search: '/search',
    account: '/account',
    contactUs: '/contact-us',
    wishlist: '/wishlist',
  },
  nav: [
    { label: 'Men', href: '/collections/mens-perfume-collection' },
    { label: 'Women', href: '/collections/womens-perfume-collection' },
    { label: 'Combos', href: '/collections/perfume-combos' },
    { label: 'Unisex', href: '/collections/unisex-perfumes' },
    { label: 'Shop All', href: '/collections/all' },
    { label: 'About Us', href: '/about-us' },
  ],
  data: {
    searchTerm: 'perfume',
    minProductsOnListing: 1,
    collections: {
      shopAll: {
        path: '/collections/all',
        title: 'The Complete Fragrance Collection',
        defaultSort: 'Best Selling',
      },
      men: {
        path: '/collections/mens-perfume-collection',
        title: 'Men\u2019s Perfume Collection',
        defaultSort: 'Featured',
      },
    },
    sortOptions: [
      'Featured',
      'Best Selling',
      'Price (Low to High)',
      'Price (High to Low)',
      'Date (New to Old)',
      'Date (Old to New)',
    ],
    filterCategories: ['Notes', 'Price', 'Availability'],
    filterNote: 'Cedar',
    priceRange: { from: 700, to: 1000 },
    highestPrice: 1899,
    sampleCard: {
      name: 'Discovery Set Male',
      tag: 'Men',
      variant: '25ml',
      price: 749,
      comparePrice: 999,
      discount: '-25%',
    },
    sampleProduct: { name: 'Sapphire Ocean', price: 999 },
    menu: {
      categories: [
        {
          label: 'Men',
          path: '/collections/mens-perfume-collection',
          title: 'Men\u2019s Perfume Collection',
        },
        {
          label: 'Women',
          path: '/collections/womens-perfume-collection',
          title: "Women's Perfume Collection",
        },
        {
          label: 'Combos',
          path: '/collections/perfume-combos',
          title: 'Luxury Perfume Gift Sets & Combos',
        },
        {
          label: 'Unisex',
          path: '/collections/unisex-perfumes',
          title: 'Luxury Unisex Perfumes Crafted Without Boundaries',
        },
        {
          label: 'Shop All',
          path: '/collections/all',
          title: 'The Complete Fragrance Collection',
        },
      ],
      comboLabel: 'Combos',
      shopAllLabel: 'Shop All',
      singleBottleVariant: '^\\s*\\d+\\s*ml',
    },
    footer: {
      shopLinks: [
        { label: 'Men', path: '/collections/mens-perfume-collection' },
        { label: 'Women', path: '/collections/womens-perfume-collection' },
        { label: 'My Wishlist', path: '/wishlist' },
        {
          label: 'Track My Order',
          path: 'https://guzz.shiprocket.co/tracking',
        },
      ],
      policyLinks: [
        { label: 'Terms of Service', path: '/policies/terms-of-service' },
        { label: 'Privacy Policy', path: '/policies/privacy-policy' },
        {
          label: 'Shipping & Return Policy',
          path: '/policies/shipping-return-policy',
        },
        { label: 'Contact Us', path: '/contact-us' },
        { label: 'About Us', path: '/about-us' },
      ],
      socialNetworks: ['Facebook', 'Instagram', 'YouTube'],
      logo: 'GUZZ',
      newsletterEmail: 'qa.guzz.test@example.com',
      contact: {
        title: 'CONTACT US',
        phone: '+91 88008 67746',
        email: 'support@startedwithguzz.com',
        form: {
          firstName: 'Test',
          lastName: 'User',
          email: 'qa.guzz.contact@example.com',
          message: 'Testing the contact form. Please ignore.',
        },
      },
    },
    home: {
      sectionOrder: [
        'announcementBar',
        'header',
        'hero',
        'bestsellers',
        'crafting',
        'discover',
        'genderTiles',
        'notes',
        'perfumers',
        'uspStrip',
        'footer',
      ],
      heroSlideCount: 2,
      sections: {
        bestsellers: 'Bestsellers',
        crafting: 'Crafted with Centuries of Expertise',
        discover: 'Discover Before You Commit',
        notes: 'Shop By Note',
        perfumers: 'Our Founders',
      },
      bestseller: {
        name: 'Sapphire Ocean',
        price: 999,
        handle: 'sapphire-ocean',
      },
      discoverySets: [
        {
          name: 'Discovery Set Male',
          price: 749,
          handle: 'discovery-set-male',
        },
        {
          name: 'Discovery Set Female',
          price: 749,
          handle: 'discovery-set-female',
        },
      ],
      genderTiles: [
        { label: 'SHOP MEN', path: '/collections/mens-perfume-collection' },
        { label: 'SHOP WOMEN', path: '/collections/womens-perfume-collection' },
      ],
    },
    cart: {
      product: {
        handle: 'oud',
        name: 'Øud',
        variant: '50ml',
        price: 999,
        comparePrice: 1399,
      },
      secondProduct: { handle: 'pine-noir', name: 'Pine Noir', price: 999 },
      summaryRows: ['Subtotal', 'Taxes', 'Delivery'],
    },
    search: {
      term: 'iris',
      sections: ['TRENDING NOW', 'PRODUCTS'],
      chip: 'Iris Santal',
      product: { name: 'Iris Santal', price: 999, handle: 'iris-santal' },
    },
    pdp: {
      handle: 'sapphire-ocean',
      name: 'Sapphire Ocean',
      price: 999,
      comparePrice: 1399,
      discount: '-29% OFF',
      taxNote: 'inc. of all taxes',
      accordions: ['Description', 'Notes', 'ALL INGREDIENTS'],
      sections: {
        bundle: 'Better Value, Blended',
        keyNotes: 'KEY NOTES',
        heritage: 'Our 115 yrs Legacy',
        reviews: 'Customer Reviews',
        recommendations: 'You May Also Like',
      },
      bundle: {
        name: 'Ice & Fire Signature Combo',
        price: 1899,
        comparePrice: 2798,
      },
      recommendation: { name: 'Midnight Woods', price: 999 },
    },
  },
  selectors: {
    header: {
      root: '.site-header',
      logo: '.header-logo',
      menuButton: '.mobile-menu-btn',
      searchButton: '.header-search-desktop',
      searchButtonMobile: '.header-search-mobile',
      menuDrawer: '.mobile-menu-overlay',
      menuDrawerOpenClass: 'open',
      menuDrawerClose: '.mobile-menu-close',
      menuDrawerLink: '.mobile-menu-link',
      // .header-right also holds a mobile search button that is hidden on
      // desktop, so the cart icon is pinned by its label.
      cartButton: '[aria-label="Open cart"]',
      cartBadge: '.header-cart-badge',
      accountLink: '.header-account',
      wishlistLink: '.header-wishlist',
      nav: '.header-nav',
    },
    menuDrawer: {
      root: '.mobile-menu-header',
      closeButton: '[aria-label="Close menu"]',
    },
    searchDrawer: {
      root: '.search-drawer',
      openRoot: '.search-drawer.open',
      overlay: '.search-drawer-overlay',
      panel: '.search-drawer-panel',
      field: '.search-drawer-field',
      label: '.search-drawer-label',
      input: '.search-drawer-input',
      clearButton: '.search-drawer-clear',
      submitButton: '.search-drawer-submit',
      closeButton: '.search-drawer-close',
      body: '.search-drawer-body',
      section: '.search-drawer-section',
      heading: '.search-drawer-heading',
      chip: '.search-drawer-chip',
      card: '.search-drawer-card',
      cardImage: '.search-drawer-card-image',
      cardTitle: '.search-drawer-card-title',
      cardPrice: '.search-drawer-card-price',
      cardAddButton: '.search-drawer-card-atc',
      searchForButton: '.search-drawer-search-for',
    },
    searchPage: {
      root: '.search-page',
      input: '.search-page-input',
      submitButton: '.search-page-submit',
      toolbar: '.search-toolbar',
      resultCount: '.search-result-count',
      sortLabel: '.search-sort-label',
      sortSelect: '.search-sort-select',
      grid: '.search-grid',
    },
    productCard: {
      root: '.product-card',
      name: '.product-card-name',
      link: 'a[href*="/products/"]',
      image: '.product-card-image img:not(.product-card-hover-img)',
      genderTag: '.product-card-note .product-badge',
      ratingStar: '.product-card-rating-star',
      ratingCount: '.product-card-rating-count',
      variant: '.product-card-variant',
      price: '.product-card-price',
      comparePrice: '.product-card-compare-price',
      discount: '.product-card-discount',
      addButton: '.product-card-add-btn',
      wishlistButton: '.product-card-wishlist',
    },
    home: {
      announcementBar: '.announcement-bar',
      hero: '.hero-v2',
      heroSlide: '.hero-v2-slide',
      heroImage: '.hero-v2-img',
      heroDots: '.hero-v2-dots',
      heroDot: '.hero-v2-dot',
      heroActiveDotClass: 'active',
      bestsellers: '.product-carousel-section',
      bestsellersTitle: '.section-title',
      bestsellersViewAll: '.product-carousel-viewall',
      crafting: '.crafting-section',
      craftingTitle: '.crafting-title',
      discover: '.discover-section',
      discoverTitle: '.discover-title',
      discoverRow: '.discover-products-row',
      genderTiles: '.shop-gender-split',
      genderTileCard: '.shop-gender-card',
      genderTileCta: '.shop-gender-cta',
      notes: '.notes-section',
      notesTitle: '.section-title',
      notesItem: '.notes-overlay-item',
      notesActiveItem: '.notes-overlay-item--active',
      notesActiveItemMobile: '.notes-slide--active',
      notesItemName: '.notes-text h3',
      // The image links to the product; the "discover more" button below it
      // goes to a collection instead.
      notesItemLink: '.notes-product a[href*="/products/"]',
      perfumers: '.perfumers-section',
      perfumersTitle: '.section-title',
      uspStrip: '.trust-section',
      uspItem: '.trust-badge',
    },
    collection: {
      root: '.collection-page',
      heroBanner: '.collection-hero-banner',
      marquee: '.usp-marquee',
      title: '.collection-title',
      toolbar: '.collection-toolbar',
      grid: '.plp-grid',
      sentinel: '.plp-sentinel',
    },
    listing: {
      filterButton: '.collection-filter-btn',
      sortButton: '.collection-sort-btn',
      mobileBar: '.mobile-filter-sort-bar',
      mobileSortCell: '.mfs-cell:has-text("Sort")',
      mobileFilterCell: '.mfs-cell:has-text("Filter")',
      mobileCellSub: '.mfs-sub',
      sortDropdownItem: '.collection-sort-dropdown-item',
      sortDrawer: '.plp-sort-drawer',
      sortOption: '.plp-sort-option',
      sortOptionRadio: '.plp-radio',
      sortOptionSelected: '.collection-sort-dropdown-item.active',
      activeClass: 'active',
      filterDrawer: '.plp-filter-drawer',
      openClass: 'open',
      filterDrawerTitle: '.plp-drawer-title',
      filterCategory: '.plp-filter-cat',
      filterOption: '.plp-filter-opt',
      filterOptionLabel: '.plp-filter-opt-label',
      filterOptionCount: '.plp-filter-opt-count',
      priceHint: '.plp-price-hint',
      priceFrom: '.plp-price-filter input[placeholder="From"]',
      priceTo: '.plp-price-filter input[placeholder="To"]',
      applyFilters: '.plp-drawer-apply',
      clearFilters: '.plp-clear-all',
    },
    pdp: {
      root: '.pdp-page',
      gallery: '.pdp-gallery',
      galleryDots: '.pdp-gallery-dots',
      galleryDot: '.pdp-gallery-dot',
      galleryPrev: '.pdp-gallery-arrow--prev',
      galleryNext: '.pdp-gallery-arrow--next',
      title: '.pdp-title',
      wishlistButton: '.pdp-actions [aria-label="Add to wishlist"]',
      shareButton: '.pdp-actions [aria-label="Share"]',
      subtitle: '.pdp-subtitle',
      rating: '.pdp-rating',
      ratingScore: '.pdp-rating-score',
      ratingCount: '.pdp-rating-count',
      price: '.pdp-price-current',
      comparePrice: '.pdp-price-compare',
      discount: '.pdp-price-discount',
      taxNote: '.pdp-price-tax',
      quantityValue: '.pdp-qty-val',
      // Scoped to the visible CTA block: the mobile sticky bar renders a
      // second, hidden copy of both buttons.
      increaseQuantity: '.pdp-qty [aria-label="Increase quantity"]',
      decreaseQuantity: '.pdp-qty [aria-label="Decrease quantity"]',
      addToCart: '.pdp-info-buttons .pdp-btn-atc',
      buyNow: '.pdp-info-buttons .pdp-btn-buy',
      stickyBar: '.pdp-sticky-bar',
      stickyAddToCart: '.pdp-sticky-bar .pdp-btn-atc',
      stickyBuyNow: '.pdp-sticky-bar .pdp-btn-buy',
      uspRow: '.pdp-trust-row',
      uspItem: '.pdp-trust-item',
      keyNotes: '.pdp-keynotes',
      keyNotesTitle: '.pdp-keynotes-title',
      heritage: '.pdp-legacy-v2',
      heritageTitle: '.pdp-legacy-v2-title',
      accordion: '.pdp-accordion',
      accordionHeader: '.pdp-accordion-header',
      accordionTitle: '.pdp-accordion-title',
      accordionBody: '.pdp-accordion-body',
      accordionContent: '.pdp-accordion-content',
      accordionOpenClass: 'open',
    },
    bundle: {
      root: '.pdp-bundle',
      title: '.pdp-bundle-title',
      name: '.pdp-bundle-name',
      price: '.pdp-bundle-price-current',
      comparePrice: '.pdp-bundle-price-compare',
      saving: '.pdp-bundle-saving',
      addButton: '.pdp-bundle-add-btn',
    },
    reviews: {
      root: '.pdp-reviews',
      widgetReady: '.jdgm-widget.jdgm--done-setup-widget',
      widgetTitle: '.jdgm-rev-widg__title',
      summaryStars: '.jdgm-rev-widg__summary-stars',
      average: '.jdgm-rev-widg__summary-average',
      countText: '.jdgm-rev-widg__summary-text',
      verifiedBadge: '.jdgm-verified-checkmark',
      // The widget appends a "clear filter" row after the five star rows.
      histogramRow: '.jdgm-histogram__row:not(.jdgm-histogram__clear-filter)',
      histogramFrequency: '.jdgm-histogram__frequency',
      writeReviewLink: '.jdgm-write-rev-link',
      form: {
        root: '.jdgm-form:visible',
        ratingStar: '.jdgm-form__rating .jdgm-star',
        body: 'textarea[name="review_body"]',
        mediaUpload: '.jdgm-media-fieldset__container',
        displayName: 'input[name="reviewer_name"]',
        nameFormatSelect: 'select[name="reviewer_name_format"]',
        email: 'input[name="reviewer_email"]',
        submitButton: '.jdgm-submit-rev',
        cancelLink: '.jdgm-cancel-rev',
      },
    },
    recommendations: {
      root: '.pdp-recommendations',
      title: '.pdp-recommendations-title',
    },
    cartSummary: {
      root: '.cart-summary',
      title: '.cart-summary-title',
      row: '.cart-summary-row',
      rowLabel: '.cart-summary-label',
      rowValue: '.cart-summary-value',
      total: '.cart-summary-total',
      totalAmount: '.cart-summary-total-amount',
    },
    checkout: {
      iframe: '#gokwik-iframe',
      orderSummary: '.exp-summary-content',
      summaryPricing: '.exp-summary-pricing',
      originalPrice: '.exp-original-price',
      loginContainer: '.login-container',
      summaryToggle: '.exp-summary-content',
      lineName: '.product-details-top',
      native: {
        url: /\/checkouts\//,
        table: '[role="table"]',
        row: '[role="row"]',
        rowHeader: '[role="rowheader"]',
        totalRowHeader: 'Total',
        summaryToggle: '[aria-controls="mobileOrderSummary"]',
      },
    },
    cartDrawer: {
      root: '.cart-drawer',
      backButton: '.cart-drawer-back',
      bagIcon: '.cart-drawer-bag',
      prepaidPill: '.cart-prepaid-pill',
      line: '.cart-line',
      lineImage: '.cart-line-image',
      lineName: '.cart-line-name',
      lineVariant: '.cart-line-size',
      linePrice: '.cart-price-current',
      lineComparePrice: '.cart-price-compare',
      lineRemove: '.cart-line-delete',
      quantity: '.cart-qty',
      quantityValue: '.cart-qty span',
      quantityIncrease: '.cart-qty [aria-label="Increase quantity"]',
      quantityDecrease: '.cart-qty [aria-label="Decrease quantity"]',
      upsell: '.cart-lineage',
      upsellTitle: '.cart-lineage-title',
      upsellCard: '.cart-lineage-card',
      upsellName: '.cart-lineage-name',
      upsellPrice: '.cart-lineage-price',
      upsellAddButton: '.cart-lineage-add',
      trustStrip: '.cart-trust',
      summary: '.cart-summary',
      summaryHead: '.cart-summary-head',
      summaryTitle: '.cart-summary-title',
      summaryChevron: '.cart-summary-chevron',
      summaryOpenClass: 'open',
      summaryRow: '.cart-summary-row',
      summaryRowLabel: '.cart-summary-label',
      summaryRowValue: '.cart-summary-value',
      summaryFreeDelivery: '.cart-summary-free',
      summaryTotal: '.cart-summary-total',
      summaryTotalAmount: '.cart-summary-total-amount',
      checkoutBar: '.cart-checkout-bar',
      itemCount: '.cart-items-count',
      total: '.cart-items-total',
      checkoutButton: '.cart-checkout',
      emptyTitle: '.cart-empty-title',
      emptySubtitle: '.cart-empty-sub',
      emptyCta: '.cart-empty-cta',
      closeButton: '.cart-drawer-back',
    },
    cartPage: {
      root: '.cart-page',
      title: '.cart-page-title',
      continueShopping: '.cart-continue',
      emptyTitle: '.cart-empty-title',
      emptyCta: '.cart-empty-cta',
    },
    footer: {
      root: '.site-footer',
      newsletterBlock: '.footer-newsletter',
      newsletterTitle: '.footer-newsletter-title',
      newsletterForm: '.footer-newsletter-form',
      newsletterInput: '.footer-newsletter-input',
      newsletterSubmit: '.footer-newsletter-btn',
      brandLogo: '.footer-brand-logo',
      brandSubtitle: '.footer-brand-subtitle',
      columns: '.footer-columns',
      shopColumn: '.footer-column-primary',
      policyColumn: '.footer-column-secondary',
      copyright: '.footer-copyright',
      socialLinks: '.footer-social a',
    },
    contact: {
      root: '.contact-page',
      title: '.contact-title',
      subtitle: '.contact-subtitle',
      infoItem: '.contact-info-item',
      form: '.contact-form',
      firstName: 'input[name="firstName"]',
      lastName: 'input[name="lastName"]',
      email: 'input[name="email"]',
      message: 'textarea[name="message"]',
      submitButton: '.contact-submit',
      confirmation: '.contact-confirmation',
    },
  },
};

const brands: Record<string, BrandConfig> = { guzz };

// `||` not `??`: an unset `${{ vars.BRAND }}` in CI expands to an empty
// string, and `??` would let that win and fail brand lookup.
const key = (process.env.BRAND || 'guzz').toLowerCase();
const selected = brands[key];

if (!selected) {
  throw new Error(
    `Unknown BRAND "${key}". Available: ${Object.keys(brands).join(', ')}. Add it to src/brand.config.ts.`,
  );
}

/**
 * The active brand. BASE_URL overrides the brand's own URL (staging,
 * preview, etc.).
 *
 * `||` rather than `??`: an unset `${{ vars.BASE_URL }}` in CI expands to an
 * empty string, and with `??` that empty string would win and leave baseURL
 * blank, making every relative goto() an invalid URL.
 */
export const brand: BrandConfig = {
  ...selected,
  baseUrl: process.env.BASE_URL || selected.baseUrl,
};

export const availableBrands = Object.keys(brands);
