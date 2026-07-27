// Catálogo comercial base de Sublicuentas.
// Este archivo conserva los precios y condiciones que ya estaban publicados
// en index.html. Firestore puede reemplazar estos datos desde el panel, pero
// siempre quedan disponibles como respaldo si la base remota no responde.

export const DEFAULT_CATALOG = {
  schemaVersion: 1,
  catalogVersion: 1,
  updatedAt: '2026-07-27T12:00:00.000Z',
  settings: {
    brand: 'Sublicuentas',
    slogan: 'Conectamos tu entretenimiento',
    currency: 'HNL',
    currencyLabel: 'Lps.',
    locale: 'es-HN',
    whatsapp: '50432126332',
    pointsPerConfirmedPurchase: 10,
    maxComboItems: 5,
    comboDiscounts: [
      { itemCount: 2, amount: 10 },
      { itemCount: 3, amount: 20 }
    ],
    paymentMethods: [
      {
        id: 'transferencia',
        name: 'Transferencia bancaria',
        active: true,
        instructions: 'Los datos de pago serán confirmados al finalizar el pedido.'
      },
      {
        id: 'tigo-money',
        name: 'Tigo Money',
        active: true,
        instructions: 'El número de pago será confirmado al finalizar el pedido.'
      }
    ]
  },
  categories: [
    { id: 'streaming', name: 'Cine y Series', icon: '🎬', order: 10, active: true },
    { id: 'music', name: 'Música Premium', icon: '🎵', order: 20, active: true },
    { id: 'iptv', name: 'TV Digital', icon: '📺', order: 30, active: true },
    { id: 'gaming', name: 'Recargas Gaming', icon: '🎮', order: 40, active: true },
    { id: 'ai', name: 'IA y Educación', icon: '✨', order: 50, active: true },
    { id: 'creative', name: 'Zona Creativa', icon: '🎨', order: 60, active: true },
    { id: 'software', name: 'Antivirus y Software', icon: '🛡️', order: 70, active: true }
  ],
  products: [
    {
      id: 'netflix',
      name: 'Netflix',
      categoryId: 'streaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 10,
      accent: '#E50914',
      visual: 'N',
      imageUrl: '/assets/netflix.webp',
      summary: 'Películas y series en calidad premium.',
      plans: [
        {
          id: 'premium',
          name: 'Cuenta Premium',
          price: 130,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · Perfil con PIN',
            'Acceso por código; no se brinda correo ni clave',
            'Código hogar cada 20 días',
            'Uso únicamente en Honduras'
          ]
        },
        {
          id: 'vip',
          name: 'VIP',
          price: 150,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          badge: 'Premium',
          features: [
            'Correo y clave propios',
            'Multidispositivo; reproduce en uno a la vez',
            'Sin código hogar'
          ]
        }
      ]
    },
    {
      id: 'disney',
      name: 'Disney+',
      categoryId: 'streaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 20,
      accent: '#113CCF',
      visual: 'D+',
      imageUrl: '/assets/disney.webp',
      summary: 'Disney, Hulu, Marvel, Pixar, Star Wars y más.',
      plans: [
        {
          id: 'premium',
          name: 'Premium',
          price: 100,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · Perfil con PIN',
            'Acceso por código',
            'Todo el catálogo Disney y Hulu',
            'Incluye ESPN y deportes'
          ]
        },
        {
          id: 'standard',
          name: 'Básico',
          price: 70,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          badge: 'Popular',
          pointsCost: 60,
          features: [
            '1 dispositivo · Perfil con PIN',
            'Acceso por código',
            'Disney, Hulu, Marvel, Pixar, Fox y National Geographic',
            'Sin canales ESPN'
          ]
        }
      ]
    },
    {
      id: 'hbo-max',
      name: 'HBO Max',
      categoryId: 'streaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 30,
      accent: '#6421D6',
      visual: 'MAX',
      imageUrl: '/assets/hbo-max.webp',
      summary: 'Estrenos, series originales y contenido Warner Bros.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 80,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · 30 días · Full HD',
            'Acceso por código; no se brinda correo ni clave',
            'Garantía incluida'
          ]
        }
      ]
    },
    {
      id: 'prime-video',
      name: 'Prime Video',
      categoryId: 'streaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 40,
      accent: '#00A8E1',
      visual: 'prime',
      imageUrl: '/assets/prime-video.webp',
      summary: 'Películas, series y Amazon Originals.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 80,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · 30 días',
            'Acceso por código',
            'No incluye compras ni rentas',
            'Garantía incluida'
          ]
        }
      ]
    },
    {
      id: 'crunchyroll',
      name: 'Crunchyroll',
      categoryId: 'streaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 50,
      accent: '#F47521',
      visual: 'C',
      imageUrl: '/assets/crunchyroll.webp',
      summary: 'Anime oficial, simulcasts y estrenos con Japón.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 80,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · 30 días',
            'Acceso por código',
            'Todo el catálogo oficial en HD',
            'Garantía incluida'
          ]
        }
      ]
    },
    {
      id: 'vix',
      name: 'Vix',
      categoryId: 'streaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 60,
      accent: '#FF6900',
      visual: 'VIX',
      imageUrl: '/assets/vix.webp',
      summary: 'Novelas, series, películas, canales y deportes latinos.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 70,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          pointsCost: 60,
          features: [
            '1 dispositivo · 30 días',
            'Acceso por código',
            'Películas, series y novelas mexicanas',
            'Canales en vivo y deportes latinos'
          ]
        }
      ]
    },
    {
      id: 'paramount',
      name: 'Paramount+',
      categoryId: 'streaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 70,
      accent: '#0064FF',
      visual: 'P+',
      imageUrl: '/assets/paramount.webp',
      summary: 'Paramount Originals, CBS, películas y UFC en vivo.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 80,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · 30 días',
            'Acceso por código',
            'UFC en vivo',
            'Garantía incluida'
          ]
        }
      ]
    },
    {
      id: 'viki',
      name: 'Viki Rakuten',
      categoryId: 'streaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 80,
      accent: '#00B6E3',
      visual: 'VIKI',
      imageUrl: '/assets/viki.webp',
      summary: 'K-dramas, doramas y contenido asiático subtitulado.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 80,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · 30 días',
            'Acceso por código',
            'Contenido en idioma original con subtítulos en español',
            'Sin doblaje latino'
          ]
        }
      ]
    },
    {
      id: 'deezer',
      name: 'Deezer Premium',
      categoryId: 'music',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 10,
      accent: '#A238FF',
      visual: 'DZ',
      imageUrl: '/assets/deezer.webp',
      summary: 'Música sin anuncios, descargas y audio de alta calidad.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 80,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          pointsCost: 50,
          features: [
            'Más de 90 millones de canciones',
            'Audio de hasta 320 kbps',
            'Descarga sin conexión',
            'Compatible con Alexa y Smart TV'
          ]
        }
      ]
    },
    {
      id: 'spotify',
      name: 'Spotify Premium',
      categoryId: 'music',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 20,
      accent: '#1DB954',
      visual: 'SP',
      imageUrl: '/assets/spotify.webp',
      summary: 'Música, podcasts y audiolibros sin anuncios.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 110,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            '30 días',
            'Se brinda correo y clave',
            'Descargas para escuchar sin conexión',
            'Garantía incluida'
          ]
        }
      ]
    },
    {
      id: 'youtube-premium',
      name: 'YouTube Premium',
      categoryId: 'music',
      active: true,
      storeEnabled: true,
      availability: 'on_request',
      order: 30,
      accent: '#FF0000',
      visual: 'YT',
      imageUrl: '/assets/youtube-premium.webp',
      summary: 'Videos y música sin anuncios.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: null,
          billingLabel: '',
          active: true,
          availability: 'on_request',
          features: [
            '30 días',
            'Cuenta válida solo en Honduras',
            'Reproducción en segundo plano',
            'Incluye YouTube Music Premium'
          ]
        }
      ]
    },
    {
      id: 'oleada-tv',
      name: 'Oleada TV',
      categoryId: 'iptv',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 10,
      accent: '#1768E5',
      visual: 'O',
      imageUrl: '/assets/oleada-tv.webp',
      summary: 'Películas, series y deportes para Android y web.',
      productFeatures: [
        'Compatible con Android, Android TV, TV Box, TV Stick y web',
        'No compatible con Smart TV Samsung o LG',
        'iPhone y iPad únicamente en modo web'
      ],
      plans: [
        {
          id: 'personal',
          name: 'Personal · 1 dispositivo',
          price: 90,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 90, bonus: '' },
            { id: '3m', label: '3 meses', price: 250, bonus: '' },
            { id: '6m', label: '6 meses', price: 450, bonus: '+1 mes gratis' },
            { id: '12m', label: '12 meses', price: 850, bonus: '+2 meses gratis' }
          ]
        },
        {
          id: 'family-3',
          name: 'Familiar · 3 dispositivos',
          price: 200,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 200, bonus: '' },
            { id: '3m', label: '3 meses', price: 550, bonus: '' },
            { id: '6m', label: '6 meses', price: 1000, bonus: '+1 mes gratis' },
            { id: '12m', label: '12 meses', price: 1900, bonus: '+2 meses gratis' }
          ]
        }
      ]
    },
    {
      id: 'latin-tv',
      name: 'Latin TV',
      categoryId: 'iptv',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 20,
      accent: '#D4AF37',
      visual: 'LATIN',
      imageUrl: '/assets/latin-tv.webp',
      summary: 'Canales, películas, series y deportes en vivo.',
      productFeatures: [
        'Más de 5,000 canales en vivo',
        'Más de 19,000 películas y 5,000 series',
        'Canales HD/FHD · Demo gratis de 6 horas'
      ],
      plans: [
        {
          id: 'screen-1',
          name: 'Plan 1 · 1 pantalla',
          price: 99,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 99, bonus: '' },
            { id: '4m', label: '4 meses', price: 299, bonus: 'Paga 3' },
            { id: '7m', label: '7 meses', price: 699, bonus: 'Lleva 8' },
            { id: '9m', label: '9 meses', price: 899, bonus: 'Lleva 12' }
          ]
        },
        {
          id: 'screen-2',
          name: 'Plan 2 · 2 pantallas',
          price: 149,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 149, bonus: '' },
            { id: '4m', label: '4 meses', price: 449, bonus: 'Paga 3' },
            { id: '7m', label: '7 meses', price: 1049, bonus: 'Lleva 8' },
            { id: '9m', label: '9 meses', price: 1349, bonus: 'Lleva 12' }
          ]
        },
        {
          id: 'screen-3',
          name: 'Plan 3 · 3 pantallas',
          price: 199,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 199, bonus: '' },
            { id: '4m', label: '4 meses', price: 599, bonus: 'Paga 3' },
            { id: '7m', label: '7 meses', price: 1399, bonus: 'Lleva 8' },
            { id: '9m', label: '9 meses', price: 1799, bonus: 'Lleva 12' }
          ]
        },
        {
          id: 'screen-4',
          name: 'Plan 4 · 4 pantallas',
          price: 249,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 249, bonus: '' },
            { id: '4m', label: '4 meses', price: 749, bonus: 'Paga 3' },
            { id: '7m', label: '7 meses', price: 1749, bonus: 'Lleva 8' },
            { id: '9m', label: '9 meses', price: 2249, bonus: 'Lleva 12' }
          ]
        }
      ]
    },
    {
      id: 'lion-tv',
      name: 'Lion TV',
      categoryId: 'iptv',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 30,
      accent: '#C58A14',
      visual: '🦁',
      imageUrl: '/assets/lion-tv.webp',
      summary: 'IPTV estable por conexiones con demo de 6 horas.',
      productFeatures: [
        'Activación inmediata',
        'Servicio estable',
        'Soporte especializado',
        'Demo gratis de 6 horas'
      ],
      plans: [
        {
          id: 'connection-1',
          name: 'Plan 1 · 1 conexión',
          price: 250,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 250, bonus: '' },
            { id: '3m', label: '3 meses', price: 750, bonus: '+15 días' },
            { id: '5m', label: '5 meses', price: 1250, bonus: '+1 mes' },
            { id: '10m', label: '10 meses', price: 2500, bonus: '+2 meses' }
          ]
        },
        {
          id: 'connection-2',
          name: 'Plan 2 · 2 conexiones',
          price: 275,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 275, bonus: '' },
            { id: '3m', label: '3 meses', price: 825, bonus: '+15 días' },
            { id: '5m', label: '5 meses', price: 1375, bonus: '+1 mes' },
            { id: '10m', label: '10 meses', price: 2750, bonus: '+2 meses' }
          ]
        },
        {
          id: 'connection-3',
          name: 'Plan 3 · 3 conexiones',
          price: 300,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 300, bonus: '' },
            { id: '3m', label: '3 meses', price: 900, bonus: '+15 días' },
            { id: '5m', label: '5 meses', price: 1500, bonus: '+1 mes' },
            { id: '10m', label: '10 meses', price: 3000, bonus: '+2 meses' }
          ]
        },
        {
          id: 'connection-5',
          name: 'Plan 5 · 5 conexiones',
          price: 400,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          options: [
            { id: '1m', label: '1 mes', price: 400, bonus: '' },
            { id: '3m', label: '3 meses', price: 1200, bonus: '+15 días' },
            { id: '5m', label: '5 meses', price: 2000, bonus: '+1 mes' },
            { id: '10m', label: '10 meses', price: 4000, bonus: '+2 meses' }
          ]
        }
      ]
    },
    {
      id: 'free-fire',
      name: 'Free Fire',
      categoryId: 'gaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 10,
      accent: '#F59E0B',
      visual: 'FF',
      imageUrl: '/assets/free-fire.webp',
      summary: 'Recargas de diamantes por ID de jugador.',
      plans: [
        {
          id: 'diamonds',
          name: 'Diamantes',
          price: 29,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          features: [
            'Entrega estimada de 10 a 20 minutos',
            'Se requiere ID y captura del jugador'
          ],
          options: [
            { id: '120', label: '120 diamantes', price: 29, bonus: '' },
            { id: '341', label: '341 diamantes', price: 89, bonus: '' },
            { id: '572', label: '572 diamantes', price: 129, bonus: '' },
            { id: '1166', label: '1,166 diamantes', price: 249, bonus: 'Más vendido' },
            { id: '2398', label: '2,398 diamantes', price: 499, bonus: '' },
            { id: '6170', label: '6,170 diamantes', price: 1199, bonus: '' }
          ]
        }
      ]
    },
    {
      id: 'pubg-mobile',
      name: 'PUBG Mobile',
      categoryId: 'gaming',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 20,
      accent: '#B7791F',
      visual: 'PUBG',
      imageUrl: '/assets/pubg-mobile.webp',
      summary: 'Recargas de UC por ID de jugador.',
      plans: [
        {
          id: 'uc',
          name: 'UC',
          price: 30,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          features: [
            'Entrega estimada de 10 a 20 minutos',
            'Se requiere ID y captura del jugador'
          ],
          options: [
            { id: '60', label: '60 UC', price: 30, bonus: '' },
            { id: '660', label: '660 UC', price: 260, bonus: 'Más vendido' },
            { id: '1800', label: '1,800 UC', price: 640, bonus: '' }
          ]
        }
      ]
    },
    {
      id: 'roblox',
      name: 'Roblox',
      categoryId: 'gaming',
      active: true,
      storeEnabled: true,
      availability: 'on_request',
      order: 30,
      accent: '#111827',
      visual: 'R',
      imageUrl: '/assets/roblox.webp',
      summary: 'Recargas de Robux y artículos bajo pedido.',
      plans: [
        {
          id: 'robux',
          name: 'Robux',
          price: null,
          billingLabel: '',
          active: true,
          availability: 'on_request',
          features: [
            'Entrega estimada de 10 a 40 minutos',
            'El asesor confirma los montos disponibles'
          ]
        }
      ]
    },
    {
      id: 'chatgpt-plus',
      name: 'ChatGPT Plus',
      categoryId: 'ai',
      active: true,
      storeEnabled: false,
      availability: 'paused',
      order: 10,
      accent: '#10A37F',
      visual: 'AI',
      imageUrl: '/assets/chatgpt-plus.webp',
      summary: 'Producto temporalmente no disponible.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: null,
          billingLabel: '',
          active: false,
          availability: 'paused',
          features: ['No ofrecer ni cotizar mientras esté pausado']
        }
      ]
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      categoryId: 'ai',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 20,
      accent: '#4285F4',
      visual: 'G',
      imageUrl: '/assets/gemini-pro.webp',
      summary: 'Herramientas premium de inteligencia artificial de Google.',
      plans: [
        {
          id: 'monthly',
          name: 'Mensual',
          price: 170,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            'Invitación directa a su correo personal',
            '1 mes de acceso premium y privado'
          ]
        }
      ]
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      categoryId: 'ai',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 30,
      accent: '#159A9C',
      visual: 'P',
      imageUrl: '/assets/perplexity.webp',
      summary: 'Buscador e investigación asistida por IA.',
      plans: [
        {
          id: 'annual',
          name: 'Anual',
          price: 600,
          billingLabel: '/año',
          active: true,
          availability: 'available',
          features: [
            'Renueva una cuenta existente',
            'Solo aplica si nunca tuvo suscripción Plus previa'
          ]
        }
      ]
    },
    {
      id: 'duolingo',
      name: 'Duolingo Plus',
      categoryId: 'ai',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 40,
      accent: '#58CC02',
      visual: 'DUO',
      imageUrl: '/assets/duolingo.svg',
      summary: 'Aprendizaje sin anuncios, vidas infinitas y repaso de errores.',
      plans: [
        {
          id: 'plus',
          name: 'Plan Plus',
          price: 100,
          billingLabel: '/mes',
          active: true,
          availability: 'available',
          features: [
            'Invitación a su cuenta personal',
            '1 mes de acceso'
          ]
        }
      ]
    },
    {
      id: 'canva',
      name: 'Canva Edu Pro',
      categoryId: 'creative',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 10,
      accent: '#00C4CC',
      visual: 'Canva',
      imageUrl: '/assets/canva.webp',
      summary: 'Plantillas y herramientas premium para diseño.',
      plans: [
        {
          id: 'membership',
          name: 'Membresía',
          price: 69,
          billingLabel: 'desde',
          active: true,
          availability: 'available',
          pointsCost: 40,
          features: [
            'Invitación al correo personal',
            'Multidispositivo',
            'Descargas sin marca de agua',
            'Garantía incluida'
          ],
          options: [
            { id: '1m', label: '1 mes', price: 69, bonus: '' },
            { id: '3m', label: '3 meses', price: 179, bonus: '' },
            { id: '6m', label: '6 meses', price: 339, bonus: '' },
            { id: '12m', label: '12 meses', price: 639, bonus: '' }
          ]
        }
      ]
    },
    {
      id: 'adobe-express',
      name: 'Adobe Express Premium',
      categoryId: 'creative',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 20,
      accent: '#6C2BFF',
      visual: 'Ae',
      imageUrl: '/assets/adobe-express.webp',
      summary: 'Diseño profesional con plantillas y recursos de Adobe.',
      plans: [
        {
          id: 'annual',
          name: 'Anual',
          price: 450,
          billingLabel: '/año',
          active: true,
          availability: 'available',
          features: [
            '12 meses completos',
            'Se entrega correo y contraseña',
            'Uso en computadora y aplicación móvil'
          ]
        }
      ]
    },
    {
      id: 'eset',
      name: 'ESET Antivirus',
      categoryId: 'software',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 10,
      accent: '#00A5A5',
      visual: 'ESET',
      imageUrl: '/assets/eset.webp',
      summary: 'Licencias originales para Windows y Mac.',
      plans: [
        {
          id: 'nod32',
          name: 'NOD32 Antivirus',
          price: 399,
          billingLabel: '/año',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · 1 año',
            'Antivirus proactivo y anti-ransomware',
            'Modo gamer'
          ]
        },
        {
          id: 'internet-security',
          name: 'Internet Security',
          price: 749,
          billingLabel: '/año',
          active: true,
          availability: 'available',
          badge: 'Favorito',
          features: [
            '1 dispositivo · 1 año',
            'Protección de banca y pagos',
            'Cortafuegos y bloqueo de webcam'
          ]
        },
        {
          id: 'smart-security',
          name: 'Smart Security Premium',
          price: 999,
          billingLabel: '/año',
          active: true,
          availability: 'available',
          features: [
            '1 dispositivo · 1 año',
            'Gestor de contraseñas',
            'Cifrado para archivos y USB'
          ]
        }
      ]
    },
    {
      id: 'windows',
      name: 'Windows 10/11',
      categoryId: 'software',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 20,
      accent: '#0078D4',
      visual: '⊞',
      imageUrl: '/assets/windows.webp',
      summary: 'Licencia permanente para un equipo.',
      plans: [
        {
          id: 'pro',
          name: 'Pro',
          price: 700,
          billingLabel: '/único pago',
          active: true,
          availability: 'available',
          badge: 'Más solicitado',
          features: [
            'Código de activación original',
            '1 equipo · Licencia permanente',
            'Seguridad avanzada y acceso remoto'
          ]
        },
        {
          id: 'home',
          name: 'Home',
          price: 700,
          billingLabel: '/único pago',
          active: true,
          availability: 'available',
          features: [
            'Código de activación original',
            '1 equipo · Licencia permanente',
            'Ideal para hogar y uso personal'
          ]
        }
      ]
    },
    {
      id: 'office-365',
      name: 'Office 365',
      categoryId: 'software',
      active: true,
      storeEnabled: true,
      availability: 'available',
      order: 30,
      accent: '#EA3E23',
      visual: 'O365',
      imageUrl: '/assets/office-365.webp',
      summary: 'Microsoft Office para cinco dispositivos.',
      plans: [
        {
          id: 'annual-5',
          name: 'Anual · 5 dispositivos',
          price: 450,
          billingLabel: '/año',
          active: true,
          availability: 'available',
          features: [
            '1 año · Hasta 5 dispositivos',
            'Word, Excel, PowerPoint, Outlook y OneNote',
            '1 TB en OneDrive',
            'Windows, Mac, iOS y Android'
          ]
        }
      ]
    },
    {
      id: 'mubi',
      name: 'Mubi Premium',
      categoryId: 'streaming',
      active: true,
      storeEnabled: false,
      redemptionOnly: true,
      availability: 'available',
      order: 90,
      accent: '#111111',
      visual: 'MUBI',
      imageUrl: '/assets/mubi.webp',
      summary: 'Beneficio disponible mediante canje de puntos.',
      plans: [
        {
          id: 'monthly-redemption',
          name: '1 mes por puntos',
          price: null,
          billingLabel: '',
          active: true,
          availability: 'available',
          pointsCost: 30,
          features: ['Disponible únicamente mediante canje de puntos']
        }
      ]
    }
  ],
  promotions: [
    {
      id: 'combo-disney-crunchyroll',
      title: 'Disney+ Premium sin ESPN + Crunchyroll Mega Fan',
      description: 'Todo el catálogo Disney y todo el anime de Crunchyroll en un solo pago.',
      active: true,
      startsAt: '',
      endsAt: '',
      order: 10,
      accent: '#7C3AED',
      productIds: ['disney', 'crunchyroll'],
      options: [
        { id: 'monthly', label: 'Combo mensual', price: 110, bonus: '' }
      ],
      features: ['1 pantalla vigente', 'Acceso por código', 'Calidad 4K FHD']
    },
    {
      id: 'hbo-multi-month',
      title: 'HBO Max',
      description: 'Series HBO y estrenos en resolución 4K.',
      active: true,
      startsAt: '',
      endsAt: '',
      order: 20,
      accent: '#6421D6',
      productIds: ['hbo-max'],
      options: [
        { id: '3m', label: '3 meses', price: 210, bonus: '' },
        { id: '4m', label: '4 meses', price: 270, bonus: '+3 días' }
      ],
      features: ['1 dispositivo vigente', 'Acceso por código', 'Servicio garantizado']
    },
    {
      id: 'prime-multi-month',
      title: 'Prime Video',
      description: 'Amazon Originals y contenido para toda la familia.',
      active: true,
      startsAt: '',
      endsAt: '',
      order: 30,
      accent: '#00A8E1',
      productIds: ['prime-video'],
      options: [
        { id: '3m', label: '3 meses', price: 210, bonus: '' },
        { id: '4m', label: '4 meses', price: 270, bonus: '+3 días' }
      ],
      features: ['1 dispositivo vigente', 'Acceso por código', 'Servicio garantizado']
    },
    {
      id: 'crunchyroll-multi-month',
      title: 'Crunchyroll Mega Fan',
      description: 'Anime, simulcasts y descargas sin anuncios.',
      active: true,
      startsAt: '',
      endsAt: '',
      order: 40,
      accent: '#F47521',
      productIds: ['crunchyroll'],
      options: [
        { id: '3m', label: 'Paga 2 meses, lleva 3', price: 160, bonus: '' },
        { id: '12m', label: '12 meses', price: 600, bonus: '' }
      ],
      features: ['1 dispositivo vigente', 'Acceso por código', 'Servicio garantizado']
    },
    {
      id: 'vix-3-months',
      title: 'Vix Premium',
      description: 'Series, películas, novelas y deportes en español.',
      active: true,
      startsAt: '',
      endsAt: '',
      order: 50,
      accent: '#F97316',
      productIds: ['vix'],
      options: [
        { id: '3m', label: '3 meses', price: 120, bonus: '' }
      ],
      features: ['1 dispositivo vigente', 'Servicio garantizado']
    }
  ]
};

export function cloneDefaultCatalog() {
  return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
}
