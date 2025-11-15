export function validateRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export interface RatingInput {
  assignmentId: number;
  categoryId: number;
  ratingValue: number;
  comment?: string;
}

export function validateRatingInput(input: RatingInput): {
  isValid: boolean;
  error?: string;
} {
  if (!input.assignmentId || input.assignmentId <= 0) {
    return { isValid: false, error: 'Invalid assignment ID' };
  }

  if (!input.categoryId || input.categoryId <= 0) {
    return { isValid: false, error: 'Invalid category ID' };
  }

  if (!validateRating(input.ratingValue)) {
    return { isValid: false, error: 'Rating must be between 1 and 5' };
  }

  if (input.comment && input.comment.length > 2000) {
    return { isValid: false, error: 'Comment too long' };
  }

  return { isValid: true };
}
