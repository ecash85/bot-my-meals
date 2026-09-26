import type { MetadataRoute } from "next";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/config";
import { BRAND_ICON_192_SRC, BRAND_ICON_512_SRC, THEME_BACKGROUND, THEME_PRIMARY } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: PRODUCT_NAME,
    description: PRODUCT_TAGLINE,
    start_url: "/week",
    scope: "/",
    display: "standalone",
    background_color: THEME_BACKGROUND,
    theme_color: THEME_PRIMARY,
    orientation: "portrait",
    icons: [
      {
        src: BRAND_ICON_192_SRC,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND_ICON_512_SRC,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND_ICON_512_SRC,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
