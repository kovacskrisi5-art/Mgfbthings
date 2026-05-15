import Image from 'next/image';
import { useState } from 'react';
import { FALLBACK_PRODUCT_IMAGE, normalizeImagePath } from '../lib/images';

export default function ProductImage({ alt, className = '', priority = false, src }) {
  const [imageSrc, setImageSrc] = useState(normalizeImagePath(src));

  return (
    <Image
      alt={alt || 'Bakery product'}
      className={className}
      height={520}
      onError={() => setImageSrc(FALLBACK_PRODUCT_IMAGE)}
      priority={priority}
      src={imageSrc}
      sizes="(max-width: 720px) 92vw, (max-width: 1100px) 46vw, 640px"
      unoptimized
      width={640}
    />
  );
}
