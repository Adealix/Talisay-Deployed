/**
 * Talisay Oil — Talisay Types Data
 * Green, Yellow, and Brown stages with descriptions and image references.
 */
import { TALISAY_IMAGES } from '../constants/images';

export const TALISAY_TYPES = [
  {
    slug: 'green',
    name: 'Green Talisay',
    carousel: [
      { image: TALISAY_IMAGES.green.slide1, placeholderColor: '#166534', alt: 'Green Talisay fruit' },
      { image: TALISAY_IMAGES.green.slide2, placeholderColor: '#15803d', alt: 'Green Talisay (unripe)' },
      { image: TALISAY_IMAGES.green.slide3, placeholderColor: '#16a34a', alt: 'Green Talisay fruit cluster' },
    ],
    sections: [
      { title: 'About Green Talisay', content: 'Green Talisay (Terminalia catappa) fruits are unripe and represent the earliest ripening stage. The fruits are firm with a bright green exterior and contain developing kernels. At this stage, oil content is lower, but the fruits are suitable for certain processing applications and research on ripening progression.' },
      { title: 'Quality Indicators', content: 'Good-quality green Talisay fruits have a uniform bright green color, intact skin without blemishes, and firm texture. Discoloration or soft spots may indicate premature drop or pest damage. The TalisayOil system evaluates color consistency and surface integrity to classify fruit maturity for oil yield prediction.' },
      { title: 'Oil Content and Use', content: 'Green-stage fruits have lower oil yield (typically 24–39%) compared to yellow and brown stages. Research shows oil content increases with ripening. Green fruits are useful for studies on extraction kinetics and for products where lower oil concentration is preferred.' },
    ],
  },
  {
    slug: 'yellow',
    name: 'Yellow Talisay',
    carousel: [
      { image: TALISAY_IMAGES.yellow.slide1, placeholderColor: '#ca8a04', alt: 'Yellow Talisay fruit' },
      { image: TALISAY_IMAGES.yellow.slide2, placeholderColor: '#eab308', alt: 'Yellow Talisay (mid-ripe)' },
      { image: TALISAY_IMAGES.yellow.slide3, placeholderColor: '#facc15', alt: 'Yellow Talisay fruit cluster' },
    ],
    sections: [
      { title: 'About Yellow Talisay', content: 'Yellow Talisay fruits represent the mid-ripening stage of Terminalia catappa. The transition from green to yellow indicates increased oil accumulation in the kernel. Studies report oil yields of 40–55% at this stage, depending on extraction method and sample origin.' },
      { title: 'Quality Indicators', content: 'High-quality yellow Talisay exhibits a uniform golden-yellow color, slight softening, and well-developed kernel. Uneven coloration or premature browning may indicate inconsistent ripening. The TalisayOil system assesses color distribution and surface quality for maturity grading.' },
      { title: 'Oil Content and Use', content: "Yellow-stage fruits offer a balance of oil yield and processing flexibility. The oil has favorable fatty acid profiles (oleic, linoleic, palmitic) suitable for edible and industrial uses. Research from Malaysia and Côte d'Ivoire confirms oil quality comparable to soybean oil." },
    ],
  },
  {
    slug: 'brown',
    name: 'Brown Talisay',
    carousel: [
      { image: TALISAY_IMAGES.brown.slide1, placeholderColor: '#78350f', alt: 'Brown Talisay fruit' },
      { image: TALISAY_IMAGES.brown.slide2, placeholderColor: '#92400e', alt: 'Brown Talisay (fully ripe)' },
      { image: TALISAY_IMAGES.brown.slide3, placeholderColor: '#a16207', alt: 'Brown Talisay fruit cluster' },
    ],
    sections: [
      { title: 'About Brown Talisay', content: 'Brown Talisay fruits are fully ripe and contain the highest oil content. Philippine DOST studies report ~51.2% oil for brown kernels; international research cites yields up to 57–65% under optimized extraction. The brown stage is ideal for oil production and biofuel applications.' },
      { title: 'Quality Indicators', content: 'Good-quality brown Talisay has a uniform brown to dark brown exterior, fully developed kernel, and dry, intact outer layer. Mold, discoloration, or rancid odor indicate poor storage or handling. TalisayOil evaluates surface quality and color uniformity for optimal oil yield prediction.' },
      { title: 'Oil Content and Use', content: 'Brown-stage kernels yield the highest oil content and are preferred for commercial extraction. The oil is used in food, cosmetics, and as a diesel extender. Studies from Benin, Malaysia, and the Philippines confirm Terminalia catappa oil meets edible oil standards and has biofuel potential.' },
    ],
  },
];

export function getTalisayTypeBySlug(slug) {
  return TALISAY_TYPES.find((t) => t.slug === slug);
}
