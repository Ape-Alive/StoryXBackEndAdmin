/**
 * 风格库：媒介类型与场景分类
 */
const MEDIA_TYPES = ['text', 'image', 'video', 'audio']

const MEDIA_TYPE_LABELS = {
  text: '文字',
  image: '图片',
  video: '视频',
  audio: '音频',
}

const SCENE_CATEGORIES = [
  { slug: 'photography', displayName: '摄影写真' },
  { slug: 'ecommerce', displayName: '电商营销' },
  { slug: 'anime_game', displayName: '动漫游戏' },
  { slug: 'illustration', displayName: '风格插画' },
  { slug: 'graphic_design', displayName: '平面设计' },
  { slug: 'architecture_interior', displayName: '建筑及室内设计' },
  { slug: 'creative_play', displayName: '创意玩法' },
  { slug: 'cultural_creative', displayName: '文创周边' },
  { slug: 'novel_promotion', displayName: '小说推文' },
]

const SCENE_SLUGS = SCENE_CATEGORIES.map(c => c.slug)

const SCENE_SLUG_SET = new Set(SCENE_SLUGS)

const DEFAULT_TAGS = { scenes: [], labels: [] }

function normalizeTags(input) {
  if (input == null) {
    return { ...DEFAULT_TAGS }
  }
  const scenes = Array.isArray(input.scenes) ? input.scenes : []
  const labels = Array.isArray(input.labels) ? input.labels : []
  return {
    scenes: [...new Set(scenes.map(s => String(s).trim()).filter(Boolean))],
    labels: [...new Set(labels.map(s => String(s).trim()).filter(Boolean))],
  }
}

function validateTags(tags) {
  const normalized = normalizeTags(tags)
  if (normalized.scenes.length === 0) {
    throw new Error('tags.scenes must contain at least one scene category')
  }
  for (const slug of normalized.scenes) {
    if (!SCENE_SLUG_SET.has(slug)) {
      throw new Error(`Invalid scene slug: ${slug}`)
    }
  }
  return normalized
}

function validateMediaType(mediaType) {
  if (!MEDIA_TYPES.includes(mediaType)) {
    throw new Error(`Invalid mediaType: ${mediaType}`)
  }
  return mediaType
}

module.exports = {
  MEDIA_TYPES,
  MEDIA_TYPE_LABELS,
  SCENE_CATEGORIES,
  SCENE_SLUGS,
  DEFAULT_TAGS,
  normalizeTags,
  validateTags,
  validateMediaType,
}
