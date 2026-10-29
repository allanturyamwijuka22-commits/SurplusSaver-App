import React from 'react';

interface FoodArtworkProps {
  imageKey: string;
  title: string;
  className?: string;
}

/**
 * Renders high-craft, zero-external-dependency SVG studio illustrations
 * for each Kampala surplus food category, guaranteeing zero broken images.
 */
export const FoodArtwork: React.FC<FoodArtworkProps> = ({
  imageKey,
  title,
  className = 'w-full h-full',
}) => {
  switch (imageKey) {
    case 'sourdough_pastry':
      return (
        <div
          className={`relative overflow-hidden bg-[#F4ECE1] flex items-center justify-center ${className}`}
          role="img"
          aria-label={title}
        >
          <svg viewBox="0 0 400 300" className="w-full h-full object-cover">
            <rect width="400" height="300" fill="#EFE5D8" />
            <circle cx="310" cy="70" r="110" fill="#E5D5C0" opacity="0.6" />
            <ellipse cx="200" cy="225" rx="145" ry="38" fill="#D5C3AA" />
            {/* Artisanal Country Sourdough Loaf */}
            <path
              d="M85 195 C85 115, 235 110, 245 195 Z"
              fill="#B46527"
              stroke="#7C3F11"
              strokeWidth="3"
            />
            <path
              d="M110 155 Q165 135 215 160"
              stroke="#F7E8D4"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M125 140 L140 128 M165 134 L175 120 M200 144 L214 132"
              stroke="#E6CCB2"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Flaky Butter Croissants */}
            <path
              d="M215 215 C225 170, 295 165, 315 210 C295 225, 240 228, 215 215 Z"
              fill="#D9822B"
              stroke="#8C4A15"
              strokeWidth="2.5"
            />
            <path
              d="M240 185 Q265 195 288 184"
              stroke="#FDE68A"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M150 228 C162 192, 222 190, 236 226 C214 238, 170 238, 150 228 Z"
              fill="#E08E36"
              stroke="#8C4A15"
              strokeWidth="2.5"
            />
            {/* Wheat Stalk Motif */}
            <path
              d="M65 235 Q95 195 135 220"
              stroke="#14532D"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );

    case 'luwombo_platter':
      return (
        <div
          className={`relative overflow-hidden bg-[#E9F0EA] flex items-center justify-center ${className}`}
          role="img"
          aria-label={title}
        >
          <svg viewBox="0 0 400 300" className="w-full h-full object-cover">
            <rect width="400" height="300" fill="#E4EDE6" />
            <circle cx="90" cy="70" r="95" fill="#D1E2D4" />
            {/* Handcrafted Clay Platter */}
            <ellipse cx="200" cy="205" rx="150" ry="52" fill="#3F2E21" />
            <ellipse cx="200" cy="198" rx="138" ry="44" fill="#5C4028" />
            {/* Steamed Banana Leaf Wrap (Luwombo) */}
            <path
              d="M95 195 C105 130, 215 125, 235 195 C195 215, 130 215, 95 195 Z"
              fill="#166534"
              stroke="#14532D"
              strokeWidth="3"
            />
            <path
              d="M125 185 C140 155, 195 155, 210 185 Z"
              fill="#9A3412"
            />
            {/* Golden Steamed Matooke Mounds */}
            <circle cx="268" cy="182" r="26" fill="#EAB308" />
            <circle cx="298" cy="194" r="22" fill="#CA8A04" />
            <circle cx="245" cy="198" r="20" fill="#FACC15" />
            {/* Banana Leaf Fibre Tie */}
            <path
              d="M158 138 L175 112 M166 138 L152 114"
              stroke="#84CC16"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );

    case 'mango_avocado_crate':
      return (
        <div
          className={`relative overflow-hidden bg-[#ECF3E8] flex items-center justify-center ${className}`}
          role="img"
          aria-label={title}
        >
          <svg viewBox="0 0 400 300" className="w-full h-full object-cover">
            <rect width="400" height="300" fill="#E7F1E2" />
            <circle cx="320" cy="80" r="90" fill="#FEF08A" opacity="0.45" />
            {/* Wooden Harvest Crate */}
            <rect x="65" y="175" width="270" height="75" rx="10" fill="#92400E" />
            <rect x="75" y="190" width="250" height="16" rx="4" fill="#B45309" />
            <rect x="75" y="218" width="250" height="16" rx="4" fill="#B45309" />
            {/* Hass Avocados */}
            <ellipse cx="135" cy="155" rx="34" ry="44" fill="#14532D" />
            <ellipse cx="185" cy="160" rx="32" ry="40" fill="#84CC16" />
            <circle cx="185" cy="166" r="15" fill="#78350F" />
            {/* Ripe Apple Mangoes */}
            <ellipse cx="248" cy="152" rx="38" ry="32" fill="#F59E0B" />
            <ellipse cx="255" cy="146" rx="26" ry="20" fill="#EF4444" opacity="0.45" />
            {/* Ugandan Purple Passion Fruits */}
            <circle cx="298" cy="164" r="18" fill="#581C87" />
            <circle cx="278" cy="172" r="16" fill="#6B21A8" />
          </svg>
        </div>
      );

    case 'rwenzori_coffee_samosa':
      return (
        <div
          className={`relative overflow-hidden bg-[#F3EDE4] flex items-center justify-center ${className}`}
          role="img"
          aria-label={title}
        >
          <svg viewBox="0 0 400 300" className="w-full h-full object-cover">
            <rect width="400" height="300" fill="#F1E9DD" />
            <ellipse cx="200" cy="215" rx="145" ry="38" fill="#D6C7B2" />
            {/* Crisp Triangular Ugandan Samosas */}
            <polygon
              points="95,210 155,118 205,208"
              fill="#D97706"
              stroke="#92400E"
              strokeWidth="3"
            />
            <polygon
              points="155,218 215,126 268,212"
              fill="#F59E0B"
              stroke="#92400E"
              strokeWidth="3"
            />
            {/* Espresso Banana Bread Slices */}
            <rect
              x="255"
              y="150"
              width="68"
              height="58"
              rx="10"
              fill="#78350F"
              stroke="#451A03"
              strokeWidth="2.5"
            />
            <circle cx="278" cy="175" r="5" fill="#FDE68A" />
            <circle cx="302" cy="185" r="4" fill="#FDE68A" />
          </svg>
        </div>
      );

    case 'bugolobi_deli_basket':
      return (
        <div
          className={`relative overflow-hidden bg-[#EEF2F6] flex items-center justify-center ${className}`}
          role="img"
          aria-label={title}
        >
          <svg viewBox="0 0 400 300" className="w-full h-full object-cover">
            <rect width="400" height="300" fill="#EBF1F5" />
            <ellipse cx="200" cy="220" rx="140" ry="34" fill="#CBD5E1" />
            {/* Mbarara Probiotic Yogurt Tub */}
            <rect
              x="95"
              y="115"
              width="78"
              height="95"
              rx="8"
              fill="#FFFFFF"
              stroke="#94A3B8"
              strokeWidth="2.5"
            />
            <rect x="90" y="108" width="88" height="14" rx="4" fill="#14532D" />
            <rect x="108" y="142" width="52" height="32" rx="4" fill="#DCFCE7" />
            {/* Gouda Cheese Wheel Wedge */}
            <polygon
              points="190,210 265,155 275,212"
              fill="#FACC15"
              stroke="#CA8A04"
              strokeWidth="2.5"
            />
            <circle cx="235" cy="192" r="5" fill="#FEF08A" />
            <circle cx="252" cy="182" r="4" fill="#FEF08A" />
            {/* Rolled Wheat Chapatis */}
            <ellipse
              cx="305"
              cy="195"
              rx="38"
              ry="16"
              fill="#D69E5C"
              stroke="#8C5828"
              strokeWidth="2"
            />
            <ellipse
              cx="305"
              cy="182"
              rx="36"
              ry="14"
              fill="#E2B176"
              stroke="#8C5828"
              strokeWidth="2"
            />
          </svg>
        </div>
      );

    default:
      return (
        <div
          className={`relative overflow-hidden bg-[#EDE9E0] flex items-center justify-center ${className}`}
          role="img"
          aria-label={title}
        >
          <svg viewBox="0 0 400 300" className="w-full h-full object-cover">
            <rect width="400" height="300" fill="#ECE7DC" />
            <ellipse cx="200" cy="195" rx="145" ry="48" fill="#27272A" />
            <ellipse cx="200" cy="190" rx="130" ry="40" fill="#FAFAFA" />
            {/* Pan-Seared Lake Victoria Tilapia Fillet */}
            <path
              d="M115 185 C135 150, 225 148, 250 185 C220 205, 145 205, 115 185 Z"
              fill="#D97706"
              stroke="#92400E"
              strokeWidth="2.5"
            />
            {/* Herb Baby Potatoes & Greens */}
            <circle cx="272" cy="176" r="14" fill="#EAB308" />
            <circle cx="295" cy="188" r="13" fill="#CA8A04" />
            <path
              d="M135 162 Q175 152 210 165"
              stroke="#15803D"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      );
  }
};
