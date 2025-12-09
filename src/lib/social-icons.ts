interface SocialIcon {
  src: string
  label: string
  aliases?: string[]
}

export const SOCIAL_ICONS: Record<string, SocialIcon> = {
  facebook: {
    src: '/social-icons/facebook.svg',
    label: 'Facebook',
    aliases: ['fb']
  },
  x: {
    src: '/social-icons/x-alt.svg',
    label: 'X (Twitter)',
    aliases: ['twitter']
  },
  instagram: {
    src: '/social-icons/instagram.svg',
    label: 'Instagram',
    aliases: ['ig']
  },
  linkedin: {
    src: '/social-icons/linkedin.svg',
    label: 'LinkedIn',
    aliases: ['in']
  },
  youtube: {
    src: '/social-icons/youtube.svg',
    label: 'YouTube',
    aliases: ['yt']
  },
  tiktok: {
    src: '/social-icons/tiktok.svg',
    label: 'TikTok'
  },
  whatsapp: {
    src: '/social-icons/whatsapp.svg',
    label: 'WhatsApp',
    aliases: ['wa']
  },
  telegram: {
    src: '/social-icons/telegram.svg',
    label: 'Telegram',
    aliases: ['tg']
  }
}

export function normalizePlatform(platform: string): string {
  const normalized = platform.toLowerCase().trim()
  
  // Check if it's a direct match
  if (SOCIAL_ICONS[normalized]) {
    return normalized
  }
  
  // Check aliases
  for (const [key, icon] of Object.entries(SOCIAL_ICONS)) {
    if (icon.aliases?.includes(normalized)) {
      return key
    }
  }
  
  return normalized
}

export function resolvePlatform(platform: string): SocialIcon | null {
  const normalized = normalizePlatform(platform)
  return SOCIAL_ICONS[normalized] || null
}