/**
 * Talisay AI — Terminalia Catappa Scientific Reference Data
 * Compiled from peer-reviewed research and Philippine DOST studies.
 *
 * Primary sources:
 *   - PMC/Molecules "Tropical almond (Terminalia catappa): A holistic review"
 *   - Philippine DOST PCHRD / HERDIN studies
 *   - Janporn et al. 2015, Santos et al. 2022, Douati et al. 2017
 *   - Jahurul et al. 2022, Benin 2020
 */

/* ── Oil Yield by Maturity Stage ── */
export const OIL_YIELD_DATA = {
  GREEN: {
    label: 'Green / Immature',
    oilYieldRange: [24, 39],
    oilYieldMean: 31.5,
    description: 'Lowest oil content. Kernel still developing.',
    colorHex: '#22c55e',
  },
  YELLOW: {
    label: 'Yellow / Mature',
    oilYieldRange: [40, 58.5],
    oilYieldMean: 49.25,
    description: 'Mid-ripe, good balance of yield and quality.',
    colorHex: '#eab308',
  },
  BROWN: {
    label: 'Brown / Overripe',
    oilYieldRange: [51.2, 65],
    oilYieldMean: 58.1,
    description: 'Fully ripe, highest oil content. Preferred for extraction.',
    colorHex: '#a16207',
  },
};

/* ── Seed-to-Oil Ratio ── */
export const SEED_TO_OIL = {
  overallKernelOilContent: 52.02,            // % (PMC review)
  kernelToFruitRatio: 0.10,                  // ~10% of whole fruit is kernel
  oilRecoveryEfficiency: 0.85,               // ~85% recovery with solvent extraction
  typicalYieldPerTree: { kgFruitPerYear: 50, kgKernelPerYear: 5, litersOilPerYear: 2.2 },
  extractionMethods: [
    { method: 'Solvent (hexane)', yield: '55–65%', quality: 'High purity' },
    { method: 'Cold press', yield: '35–45%', quality: 'Best flavor, lower yield' },
    { method: 'Supercritical CO₂', yield: '50–60%', quality: 'Highest quality' },
    { method: 'Soxhlet', yield: '49–57%', quality: 'Lab standard' },
  ],
};

/* ── Nutritional Composition (per 100 g kernel) ── */
export const NUTRITIONAL_DATA = {
  lipids: { value: 52.02, unit: '%', label: 'Lipids (Oil)' },
  protein: { value: 25.42, unit: '%', label: 'Crude Protein' },
  carbohydrate: { value: 15.84, unit: '%', label: 'Carbohydrate' },
  moisture: { value: 4.18, unit: '%', label: 'Moisture' },
  ash: { value: 2.54, unit: '%', label: 'Ash' },
  fiber: { value: 4.0, unit: '%', label: 'Crude Fiber' },
  energy: { value: 625, unit: 'kcal', label: 'Energy' },
};

/* ── Fatty Acid Composition ── */
export const FATTY_ACID_PROFILE = [
  { name: 'Palmitic acid (C16:0)', percentage: 36.01, type: 'Saturated' },
  { name: 'Oleic acid (C18:1)', percentage: 33.25, type: 'Monounsaturated' },
  { name: 'Linoleic acid (C18:2)', percentage: 22.26, type: 'Polyunsaturated' },
  { name: 'Stearic acid (C18:0)', percentage: 4.69, type: 'Saturated' },
  { name: 'Palmitoleic acid (C16:1)', percentage: 0.81, type: 'Monounsaturated' },
  { name: 'Myristic acid (C14:0)', percentage: 0.62, type: 'Saturated' },
  { name: 'Others', percentage: 2.36, type: 'Mixed' },
];

/* ── Physical Dimension Ranges (from ML config) ── */
export const DIMENSION_RANGES = {
  fruitLength: { min: 3.0, max: 8.0, unit: 'cm', label: 'Fruit Length' },
  fruitWidth: { min: 1.5, max: 6.0, unit: 'cm', label: 'Fruit Width' },
  kernelMass: { min: 0.1, max: 0.9, unit: 'g', label: 'Kernel Mass' },
  wholeFruitWeight: { min: 15, max: 60, unit: 'g', label: 'Whole Fruit Weight' },
};

/* ── Correlation Factors (dimension → oil yield) ── */
export const CORRELATION_FACTORS = [
  { factor: 'Kernel Mass', correlation: 0.85, icon: 'cube', description: 'Strongest predictor of oil yield' },
  { factor: 'Fruit Length', correlation: 0.65, icon: 'resize', description: 'Moderate positive correlation' },
  { factor: 'Fruit Width', correlation: 0.60, icon: 'swap-horizontal', description: 'Moderate positive correlation' },
  { factor: 'Whole Fruit Weight', correlation: 0.55, icon: 'scale', description: 'Moderate correlation' },
];

/* ── ML Model Architecture ── */
export const MODEL_ARCHITECTURE = [
  {
    name: 'Color Classifier',
    model: 'MobileNetV2',
    task: 'Maturity Stage Classification',
    classes: ['Green', 'Yellow', 'Brown'],
    inputSize: '224×224 RGB',
    description: 'Classifies fruit ripeness by color using transfer learning',
    icon: 'color-palette',
  },
  {
    name: 'Object Detector',
    model: 'YOLOv8n',
    task: 'Fruit & Coin Detection',
    classes: ['talisay_fruit', 'coin'],
    inputSize: '640×640',
    description: 'Detects and localizes Talisay fruits and reference coins',
    icon: 'scan',
  },
  {
    name: 'Size Estimator',
    model: 'ResNet50 + Coin Reference',
    task: 'Physical Dimension Estimation',
    outputs: ['Length (cm)', 'Width (cm)', 'Weight (g)', 'Kernel Mass (g)'],
    description: 'Estimates fruit dimensions using coin as size reference',
    icon: 'analytics',
  },
  {
    name: 'Oil Yield Predictor',
    model: 'RF + Gradient Boosting Ensemble',
    task: 'Oil Yield Percentage Prediction',
    inputs: ['Color', 'Dimensions', 'Spot Coverage'],
    description: 'Predicts oil yield % from color, size, and surface features',
    icon: 'flask',
  },
  {
    name: 'HSV Classifier',
    model: 'Hand-crafted HSV Pipeline',
    task: 'Backup Color Classification',
    description: 'Rule-based HSV color analysis as ensemble member',
    icon: 'eye',
  },
];

/* ── Botanical Info ── */
export const BOTANICAL_INFO = {
  scientificName: 'Terminalia catappa L.',
  commonNames: ['Tropical Almond', 'Indian Almond', 'Talisay', 'Ketapang', 'Badamier'],
  family: 'Combretaceae',
  origin: 'Tropical regions of Asia and the Pacific',
  distribution: 'Pantropical – found in coastal areas of Southeast Asia, India, Africa, Central & South America',
  treeHeight: '10–25 meters',
  fruitType: 'Drupe (almond-shaped, 5–7 cm long)',
  harvestSeason: 'Year-round in tropical climates; peak June–October in the Philippines',
  usesOfOil: [
    'Edible cooking oil (comparable to soybean oil)',
    'Cosmetics and skincare',
    'Biodiesel / biofuel feedstock',
    'Traditional medicine',
    'Wood finish / varnish extender',
  ],
};

/* ── Key Research References ── */
export const RESEARCH_REFERENCES = [
  { author: 'Janporn et al.', year: 2015, title: 'Physicochemical properties of Terminalia catappa seed oil', journal: 'J. Food Lipids', origin: 'Thailand' },
  { author: 'Santos et al.', year: 2022, title: 'Cold-pressed kernel oil from T. catappa', journal: 'Food Chem.', origin: 'Brazil' },
  { author: 'Douati et al.', year: 2017, title: 'Comparison of methods for almond oil extraction', journal: 'Eur. J. Lipid Sci.', origin: "Côte d'Ivoire" },
  { author: 'Jahurul et al.', year: 2022, title: 'Terminalia catappa fat as cocoa butter alternative', journal: 'Trends Food Sci.', origin: 'Malaysia' },
  { author: 'Arunachalam et al.', year: 2024, title: 'T. catappa leaf-mediated AgNPs biosynthesis', journal: 'Environ. Res.', origin: 'India' },
  { author: 'Benin (INRAB)', year: 2020, title: 'Tropical almond kernel oil for cosmetics', journal: 'INRAB Report', origin: 'Benin' },
  { author: 'DOST-PCHRD', year: 2020, title: 'Oil extraction from Talisay kernels', journal: 'HERDIN Database', origin: 'Philippines' },
  { author: 'Thomson & Evans', year: 2006, title: 'Terminalia species – review of uses', journal: 'Econ. Bot.', origin: 'Australia' },
];

/* ── Summary stats for dashboard cards ── */
export const SCIENCE_SUMMARY = [
  { label: 'Kernel Oil Content', value: '52%', detail: '52.02% lipids per 100g kernel', icon: 'water', color: '#3b82f6' },
  { label: 'Protein Content', value: '25.4%', detail: '25.42% crude protein', icon: 'nutrition', color: '#22c55e' },
  { label: 'Oil Yield Range', value: '24–65%', detail: 'Green 24-39% → Brown 51-65%', icon: 'trending-up', color: '#f97316' },
  { label: 'Trees Yield/yr', value: '~2.2 L', detail: '~50 kg fruit → 5 kg kernel → 2.2 L oil', icon: 'leaf', color: '#7c3aed' },
];
