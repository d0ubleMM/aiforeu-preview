/* Keep FormSubmit's configured endpoint, but return to this Voice subsite. */
(() => {
 const next = document.querySelector('form[data-pilot-form] input[name="_next"]');
 const update = () => { if (!next) return; const url = new URL('danke.html', window.location.href); const language = new URLSearchParams(location.search).get('lang') || window.AiforeuLanguage?.language; if(language)url.searchParams.set('lang',language); next.value=url.href; };
 update(); window.addEventListener('aiforeu:language-ready', update);
})();
