import translations from "./translations.json";

// Definir tipos para las traducciones
type Language = 'en' | 'es';
interface Translations {
    [key: string]: {
        [key: string]: string;
    };
}

// Carga las traducciones con tipo
const typedTranslations: Translations = translations;

// Función para obtener el idioma del navegador
function getBrowserLanguage(): Language {
    const language = navigator.language.slice(0, 2) as Language;
    console.log({language});
    
    return Object.keys(translations).includes(language) ? language : 'en';
}

// Función para obtener una traducción
function translate(key: string): string {
    const language = getBrowserLanguage();
    return typedTranslations[language][key] || typedTranslations['en'][key];
}


export default {
    translate,
    getBrowserLanguage
};
