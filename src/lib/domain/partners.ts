import rrgLogo from "@/assets/rrg-partner.png.asset.json";
import straightlineLogo from "@/assets/straightline-partner-black.png.asset.json";
import wolfLogo from "@/assets/wolf-wholesaling-fill.png.asset.json";
import firstnteLogo from "@/assets/firstnte-partner.png.asset.json";

/** Organizations RealtyBridge works with, shown on the public site. */
export interface Partner {
  name: string;
  /** The partner's own tagline, shown under their name. */
  tagline?: string;
  /** The partner's own website. Their logo and name hyperlink to it. */
  url: string;
  /** Logo image URL. */
  image: string;
  imageAlt: string;
  blurb: string;
  /**
   * Background the logo sits on: "dark" (navy plaque, default) or "light" for
   * logos drawn in dark ink that would disappear on navy.
   */
  logoPlaque?: "dark" | "light";
  /** When true the logo image fills the whole plaque instead of fitting inside it. */
  logoFill?: boolean;
}

export const PARTNERS: Partner[] = [
  {
    name: "RealEstate Recovery Group",
    url: "http://www.realestaterecoverygroup.com/",
    image: rrgLogo.url,
    imageAlt: "RealEstate Recovery Group logo: RRG roofline mark, established 2005",
    blurb: "Nationwide short sales, loan modifications and foreclosure-prevention solutions.",
  },
  {
    name: "StraightLine Funding",
    url: "http://www.straightlinefunding.com/",
    image: straightlineLogo.url,
    imageAlt: "StraightLine Funding logo: stacked lines mark with the StraightLine Funding wordmark",
    blurb: "Direct lender for real estate investors nationwide — fix & flip, DSCR, bridge, new construction and transactional funding.",
    logoPlaque: "light",
  },
  {
    name: "The Wolf of Wholesaling",
    url: "https://www.skool.com/thewolfofwholesaling/about",
    image: wolfLogo.url,
    imageAlt: "The Wolf of Wholesaling logo: glowing blue wolf wordmark",
    blurb: "Wholesaling community: bring a motivated lead and they help you close it — you keep 70% of the deal.",
    logoFill: true,
  },
  {
    name: "First National Title & Escrow",
    url: "http://www.firstnte.com/",
    image: firstnteLogo.url,
    imageAlt: "First National Title & Escrow logo: blue N mark above the company name",
    blurb: "Title and escrow services with seamless eClosings and comprehensive title insurance solutions.",
  },
];

/** Website shown under the partner's name, e.g. "realestaterecoverygroup.com". */
export function partnerDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
