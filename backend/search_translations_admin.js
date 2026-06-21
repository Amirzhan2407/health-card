import { translations } from '../frontend/src/i18n/translations.js';

console.log('RU translations (sample keys):');
Object.keys(translations.ru).forEach(key => {
  if (key.includes('Tab') || key.includes('admin') || key.includes('doctor') || key.includes('cabinet') || key.includes('password')) {
    console.log(`  ${key}: "${translations.ru[key]}"`);
  }
});
