/* Keep FormSubmit's configured endpoint, but return to this Voice subsite. */
(() => {
 const next = document.querySelector('form[data-pilot-form] input[name="_next"]');
 if (next) next.value = new URL('danke.html', window.location.href).href;
})();
