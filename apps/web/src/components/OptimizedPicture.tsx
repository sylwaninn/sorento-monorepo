import { cn } from "@/lib/utils";

export interface OptimizedPictureProps {
  alt: string;
  avifSrcSet: string;
  fallbackSrc: string;
  fallbackSrcSet: string;
  height: number;
  sizes: string;
  variant: "hero" | "stack";
  width: number;
  className?: string;
  priority?: boolean;
}

const VARIANT_CLASS = {
  /* The tall crop a phone or a tablet takes out of a 1.9 ratio photograph is mostly the left
     half, which is also the half the copy column darkens, so centring it leaves the subject
     behind the gradient. 83.33% is the centre of the right third: far enough right to clear the
     copy, not so far that the crop loses the edge of the frame the way a hard right does. Past
     lg the box is wide enough that the right edge itself is the interesting one, so it anchors
     there. */
  hero: "absolute inset-0 [&_img]:object-[83.333%_50%] lg:[&_img]:object-right",
  stack: "size-full",
} as const;

/**
 * A responsive image with explicit dimensions and modern/fallback sources. The native picture
 * element is the primitive here: the component library has no image of its own, and a wrapper
 * would only get between the browser and its own format negotiation.
 */
export const OptimizedPicture = ({
  alt,
  avifSrcSet,
  className,
  fallbackSrc,
  fallbackSrcSet,
  height,
  priority = false,
  sizes,
  variant,
  width,
}: OptimizedPictureProps) => (
  <picture
    className={cn(
      "relative block overflow-hidden [&_img]:block [&_img]:size-full [&_img]:object-cover",
      VARIANT_CLASS[variant],
      className,
    )}
    data-slot="picture"
    data-variant={variant}
  >
    <source sizes={sizes} srcSet={avifSrcSet} type="image/avif" />
    <img
      alt={alt}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      height={height}
      loading={priority ? "eager" : "lazy"}
      sizes={sizes}
      src={fallbackSrc}
      srcSet={fallbackSrcSet}
      width={width}
    />
  </picture>
);
