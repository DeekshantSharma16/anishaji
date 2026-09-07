/**
 * Every image the site uses, served from /public/images.
 *
 * Files live in public/ rather than src/assets so the paths stay stable,
 * the build needs no asset pipeline, and a non-developer can swap a photo
 * by dropping a file with the same name into public/images.
 */

export const images = {
  /** Hands-on therapy close-up. Used in the hero. */
  "treatment-room": "/images/treatment-room.jpg",
  /** Outdoor yoga practice. Used in the story section. */
  portrait: "/images/portrait.jpg",
  /** Seated meditation at sunrise. Used on meditation notes. */
  meditation: "/images/meditation.jpg",
  /** Relaxed client portrait. */
  "smiling-client": "/images/smiling-client.jpg",
  /** Video testimonial posters. */
  "testimonial-video-1": "/images/testimonial-video-1.jpg",
  "testimonial-video-2": "/images/testimonial-video-2.jpg",
  /** Client avatars used beside written testimonials. */
  "avatar-1": "/images/avatar-1.jpg",
  "avatar-2": "/images/avatar-2.jpg",
  "avatar-3": "/images/avatar-3.jpg",
  "avatar-4": "/images/avatar-4.jpg",
  /** Wordmark, light on dark. Used in the footer. */
  logo: "/images/logo.png",
} as const;

export type ImageKey = keyof typeof images;
