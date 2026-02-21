export interface ChecklistItem {
  name: string;
  isEssential: boolean;
  suggestedPrice: string;
  suggestedQuantity: number;
  description?: string;
}

export interface ChecklistCategory {
  name: string;
  icon: string;
  items: ChecklistItem[];
}

export const DEFAULT_CHECKLIST: ChecklistCategory[] = [
  // ---------------------------------------------------------------------------
  // 1. Nursery & Sleep
  // ---------------------------------------------------------------------------
  {
    name: "Nursery & Sleep",
    icon: "moon",
    items: [
      {
        name: "Crib",
        isEssential: true,
        suggestedPrice: "$150-600",
        suggestedQuantity: 1,
        description:
          "A safe, sturdy crib that meets current CPSC safety standards.",
      },
      {
        name: "Crib Mattress",
        isEssential: true,
        suggestedPrice: "$50-250",
        suggestedQuantity: 1,
        description:
          "Firm, flat mattress sized to fit the crib snugly with no gaps.",
      },
      {
        name: "Bassinet",
        isEssential: true,
        suggestedPrice: "$100-400",
        suggestedQuantity: 1,
        description:
          "Compact bedside sleeper for the first few months before transitioning to a crib.",
      },
      {
        name: "Fitted Crib Sheets",
        isEssential: true,
        suggestedPrice: "$15-30",
        suggestedQuantity: 4,
        description:
          "Soft, breathable fitted sheets. Have extras on hand for middle-of-the-night changes.",
      },
      {
        name: "Waterproof Mattress Protectors",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 2,
        description:
          "Placed between the mattress and sheet to protect against leaks and blowouts.",
      },
      {
        name: "Swaddles",
        isEssential: true,
        suggestedPrice: "$10-30",
        suggestedQuantity: 6,
        description:
          "Muslin or stretchy swaddle blankets to help newborns feel secure and sleep better.",
      },
      {
        name: "Sleep Sacks",
        isEssential: true,
        suggestedPrice: "$15-35",
        suggestedQuantity: 3,
        description:
          "Wearable blankets that keep baby warm without loose bedding in the crib.",
      },
      {
        name: "Baby Monitor",
        isEssential: true,
        suggestedPrice: "$40-350",
        suggestedQuantity: 1,
        description:
          "Audio or video monitor to keep an eye on baby from another room.",
      },
      {
        name: "Sound Machine",
        isEssential: false,
        suggestedPrice: "$20-50",
        suggestedQuantity: 1,
        description:
          "White noise or nature sounds to help baby fall asleep and stay asleep.",
      },
      {
        name: "Changing Pad",
        isEssential: true,
        suggestedPrice: "$20-40",
        suggestedQuantity: 1,
        description:
          "Contoured pad that sits on top of a dresser or changing table.",
      },
      {
        name: "Changing Pad Covers",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 3,
        description:
          "Machine-washable covers for the changing pad. Stock a few for quick swaps.",
      },
      {
        name: "Dresser",
        isEssential: false,
        suggestedPrice: "$150-500",
        suggestedQuantity: 1,
        description:
          "Doubles as clothing storage and a changing station when paired with a changing pad.",
      },
      {
        name: "Glider / Rocker",
        isEssential: false,
        suggestedPrice: "$150-800",
        suggestedQuantity: 1,
        description:
          "Comfortable chair for late-night feedings, rocking, and story time.",
      },
      {
        name: "Nightlight",
        isEssential: false,
        suggestedPrice: "$10-25",
        suggestedQuantity: 1,
        description:
          "Dim, warm-toned light for nighttime feedings and diaper changes.",
      },
      {
        name: "Blackout Curtains",
        isEssential: false,
        suggestedPrice: "$20-50",
        suggestedQuantity: 1,
        description:
          "Block out daylight to help baby nap during the day and sleep longer in the morning.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Feeding
  // ---------------------------------------------------------------------------
  {
    name: "Feeding",
    icon: "utensils",
    items: [
      {
        name: "Bottles",
        isEssential: true,
        suggestedPrice: "$5-10",
        suggestedQuantity: 12,
        description:
          "Start with a variety pack to find what baby prefers. Anti-colic options are popular.",
      },
      {
        name: "Bottle Brush",
        isEssential: true,
        suggestedPrice: "$5-10",
        suggestedQuantity: 1,
        description:
          "Dedicated brush for cleaning the inside of bottles and nipples.",
      },
      {
        name: "Burp Cloths",
        isEssential: true,
        suggestedPrice: "$10-20",
        suggestedQuantity: 12,
        description:
          "Absorbent cloths to drape over your shoulder during and after feedings.",
      },
      {
        name: "Bibs",
        isEssential: true,
        suggestedPrice: "$8-15",
        suggestedQuantity: 6,
        description:
          "Protect baby's clothes from drool and spit-up. Snap or velcro closures work best.",
      },
      {
        name: "Breast Pump",
        isEssential: true,
        suggestedPrice: "$0-300",
        suggestedQuantity: 1,
        description:
          "Electric or manual pump for expressing milk. Many insurance plans cover one at no cost.",
      },
      {
        name: "Nursing Pillow",
        isEssential: true,
        suggestedPrice: "$25-65",
        suggestedQuantity: 1,
        description:
          "Supportive pillow that wraps around the waist to position baby during breastfeeding.",
      },
      {
        name: "Nursing Pads",
        isEssential: false,
        suggestedPrice: "$8-15",
        suggestedQuantity: 1,
        description:
          "Disposable or reusable pads worn inside a bra to absorb leaks.",
      },
      {
        name: "Nipple Cream",
        isEssential: false,
        suggestedPrice: "$8-12",
        suggestedQuantity: 1,
        description:
          "Lanolin-based or organic balm to soothe and protect during breastfeeding.",
      },
      {
        name: "Breast Milk Storage Bags",
        isEssential: false,
        suggestedPrice: "$10-15",
        suggestedQuantity: 1,
        description:
          "Pre-sterilized bags for storing expressed breast milk in the fridge or freezer.",
      },
      {
        name: "High Chair",
        isEssential: true,
        suggestedPrice: "$30-350",
        suggestedQuantity: 1,
        description:
          "Needed around 6 months when baby starts solids. Look for easy-to-clean models.",
      },
      {
        name: "Bottle Drying Rack",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 1,
        description:
          "Countertop rack for air-drying bottles, pump parts, and accessories.",
      },
      {
        name: "Formula Dispenser",
        isEssential: false,
        suggestedPrice: "$8-15",
        suggestedQuantity: 1,
        description:
          "Portable container with pre-measured compartments for formula on the go.",
      },
      {
        name: "Sippy Cups",
        isEssential: false,
        suggestedPrice: "$8-15",
        suggestedQuantity: 3,
        description:
          "Transition cups for when baby starts learning to drink independently around 6-9 months.",
      },
      {
        name: "Baby Spoons",
        isEssential: false,
        suggestedPrice: "$5-10",
        suggestedQuantity: 1,
        description:
          "Soft-tipped spoons sized for tiny mouths, used when starting solid foods.",
      },
      {
        name: "Bowl Set",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 1,
        description:
          "Suction-bottom bowls that stick to the highchair tray to prevent spills.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Diapering
  // ---------------------------------------------------------------------------
  {
    name: "Diapering",
    icon: "package",
    items: [
      {
        name: "Diapers — Newborn",
        isEssential: true,
        suggestedPrice: "$20-30",
        suggestedQuantity: 3,
        description:
          "Newborn-size diapers with umbilical cord cutout. Stock 2-3 boxes to start.",
      },
      {
        name: "Diapers — Size 1",
        isEssential: true,
        suggestedPrice: "$25-35",
        suggestedQuantity: 3,
        description:
          "Most babies move into size 1 within a few weeks. Have plenty on hand.",
      },
      {
        name: "Diapers — Size 2",
        isEssential: true,
        suggestedPrice: "$25-35",
        suggestedQuantity: 2,
        description:
          "Babies typically reach size 2 around 12-18 lbs. Good to stock up early.",
      },
      {
        name: "Wipes",
        isEssential: true,
        suggestedPrice: "$15-25",
        suggestedQuantity: 4,
        description:
          "Fragrance-free, hypoallergenic wipes. You will go through far more than you expect.",
      },
      {
        name: "Diaper Rash Cream",
        isEssential: true,
        suggestedPrice: "$8-12",
        suggestedQuantity: 1,
        description:
          "Zinc oxide-based cream to treat and prevent diaper rash.",
      },
      {
        name: "Diaper Pail",
        isEssential: true,
        suggestedPrice: "$25-70",
        suggestedQuantity: 1,
        description:
          "Odor-locking trash can designed specifically for dirty diapers.",
      },
      {
        name: "Diaper Bag",
        isEssential: true,
        suggestedPrice: "$30-200",
        suggestedQuantity: 1,
        description:
          "Spacious bag with compartments for diapers, wipes, bottles, and a change of clothes.",
      },
      {
        name: "Portable Changing Pad",
        isEssential: false,
        suggestedPrice: "$10-25",
        suggestedQuantity: 1,
        description:
          "Foldable, wipeable pad for diaper changes on the go.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. Gear & Travel
  // ---------------------------------------------------------------------------
  {
    name: "Gear & Travel",
    icon: "car",
    items: [
      {
        name: "Infant Car Seat",
        isEssential: true,
        suggestedPrice: "$150-500",
        suggestedQuantity: 1,
        description:
          "Rear-facing car seat required from day one. Must be installed before leaving the hospital.",
      },
      {
        name: "Convertible Car Seat",
        isEssential: false,
        suggestedPrice: "$150-400",
        suggestedQuantity: 1,
        description:
          "Transitions from rear-facing to forward-facing as baby grows. Can be used from birth.",
      },
      {
        name: "Full-Size Stroller",
        isEssential: true,
        suggestedPrice: "$200-1000",
        suggestedQuantity: 1,
        description:
          "Everyday stroller with good suspension, storage, and recline for naps on the go.",
      },
      {
        name: "Baby Carrier / Wrap",
        isEssential: true,
        suggestedPrice: "$30-200",
        suggestedQuantity: 1,
        description:
          "Hands-free babywearing option for walks, errands, and soothing a fussy baby.",
      },
      {
        name: "Play Mat / Activity Gym",
        isEssential: false,
        suggestedPrice: "$30-80",
        suggestedQuantity: 1,
        description:
          "Padded mat with hanging toys to encourage tummy time and reaching.",
      },
      {
        name: "Travel Crib / Pack 'n Play",
        isEssential: false,
        suggestedPrice: "$80-200",
        suggestedQuantity: 1,
        description:
          "Portable crib for travel, visits to grandparents, or as a secondary sleep space.",
      },
      {
        name: "Baby Swing",
        isEssential: false,
        suggestedPrice: "$80-200",
        suggestedQuantity: 1,
        description:
          "Motorized swing that soothes baby with gentle rocking motions.",
      },
      {
        name: "Bouncer",
        isEssential: false,
        suggestedPrice: "$30-100",
        suggestedQuantity: 1,
        description:
          "Lightweight, portable seat that bounces with baby's movements. Great for supervised awake time.",
      },
      {
        name: "Stroller Organizer",
        isEssential: false,
        suggestedPrice: "$15-30",
        suggestedQuantity: 1,
        description:
          "Clip-on caddy that holds your phone, keys, water bottle, and snacks.",
      },
      {
        name: "Car Seat Mirror",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 1,
        description:
          "Attaches to the rear headrest so you can see a rear-facing baby from the driver's seat.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Bath
  // ---------------------------------------------------------------------------
  {
    name: "Bath",
    icon: "bath",
    items: [
      {
        name: "Baby Bathtub",
        isEssential: true,
        suggestedPrice: "$15-50",
        suggestedQuantity: 1,
        description:
          "Contoured tub or insert that supports baby safely during bath time.",
      },
      {
        name: "Hooded Towels",
        isEssential: true,
        suggestedPrice: "$10-20",
        suggestedQuantity: 3,
        description:
          "Soft, absorbent towels with a hood to keep baby's head warm after the bath.",
      },
      {
        name: "Washcloths",
        isEssential: false,
        suggestedPrice: "$8-12",
        suggestedQuantity: 10,
        description:
          "Small, gentle cloths for washing baby's face, body, and cleaning up messes.",
      },
      {
        name: "Baby Shampoo / Wash",
        isEssential: false,
        suggestedPrice: "$8-12",
        suggestedQuantity: 1,
        description:
          "Tear-free, gentle cleanser formulated for sensitive baby skin.",
      },
      {
        name: "Baby Lotion",
        isEssential: false,
        suggestedPrice: "$6-10",
        suggestedQuantity: 1,
        description:
          "Fragrance-free moisturizer to keep baby's skin soft and hydrated after baths.",
      },
      {
        name: "Bath Toys",
        isEssential: false,
        suggestedPrice: "$8-15",
        suggestedQuantity: 1,
        description:
          "Floating toys and cups for sensory play once baby can sit up in the tub.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. Clothing
  // ---------------------------------------------------------------------------
  {
    name: "Clothing",
    icon: "shirt",
    items: [
      {
        name: "Onesies (0-3m)",
        isEssential: true,
        suggestedPrice: "$15-25",
        suggestedQuantity: 10,
        description:
          "Short- and long-sleeve bodysuits — the wardrobe staple for newborns.",
      },
      {
        name: "Sleepers / Footies (0-3m)",
        isEssential: true,
        suggestedPrice: "$8-12",
        suggestedQuantity: 8,
        description:
          "Zip-up or snap footed pajamas for easy nighttime changes.",
      },
      {
        name: "Pants (0-3m)",
        isEssential: true,
        suggestedPrice: "$8-12",
        suggestedQuantity: 5,
        description:
          "Soft, stretchy pants to pair with onesies. Elastic waistbands are easiest.",
      },
      {
        name: "Socks (0-3m)",
        isEssential: true,
        suggestedPrice: "$8-12",
        suggestedQuantity: 6,
        description:
          "Tiny socks to keep baby's feet warm. They fall off constantly — buy extras.",
      },
      {
        name: "Hats (Newborn)",
        isEssential: true,
        suggestedPrice: "$5-10",
        suggestedQuantity: 3,
        description:
          "Soft cotton beanies to help regulate baby's body temperature.",
      },
      {
        name: "Scratch Mittens",
        isEssential: false,
        suggestedPrice: "$5-8",
        suggestedQuantity: 3,
        description:
          "Prevent newborns from scratching their face with sharp little nails.",
      },
      {
        name: "Going-Home Outfit",
        isEssential: false,
        suggestedPrice: "$15-30",
        suggestedQuantity: 1,
        description:
          "A special outfit for baby's first trip home from the hospital.",
      },
      {
        name: "Onesies (3-6m)",
        isEssential: false,
        suggestedPrice: "$15-25",
        suggestedQuantity: 8,
        description:
          "Next-size-up bodysuits. Babies grow fast — have these ready to go.",
      },
      {
        name: "Sleepers / Footies (3-6m)",
        isEssential: false,
        suggestedPrice: "$8-12",
        suggestedQuantity: 6,
        description:
          "Footed pajamas in the next size up for continued nighttime comfort.",
      },
      {
        name: "Onesies (6-9m)",
        isEssential: false,
        suggestedPrice: "$15-25",
        suggestedQuantity: 6,
        description:
          "Bodysuits for when baby is bigger and more active.",
      },
      {
        name: "Pants (3-6m)",
        isEssential: false,
        suggestedPrice: "$8-12",
        suggestedQuantity: 5,
        description:
          "Stretchy pants in the next size up for growing babies.",
      },
      {
        name: "Jacket / Sweater",
        isEssential: false,
        suggestedPrice: "$15-30",
        suggestedQuantity: 1,
        description:
          "Light layer for cool weather outings. Easy on/off is key.",
      },
      {
        name: "Snowsuit / Bunting",
        isEssential: false,
        suggestedPrice: "$20-40",
        suggestedQuantity: 1,
        description:
          "Warm outer layer for cold-weather babies. Must be removed in the car seat.",
      },
      {
        name: "Sun Hat",
        isEssential: false,
        suggestedPrice: "$8-15",
        suggestedQuantity: 1,
        description:
          "Wide-brim hat with a chin strap to protect baby from the sun.",
      },
      {
        name: "Swimsuit",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 1,
        description:
          "Rash-guard style swimsuit with UPF protection for pool or beach outings.",
      },
      {
        name: "Shoes / Booties",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 1,
        description:
          "Soft-soled shoes or booties. Mostly decorative until baby starts walking.",
      },
      {
        name: "Rompers",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 5,
        description:
          "One-piece outfits that are easy to put on and great for warm weather.",
      },
      {
        name: "Dress-Up Outfit",
        isEssential: false,
        suggestedPrice: "$15-30",
        suggestedQuantity: 1,
        description:
          "A nicer outfit for photos, holidays, or special occasions.",
      },
      {
        name: "Socks (3-6m)",
        isEssential: false,
        suggestedPrice: "$8-12",
        suggestedQuantity: 6,
        description:
          "Next-size socks. Consider ones with grip dots once baby starts moving.",
      },
      {
        name: "Burp-Cloth Bibs",
        isEssential: false,
        suggestedPrice: "$8-15",
        suggestedQuantity: 6,
        description:
          "Bandana-style bibs that double as drool catchers and burp cloths.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. Health & Safety
  // ---------------------------------------------------------------------------
  {
    name: "Health & Safety",
    icon: "heart-pulse",
    items: [
      {
        name: "Thermometer",
        isEssential: true,
        suggestedPrice: "$8-25",
        suggestedQuantity: 1,
        description:
          "Digital rectal or forehead thermometer for accurate temperature readings.",
      },
      {
        name: "Nasal Aspirator",
        isEssential: true,
        suggestedPrice: "$10-30",
        suggestedQuantity: 1,
        description:
          "Suction device to clear baby's stuffy nose. The NoseFrida is a parent favorite.",
      },
      {
        name: "Nail Clipper Set",
        isEssential: true,
        suggestedPrice: "$5-10",
        suggestedQuantity: 1,
        description:
          "Baby-sized clippers, file, and scissors for tiny, fast-growing nails.",
      },
      {
        name: "Humidifier",
        isEssential: true,
        suggestedPrice: "$25-60",
        suggestedQuantity: 1,
        description:
          "Cool-mist humidifier to keep nursery air comfortable and help with congestion.",
      },
      {
        name: "Pacifiers",
        isEssential: true,
        suggestedPrice: "$5-10",
        suggestedQuantity: 4,
        description:
          "Orthodontic-style pacifiers for soothing. Try a couple of brands to find a favorite.",
      },
      {
        name: "Teethers",
        isEssential: false,
        suggestedPrice: "$5-15",
        suggestedQuantity: 3,
        description:
          "Silicone or rubber teethers to relieve sore gums when teeth start coming in.",
      },
      {
        name: "Baby-Safe Detergent",
        isEssential: false,
        suggestedPrice: "$10-15",
        suggestedQuantity: 1,
        description:
          "Fragrance-free, hypoallergenic laundry detergent for washing baby clothes and linens.",
      },
      {
        name: "First Aid Kit",
        isEssential: false,
        suggestedPrice: "$15-25",
        suggestedQuantity: 1,
        description:
          "Kit with infant-safe essentials: saline drops, medicine dropper, bandages, and more.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 8. Toys & Books
  // ---------------------------------------------------------------------------
  {
    name: "Toys & Books",
    icon: "book-open",
    items: [
      {
        name: "Board Books",
        isEssential: false,
        suggestedPrice: "$5-10",
        suggestedQuantity: 10,
        description:
          "Sturdy, chewable books with bold images. Great for building an early library.",
      },
      {
        name: "Rattles",
        isEssential: false,
        suggestedPrice: "$5-10",
        suggestedQuantity: 4,
        description:
          "Lightweight rattles that help develop baby's grip and auditory awareness.",
      },
      {
        name: "High-Contrast Cards",
        isEssential: false,
        suggestedPrice: "$8-12",
        suggestedQuantity: 1,
        description:
          "Black-and-white patterned cards that stimulate a newborn's developing vision.",
      },
      {
        name: "Soft Plush Toys",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 2,
        description:
          "Cuddly stuffed animals for comfort. Keep out of the crib during sleep.",
      },
      {
        name: "Play Gym",
        isEssential: false,
        suggestedPrice: "$30-80",
        suggestedQuantity: 1,
        description:
          "Activity gym with arches and dangling toys for tummy time and reaching practice.",
      },
      {
        name: "Teething Toys",
        isEssential: false,
        suggestedPrice: "$8-15",
        suggestedQuantity: 3,
        description:
          "Textured, freezer-safe toys that soothe tender gums during teething.",
      },
      {
        name: "Stacking Toys",
        isEssential: false,
        suggestedPrice: "$10-15",
        suggestedQuantity: 1,
        description:
          "Colorful rings or cups that teach cause-and-effect and fine motor skills.",
      },
      {
        name: "Musical Toys",
        isEssential: false,
        suggestedPrice: "$10-20",
        suggestedQuantity: 1,
        description:
          "Toys that play songs or sounds when pressed, encouraging exploration and interaction.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 9. Maternity & Postpartum
  // ---------------------------------------------------------------------------
  {
    name: "Maternity & Postpartum",
    icon: "heart",
    items: [
      {
        name: "Postpartum Recovery Kit",
        isEssential: false,
        suggestedPrice: "$20-40",
        suggestedQuantity: 1,
        description:
          "All-in-one kit with pads, witch hazel, and soothing sprays for postpartum healing.",
      },
      {
        name: "Peri Bottle",
        isEssential: false,
        suggestedPrice: "$8-15",
        suggestedQuantity: 1,
        description:
          "Angled squeeze bottle for gentle cleansing during postpartum recovery.",
      },
      {
        name: "Postpartum Underwear",
        isEssential: false,
        suggestedPrice: "$15-25",
        suggestedQuantity: 5,
        description:
          "High-waisted, disposable or washable underwear designed for postpartum comfort.",
      },
      {
        name: "Nursing Bras",
        isEssential: false,
        suggestedPrice: "$15-30",
        suggestedQuantity: 3,
        description:
          "Comfortable, clip-down bras for easy breastfeeding access.",
      },
      {
        name: "Lactation Supplements",
        isEssential: false,
        suggestedPrice: "$15-25",
        suggestedQuantity: 1,
        description:
          "Herbal supplements or lactation cookies to help support milk supply.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 10. Gifts & Extras
  // ---------------------------------------------------------------------------
  {
    name: "Gifts & Extras",
    icon: "gift",
    items: [
      {
        name: "Gift Cards",
        isEssential: false,
        suggestedPrice: "Variable",
        suggestedQuantity: 1,
        description:
          "Gift cards to baby stores, Amazon, or Target let parents buy exactly what they need.",
      },
      {
        name: "Diaper Fund",
        isEssential: false,
        suggestedPrice: "Variable",
        suggestedQuantity: 1,
        description:
          "Cash contribution toward the never-ending diaper supply.",
      },
      {
        name: "College Fund",
        isEssential: false,
        suggestedPrice: "Variable",
        suggestedQuantity: 1,
        description:
          "Contribution to a 529 plan or savings account for baby's future education.",
      },
      {
        name: "Baby Memory Book",
        isEssential: false,
        suggestedPrice: "$15-35",
        suggestedQuantity: 1,
        description:
          "Journal or scrapbook for recording milestones, firsts, and memories.",
      },
      {
        name: "Milestone Blanket / Cards",
        isEssential: false,
        suggestedPrice: "$15-30",
        suggestedQuantity: 1,
        description:
          "Monthly milestone markers for tracking growth and taking adorable photos.",
      },
    ],
  },
];
