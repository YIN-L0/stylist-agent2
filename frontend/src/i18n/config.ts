import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'

// 如果 localStorage 中没有语言设置，强制设置为英语
if (!localStorage.getItem('i18nextLng')) {
  localStorage.setItem('i18nextLng', 'en')
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh }
    },
    lng: localStorage.getItem('i18nextLng') || 'en', // 从 localStorage 读取，默认英语
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
