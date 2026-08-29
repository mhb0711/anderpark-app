// Stand-in art for species that don't have real pixel-art assets yet — a
// dashed-border card with the animal's emoji, so it reads clearly as
// "not final" rather than pretending to be finished art. Swap a species'
// `image` for a real PNG import (see beaver/octopus/owl) once it exists.
export function placeholderImage(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
    <rect x="3" y="3" width="122" height="122" rx="20" fill="#e9e9e9" stroke="#9a9a9a" stroke-width="3" stroke-dasharray="7 5"/>
    <text x="64" y="80" font-size="56" text-anchor="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
