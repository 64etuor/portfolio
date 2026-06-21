// Site-level copy that was previously hardcoded in components.
// Import from here so all displayed text has a single source.

export const SITE = {
  /** Browser/SEO page title */
  title: '박양하 · Portfolio',

  /** Brand domain shown in the site header */
  domain: 'yanghapark.com',

  landing: {
    /** Four PretextText lines rendered in the hero, in order. */
    hero: [
      'PORTFOLIO',
      "It's me.",
      'YANGHA PARK',
      'Designing an awesome future',
    ] as const,

    /** Ambient descriptor words that flicker behind the Spline scene.
     *  Each entry has the display word and a luminance weight (0–1):
     *  warm/human/hopeful words glow slightly; technical ones stay flat. */
    ambientWords: [
      { word: 'Love',           lum: 1    },
      { word: 'Hope',           lum: 1    },
      { word: 'Peace',          lum: 0.92 },
      { word: 'Service',        lum: 0.7  },
      { word: 'Art',            lum: 0.6  },
      { word: 'Music',          lum: 0.6  },
      { word: 'Philosophy',     lum: 0.42 },
      { word: 'Literature',     lum: 0.42 },
      { word: 'Psychology',     lum: 0.42 },
      { word: 'Knowledge',      lum: 0.4  },
      { word: 'Design',         lum: 0.36 },
      { word: 'Technology',     lum: 0.22 },
      { word: 'Development',    lum: 0.22 },
      { word: 'Management',     lum: 0.22 },
      { word: 'Infrastructure', lum: 0.22 },
      { word: 'Data',           lum: 0.22 },
      { word: 'Systems',        lum: 0.22 },
      { word: 'Manufacturing',  lum: 0.22 },
    ] as const,
  },
} as const
