export enum ReviewTag {
  // Positive tags (matching Prisma schema)
  SUPER_CLEAN = 'SUPER_CLEAN',
  AMAZING_HOST = 'AMAZING_HOST',
  GREAT_LOCATION = 'GREAT_LOCATION',
  GOOD_VALUE = 'GOOD_VALUE',
  QUIET_AREA = 'QUIET_AREA',
  PERFECT_FOR_FAMILIES = 'PERFECT_FOR_FAMILIES',

  // Negative tags (matching Prisma schema)
  NOT_CLEAN = 'NOT_CLEAN',
  POOR_COMMUNICATION = 'POOR_COMMUNICATION',
  TOO_NOISY = 'TOO_NOISY',
  BAD_LOCATION = 'BAD_LOCATION',
  PRICE_TOO_HIGH = 'PRICE_TOO_HIGH',
}

// Display labels for the tags
export const ReviewTagLabels: Record<ReviewTag, string> = {
  [ReviewTag.SUPER_CLEAN]: 'Super clean',
  [ReviewTag.AMAZING_HOST]: 'Amazing host',
  [ReviewTag.GREAT_LOCATION]: 'Great location',
  [ReviewTag.GOOD_VALUE]: 'Good value',
  [ReviewTag.QUIET_AREA]: 'Quiet area',
  [ReviewTag.PERFECT_FOR_FAMILIES]: 'Perfect for families',
  [ReviewTag.NOT_CLEAN]: 'Not clean',
  [ReviewTag.POOR_COMMUNICATION]: 'Poor communication',
  [ReviewTag.TOO_NOISY]: 'Too noisy',
  [ReviewTag.BAD_LOCATION]: 'Bad location',
  [ReviewTag.PRICE_TOO_HIGH]: 'Price too high',
}

export enum GuestReviewTag {
  // Positive guest tags
  RESPECTFUL_GUEST = 'Respectful guest',
  CLEAN_AND_TIDY = 'Clean and tidy',
  GOOD_COMMUNICATION = 'Good communication',
  FOLLOWED_RULES = 'Followed rules',
  EASY_GUEST = 'Easy guest',
  ON_TIME = 'On time',

  // Negative guest tags
  DISRESPECTFUL = 'Disrespectful',
  LEFT_MESS = 'Left mess',
  POOR_COMMUNICATION = 'Poor communication',
  BROKE_RULES = 'Broke rules',
  DIFFICULT_GUEST = 'Difficult guest',
  LATE_NO_SHOW = 'Late/no show',
  DAMAGED_PROPERTY = 'Damaged property',
}