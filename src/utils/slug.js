// src/utils/slug.js

export function slugify(input) {
  try {
    if (!input) return '';
    let s = String(input)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    s = s.replace(/&/g, ' and ');
    s = s.replace(/[^a-z0-9]+/g, '-');
    s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
    return s || 'item';
  } catch {
    return 'item';
  }
}

export function slugCategory(cat) {
  try {
    if (!cat) return 'collection';
    return slugify(String(cat));
  } catch { return 'collection'; }
}