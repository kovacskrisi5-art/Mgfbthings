import ProductImage from './ProductImage';

export default function ProductGallery({ alt, images = [], primary }) {
  const gallery = Array.from(new Set([primary, ...images].filter(Boolean)));

  return (
    <div className="product-gallery" aria-label={`${alt} product images`}>
      {gallery.map((src, index) => (
        <div className="gallery-frame" key={src}>
          <ProductImage
            alt={`${alt}${gallery.length > 1 ? ` image ${index + 1}` : ''}`}
            className="product-hero-image"
            priority={index === 0}
            src={src}
          />
        </div>
      ))}
    </div>
  );
}
