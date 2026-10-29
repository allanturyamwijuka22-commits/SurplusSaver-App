import React from 'react';

interface FoodIllustrationProps {
  imageKey: string;
  customImageDataUrl?: string;
  title: string;
  lowBandwidth?: boolean;
  className?: string;
}

/**
 * Resilient, zero-broken-image artwork component for SurplusSaver listings.
 * Supports:
 * 1. Low-bandwidth mode (compact vector emblem with zero heavy decoding)
 * 2. Business-uploaded custom photographs (compressed Data URL)
 * 3. Curated bespoke SVG culinary illustrations tailored to Kampala food categories
 */
export const FoodArtwork: React.FC<FoodIllustrationProps> = ({
  imageKey,
  customImageDataUrl,
  title,
  lowBandwidth = false,
  className = 'w-full h-full',
}) => {
  const [imgError, setImgError] = React.useState(false);

  if (lowBandwidth) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EFECE6] text-[#1C241E] p-4 select-none ${className}`}
        role="img"
        aria-label={title}
      >
        <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#5A655D]">
          Low-Bandwidth Mode
        </span>
        <span className="mt-1 text-sm font-medium text-center line-clamp-2">{title}</span>
      </div>
    );
  }

  if (customImageDataUrl && customImageDataUrl.startsWith('data:image/') && !imgError) {
    return (
      <img
        src={customImageDataUrl}
        alt={title}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  switch (imageKey) {
    case 'bakery_sourdough':
      return (
        <svg
          viewBox="0 0 400 300"
          className={`w-full h-full object-cover bg-[#F3E9DC] ${className}`}
          role="img"
          aria-label={title}
        >
          <defs>
            <radialGradient id="bakeryGlow" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#FFF7ED" />
              <stop offset="100%" stopColor="#E6D2B5" />
            </radialGradient>
          </defs>
          <rect width="400" height="300" fill="url(#bakeryGlow)" />
          <circle cx="200" cy="165" r="105" fill="#EDE0D4" stroke="#D5BDAF" strokeWidth="2" />
          {/* Artisan Country Loaf */}
          <ellipse cx="185" cy="155" rx="76" ry="54" fill="#B06D3B" />
          <ellipse cx="183" cy="150" rx="70" ry="47" fill="#C87D45" />
          {/* Flour scoring marks */}
          <path d="M140 135 Q180 120 225 140" stroke="#F8EFE6" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M135 155 Q185 142 230 160" stroke="#F8EFE6" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M150 175 Q185 166 218 178" stroke="#F8EFE6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* Croissant accent */}
          <path
            d="M240 190 C268 172, 295 195, 275 220 C260 232, 232 215, 240 190 Z"
            fill="#D98A3C"
            stroke="#9C5A1E"
            strokeWidth="2"
          />
          <circle cx="115" cy="115" r="6" fill="#1B5E3A" opacity="0.7" />
          <circle cx="128" cy="108" r="4" fill="#1B5E3A" opacity="0.5" />
        </svg>
      );

    case 'kampala_luwombo':
      return (
        <svg
          viewBox="0 0 400 300"
          className={`w-full h-full object-cover bg-[#E9F0EA] ${className}`}
          role="img"
          aria-label={title}
        >
          <rect width="400" height="300" fill="#E7EFE8" />
          {/* Steamed Banana Leaf Wrap Base */}
          <polygon points="75,210 200,70 325,210 200,255" fill="#2D6A4F" />
          <polygon points="95,205 200,85 305,205 200,242" fill="#40916C" />
          {/* Terracotta Bowl */}
          <circle cx="200" cy="168" r="72" fill="#5C3A21" />
          <circle cx="200" cy="168" r="63" fill="#D97724" />
          {/* Matooke & Groundnut Stew Garnish */}
          <circle cx="176" cy="154" r="18" fill="#F4C44E" />
          <circle cx="215" cy="148" r="16" fill="#F4C44E" />
          <circle cx="195" cy="182" r="20" fill="#B85318" />
          <circle cx="226" cy="178" r="12" fill="#52B788" />
          <circle cx="168" cy="182" r="9" fill="#52B788" />
        </svg>
      );

    case 'fresh_produce_box':
      return (
        <svg
          viewBox="0 0 400 300"
          className={`w-full h-full object-cover bg-[#ECF3EC] ${className}`}
          role="img"
          aria-label={title}
        >
          <rect width="400" height="300" fill="#EDF4ED" />
          {/* Wooden Harvest Crate */}
          <rect x="85" y="135" width="230" height="110" rx="10" fill="#C69C6D" stroke="#8C6239" strokeWidth="3" />
          <line x1="85" y1="170" x2="315" y2="170" stroke="#8C6239" strokeWidth="3" />
          <line x1="85" y1="205" x2="315" y2="205" stroke="#8C6239" strokeWidth="3" />
          {/* Avocados, Mangoes, Tomatoes & Greens */}
          <circle cx="140" cy="118" r="32" fill="#2D6A4F" />
          <circle cx="195" cy="112" r="35" fill="#F59E0B" />
          <circle cx="252" cy="120" r="28" fill="#DC2626" />
          <ellipse cx="170" cy="130" rx="26" ry="18" fill="#52B788" />
          <ellipse cx="225" cy="132" rx="24" ry="16" fill="#1B5E3A" />
        </svg>
      );

    case 'cafe_pastry_box':
      return (
        <svg
          viewBox="0 0 400 300"
          className={`w-full h-full object-cover bg-[#F6EFE8] ${className}`}
          role="img"
          aria-label={title}
        >
          <rect width="400" height="300" fill="#F6EFE8" />
          <rect x="80" y="65" width="240" height="170" rx="16" fill="#FFFFFF" stroke="#E2D9CE" strokeWidth="3" />
          {/* Cinnamon Rolls & Mandazi Pastries */}
          <circle cx="145" cy="122" r="32" fill="#C87D45" />
          <circle cx="145" cy="122" r="20" fill="#F5EBE0" />
          <circle cx="145" cy="122" r="9" fill="#9C5A1E" />
          <circle cx="245" cy="122" r="32" fill="#D98A3C" />
          <circle cx="245" cy="122" r="18" fill="#FFF8F0" />
          <rect x="115" y="172" width="75" height="38" rx="12" fill="#7F4F24" />
          <rect x="208" y="172" width="75" height="38" rx="12" fill="#936639" />
        </svg>
      );

    case 'hotel_buffet_pack':
      return (
        <svg
          viewBox="0 0 400 300"
          className={`w-full h-full object-cover bg-[#EFECE6] ${className}`}
          role="img"
          aria-label={title}
        >
          <rect width="400" height="300" fill="#EFECE6" />
          {/* Kraft Eco Bento Container */}
          <rect x="75" y="65" width="250" height="170" rx="18" fill="#D4A373" stroke="#A97142" strokeWidth="3" />
          <rect x="92" y="82" width="105" height="68" rx="8" fill="#FAF8F5" />
          <rect x="208" y="82" width="100" height="68" rx="8" fill="#FAF8F5" />
          <rect x="92" y="160" width="216" height="58" rx="8" fill="#FAF8F5" />
          {/* Jollof / Pilau Rice, Grilled Tilapia, Steamed Greens */}
          <circle cx="144" cy="116" r="24" fill="#E07A5F" />
          <circle cx="258" cy="116" r="24" fill="#3D8361" />
          <rect x="115" y="174" width="170" height="30" rx="10" fill="#9C6644" />
        </svg>
      );

    default:
      return (
        <svg
          viewBox="0 0 400 300"
          className={`w-full h-full object-cover bg-[#E8F0EB] ${className}`}
          role="img"
          aria-label={title}
        >
          <rect width="400" height="300" fill="#E8F0EB" />
          <circle cx="200" cy="150" r="82" fill="#FFFFFF" stroke="#C8D8CE" strokeWidth="3" />
          <circle cx="200" cy="150" r="56" fill="#1B5E3A" opacity="0.14" />
          <path
            d="M172 155 C172 132, 228 132, 228 155 C228 175, 172 175, 172 155 Z"
            fill="#1B5E3A"
          />
          <path d="M200 112 C212 112, 222 122, 210 134 C198 134, 195 122, 200 112 Z" fill="#D97706" />
        </svg>
      );
  }
};
